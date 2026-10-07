'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  CONSENTIMENTO_CONTATO_GERAL,
  CONSENTIMENTO_INTERESSES,
} from '@/lib/config'
import { precoDoInteresse } from '@/lib/preco'
import type { Selo } from '@/lib/motor'

// ============================================================================
// GRAVACAO DOS INTERESSES
//
// Cada empreendimento marcado vira uma linha em `interesses` -- e cada linha e
// uma unidade de venda independente, com preco proprio.
//
// Quem nao marcou nenhum e aceitou contato generico gera UMA linha sem
// empreendimento: a vitrine geral. Quem recusou nao gera nada e sai do funil,
// ficando so como dado agregado.
// ============================================================================

export type ResultadoEnvio = { erro: string }

/** Tipo explicito: sem ele, a inferencia trata o caso geral (empreendimento
 *  nulo) como incompativel com o caso marcado. */
type LinhaInteresse = {
  lead_id: string
  empreendimento_id: string | null
  consentimento_id: string
  preco: number
}

export async function salvarInteresses(
  empreendimentoIds: string[],
  querContatoGeral: boolean
): Promise<ResultadoEnvio> {
  const biscoitos = await cookies()
  const leadId = biscoitos.get('lead_resultado')?.value

  if (!leadId) {
    return {
      erro: 'Sua sessão expirou. Responda o quiz de novo para escolher os empreendimentos.',
    }
  }

  const { data: lead, error: erroLead } = await supabaseAdmin()
    .from('leads')
    .select('id, criado_em, selo_declarado, qtd_interesses')
    .eq('id', leadId)
    .maybeSingle<{
      id: string
      criado_em: string
      selo_declarado: string | null
      qtd_interesses: number
    }>()

  if (erroLead || !lead) {
    return { erro: 'Não encontramos seu cadastro. Responda o quiz de novo.' }
  }

  // Trava contra duplo envio: se ja gravou, nao grava de novo. O indice unico
  // em interesses tambem barraria, mas com erro feio na cara da pessoa.
  if (lead.qtd_interesses > 0) {
    biscoitos.delete('lead_resultado')
    redirect('/obrigado')
  }

  const marcou = empreendimentoIds.length > 0

  // --- consentimento proprio da marcacao ---
  // Nao reaproveito o consentimento do fim do quiz: ali a pessoa aceitou ser
  // contatada, aqui ela escolheu POR QUEM. Sao atos diferentes, e so um
  // registro proprio prova quais empreendimentos ela marcou, e quando.
  const cabecalhos = await headers()
  const texto = marcou ? CONSENTIMENTO_INTERESSES : CONSENTIMENTO_CONTATO_GERAL

  const { data: consentimento, error: erroConsentimento } = await supabaseAdmin()
    .from('consentimentos')
    .insert({
      texto_versao: texto.versao,
      ip:
        cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        cabecalhos.get('x-real-ip') ??
        null,
      user_agent: cabecalhos.get('user-agent'),
    })
    .select('id')
    .single()

  if (erroConsentimento || !consentimento) {
    console.error('[salvarInteresses] consentimento:', erroConsentimento)
    return { erro: 'Não conseguimos registrar sua escolha. Tente novamente.' }
  }

  // --- os interesses ---
  // Preco na faixa de perfil DECLARADO: a ligacao de verificacao ainda nao
  // aconteceu. Aprovar o lead no admin sobe todos eles de uma vez.
  const selo = (lead.selo_declarado ?? 'a_confirmar') as Selo

  const linhas: LinhaInteresse[] = marcou
    ? empreendimentoIds.map((id) => ({
        lead_id: lead.id,
        empreendimento_id: id,
        consentimento_id: consentimento.id,
        preco: precoDoInteresse({
          temEmpreendimento: true,
          verificado: false,
          criadoEm: lead.criado_em,
          selo,
        }),
      }))
    : querContatoGeral
      ? [
          {
            lead_id: lead.id,
            empreendimento_id: null,
            consentimento_id: consentimento.id,
            preco: precoDoInteresse({
              temEmpreendimento: false,
              verificado: false,
              criadoEm: lead.criado_em,
              selo,
            }),
          },
        ]
      : []

  if (linhas.length > 0) {
    const { error } = await supabaseAdmin().from('interesses').insert(linhas)
    if (error) {
      console.error('[salvarInteresses] interesses:', error)
      return { erro: 'Não conseguimos registrar sua escolha. Tente novamente.' }
    }
  }

  // qtd_interesses e DADO INTERNO DE CALIBRACAO. Nunca sai na vitrine: com ele,
  // o corretor saberia quantas empresas vao ligar para a mesma pessoa.
  const { error: erroUpdate } = await supabaseAdmin()
    .from('leads')
    .update({
      qtd_interesses: linhas.length,
      quer_contato_geral: marcou ? null : querContatoGeral,
    })
    .eq('id', lead.id)

  if (erroUpdate) {
    // Os interesses ja existem; so o contador ficou para tras. Nao vale travar
    // a pessoa numa tela de erro por causa de um numero de calibracao.
    console.error('[salvarInteresses] contador:', erroUpdate)
  }

  biscoitos.delete('lead_resultado')
  redirect('/obrigado')
}

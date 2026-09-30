'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CONSENTIMENTO } from '@/lib/config'
import { enquadramentoDaRenda } from '@/lib/quiz'

// ============================================================================
// GRAVACAO DO LEAD
//
// Roda no servidor. O navegador manda apenas as respostas; versao do
// consentimento, IP e user agent sao determinados AQUI -- se viessem do
// cliente, nao provariam nada.
//
// Ordem: consentimento primeiro (o lead aponta para ele), lead depois.
// ============================================================================

export type RespostasQuiz = Record<string, string>

export type ResultadoEnvio = { erro: string }

/** 'sim' -> true, 'nao' -> false, ausente -> null. */
function booleano(valor: string | undefined): boolean | null {
  if (valor === 'sim') return true
  if (valor === 'nao') return false
  return null
}

/** Mantem so digitos. Aceita 10 (fixo) ou 11 (celular) digitos. */
function normalizarTelefone(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.length === 10 || digitos.length === 11) return digitos
  // Com codigo do pais colado na frente.
  if (digitos.length === 13 && digitos.startsWith('55')) return digitos.slice(2)
  return null
}

export async function salvarLead(respostas: RespostasQuiz): Promise<ResultadoEnvio> {
  // --- validacao do minimo indispensavel ---
  const nome = (respostas.nome ?? '').trim()
  const cidade = (respostas.cidade ?? '').trim()

  if (nome.length < 2) return { erro: 'Informe seu nome.' }
  if (!cidade) return { erro: 'Informe a cidade de interesse.' }
  if (respostas.consentimento !== 'sim') {
    return { erro: 'E necessario aceitar o compartilhamento dos dados para continuar.' }
  }

  const telefone = normalizarTelefone(respostas.telefone ?? '')
  if (!telefone) return { erro: 'Informe um WhatsApp valido, com DDD.' }

  // --- consentimento: prova de qual texto foi aceito, por quem e de onde ---
  const cabecalhos = await headers()
  const ip =
    cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    cabecalhos.get('x-real-ip') ??
    null

  const { data: consentimento, error: erroConsentimento } = await supabaseAdmin()
    .from('consentimentos')
    .insert({
      texto_versao: CONSENTIMENTO.versao,
      ip,
      user_agent: cabecalhos.get('user-agent'),
    })
    .select('id')
    .single()

  if (erroConsentimento || !consentimento) {
    console.error('[salvarLead] falha ao gravar consentimento:', erroConsentimento)
    return { erro: 'Nao conseguimos registrar seu cadastro. Tente novamente.' }
  }

  // --- lead ---
  const quartos = Number.parseInt(respostas.quartos ?? '', 10)

  const { error: erroLead } = await supabaseAdmin().from('leads').insert({
    cidade,
    bairro: (respostas.bairro ?? '').trim() || null,
    quartos: Number.isNaN(quartos) ? null : quartos,
    garagem: booleano(respostas.garagem),
    // faixa_tamanho: o quiz nao pergunta metragem hoje. Coluna fica nula.
    enquadramento: respostas.renda_faixa
      ? enquadramentoDaRenda(respostas.renda_faixa)
      : null,
    renda_faixa: respostas.renda_faixa ?? null,
    renda_formal: booleano(respostas.renda_formal),
    renda_composta: booleano(respostas.renda_composta),
    nome_limpo: respostas.nome_limpo ?? null,
    fgts_tempo: respostas.fgts_tempo ?? null,
    ja_financiou: booleano(respostas.ja_financiou),
    entrada_disponivel: respostas.entrada_disponivel ?? null,
    prazo_compra: respostas.prazo_compra ?? null,
    nome,
    telefone,
    status: 'novo',
    // preco fica nulo: e definido quando eu aprovo o lead no admin (Dia 2).
    consentimento_id: consentimento.id,
  })

  if (erroLead) {
    console.error('[salvarLead] falha ao gravar lead:', erroLead)
    return { erro: 'Nao conseguimos registrar seu cadastro. Tente novamente.' }
  }

  redirect('/obrigado')
}

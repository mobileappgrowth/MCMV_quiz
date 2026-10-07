'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CONSENTIMENTO } from '@/lib/config'
import { qualificar } from '@/lib/motor'

// ============================================================================
// GRAVACAO DO LEAD
//
// Roda no servidor. O navegador manda apenas as respostas; versao do
// consentimento, IP e user agent sao determinados AQUI -- se viessem do
// cliente, nao provariam nada.
//
// Ordem: consentimento primeiro (o lead aponta para ele), lead depois.
//
// O MOTOR RODA AQUI, no servidor, antes do insert. Nunca no navegador: as
// respostas chegam do cliente, mas a decisao sobre elas e do servidor. Rodar no
// cliente deixaria a pontuacao visivel no bundle e manipulavel no DevTools.
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
    return { erro: 'É necessário aceitar o compartilhamento dos dados para continuar.' }
  }

  const telefone = normalizarTelefone(respostas.telefone ?? '')
  if (!telefone) return { erro: 'Informe um WhatsApp válido, com DDD.' }

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
    return { erro: 'Não conseguimos registrar seu cadastro. Tente novamente.' }
  }

  // --- motor de qualificacao ---
  const motor = qualificar({ ...respostas, cidade })

  // --- lead ---
  const quartos = Number.parseInt(respostas.quartos ?? '', 10)

  const { data: lead, error: erroLead } = await supabaseAdmin()
    .from('leads')
    .insert({
    cidade,
    bairro: (respostas.bairro ?? '').trim() || null,
    quartos: Number.isNaN(quartos) ? null : quartos,
    garagem: booleano(respostas.garagem),
    // faixa_tamanho: o quiz nao pergunta metragem hoje. Coluna fica nula.
    enquadramento: motor.enquadramento,
    renda_faixa: respostas.renda_faixa ?? null,
    vinculo_renda: respostas.vinculo_renda ?? null,
    // Booleano derivado do vinculo, para o cartao da vitrine mostrar "formal ou
    // informal". MEI e autonomo comprovado contam como formal aqui.
    renda_formal:
      respostas.vinculo_renda === undefined
        ? null
        : respostas.vinculo_renda !== 'informal',
    renda_composta: booleano(respostas.renda_composta),
    nome_limpo: respostas.nome_limpo ?? null,
    regularizacao_andamento: booleano(respostas.regularizacao_andamento),
    fgts_tempo: respostas.fgts_tempo ?? null,
    fgts_saldo: respostas.fgts_saldo ?? null,
    ja_financiou: booleano(respostas.ja_financiou),
    entrada_disponivel: respostas.entrada_disponivel ?? null,
    prazo_compra: respostas.prazo_compra ?? null,
    nome,
    telefone,

    // Eliminado pelo motor nao entra na fila. O motivo fica gravado: sem ele,
    // "a regra esta matando lead bom?" nao tem resposta -- e lead descartado
    // por engano e dinheiro de anuncio no lixo.
    status: motor.eliminado ? 'descartado' : 'novo',
    motivo_descarte: motor.motivo_descarte,

    pontuacao: motor.pontuacao,
    selo_declarado: motor.selo_declarado,
    poder_de_compra: motor.poder_de_compra,
    regra_versao: motor.regra_versao,

      consentimento_id: consentimento.id,
    })
    .select('id')
    .single()

  if (erroLead || !lead) {
    console.error('[salvarLead] falha ao gravar lead:', erroLead)
    return { erro: 'Não conseguimos registrar seu cadastro. Tente novamente.' }
  }

  // ---------------------------------------------------------------------
  // O id do lead vai num cookie httpOnly, NAO na URL.
  //
  // Com /resultado?lead=<uuid>, o endereco vaza no historico, no Referer de
  // qualquer imagem de terceiro e em qualquer print que a pessoa mande. O
  // cookie e ilegivel para o JavaScript da pagina, e a proxima tela o le no
  // servidor.
  //
  // Uma hora e o bastante para escolher empreendimentos; depois disso, o link
  // morre sozinho. A acao da tela de resultado apaga o cookie ao gravar.
  // ---------------------------------------------------------------------
  const biscoitos = await cookies()
  biscoitos.set('lead_resultado', lead.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60,
  })

  // O MESMO DESFECHO PARA TODO MUNDO. Quem foi eliminado pelo motor segue por
  // este mesmo caminho: o match simplesmente nao vai achar nada para ele (sem
  // capacidade, ou fora da area), e ele cai na pergunta de contato geral e
  // depois na mesma tela de agradecimento. Nenhum tratamento especial, nenhuma
  // pista da decisao -- a pontuacao nunca aparece para o lead.
  redirect('/resultado')
}

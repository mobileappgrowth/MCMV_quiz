'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirCorretor } from '@/lib/auth'
import { contatoDoInteresse, type ContatoRevelado } from '@/lib/contato'
import { reais } from '@/lib/preco'

// ============================================================================
// REVELAR O CONTATO
//
// A acao nao debita nada por conta propria: ela chama revelar_interesse(), a
// funcao do Postgres que faz debito e desbloqueio na MESMA transacao. Se
// qualquer parte falhar, nada e cobrado -- e nao ha estado intermediario para
// a aplicacao limpar depois.
//
// exigirCorretor() na primeira linha. Server Action e endpoint HTTP publico, e
// esta aqui move dinheiro.
// ============================================================================

export type ResultadoRevelacao =
  | { ok: true; contato: ContatoRevelado; saldoNovo: number }
  | { ok: false; erro: string; recarregar?: boolean }

/** Traduz a excecao do Postgres para uma frase que diz o que fazer. */
function traduzir(mensagem: string): { erro: string; recarregar?: boolean } {
  if (mensagem.includes('JA_VENDIDO')) {
    return {
      erro:
        'Outro corretor revelou este contato primeiro. Você não foi cobrado, e ' +
        'o interesse já saiu da sua vitrine.',
    }
  }
  if (mensagem.includes('SALDO_INSUFICIENTE')) {
    const saldo = mensagem.split('SALDO_INSUFICIENTE:')[1]
    return {
      erro: `Saldo insuficiente${saldo ? ` (você tem ${reais(Number(saldo))})` : ''}. Nada foi cobrado.`,
      recarregar: true,
    }
  }
  if (mensagem.includes('PRECO_MUDOU')) {
    const novo = mensagem.split('PRECO_MUDOU:')[1]
    return {
      erro:
        `O preço mudou para ${novo ? reais(Number(novo)) : 'outro valor'} desde que ` +
        'a tela carregou — em geral porque o perfil acabou de ser verificado. ' +
        'Atualize a página e confirme de novo. Nada foi cobrado.',
    }
  }
  if (mensagem.includes('CORRETOR_INATIVO')) {
    return { erro: 'Sua conta está inativa. Fale com o administrador.' }
  }
  if (mensagem.includes('INTERESSE_SEM_PRECO')) {
    return { erro: 'Este interesse ainda não tem preço definido.' }
  }
  if (mensagem.includes('INTERESSE_NAO_ENCONTRADO')) {
    return { erro: 'Este interesse não existe mais.' }
  }
  console.error('[revelar] excecao nao prevista:', mensagem)
  return { erro: 'Não conseguimos concluir. Nada foi cobrado. Tente de novo.' }
}

export async function revelarContato(
  interesseId: string,
  precoVisto: number
): Promise<ResultadoRevelacao> {
  const corretor = await exigirCorretor()

  // O preco que o corretor viu vai junto. A funcao recusa se divergir do banco:
  // cobrar um valor diferente do que estava na tela seria desonesto, mesmo que
  // a diferenca fosse para menos.
  const { error } = await supabaseAdmin().rpc('revelar_interesse', {
    p_interesse_id: interesseId,
    p_corretor_id: corretor.id,
    p_preco_esperado: precoVisto,
  })

  if (error) {
    const t = traduzir(error.message ?? '')
    revalidatePath('/painel')
    return { ok: false, ...t }
  }

  // O desbloqueio existe: so agora o contato pode sair do servidor, e so pelo
  // endpoint dedicado, que confere o desbloqueio de novo.
  const contato = await contatoDoInteresse(interesseId, corretor.id)

  if (!contato) {
    // Cobrado e sem contato e o pior resultado possivel. Nao deveria acontecer
    // -- o desbloqueio acabou de ser criado -- mas se acontecer, a mensagem
    // precisa dizer para procurar ajuda, nao para tentar de novo e pagar duas
    // vezes.
    console.error('[revelar] desbloqueio criado sem contato:', interesseId)
    return {
      ok: false,
      erro:
        'O desbloqueio foi registrado, mas não conseguimos carregar o contato. ' +
        'NÃO tente de novo: o lead já é seu e está na aba Meus leads. Se não ' +
        'aparecer lá, fale com o administrador.',
    }
  }

  const { data: atualizado } = await supabaseAdmin()
    .from('corretores')
    .select('creditos')
    .eq('id', corretor.id)
    .single()

  revalidatePath('/painel')
  revalidatePath('/painel/meus-leads')

  return {
    ok: true,
    contato,
    saldoNovo: Number(atualizado?.creditos ?? 0),
  }
}

// ============================================================================
// FEEDBACK
//
// Tres cliques e um comentario opcional. E o dado que diz se a verificacao esta
// funcionando: depois de 50 leads, cruzar o selo com agendou_visita mostra se
// os pesos do motor estao certos.
// ============================================================================

export type ResultadoFeedback = { ok: true } | { ok: false; erro: string }

export async function salvarFeedback(
  desbloqueioId: string,
  dados: {
    atendeu: boolean | null
    tem_renda: boolean | null
    tem_restricao: boolean | null
    agendou_visita: boolean | null
    comentario: string
  }
): Promise<ResultadoFeedback> {
  const corretor = await exigirCorretor()

  // O desbloqueio e deste corretor? Sem esta checagem, qualquer corretor
  // registraria feedback no lead de outro.
  const { data: desbloqueio } = await supabaseAdmin()
    .from('desbloqueios')
    .select('id')
    .eq('id', desbloqueioId)
    .eq('corretor_id', corretor.id)
    .maybeSingle()

  if (!desbloqueio) return { ok: false, erro: 'Desbloqueio não encontrado.' }

  const { error } = await supabaseAdmin().from('feedbacks').insert({
    desbloqueio_id: desbloqueioId,
    atendeu: dados.atendeu,
    tem_renda: dados.tem_renda,
    tem_restricao: dados.tem_restricao,
    agendou_visita: dados.agendou_visita,
    comentario: dados.comentario.trim() || null,
  })

  if (error) {
    console.error('[salvarFeedback]', error)
    return { ok: false, erro: 'Falha ao salvar o feedback.' }
  }

  revalidatePath('/painel/meus-leads')
  return { ok: true }
}

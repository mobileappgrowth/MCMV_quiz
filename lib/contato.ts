import { supabaseAdmin } from './supabase/admin.ts'

// ============================================================================
// O ENDPOINT DEDICADO DO CONTATO
//
// ESTE E O UNICO CAMINHO pelo qual nome e telefone saem do servidor. Nao e uma
// convencao: nenhuma outra consulta do projeto pede essas colunas, a view da
// vitrine nao as tem, e o teste de vazamento falha se elas aparecerem na
// listagem.
//
// A regra que esta funcao implementa: o contato so sai se existir registro em
// `desbloqueios` ligando AQUELE corretor AQUELE interesse. Nao basta o
// interesse estar vendido -- tem que estar vendido para quem esta perguntando.
// Sem essa segunda metade, um corretor leria o contato comprado por outro.
// ============================================================================

export type ContatoRevelado = {
  nome: string
  telefone: string
  /** Para a mensagem do WhatsApp citar o que a pessoa pediu. */
  empreendimento_nome: string | null
}

/**
 * Devolve o contato, ou null se este corretor nao comprou este interesse.
 *
 * Null em vez de excecao de proposito: "nao comprou" e um caso esperado, nao um
 * erro. Quem chama decide o que mostrar.
 */
export async function contatoDoInteresse(
  interesseId: string,
  corretorId: string
): Promise<ContatoRevelado | null> {
  // 1. Existe desbloqueio deste corretor para este interesse?
  const { data: desbloqueio, error: erroDesbloqueio } = await supabaseAdmin()
    .from('desbloqueios')
    .select('id')
    .eq('interesse_id', interesseId)
    .eq('corretor_id', corretorId)
    .maybeSingle()

  if (erroDesbloqueio) {
    console.error('[contatoDoInteresse] desbloqueio:', erroDesbloqueio)
    return null
  }
  if (!desbloqueio) return null

  // 2. So agora o contato. Colunas explicitas, como em todo lugar.
  const { data, error } = await supabaseAdmin()
    .from('interesses')
    .select('leads(nome, telefone), empreendimentos(nome)')
    .eq('id', interesseId)
    .maybeSingle<{
      leads: { nome: string; telefone: string } | null
      empreendimentos: { nome: string } | null
    }>()

  if (error || !data?.leads) {
    console.error('[contatoDoInteresse] contato:', error)
    return null
  }

  return {
    nome: data.leads.nome,
    telefone: data.leads.telefone,
    empreendimento_nome: data.empreendimentos?.nome ?? null,
  }
}

/** Link do WhatsApp com a mensagem pronta, citando o empreendimento pedido. */
export function linkWhatsApp(c: ContatoRevelado, nomeCorretor: string): string {
  const primeiroNome = c.nome.trim().split(/\s+/)[0]
  const sobre = c.empreendimento_nome
    ? `sobre o ${c.empreendimento_nome}`
    : 'sobre as opções de imóvel que você procura'

  const mensagem =
    `Oi, ${primeiroNome}! Aqui é ${nomeCorretor}. ` +
    `Você pediu contato ${sobre}. Posso te passar as informações?`

  return `https://wa.me/55${c.telefone}?text=${encodeURIComponent(mensagem)}`
}

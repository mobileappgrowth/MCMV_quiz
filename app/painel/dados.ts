// ============================================================================
// DADOS DA VITRINE
//
// Imports relativos (nao '@/...') de proposito: assim o teste de vazamento em
// testes/vazamento-contato.test.ts consegue importar esta funcao com o runner
// nativo do Node, sem precisar resolver path alias nem instalar nada.
// ============================================================================
import { supabaseAdmin } from '../../lib/supabase/admin.ts'
import { DIAS_NA_VITRINE } from '../../lib/config.ts'

// ----------------------------------------------------------------------------
// COLUNAS EXPLICITAS. NUNCA `select *`.
//
// `nome` e `telefone` nao estao nesta lista, e tambem nao existem na view
// `vitrine`. Duas camadas: se alguem acrescentar as colunas a view, esta lista
// ainda nao as pede; se alguem trocar esta lista por '*', a view nao as tem.
//
// Ao adicionar uma coluna aqui, pergunte: o corretor pode ver isso ANTES de
// pagar? Se a resposta for nao, ela nao entra.
// ----------------------------------------------------------------------------
const COLUNAS_VITRINE = [
  'id',
  'criado_em',
  'cidade',
  'bairro',
  'quartos',
  'garagem',
  'enquadramento',
  'renda_faixa',
  'renda_formal',
  'renda_composta',
  'nome_limpo',
  'fgts_tempo',
  'ja_financiou',
  'entrada_disponivel',
  'prazo_compra',
  'preco',
  'verificado_em',
].join(', ')

export type LeadVitrine = {
  id: string
  criado_em: string
  cidade: string
  bairro: string | null
  quartos: number | null
  garagem: boolean | null
  enquadramento: string | null
  renda_faixa: string | null
  renda_formal: boolean | null
  renda_composta: boolean | null
  nome_limpo: string | null
  fgts_tempo: string | null
  ja_financiou: boolean | null
  entrada_disponivel: string | null
  prazo_compra: string | null
  preco: number | null
  verificado_em: string | null
}

export type FiltrosVitrine = {
  cidade?: string
  bairro?: string
  renda_faixa?: string
}

/**
 * Lista os leads disponiveis na vitrine.
 *
 * O que a view `vitrine` ja garante: status verificado e nenhum desbloqueio.
 * O que esta funcao acrescenta: a janela de DIAS_NA_VITRINE e os filtros.
 *
 * O retorno desta funcao e tudo que chega ao navegador do corretor. Se nome ou
 * telefone aparecerem aqui, o produto acabou -- e por isso que o teste de
 * vazamento aponta exatamente para esta funcao.
 */
export async function listarVitrine(
  filtros: FiltrosVitrine = {}
): Promise<LeadVitrine[]> {
  const corte = new Date(
    Date.now() - DIAS_NA_VITRINE * 86_400_000
  ).toISOString()

  let consulta = supabaseAdmin()
    .from('vitrine')
    .select(COLUNAS_VITRINE)
    .gte('criado_em', corte)

  if (filtros.cidade?.trim()) {
    consulta = consulta.ilike('cidade', `%${filtros.cidade.trim()}%`)
  }
  if (filtros.bairro?.trim()) {
    consulta = consulta.ilike('bairro', `%${filtros.bairro.trim()}%`)
  }
  if (filtros.renda_faixa?.trim()) {
    consulta = consulta.eq('renda_faixa', filtros.renda_faixa.trim())
  }

  // Ordenacao e tipagem no fim: .order() e .returns() fecham o builder e
  // tirariam os metodos de filtro usados acima.
  const { data, error } = await consulta
    .order('criado_em', { ascending: false })
    .returns<LeadVitrine[]>()

  if (error) {
    console.error('[listarVitrine] falha na consulta:', error)
    throw new Error('Nao foi possivel carregar a vitrine.')
  }

  return data ?? []
}

/** Cidades presentes na vitrine, para popular o filtro. */
export async function cidadesNaVitrine(): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from('vitrine').select('cidade')
  if (error || !data) return []
  return [...new Set(data.map((l) => l.cidade as string))].sort()
}

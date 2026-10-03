import { MAX_RESULTADOS, MIN_RESULTADOS_DESEJADO } from './config.ts'

// ============================================================================
// MATCH: quais empreendimentos mostrar para esta pessoa
//
// Funcao pura, como o motor. Entra o perfil e o catalogo, sai a lista ordenada.
// Quem busca no banco e a pagina; aqui so se decide.
//
// O CRITERIO PRINCIPAL E O PODER DE COMPRA, calculado pelo motor e gravado no
// lead. Mostrar empreendimento que a pessoa nao pode pagar nao e otimismo, e
// desperdicio dos dois lados: ela marca, o corretor paga pelo interesse, liga,
// e descobre que nao fecha. O preco do erro recai sobre quem comprou.
//
// Cidade e filtro duro: nao atendemos fora da area, e o motor ja descartou
// quem esta fora. Bairro e garagem sao PREFERENCIA, nao filtro -- restringir
// por bairro num catalogo pequeno devolveria lista vazia, e a pessoa prefere
// ver tres opcoes no bairro vizinho a nenhuma.
// ============================================================================

export type EmpreendimentoMatch = {
  id: string
  nome: string | null
  construtora: string | null
  cidade: string | null
  bairro: string | null
  tipologias: string | null
  quartos: number | null
  garagem: boolean | null
  preco_de: number | null
  preco_ate: number | null
  status: string | null
  descricao: string | null
  foto_url: string | null
}

export type PerfilMatch = {
  cidade: string
  bairro: string | null
  quartos: number | null
  garagem: boolean | null
  poder_de_compra: number
}

function normalizar(texto: string | null): string {
  return (texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Cabe no bolso? Sem preco_de cadastrado, nao da para afirmar que cabe. */
function cabeNoBolso(e: EmpreendimentoMatch, poder: number): boolean {
  if (e.preco_de === null) return false
  return Number(e.preco_de) <= poder
}

/**
 * Ordena por quao bem serve, nao por preco.
 *
 * 1. bairro pedido primeiro -- e o que a pessoa escreveu
 * 2. garagem, quando ela pediu
 * 3. entre os que cabem, o de maior preco_de: dentro do que ela pode pagar,
 *    o mais caro tende a ser o melhor produto. Ordenar do mais barato para o
 *    mais caro mostraria primeiro o que ela provavelmente ja descartou.
 */
function pontuarAderencia(e: EmpreendimentoMatch, p: PerfilMatch): number {
  let pontos = 0
  if (p.bairro && normalizar(e.bairro) === normalizar(p.bairro)) pontos += 100
  if (p.garagem === true && e.garagem === true) pontos += 20
  if (p.quartos !== null && e.quartos !== null && e.quartos >= p.quartos) {
    pontos += 10
  }
  return pontos
}

/**
 * Os empreendimentos a mostrar na tela de resultado.
 *
 * O catalogo que chega aqui ja vem filtrado por status_publicacao = publicado:
 * rascunho, em revisao, pausado e arquivado nao entram no match.
 */
export function empreendimentosParaOLead(
  catalogo: EmpreendimentoMatch[],
  perfil: PerfilMatch
): EmpreendimentoMatch[] {
  const naCidade = catalogo.filter(
    (e) => normalizar(e.cidade) === normalizar(perfil.cidade)
  )

  const ordenar = (lista: EmpreendimentoMatch[]) =>
    [...lista].sort((a, b) => {
      const d = pontuarAderencia(b, perfil) - pontuarAderencia(a, perfil)
      if (d !== 0) return d
      return Number(b.preco_de ?? 0) - Number(a.preco_de ?? 0)
    })

  // Passo 1: tudo que serve, inclusive o numero de quartos.
  const estrito = naCidade.filter(
    (e) =>
      cabeNoBolso(e, perfil.poder_de_compra) &&
      (perfil.quartos === null ||
        e.quartos === null ||
        e.quartos >= perfil.quartos)
  )

  if (estrito.length >= MIN_RESULTADOS_DESEJADO) {
    return ordenar(estrito).slice(0, MAX_RESULTADOS)
  }

  // Passo 2: afrouxa os quartos, nunca o preco. Um quarto a menos e uma
  // conversa; uma parcela que nao cabe e um nao da Caixa.
  const semQuartos = naCidade.filter((e) =>
    cabeNoBolso(e, perfil.poder_de_compra)
  )

  return ordenar(semQuartos).slice(0, MAX_RESULTADOS)
}

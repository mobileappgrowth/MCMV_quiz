import {
  CIDADES_ATENDIDAS,
  COMPROMETIMENTO,
  CORTES_SELO,
  ENTRADA_FAIXAS,
  FGTS_SALDO_FAIXAS,
  FGTS_SALDO_RELEVANTE,
  FRACAO_MINIMA_CAPACIDADE,
  MULTIPLICADOR_FAIXA,
  PONTOS,
  PRECO_PRODUTO_POR_CIDADE,
  REGRA_VERSAO,
  RENDA_FAIXAS,
  RENDA_MINIMA,
  RENDA_PISO,
  precoProdutoMaisBarato,
} from './config.ts'

// ============================================================================
// MOTOR DE QUALIFICACAO
//
// Funcao pura. Entra as respostas do quiz, sai a decisao. Sem banco, sem rede,
// sem Date.now(), sem nada que mude entre duas chamadas iguais. Isso e o que
// permite reproduzir a decisao de um lead antigo meses depois, com a versao de
// regra que ele carrega.
//
// NENHUM NUMERO E ESCRITO AQUI DENTRO. Todos vem de lib/config.ts. Se voce
// precisar recalibrar, nao abra este arquivo.
//
// Os seis passos do documento, nesta ordem:
//   1. enquadramento        pela faixa de renda
//   2. capacidade estimada  parcela -> financiavel -> poder de compra
//   3. eliminatorios        antes da pontuacao; qualquer um descarta
//   4. pontuacao            a tabela de pesos
//   5. selo                 pelos cortes
//   6. travas               rebaixam o selo, nunca sobem
//
// REGRA DE PRODUTO: a pontuacao e o poder de compra NUNCA aparecem para o
// lead. O poder de compra tambem nao aparece para o corretor: e triagem, nao
// simulacao, e exibi-lo como valor aprovado seria falso. Aprovacao e da Caixa.
// ============================================================================

export type Selo = 'forte' | 'medio' | 'a_confirmar'

export type RespostasMotor = {
  cidade?: string
  renda_faixa?: string
  vinculo_renda?: string
  renda_composta?: string
  nome_limpo?: string
  fgts_tempo?: string
  fgts_saldo?: string
  ja_financiou?: string
  entrada_disponivel?: string
  prazo_compra?: string
}

export type ResultadoMotor = {
  enquadramento: string | null
  poder_de_compra: number
  /** false quando o preco do produto nao foi configurado para a cidade. */
  capacidade_avaliada: boolean
  eliminado: boolean
  motivo_descarte: string | null
  pontuacao: number
  selo_declarado: Selo
  regra_versao: string
}

/** Minusculas, sem acento. Para comparar cidade digitada a mao. */
function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function pisoDaFaixa(
  faixas: ReadonlyArray<{ valor: string; piso: number }>,
  valor: string | undefined
): number {
  if (!valor) return 0
  return faixas.find((f) => f.valor === valor)?.piso ?? 0
}

// ---------------------------------------------------------------------------
// Passo 1 — Enquadramento
// ---------------------------------------------------------------------------
export function enquadrar(rendaFaixa: string | undefined): string | null {
  if (!rendaFaixa) return null
  return RENDA_FAIXAS.find((f) => f.valor === rendaFaixa)?.enquadramento ?? null
}

// ---------------------------------------------------------------------------
// Passo 2 — Capacidade estimada
// ---------------------------------------------------------------------------
export function poderDeCompra(r: RespostasMotor): number {
  const renda = RENDA_PISO[r.renda_faixa ?? ''] ?? 0
  const parcelaMaxima = renda * COMPROMETIMENTO
  const financiavel = parcelaMaxima * MULTIPLICADOR_FAIXA
  const fgts = pisoDaFaixa(FGTS_SALDO_FAIXAS, r.fgts_saldo)
  const entrada = pisoDaFaixa(ENTRADA_FAIXAS, r.entrada_disponivel)
  return Math.round(financiavel + fgts + entrada)
}

/** Preco do produto na cidade do lead, ou o mais barato da regiao. 0 = nao configurado. */
function precoDoProduto(cidade: string | undefined): number {
  const chave = normalizar(cidade ?? '')
  const daCidade = PRECO_PRODUTO_POR_CIDADE[chave]
  if (daCidade && daCidade > 0) return daCidade
  return precoProdutoMaisBarato()
}

// ---------------------------------------------------------------------------
// Passo 4 — Pontuacao
// ---------------------------------------------------------------------------
function pontuar(
  r: RespostasMotor,
  poder: number,
  precoProduto: number
): number {
  let total = 0

  // Formalidade da renda
  total +=
    PONTOS.vinculo[r.vinculo_renda as keyof typeof PONTOS.vinculo] ?? 0

  // Situacao do nome
  total += PONTOS.nome[r.nome_limpo as keyof typeof PONTOS.nome] ?? 0

  // Capacidade. Sem preco configurado nao da para avaliar: 0 pontos, em vez de
  // 20 de graca. Selo baixo demais faz voce ligar a mais; selo alto demais faz
  // voce vender lead ruim. O primeiro erro e barato, o segundo nao.
  if (precoProduto > 0) {
    const fracao = poder / precoProduto
    if (fracao >= 1) total += PONTOS.capacidade.cheia
    else if (fracao >= 0.85) total += PONTOS.capacidade.de_85_a_100
    else total += PONTOS.capacidade.de_70_a_85
  }

  // FGTS: tempo de regime E saldo
  const fgtsLongo = r.fgts_tempo === 'mais_3_anos'
  const saldo = pisoDaFaixa(FGTS_SALDO_FAIXAS, r.fgts_saldo)
  if (fgtsLongo && saldo >= FGTS_SALDO_RELEVANTE) {
    total += PONTOS.fgts.tres_anos_com_saldo
  } else if (fgtsLongo) {
    total += PONTOS.fgts.tres_anos_sem_saldo
  } else {
    total += PONTOS.fgts.curto
  }

  if (r.renda_composta === 'sim') total += PONTOS.renda_composta
  if (r.ja_financiou === 'nao') total += PONTOS.nunca_financiou

  if (r.prazo_compra === 'imediato' || r.prazo_compra === 'ate_3_meses') {
    total += PONTOS.prazo.ate_3_meses
  } else if (r.prazo_compra === 'ate_6_meses') {
    total += PONTOS.prazo.de_3_a_6_meses
  } else {
    total += PONTOS.prazo.acima_de_6_meses
  }

  return total
}

// ---------------------------------------------------------------------------
// Passo 5 — Selo
// ---------------------------------------------------------------------------
function seloPorPontos(pontos: number): Selo {
  if (pontos >= CORTES_SELO.forte) return 'forte'
  if (pontos >= CORTES_SELO.medio) return 'medio'
  return 'a_confirmar'
}

// ---------------------------------------------------------------------------
// Passo 6 — Travas
//
// Sempre rebaixam, nunca sobem. Duas ou mais derrubam direto para a_confirmar,
// qualquer que seja a pontuacao: tres sinais fracos juntos nao viram um forte.
// ---------------------------------------------------------------------------
function aplicarTravas(selo: Selo, r: RespostasMotor): Selo {
  const travas = [
    r.nome_limpo === 'nao', // restricao declarada
    r.vinculo_renda === 'informal', // renda sem comprovacao
    r.ja_financiou === 'sim', // ja usou o programa
  ].filter(Boolean).length

  if (travas >= 2) return 'a_confirmar'
  if (travas === 1 && selo === 'forte') return 'medio'
  return selo
}

// ---------------------------------------------------------------------------
// A funcao publica
// ---------------------------------------------------------------------------
export function qualificar(r: RespostasMotor): ResultadoMotor {
  const enquadramento = enquadrar(r.renda_faixa)
  const poder = poderDeCompra(r)
  const precoProduto = precoDoProduto(r.cidade)
  const capacidadeAvaliada = precoProduto > 0

  // --- Passo 3: eliminatorios, antes da pontuacao ---
  // Ordem deliberada: do mais barato de checar para o mais caro de explicar.
  let motivo: string | null = null

  if (!CIDADES_ATENDIDAS.includes(normalizar(r.cidade ?? '') as never)) {
    motivo = 'cidade_fora_da_area'
  } else if ((RENDA_PISO[r.renda_faixa ?? ''] ?? 0) < RENDA_MINIMA) {
    motivo = 'renda_abaixo_do_minimo'
  } else if (
    capacidadeAvaliada &&
    poder < precoProduto * FRACAO_MINIMA_CAPACIDADE
  ) {
    motivo = 'capacidade_abaixo_do_minimo'
  }

  if (motivo) {
    return {
      enquadramento,
      poder_de_compra: poder,
      capacidade_avaliada: capacidadeAvaliada,
      eliminado: true,
      motivo_descarte: motivo,
      // Pontua mesmo assim: se um dia a regra se mostrar errada, da para ver
      // quanto valia o lead que ela matou.
      pontuacao: pontuar(r, poder, precoProduto),
      selo_declarado: 'a_confirmar',
      regra_versao: REGRA_VERSAO,
    }
  }

  const pontuacao = pontuar(r, poder, precoProduto)
  const selo = aplicarTravas(seloPorPontos(pontuacao), r)

  return {
    enquadramento,
    poder_de_compra: poder,
    capacidade_avaliada: capacidadeAvaliada,
    eliminado: false,
    motivo_descarte: null,
    pontuacao,
    selo_declarado: selo,
    regra_versao: REGRA_VERSAO,
  }
}

/** Rotulo do selo para exibicao. Nunca mostrado ao lead. */
export function rotuloSelo(selo: Selo | string | null): string {
  if (selo === 'forte') return 'Forte'
  if (selo === 'medio') return 'Médio'
  if (selo === 'a_confirmar') return 'A confirmar'
  return '-'
}

/** Rotulo do motivo de descarte, para os contadores do admin. */
export function rotuloMotivo(motivo: string | null): string {
  switch (motivo) {
    case 'cidade_fora_da_area':
      return 'Cidade fora da área de atuação'
    case 'renda_abaixo_do_minimo':
      return 'Renda abaixo do mínimo'
    case 'capacidade_abaixo_do_minimo':
      return 'Poder de compra abaixo do corte'
    default:
      return motivo ?? 'Sem motivo registrado'
  }
}

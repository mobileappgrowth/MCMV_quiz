// ============================================================================
// CONFIGURACAO DE NEGOCIO
// Este e o unico arquivo que voce precisa editar para mudar preco, prazo ou
// o texto do consentimento. Mexer aqui NAO exige entender o resto do codigo.
// Alterar valores exige commit + redeploy na Vercel (leva ~1 minuto).
// ============================================================================

// --- PRECO ---------------------------------------------------------------
// O preco e gravado em leads.preco no momento em que voce aprova o lead no
// admin, nao calculado na hora de exibir. Mudar estes valores afeta apenas
// leads aprovados DEPOIS da mudanca. Leads ja na vitrine mantem o preco antigo.
export const PRECOS = {
  verificado_fresco: 70, // verificado, captado ha menos de HORAS_FRESCO
  verificado_antigo: 45, // verificado, captado ha HORAS_FRESCO ou mais
  nao_verificado: 30, // reservado: hoje nenhum lead entra na vitrine sem verificacao
} as const

// Fronteira entre "fresco" e "antigo", em horas desde leads.criado_em.
export const HORAS_FRESCO = 72

// Depois de quantos dias desde a captacao o lead sai da vitrine.
export const DIAS_NA_VITRINE = 10

// --- FAIXA DE RENDA E ENQUADRAMENTO MCMV ---------------------------------
// As faixas do programa mudam por decreto. Ajuste os rotulos aqui e o
// enquadramento passa a ser derivado da nova regra automaticamente.
// A ordem desta lista e a ordem dos botoes na pergunta 5 do quiz.
export const RENDA_FAIXAS = [
  { valor: 'ate_2850', rotulo: 'Ate R$ 2.850', enquadramento: 'mcmv_faixa1' },
  { valor: '2851_4700', rotulo: 'R$ 2.851 a R$ 4.700', enquadramento: 'mcmv_faixa2' },
  { valor: '4701_8600', rotulo: 'R$ 4.701 a R$ 8.600', enquadramento: 'mcmv_faixa3' },
  { valor: 'acima_8600', rotulo: 'Acima de R$ 8.600', enquadramento: 'fora_mcmv' },
] as const

// --- CONSENTIMENTO -------------------------------------------------------
// Ao mudar o texto, INCREMENTE a versao. Nunca reescreva um texto mantendo a
// mesma versao: e exatamente isso que permite provar depois qual redacao cada
// pessoa aceitou. Versoes antigas continuam registradas em consentimentos.
export const CONSENTIMENTO = {
  versao: 'v1',
  texto:
    'Os dados serao compartilhados com corretores e imobiliarias parceiras da ' +
    'regiao para apresentacao de imoveis, e podem ser removidos a qualquer ' +
    'momento por solicitacao.',
} as const

// --- RECARGA DE CREDITO (PIX manual) -------------------------------------
// Mostrado ao corretor no botao de recarga. Preencha antes do Dia 3.
export const PIX = {
  chave: 'PREENCHER',
  nome_favorecido: 'PREENCHER',
  whatsapp_suporte: 'PREENCHER', // formato: 5511999999999
} as const

// ============================================================================
// MOTOR DE QUALIFICACAO
//
// Todos os parametros do motor vivem aqui. lib/motor.ts nao tem numero nenhum
// escrito dentro: ele le tudo deste arquivo. Recalibrar e mexer aqui.
// ============================================================================

// Gravada em cada lead. INCREMENTE ao mudar qualquer peso ou corte abaixo --
// e o que mantem os leads antigos explicaveis depois da recalibracao.
export const REGRA_VERSAO = 'v1'

// --- Area de atuacao -----------------------------------------------------
// Comparacao sem acento e sem maiuscula. Cidade fora daqui e eliminatorio.
export const CIDADES_ATENDIDAS = ['contagem', 'betim'] as const

// --- PRECO TIPICO DO PRODUTO POR CIDADE ----------------------------------
//
//   >>> PREENCHER ANTES DE SUBIR <<<
//
// E o valor do imovel de entrada que voce realmente vende em cada cidade. Esse
// numero decide o eliminatorio dos 70% e a pontuacao de capacidade -- ou seja,
// quem entra na sua fila e quem nao entra.
//
// Nao inventei valores. Com 0, o motor trata a capacidade como NAO AVALIADA:
// nao elimina ninguem e nao da ponto nenhum de capacidade. Falha para o lado
// seguro nas duas pontas, e o /admin avisa em vermelho enquanto estiver assim.
export const PRECO_PRODUTO_POR_CIDADE: Record<string, number> = {
  contagem: 0, // PREENCHER
  betim: 0, // PREENCHER
}

// --- Passo 2: capacidade estimada ----------------------------------------
// parcela_maxima  = renda x COMPROMETIMENTO
// financiavel     = parcela_maxima x MULTIPLICADOR_FAIXA
// poder_de_compra = financiavel + fgts_saldo + entrada
//
// O multiplicador aproxima SAC em 360 meses: cada R$ 1 de parcela inicial
// sustenta de R$ 110 a R$ 145 de financiamento, conforme a taxa da faixa.
// ISSO E TRIAGEM, NAO SIMULACAO. O numero nunca aparece em tela nenhuma.
export const COMPROMETIMENTO = 0.28
export const MULTIPLICADOR_FAIXA = 120

// --- Passo 3: eliminatorios ----------------------------------------------
// Renda familiar minima aceita. Valor de partida -- confira o salario minimo
// vigente e ajuste.
export const RENDA_MINIMA = 1500

// Poder de compra abaixo desta fracao do produto mais barato da regiao elimina.
export const FRACAO_MINIMA_CAPACIDADE = 0.7

// --- Passo 4: pontuacao ---------------------------------------------------
export const PONTOS = {
  vinculo: {
    clt_servidor_aposentado: 30,
    mei_autonomo_comprovado: 15,
    informal: 0,
  },
  nome: { sim: 25, nao_sei: 10, nao: 0 },
  // Capacidade, como fracao do preco do produto:
  capacidade: { cheia: 20, de_85_a_100: 10, de_70_a_85: 0 },
  fgts: { tres_anos_com_saldo: 10, tres_anos_sem_saldo: 5, curto: 0 },
  renda_composta: 5,
  nunca_financiou: 5,
  prazo: { ate_3_meses: 5, de_3_a_6_meses: 3, acima_de_6_meses: 0 },
} as const

// Saldo de FGTS que separa "com saldo" de "sem saldo" na pontuacao.
export const FGTS_SALDO_RELEVANTE = 5000

// --- Passo 5: cortes do selo ---------------------------------------------
export const CORTES_SELO = { forte: 70, medio: 45 } as const

// --- Conversao de faixa para numero --------------------------------------
// As faixas viram o PISO, nao o meio. Superestimar capacidade empurra lead
// fraco para a fila e faz voce gastar ligacao com quem nao fecha. O piso erra
// para o lado barato.
//
// A primeira faixa de renda e aberta embaixo, entao seu piso e RENDA_MINIMA:
// abaixo disso o lead ja foi eliminado.
export const RENDA_PISO: Record<string, number> = {
  ate_2850: RENDA_MINIMA,
  '2851_4700': 2851,
  '4701_8600': 4701,
  acima_8600: 8601,
}

export const ENTRADA_FAIXAS = [
  { valor: 'nada', rotulo: 'Nao tenho entrada', piso: 0 },
  { valor: 'ate_5k', rotulo: 'Até R$ 5 mil', piso: 0 },
  { valor: '5k_15k', rotulo: 'R$ 5 mil a R$ 15 mil', piso: 5000 },
  { valor: '15k_30k', rotulo: 'R$ 15 mil a R$ 30 mil', piso: 15000 },
  { valor: 'acima_30k', rotulo: 'Mais de R$ 30 mil', piso: 30000 },
] as const

export const FGTS_SALDO_FAIXAS = [
  { valor: 'nao_tenho', rotulo: 'Nao tenho FGTS', piso: 0 },
  { valor: 'ate_5k', rotulo: 'Até R$ 5 mil', piso: 0 },
  { valor: '5k_15k', rotulo: 'R$ 5 mil a R$ 15 mil', piso: 5000 },
  { valor: '15k_30k', rotulo: 'R$ 15 mil a R$ 30 mil', piso: 15000 },
  { valor: 'acima_30k', rotulo: 'Mais de R$ 30 mil', piso: 30000 },
] as const

export const VINCULO_RENDA_FAIXAS = [
  {
    valor: 'clt_servidor_aposentado',
    rotulo: 'Carteira assinada, servidor publico ou aposentado',
  },
  {
    valor: 'mei_autonomo_comprovado',
    rotulo: 'MEI ou autonomo ha mais de 6 meses',
  },
  { valor: 'informal', rotulo: 'Informal, sem comprovacao' },
] as const

/** O produto mais barato da regiao. 0 quando nenhuma cidade foi configurada. */
export function precoProdutoMaisBarato(): number {
  const precos = Object.values(PRECO_PRODUTO_POR_CIDADE).filter((p) => p > 0)
  return precos.length > 0 ? Math.min(...precos) : 0
}

/** Avisa se o motor esta rodando sem o preco do produto. Usado no /admin. */
export function precosConfigurados(): boolean {
  return precoProdutoMaisBarato() > 0
}

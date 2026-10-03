// ============================================================================
// CONFIGURACAO DE NEGOCIO
// Este e o unico arquivo que voce precisa editar para mudar preco, prazo ou
// o texto do consentimento. Mexer aqui NAO exige entender o resto do codigo.
// Alterar valores exige commit + redeploy na Vercel (leva ~1 minuto).
// ============================================================================

// --- PRECO DO INTERESSE ---------------------------------------------------
// O que se vende e o INTERESSE, nao o lead. Uma pessoa que marca quatro
// empreendimentos gera quatro unidades de venda.
//
// O preco e gravado em interesses.preco: na criacao (perfil declarado) e
// recalculado quando voce verifica o lead (perfil verificado). Nao e calculado
// na hora de exibir -- o corretor que abriu a vitrine as 11h e clicou as 11h05
// nao pode ver o preco mudar embaixo dele. Preco gravado e preco combinado.
export const PRECOS = {
  // Interesse em um empreendimento especifico: a pessoa disse o que quer.
  empreendimento: {
    verificado_fresco: 90, // verificado, captado ha menos de HORAS_FRESCO
    verificado_antigo: 60, // verificado, captado ha HORAS_FRESCO ou mais
    nao_verificado: 30, // perfil so declarado, ainda sem a sua ligacao
  },
  // Vitrine geral: nao marcou nenhum empreendimento, mas aceitou contato.
  // Vale menos porque o corretor nao sabe o que oferecer.
  geral: {
    verificado: 60,
    nao_verificado: 25,
  },
} as const

// Multiplicador sobre o valor da linha, conforme o selo. Rebaixa ou premia.
export const MULTIPLICADOR_SELO = {
  forte: 1.3,
  medio: 1.0,
  a_confirmar: 0.7,
} as const

// Fronteira entre "fresco" e "antigo", em horas desde leads.criado_em.
export const HORAS_FRESCO = 72

// Depois de quantos dias desde a captacao o interesse sai da vitrine.
export const DIAS_NA_VITRINE = 10

// --- EMPREENDIMENTOS -----------------------------------------------------
// Pausar um empreendimento nao apaga nada: os interesses ja criados ficam na
// vitrine por este tempo, com etiqueta de que ele saiu do ar, e depois somem.
// Arquivar retira na hora -- isso e regra estrutural e mora na view.
export const HORAS_CARENCIA_PAUSADO = 72

// QUEM VE OS INTERESSES DOS EMPREENDIMENTOS SEM DONO (cadastrados por voce).
//
// false (atual): o corretor ve so os interesses dos empreendimentos DELE, mais
// a vitrine geral. E a leitura literal da especificacao. Consequencia assumida:
// os interesses gerados pelo seu catalogo nao aparecem para corretor nenhum --
// o catalogo vira dispositivo de captacao, e a receita sai da vitrine geral e
// do estoque que os corretores cadastrarem.
//
// true: empreendimento sem dono fica visivel para todos os corretores, e o seu
// catalogo passa a gerar receita direta.
//
// Mudar aqui e a unica coisa necessaria para trocar de modelo.
export const INTERESSES_SEM_DONO_VISIVEIS_PARA_TODOS = false

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

// --- EMPREENDIMENTOS: validacao de preco ---------------------------------
// Teto de preco do imovel que ainda se enquadra no MCMV. Usado para AVISAR no
// formulario quando a faixa cadastrada passa do teto -- nunca para bloquear:
// um empreendimento acima do teto pode ser cadastrado de proposito, para o
// publico fora_mcmv.
//
// Zero desliga o aviso. Nao inventei o valor: ele muda por decreto.
export const TETO_PRECO_MCMV = 0 // PREENCHER

// Campos sem os quais um empreendimento nao pode ser publicado. Rascunho
// salva incompleto; publicar exige o conjunto.
export const CAMPOS_OBRIGATORIOS_PARA_PUBLICAR = [
  'nome',
  'construtora',
  'cidade',
  'bairro',
  'quartos',
  'preco_de',
  'fonte_material',
] as const

// --- TELA DE RESULTADO ----------------------------------------------------
// Quantos empreendimentos mostrar. A especificacao pede de 3 a 8: o maximo e
// teto duro, o minimo e alvo -- se o catalogo so tem dois publicados que
// servem, mostramos dois. Inventar opcao que a pessoa nao pode pagar seria
// pior que mostrar pouco.
export const MAX_RESULTADOS = 8
export const MIN_RESULTADOS_DESEJADO = 3

// --- CONSENTIMENTO DA MARCACAO -------------------------------------------
// Marcar um empreendimento e um ato de consentimento proprio, mais especifico
// que o do fim do quiz: ali a pessoa aceitou ser contatada, aqui ela escolhe
// POR QUEM. Por isso `interesses` tem consentimento_id proprio, e nao o do
// lead -- e o que permite provar depois quais empreendimentos cada pessoa
// escolheu, e quando.
//
// Mesma regra de sempre: ao mudar o texto, INCREMENTE a versao.
export const CONSENTIMENTO_INTERESSES = {
  versao: 'interesses_v1',
  texto:
    'Quero receber contato de corretores e imobiliarias sobre os ' +
    'empreendimentos que marquei, e posso pedir a remocao dos meus dados a ' +
    'qualquer momento.',
} as const

// Texto do consentimento da vitrine geral, para quem nao marcou nenhum.
export const CONSENTIMENTO_CONTATO_GERAL = {
  versao: 'contato_geral_v1',
  texto:
    'Quero que um corretor da regiao entre em contato comigo com outras ' +
    'opcoes, e posso pedir a remocao dos meus dados a qualquer momento.',
} as const

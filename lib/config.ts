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

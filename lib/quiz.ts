import { RENDA_FAIXAS } from './config'

// ============================================================================
// DEFINICAO DO QUIZ
//
// A ordem e deliberada: perguntas faceis primeiro (cidade, quartos, garagem),
// sensiveis no fim (renda, situacao do nome, entrada), contato por ultimo --
// quando a pessoa ja investiu atencao e a chance de abandono e menor.
//
// Os 10 passos abaixo sao de botao unico (um toque avanca). A primeira tela
// (cidade/bairro) e a ultima (contato) precisam de teclado e sao escritas a
// mao no componente.
// ============================================================================

export type PassoOpcoes = {
  campo: string
  pergunta: string
  ajuda?: string
  opcoes: { valor: string; rotulo: string }[]
}

export const PASSOS_OPCOES: PassoOpcoes[] = [
  {
    campo: 'quartos',
    pergunta: 'Quantos quartos voce precisa?',
    opcoes: [
      { valor: '1', rotulo: '1 quarto' },
      { valor: '2', rotulo: '2 quartos' },
      { valor: '3', rotulo: '3 quartos ou mais' },
    ],
  },
  {
    campo: 'garagem',
    pergunta: 'Precisa de garagem?',
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, preciso' },
      { valor: 'nao', rotulo: 'Nao e necessario' },
    ],
  },
  {
    campo: 'prazo_compra',
    pergunta: 'Quando pretende comprar?',
    opcoes: [
      { valor: 'imediato', rotulo: 'O quanto antes' },
      { valor: 'ate_3_meses', rotulo: 'Nos proximos 3 meses' },
      { valor: 'ate_6_meses', rotulo: 'Em até 6 meses' },
      { valor: 'ate_1_ano', rotulo: 'Em até 1 ano' },
      { valor: 'pesquisando', rotulo: 'So pesquisando por enquanto' },
    ],
  },
  {
    campo: 'renda_faixa',
    pergunta: 'Qual a renda da familia por mes?',
    ajuda: 'Somando todos que vao entrar no financiamento.',
    opcoes: RENDA_FAIXAS.map((f) => ({ valor: f.valor, rotulo: f.rotulo })),
  },
  {
    campo: 'renda_formal',
    pergunta: 'Essa renda e de carteira assinada?',
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, carteira assinada' },
      { valor: 'nao', rotulo: 'Autonomo ou informal' },
    ],
  },
  {
    campo: 'renda_composta',
    pergunta: 'Vai compor renda com outra pessoa?',
    ajuda: 'Conjuge, pai, mae, irmao.',
    opcoes: [
      { valor: 'sim', rotulo: 'Sim' },
      { valor: 'nao', rotulo: 'Nao, so a minha renda' },
    ],
  },
  {
    campo: 'nome_limpo',
    pergunta: 'Como esta o seu nome hoje?',
    opcoes: [
      { valor: 'sim', rotulo: 'Limpo' },
      { valor: 'nao', rotulo: 'Com restricao' },
      { valor: 'nao_sei', rotulo: 'Nao sei' },
    ],
  },
  {
    campo: 'fgts_tempo',
    pergunta: 'Quanto tempo de FGTS voce tem?',
    ajuda: 'Tempo somado de carteira assinada.',
    opcoes: [
      { valor: 'nao_tenho', rotulo: 'Nao tenho FGTS' },
      { valor: 'menos_1_ano', rotulo: 'Menos de 1 ano' },
      { valor: '1_a_3_anos', rotulo: 'Entre 1 e 3 anos' },
      { valor: 'mais_3_anos', rotulo: 'Mais de 3 anos' },
    ],
  },
  {
    campo: 'ja_financiou',
    pergunta: 'Ja financiou um imovel antes?',
    opcoes: [
      { valor: 'nao', rotulo: 'Nao, seria o primeiro' },
      { valor: 'sim', rotulo: 'Sim, ja financiei' },
    ],
  },
  {
    campo: 'entrada_disponivel',
    pergunta: 'Quanto tem de entrada?',
    ajuda: 'Dinheiro guardado, sem contar o FGTS.',
    opcoes: [
      { valor: 'nada', rotulo: 'Nao tenho entrada' },
      { valor: 'ate_5k', rotulo: 'Até R$ 5 mil' },
      { valor: '5k_15k', rotulo: 'R$ 5 mil a R$ 15 mil' },
      { valor: '15k_30k', rotulo: 'R$ 15 mil a R$ 30 mil' },
      { valor: 'acima_30k', rotulo: 'Mais de R$ 30 mil' },
    ],
  },
]

// 1 tela de cidade/bairro + 10 de opcoes + 1 de contato.
export const TOTAL_PASSOS = PASSOS_OPCOES.length + 2

/** Deriva o enquadramento MCMV da faixa de renda. Regra em lib/config.ts. */
export function enquadramentoDaRenda(rendaFaixa: string): string | null {
  return RENDA_FAIXAS.find((f) => f.valor === rendaFaixa)?.enquadramento ?? null
}

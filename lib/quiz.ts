import {
  ENTRADA_FAIXAS,
  FGTS_SALDO_FAIXAS,
  RENDA_FAIXAS,
  VINCULO_RENDA_FAIXAS,
} from './config'

// ============================================================================
// DEFINICAO DO QUIZ
//
// A ordem e deliberada: perguntas faceis primeiro (cidade, quartos, garagem),
// sensiveis no fim (renda, situacao do nome, entrada), contato por ultimo --
// quando a pessoa ja investiu atencao e a chance de abandono e menor.
//
// Os passos abaixo sao de botao unico. A primeira tela (cidade/bairro) e a
// ultima (contato) precisam de teclado e sao escritas a mao no componente.
//
// RAMIFICACAO: alguns passos so aparecem para certas respostas, via `visivelSe`.
// A regra mora ao lado da pergunta de proposito -- espalhar isso por um estado
// separado e como se perde o controle de um quiz.
// ============================================================================

export type PassoOpcoes = {
  campo: string
  /** Rotulo pequeno acima da pergunta. Agrupa as telas em blocos ("Sua renda",
   *  "Seu FGTS") para a pessoa sentir que o assunto avanca, nao que as
   *  perguntas nao acabam. */
  tema: string
  pergunta: string
  ajuda?: string
  /** `curto` e usado no cartao da vitrine, onde o rotulo inteiro nao cabe. */
  opcoes: { valor: string; rotulo: string; curto?: string }[]
  /**
   * Resposta -> linha tranquilizadora. Quando a resposta escolhida tem nota, a
   * tela NAO avanca sozinha: mostra a nota e um botao de continuar. E o unico
   * lugar onde quebro o padrao de um toque por tela, e e de proposito -- a
   * pessoa acabou de admitir algo que ela teme que a desqualifique.
   */
  notas?: Record<string, string>
  /** Sem isto, o passo sempre aparece. */
  visivelSe?: (respostas: Record<string, string>) => boolean
}

/** Renda acima do teto do programa: segue por um caminho curto. */
function dentroDoPrograma(r: Record<string, string>): boolean {
  return r.renda_faixa !== 'acima_8600'
}

export const PASSOS_OPCOES: PassoOpcoes[] = [
  {
    campo: 'quartos',
    tema: 'O imóvel',
    pergunta: 'Quantos quartos você precisa?',
    opcoes: [
      { valor: '1', rotulo: '1 quarto' },
      { valor: '2', rotulo: '2 quartos' },
      { valor: '3', rotulo: '3 quartos ou mais' },
    ],
  },
  {
    campo: 'garagem',
    tema: 'O imóvel',
    pergunta: 'Precisa de garagem?',
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, preciso' },
      { valor: 'nao', rotulo: 'Não é necessário' },
    ],
  },
  {
    campo: 'prazo_compra',
    tema: 'Seu prazo',
    pergunta: 'Quando pretende comprar?',
    opcoes: [
      { valor: 'imediato', rotulo: 'O quanto antes', curto: 'O quanto antes' },
      { valor: 'ate_3_meses', rotulo: 'Nos próximos 3 meses', curto: 'Até 3 meses' },
      { valor: 'ate_6_meses', rotulo: 'Em até 6 meses', curto: 'Até 6 meses' },
      { valor: 'ate_1_ano', rotulo: 'Em até 1 ano', curto: 'Até 1 ano' },
      { valor: 'pesquisando', rotulo: 'Só pesquisando por enquanto', curto: 'Pesquisando' },
    ],
  },
  {
    campo: 'renda_faixa',
    tema: 'Sua renda',
    pergunta: 'Qual a renda da família por mês?',
    ajuda: 'Somando todos que vão entrar no financiamento.',
    opcoes: RENDA_FAIXAS.map((f) => ({ valor: f.valor, rotulo: f.rotulo })),
  },
  {
    campo: 'vinculo_renda',
    tema: 'Sua renda',
    pergunta: 'Como é essa renda?',
    opcoes: VINCULO_RENDA_FAIXAS.map((f) => ({
      valor: f.valor,
      rotulo: f.rotulo,
    })),
  },
  {
    campo: 'renda_composta',
    tema: 'Sua renda',
    pergunta: 'Vai compor renda com outra pessoa?',
    ajuda: 'Cônjuge, pai, mãe, irmão.',
    visivelSe: dentroDoPrograma,
    opcoes: [
      { valor: 'sim', rotulo: 'Sim' },
      { valor: 'nao', rotulo: 'Não, só a minha renda' },
    ],
  },
  {
    campo: 'nome_limpo',
    tema: 'Seu crédito',
    pergunta: 'Como está o seu nome hoje?',
    opcoes: [
      { valor: 'sim', rotulo: 'Limpo' },
      { valor: 'nao', rotulo: 'Com restrição' },
      { valor: 'nao_sei', rotulo: 'Não sei' },
    ],
    notas: {
      nao_sei:
        'Tudo bem não saber. Isso não impede o atendimento — a gente confere ' +
        'junto com você na hora da conversa.',
    },
  },
  {
    campo: 'regularizacao_andamento',
    tema: 'Seu crédito',
    pergunta: 'Você já está regularizando essa pendência?',
    ajuda: 'Acordo em andamento, parcelamento, ou já quitado esperando baixa.',
    // So para quem declarou restricao. Perguntar isso a quem disse "limpo"
    // seria constrangedor e inutil.
    visivelSe: (r) => r.nome_limpo === 'nao',
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, já estou resolvendo' },
      { valor: 'nao', rotulo: 'Ainda não' },
    ],
  },
  {
    campo: 'fgts_tempo',
    tema: 'Seu FGTS',
    pergunta: 'Quanto tempo de FGTS você tem?',
    ajuda: 'Tempo somado de carteira assinada.',
    visivelSe: dentroDoPrograma,
    opcoes: [
      { valor: 'nao_tenho', rotulo: 'Não tenho FGTS' },
      { valor: 'menos_1_ano', rotulo: 'Menos de 1 ano' },
      { valor: '1_a_3_anos', rotulo: 'Entre 1 e 3 anos' },
      { valor: 'mais_3_anos', rotulo: 'Mais de 3 anos' },
    ],
  },
  {
    campo: 'fgts_saldo',
    tema: 'Seu FGTS',
    pergunta: 'E quanto tem de saldo no FGTS?',
    ajuda: 'Dá para ver no aplicativo do FGTS. Um valor aproximado já ajuda.',
    // Nao faz sentido perguntar saldo a quem acabou de dizer que nao tem FGTS.
    visivelSe: (r) => dentroDoPrograma(r) && r.fgts_tempo !== 'nao_tenho',
    opcoes: FGTS_SALDO_FAIXAS.map((f) => ({
      valor: f.valor,
      rotulo: f.rotulo,
    })),
  },
  {
    campo: 'ja_financiou',
    tema: 'Seu histórico',
    pergunta: 'Já financiou um imóvel antes?',
    opcoes: [
      { valor: 'nao', rotulo: 'Não, seria o primeiro' },
      { valor: 'sim', rotulo: 'Sim, já financiei' },
    ],
  },
  {
    campo: 'entrada_disponivel',
    tema: 'Sua entrada',
    pergunta: 'Quanto tem de entrada?',
    ajuda: 'Dinheiro guardado, sem contar o FGTS.',
    opcoes: ENTRADA_FAIXAS.map((f) => ({ valor: f.valor, rotulo: f.rotulo })),
  },
]

/**
 * Os passos que valem para estas respostas. A barra de progresso usa o tamanho
 * desta lista, entao quem segue o caminho curto ve a barra andar mais rapido --
 * nao uma barra que encolhe.
 */
export function passosVisiveis(
  respostas: Record<string, string>
): PassoOpcoes[] {
  return PASSOS_OPCOES.filter((p) => !p.visivelSe || p.visivelSe(respostas))
}

/** 1 tela de cidade/bairro + os passos visiveis + 1 de contato. */
export function totalPassos(respostas: Record<string, string>): number {
  return passosVisiveis(respostas).length + 2
}

/**
 * Traduz o valor gravado no banco para o rotulo legivel.
 * Usado nos cartoes da vitrine e na fila de verificacao.
 * Valor desconhecido volta como esta: prefiro ver o codigo cru na tela a
 * esconder que o dado mudou de formato.
 */
export function rotuloDe(campo: string, valor: string | null): string {
  if (valor === null) return '-'
  const passo = PASSOS_OPCOES.find((p) => p.campo === campo)
  return passo?.opcoes.find((o) => o.valor === valor)?.rotulo ?? valor
}

/**
 * Como rotuloDe, mas prefere a forma curta quando existe. E o que o cartao da
 * vitrine usa: "Ate 3 meses" cabe numa celula de grade, "Nos proximos 3 meses"
 * vira tres linhas e estica o cartao inteiro.
 */
export function rotuloCurto(campo: string, valor: string | null): string {
  if (valor === null) return '-'
  const passo = PASSOS_OPCOES.find((p) => p.campo === campo)
  const opcao = passo?.opcoes.find((o) => o.valor === valor)
  return opcao?.curto ?? opcao?.rotulo ?? valor
}

/** Rotulo para colunas booleanas, ja traduzidas pelo banco. */
export function rotuloBooleano(
  valor: boolean | null,
  seSim: string,
  seNao: string
): string {
  if (valor === null) return '-'
  return valor ? seSim : seNao
}

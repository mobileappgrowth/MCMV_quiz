import {
  HORAS_FRESCO,
  MULTIPLICADOR_SELO,
  PRECOS,
} from './config.ts'
import type { Selo } from './motor.ts'

// ============================================================================
// PRECO DO INTERESSE E IDADE
//
// O que se vende e o interesse, nao o lead. Uma pessoa que marcou quatro
// empreendimentos gera quatro precos independentes.
//
// O preco e calculado em DOIS momentos e gravado em interesses.preco:
//
//   1. quando o interesse nasce       -> faixa de perfil declarado
//   2. quando eu verifico o lead      -> faixa de perfil verificado
//
// Entre um e outro ele nao muda. O corretor que abriu a vitrine as 11h e
// clicou as 11h05 nao pode ver o preco mudar embaixo dele porque o lead cruzou
// a marca de 72h nesse meio tempo. Preco gravado e preco combinado.
//
// O corretor PODE ver o preco subir se eu verificar o lead nesse intervalo --
// e isso e correto: o que ele compra depois da verificacao e outro produto.
// ============================================================================

export type ContextoPreco = {
  /** false = vitrine geral, de quem nao marcou nenhum empreendimento. */
  temEmpreendimento: boolean
  /** Ja passei o telefone nessa pessoa? */
  verificado: boolean
  /** Captacao do lead, para a fronteira de 72h. */
  criadoEm: string
  /** O selo que vale agora: o verificado, se existir; senao o declarado. */
  selo: Selo | string | null
}

/** Multiplicador do selo. Selo desconhecido ou ausente nao mexe no preco. */
function multiplicador(selo: Selo | string | null): number {
  if (selo && selo in MULTIPLICADOR_SELO) {
    return MULTIPLICADOR_SELO[selo as Selo]
  }
  return 1
}

/**
 * Preco a gravar em interesses.preco. Valores e multiplicadores em
 * lib/config.ts -- nao ha numero escrito aqui.
 */
export function precoDoInteresse(ctx: ContextoPreco): number {
  let base: number

  if (ctx.temEmpreendimento) {
    if (!ctx.verificado) {
      base = PRECOS.empreendimento.nao_verificado
    } else {
      const horas = (Date.now() - new Date(ctx.criadoEm).getTime()) / 3_600_000
      base =
        horas < HORAS_FRESCO
          ? PRECOS.empreendimento.verificado_fresco
          : PRECOS.empreendimento.verificado_antigo
    }
  } else {
    base = ctx.verificado ? PRECOS.geral.verificado : PRECOS.geral.nao_verificado
  }

  // Arredonda para o real: centavo em preco de lead so gera pergunta.
  return Math.round(base * multiplicador(ctx.selo))
}

/** Dias completos desde a captacao. E o que justifica o preco no cartao. */
export function diasDesde(criadoEm: string): number {
  const ms = Date.now() - new Date(criadoEm).getTime()
  return Math.floor(ms / 86_400_000)
}

/** Formata em reais, para exibicao. */
export function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

import { PRECOS, HORAS_FRESCO } from './config'

// ============================================================================
// PRECO E IDADE DO LEAD
//
// O preco e calculado UMA VEZ, no momento em que eu aprovo o lead no admin, e
// gravado em leads.preco. Nao e recalculado na exibicao.
//
// Por que: o corretor que abriu a vitrine as 11h e clicou as 11h05 nao pode ver
// o preco mudar embaixo dele porque o lead cruzou a marca de 72h nesse meio
// tempo. Preco gravado e preco combinado.
// ============================================================================

/** Preco a gravar no momento da aprovacao. Regra em lib/config.ts. */
export function precoNaAprovacao(criadoEm: string): number {
  const horas = (Date.now() - new Date(criadoEm).getTime()) / 3_600_000
  return horas < HORAS_FRESCO ? PRECOS.verificado_fresco : PRECOS.verificado_antigo
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

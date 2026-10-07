// ============================================================================
// DADOS DA VITRINE
//
// A vitrine lista INTERESSES, nao leads. Cada linha e um empreendimento que
// uma pessoa marcou, ou uma "busca aberta" de quem nao marcou nenhum e aceitou
// contato de outras opcoes.
//
// Imports relativos com extensao (nao '@/...') de proposito: assim o teste de
// vazamento consegue importar estas funcoes com o runner nativo do Node, sem
// resolver path alias nem instalar nada.
// ============================================================================
import { supabaseAdmin } from '../../lib/supabase/admin.ts'
import {
  DIAS_NA_VITRINE,
  HORAS_CARENCIA_PAUSADO,
  INTERESSES_SEM_DONO_VISIVEIS_PARA_TODOS,
} from '../../lib/config.ts'

// ----------------------------------------------------------------------------
// COLUNAS EXPLICITAS. NUNCA `select *`.
//
// Fora daqui, e fora da view, de proposito:
//   nome, telefone   -- a regra critica do projeto
//   pontuacao        -- o corretor ve o SELO, nao o numero
//   poder_de_compra  -- e triagem; viraria "valor aprovado" na cabeca de quem le
//   lead_id          -- com ele no payload, daria para contar quantos interesses
//                       a mesma pessoa gerou. A especificacao proibe expor isso
//                       "em hipotese alguma", e esconder no componente nao
//                       bastaria: o dado estaria na resposta.
//   qtd_interesses   -- pelo mesmo motivo
//
// Ao adicionar uma coluna aqui, pergunte: o corretor pode ver isso ANTES de
// pagar? Se a resposta for nao, ela nao entra.
// ----------------------------------------------------------------------------
const COLUNAS_VITRINE = [
  'id',
  'criado_em',
  'preco',
  'empreendimento_id',
  // qualificacao do lead
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
  'selo_declarado',
  'selo_verificado',
  'verificado_em',
  'lead_status',
  // empreendimento pedido (tudo nulo quando e vitrine geral)
  'empreendimento_nome',
  'construtora',
  'empreendimento_bairro',
  'empreendimento_cidade',
  'tipologias',
  'preco_de',
  'preco_ate',
  'foto_url',
  'status_publicacao',
  'pausado_em',
].join(', ')

export type InteresseVitrine = {
  id: string
  criado_em: string
  preco: number | null
  empreendimento_id: string | null
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
  selo_declarado: string | null
  selo_verificado: string | null
  verificado_em: string | null
  lead_status: string
  empreendimento_nome: string | null
  construtora: string | null
  empreendimento_bairro: string | null
  empreendimento_cidade: string | null
  tipologias: string | null
  preco_de: number | null
  preco_ate: number | null
  foto_url: string | null
  status_publicacao: string | null
  pausado_em: string | null
}

export type FiltrosVitrine = {
  cidade?: string
  bairro?: string
  renda_faixa?: string
}

/**
 * Os interesses que ESTE corretor pode ver.
 *
 * A view ja garante o que e estrutural: lead nao descartado, empreendimento
 * nao arquivado, interesse ainda nao vendido. Aqui entram as regras de negocio:
 * a janela de DIAS_NA_VITRINE, a visibilidade por dono, a carencia do pausado e
 * os filtros da tela.
 *
 * VISIBILIDADE: por padrao o corretor ve os interesses dos empreendimentos
 * DELE mais a vitrine geral -- os cadastrados por mim nao aparecem para
 * ninguem. Isso e uma decisao de modelo de negocio, nao um descuido, e vive
 * atras de INTERESSES_SEM_DONO_VISIVEIS_PARA_TODOS em lib/config.ts.
 *
 * corretorId null e a vistoria do admin: a vitrine inteira, sem filtro de dono
 * e sem poder comprar nada (ver exigirCorretorOuAdmin em lib/auth.ts).
 */
export async function listarInteresses(
  corretorId: string | null,
  filtros: FiltrosVitrine = {}
): Promise<InteresseVitrine[]> {
  const corte = new Date(
    Date.now() - DIAS_NA_VITRINE * 86_400_000
  ).toISOString()

  let consulta = supabaseAdmin()
    .from('vitrine')
    .select(COLUNAS_VITRINE)
    .gte('criado_em', corte)

  // corretorId null = vistoria do admin: sem filtro de dono, porque o ponto da
  // vistoria e ver a vitrine inteira -- inclusive os interesses do catalogo que
  // eu cadastrei, que corretor nenhum ve. Isso nao afrouxa a regra critica: as
  // colunas sao as mesmas da lista acima, e nome e telefone nao estao nelas.
  if (corretorId !== null) {
    // Vitrine geral (sem empreendimento) + os empreendimentos deste corretor,
    // mais os sem dono quando a constante estiver ligada.
    const visiveis = [
      'empreendimento_id.is.null',
      `dono_corretor_id.eq.${corretorId}`,
    ]
    if (INTERESSES_SEM_DONO_VISIVEIS_PARA_TODOS) {
      visiveis.push('dono_corretor_id.is.null')
    }
    consulta = consulta.or(visiveis.join(','))
  }

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
    .returns<InteresseVitrine[]>()

  if (error) {
    console.error('[listarInteresses] falha na consulta:', error)
    throw new Error('Não foi possível carregar a vitrine.')
  }

  // Carencia do pausado, filtrada aqui e nao no SQL: o prazo e knob de negocio
  // (HORAS_CARENCIA_PAUSADO) e mudar de 72h para 24h nao deve exigir migration.
  // Com dezenas de interesses por semana, filtrar em memoria custa nada.
  const limitePausado = Date.now() - HORAS_CARENCIA_PAUSADO * 3_600_000
  return (data ?? []).filter((i) => {
    if (i.status_publicacao !== 'pausado') return true
    if (!i.pausado_em) return true
    return new Date(i.pausado_em).getTime() > limitePausado
  })
}

/** O empreendimento saiu do ar e esta na carencia? Vira etiqueta no cartao. */
export function emCarencia(i: InteresseVitrine): boolean {
  return i.status_publicacao === 'pausado'
}

/** Cidades presentes na vitrine deste corretor, para popular o filtro. */
export async function cidadesNaVitrine(
  corretorId: string | null
): Promise<string[]> {
  const interesses = await listarInteresses(corretorId)
  return [...new Set(interesses.map((i) => i.cidade))].sort()
}

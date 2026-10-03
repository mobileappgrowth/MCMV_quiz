'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { CAMPOS_OBRIGATORIOS_PARA_PUBLICAR } from '@/lib/config'

// ============================================================================
// EMPREENDIMENTOS -- cadastro e ciclo de publicacao
//
// CADA FUNCAO CHAMA exigirAdmin() NA PRIMEIRA LINHA. Server Action e endpoint
// HTTP publico: quem descobrir o id dispara um POST sem nunca abrir a pagina.
//
// NUNCA EXCLUIR UM EMPREENDIMENTO. Arquivar preserva o historico dos interesses
// ja gerados e vendidos; excluir quebraria a rastreabilidade do que foi
// cobrado. Por isso nao existe acao de delete aqui, e nao e esquecimento.
// ============================================================================

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string }

export type CamposEmpreendimento = {
  nome: string
  construtora: string
  cidade: string
  bairro: string
  tipologias: string
  quartos: string
  garagem: string
  faixa_tamanho: string
  preco_de: string
  preco_ate: string
  status: string
  descricao: string
  foto_url: string
  fonte_material: string
  autorizacao: string
}

/** Texto vazio vira null: '' no banco e pior que ausencia declarada. */
function texto(v: string | undefined): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

function numero(v: string | undefined): number | null {
  const t = (v ?? '').trim().replace(/\./g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function paraLinha(campos: CamposEmpreendimento) {
  return {
    nome: texto(campos.nome),
    construtora: texto(campos.construtora),
    cidade: texto(campos.cidade),
    bairro: texto(campos.bairro),
    tipologias: texto(campos.tipologias),
    quartos: numero(campos.quartos),
    garagem: campos.garagem === '' ? null : campos.garagem === 'sim',
    faixa_tamanho: texto(campos.faixa_tamanho),
    preco_de: numero(campos.preco_de),
    preco_ate: numero(campos.preco_ate),
    status: texto(campos.status),
    descricao: texto(campos.descricao),
    foto_url: texto(campos.foto_url),
    fonte_material: texto(campos.fonte_material),
    autorizacao: campos.autorizacao === 'sim',
  }
}

/**
 * Grava no log o que mudou, campo a campo.
 *
 * Serve para responder a uma construtora que questione o que foi publicado: o
 * que estava no ar, quando, e quem mudou. Por isso compara valor a valor em vez
 * de guardar a linha inteira -- "o que mudou" e a pergunta, nao "como estava".
 */
async function registrarNoLog(
  empreendimentoId: string,
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
  autor: string
) {
  const linhas: {
    empreendimento_id: string
    campo: string
    valor_antes: string | null
    valor_depois: string | null
    autor_id: null
  }[] = []

  for (const campo of Object.keys(depois)) {
    const a = antes[campo] ?? null
    const d = depois[campo] ?? null
    if (String(a) === String(d)) continue
    linhas.push({
      empreendimento_id: empreendimentoId,
      campo,
      valor_antes: a === null ? null : String(a),
      valor_depois: d === null ? null : String(d),
      // autor_id e uuid na tabela e o admin e identificado por email, nao por
      // id de corretor. Guardo o email no campo de texto do proximo registro.
      autor_id: null,
    })
  }

  if (linhas.length === 0) return

  // O email do admin entra como uma linha propria, para a autoria nao se
  // perder sem precisar de uma coluna nova.
  linhas.push({
    empreendimento_id: empreendimentoId,
    campo: '_autor',
    valor_antes: null,
    valor_depois: autor,
    autor_id: null,
  })

  const { error } = await supabaseAdmin().from('empreendimentos_log').insert(linhas)
  if (error) console.error('[registrarNoLog]', error)
}

export async function criarEmpreendimento(
  campos: CamposEmpreendimento
): Promise<Resultado> {
  const admin = await exigirAdmin()

  const linha = paraLinha(campos)
  if (!linha.nome) return { ok: false, erro: 'O nome e obrigatorio ate para rascunho.' }

  const { data, error } = await supabaseAdmin()
    .from('empreendimentos')
    .insert({
      ...linha,
      // Nasce sempre como rascunho: invisivel ate alguem decidir publicar.
      status_publicacao: 'rascunho',
      atualizado_em: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[criarEmpreendimento]', error)
    return { ok: false, erro: error?.message ?? 'Falha ao criar.' }
  }

  await registrarNoLog(data.id, {}, { ...linha, status_publicacao: 'rascunho' }, admin)
  revalidatePath('/admin/empreendimentos')
  return { ok: true, id: data.id }
}

export async function salvarEmpreendimento(
  id: string,
  campos: CamposEmpreendimento
): Promise<Resultado> {
  const admin = await exigirAdmin()

  const { data: antes, error: erroBusca } = await supabaseAdmin()
    .from('empreendimentos')
    .select('*')
    .eq('id', id)
    .single()

  if (erroBusca || !antes) return { ok: false, erro: 'Empreendimento nao encontrado.' }
  if (antes.status_publicacao === 'arquivado') {
    return { ok: false, erro: 'Empreendimento arquivado nao pode ser editado.' }
  }

  const linha = paraLinha(campos)
  const { error } = await supabaseAdmin()
    .from('empreendimentos')
    .update({ ...linha, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[salvarEmpreendimento]', error)
    return { ok: false, erro: error.message }
  }

  await registrarNoLog(id, antes, linha, admin)
  revalidatePath('/admin/empreendimentos')
  return { ok: true }
}

/**
 * Transicao de estado.
 *
 * Publicar exige o conjunto obrigatorio: sem ele, o card quebra na tela de
 * resultado e o empreendimento vai ao ar sem a resposta de onde veio o
 * material. Pausar e arquivar exigem motivo -- daqui a tres meses, "por que
 * esse sumiu?" precisa ter resposta.
 */
export async function mudarPublicacao(
  id: string,
  novo: 'rascunho' | 'em_revisao' | 'publicado' | 'pausado' | 'arquivado',
  motivo?: string
): Promise<Resultado> {
  const admin = await exigirAdmin()

  const { data: emp, error: erroBusca } = await supabaseAdmin()
    .from('empreendimentos')
    .select('*')
    .eq('id', id)
    .single()

  if (erroBusca || !emp) return { ok: false, erro: 'Empreendimento nao encontrado.' }
  if (emp.status_publicacao === 'arquivado') {
    return { ok: false, erro: 'Arquivado e definitivo. Cadastre um novo, se precisar.' }
  }

  if (novo === 'publicado') {
    const faltando = CAMPOS_OBRIGATORIOS_PARA_PUBLICAR.filter(
      (c) => emp[c] === null || emp[c] === undefined || emp[c] === ''
    )
    if (faltando.length > 0) {
      return {
        ok: false,
        erro: `Faltam campos para publicar: ${faltando.join(', ')}.`,
      }
    }
  }

  if ((novo === 'pausado' || novo === 'arquivado') && !(motivo ?? '').trim()) {
    return { ok: false, erro: 'Pausar e arquivar exigem motivo.' }
  }

  const agora = new Date().toISOString()
  const mudanca: Record<string, unknown> = {
    status_publicacao: novo,
    atualizado_em: agora,
  }
  if (novo === 'publicado') mudanca.publicado_em = agora
  if (novo === 'pausado') {
    mudanca.pausado_em = agora
    mudanca.pausado_motivo = motivo!.trim()
  }
  if (novo === 'arquivado') {
    mudanca.arquivado_em = agora
    mudanca.arquivado_motivo = motivo!.trim()
  }

  const { error } = await supabaseAdmin()
    .from('empreendimentos')
    .update(mudanca)
    .eq('id', id)

  if (error) {
    console.error('[mudarPublicacao]', error)
    return { ok: false, erro: error.message }
  }

  await registrarNoLog(id, emp, mudanca, admin)
  revalidatePath('/admin/empreendimentos')
  revalidatePath('/painel')
  return { ok: true }
}

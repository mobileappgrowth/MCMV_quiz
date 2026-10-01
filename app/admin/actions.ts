'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { precoNaAprovacao } from '@/lib/preco'

// ============================================================================
// ACOES DO ADMIN
//
// CADA FUNCAO AQUI CHAMA exigirAdmin() NA PRIMEIRA LINHA.
//
// Nao e redundancia com a protecao da pagina. Uma Server Action e um endpoint
// HTTP publico: o Next gera um id para ela e qualquer pessoa que descubra esse
// id pode dispara-la com um POST, sem nunca abrir a pagina. A protecao da
// pagina esconde o botao; so o guard aqui impede a chamada.
// ============================================================================

export type Resultado = { ok: true } | { ok: false; erro: string }

/**
 * Aprova o lead e o coloca na vitrine.
 *
 * Aqui o preco CONGELA: calculado a partir da idade do lead no momento da
 * aprovacao e gravado. Nunca recalculado depois.
 */
export async function verificarLead(leadId: string): Promise<Resultado> {
  await exigirAdmin()

  // Precisa da data de captacao para decidir entre 70 e 45.
  const { data: lead, error: erroBusca } = await supabaseAdmin()
    .from('leads')
    .select('id, criado_em, status')
    .eq('id', leadId)
    .single()

  if (erroBusca || !lead) return { ok: false, erro: 'Lead nao encontrado.' }
  if (lead.status !== 'novo') {
    return { ok: false, erro: `Lead ja esta como "${lead.status}".` }
  }

  const { error } = await supabaseAdmin()
    .from('leads')
    .update({
      status: 'verificado',
      verificado_em: new Date().toISOString(),
      preco: precoNaAprovacao(lead.criado_em),
    })
    .eq('id', leadId)
    .eq('status', 'novo') // trava: nao reaprova o que ja saiu da fila

  if (error) {
    console.error('[verificarLead]', error)
    return { ok: false, erro: 'Falha ao aprovar o lead.' }
  }

  revalidatePath('/admin')
  return { ok: true }
}

export async function descartarLead(leadId: string): Promise<Resultado> {
  await exigirAdmin()

  const { error } = await supabaseAdmin()
    .from('leads')
    .update({ status: 'descartado' })
    .eq('id', leadId)
    .eq('status', 'novo')

  if (error) {
    console.error('[descartarLead]', error)
    return { ok: false, erro: 'Falha ao descartar o lead.' }
  }

  revalidatePath('/admin')
  return { ok: true }
}

export async function salvarNota(leadId: string, nota: string): Promise<Resultado> {
  await exigirAdmin()

  const { error } = await supabaseAdmin()
    .from('leads')
    .update({ notas_verificacao: nota.trim() || null })
    .eq('id', leadId)

  if (error) {
    console.error('[salvarNota]', error)
    return { ok: false, erro: 'Falha ao salvar a nota.' }
  }

  revalidatePath('/admin')
  return { ok: true }
}

/**
 * Cadastra um corretor.
 *
 * Duas escritas que precisam acontecer juntas: a linha em `corretores` e o
 * usuario de autenticacao. Sem o usuario de autenticacao o magic link nao
 * funciona (o login tem shouldCreateUser: false); sem a linha em `corretores`
 * o login funciona mas a vitrine nega.
 *
 * Ordem: `corretores` primeiro, porque o UNIQUE em email detecta duplicata de
 * graca. Se a criacao do usuario falhar depois, apago a linha -- cadastro pela
 * metade e pior que cadastro nenhum, porque falha silenciosamente no login.
 */
export async function cadastrarCorretor(dados: {
  nome: string
  email: string
  telefone: string
  creci: string
}): Promise<Resultado> {
  await exigirAdmin()

  const nome = dados.nome.trim()
  const email = dados.email.trim().toLowerCase()

  if (nome.length < 2) return { ok: false, erro: 'Informe o nome do corretor.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, erro: 'Email invalido.' }
  }

  const { data: corretor, error: erroCorretor } = await supabaseAdmin()
    .from('corretores')
    .insert({
      nome,
      email,
      telefone: dados.telefone.replace(/\D/g, '') || null,
      creci: dados.creci.trim() || null,
      creditos: 0,
      ativo: true,
    })
    .select('id')
    .single()

  if (erroCorretor || !corretor) {
    // 23505 = unique_violation
    if (erroCorretor?.code === '23505') {
      return { ok: false, erro: 'Ja existe um corretor com esse email.' }
    }
    console.error('[cadastrarCorretor] insert:', erroCorretor)
    return { ok: false, erro: 'Falha ao cadastrar o corretor.' }
  }

  const { error: erroUsuario } = await supabaseAdmin().auth.admin.createUser({
    email,
    email_confirm: true, // ja confirmado: o magic link e a prova de posse
  })

  if (erroUsuario) {
    // Compensacao: desfaz a linha para nao deixar cadastro que nao loga.
    await supabaseAdmin().from('corretores').delete().eq('id', corretor.id)
    console.error('[cadastrarCorretor] createUser:', erroUsuario)
    return {
      ok: false,
      erro:
        'Falha ao criar o acesso. Se esse email ja existe na autenticacao do ' +
        'Supabase, remova-o lá antes de cadastrar aqui.',
    }
  }

  revalidatePath('/admin/corretores')
  return { ok: true }
}

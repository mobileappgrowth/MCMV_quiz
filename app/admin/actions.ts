'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { precoDoInteresse } from '@/lib/preco'
import type { Selo } from '@/lib/motor'

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
 * Duas coisas acontecem aqui, e a ordem importa.
 *
 * 1. O selo VERIFICADO nasce. O motor produziu um selo declarado a partir do
 *    que a pessoa digitou; este e o que voce confirmou no telefone. Sao coisas
 *    diferentes e o cartao mostra qual e qual.
 *
 * 2. TODOS OS INTERESSES DESSE LEAD SAO REPRECIFICADOS. O que se vende e o
 *    interesse, nao o lead: quem marcou quatro empreendimentos tem quatro
 *    precos para subir da faixa de perfil declarado para a de verificado. O
 *    selo entra como multiplicador.
 *
 * Reprecificar depois de gravar o selo, nunca antes: o preco depende dele.
 */
export async function verificarLead(
  leadId: string,
  selo: Selo
): Promise<Resultado> {
  await exigirAdmin()

  // Precisa da data de captacao para decidir entre 70 e 45.
  const { data: lead, error: erroBusca } = await supabaseAdmin()
    .from('leads')
    .select('id, criado_em, status')
    .eq('id', leadId)
    .single()

  if (erroBusca || !lead) return { ok: false, erro: 'Lead não encontrado.' }
  if (lead.status !== 'novo') {
    return { ok: false, erro: `Lead ja esta como "${lead.status}".` }
  }

  const { error } = await supabaseAdmin()
    .from('leads')
    .update({
      status: 'verificado',
      verificado_em: new Date().toISOString(),
      selo_verificado: selo,
    })
    .eq('id', leadId)
    .eq('status', 'novo') // trava: nao reaprova o que ja saiu da fila

  if (error) {
    console.error('[verificarLead]', error)
    return { ok: false, erro: 'Falha ao aprovar o lead.' }
  }

  const erroPreco = await reprecificarInteresses(leadId, lead.criado_em, selo)
  if (erroPreco) return { ok: false, erro: erroPreco }

  revalidatePath('/admin')
  return { ok: true }
}

/**
 * Sobe os interesses do lead para a faixa de perfil verificado.
 *
 * Um update por interesse, de proposito: o preco de cada um depende de ter ou
 * nao empreendimento, entao nao da para resolver num update so. Com dezenas de
 * leads por semana e poucos interesses cada, o custo e irrelevante perto da
 * clareza.
 *
 * Se um interesse falhar, os outros ja subiram. Nao e transacao, e nao precisa
 * ser: nada foi cobrado de ninguem aqui, e a correcao e reaprovar.
 */
async function reprecificarInteresses(
  leadId: string,
  leadCriadoEm: string,
  selo: Selo
): Promise<string | null> {
  const { data: interesses, error } = await supabaseAdmin()
    .from('interesses')
    .select('id, empreendimento_id')
    .eq('lead_id', leadId)
    .returns<{ id: string; empreendimento_id: string | null }[]>()

  if (error) {
    console.error('[reprecificarInteresses] busca:', error)
    return 'Lead aprovado, mas falhou ao reprecificar os interesses.'
  }

  for (const interesse of interesses ?? []) {
    const preco = precoDoInteresse({
      temEmpreendimento: interesse.empreendimento_id !== null,
      verificado: true,
      criadoEm: leadCriadoEm,
      selo,
    })

    const { error: erroUpdate } = await supabaseAdmin()
      .from('interesses')
      .update({ preco })
      .eq('id', interesse.id)

    if (erroUpdate) {
      console.error('[reprecificarInteresses] update:', erroUpdate)
      return 'Lead aprovado, mas falhou ao reprecificar os interesses.'
    }
  }

  return null
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

/**
 * Devolve um lead descartado para a fila.
 *
 * Existe porque o motor descarta SOZINHO, antes de voce ver qualquer coisa:
 * cidade fora da area, renda abaixo do minimo, capacidade abaixo do corte. Se
 * um parametro estiver mal calibrado, ele mata lead bom que voce pagou anuncio
 * para trazer -- e sem isto aqui nao haveria como resgatar.
 *
 * So aceita `descartado`. Verificado nao volta: a aprovacao ja subiu o preco
 * de todos os interesses do lead, e desfazer isso depois de um corretor ter
 * visto o preco novo seria mexer no que ja esta a venda.
 */
export async function devolverParaFila(leadId: string): Promise<Resultado> {
  await exigirAdmin()

  const { error, count } = await supabaseAdmin()
    .from('leads')
    .update(
      { status: 'novo', motivo_descarte: null },
      { count: 'exact' }
    )
    .eq('id', leadId)
    .eq('status', 'descartado')

  if (error) {
    console.error('[devolverParaFila]', error)
    return { ok: false, erro: 'Falha ao devolver o lead para a fila.' }
  }
  if (count === 0) {
    return { ok: false, erro: 'So lead descartado volta para a fila.' }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/leads')
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
  revalidatePath('/admin/leads')
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
    return { ok: false, erro: 'Email inválido.' }
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
      return { ok: false, erro: 'Já existe um corretor com esse email.' }
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
        'Falha ao criar o acesso. Se esse email já existe na autenticação do ' +
        'Supabase, remova-o lá antes de cadastrar aqui.',
    }
  }

  revalidatePath('/admin/corretores')
  return { ok: true }
}


// ============================================================================
// APROVACAO DE RECARGA (PIX manual)
//
// Sem gateway de pagamento: o corretor faz o PIX, me manda o comprovante, e eu
// credito aqui. A funcao creditar_corretor() insere a transacao e atualiza o
// cache do saldo na MESMA transacao -- os dois nunca divergem.
//
// A referencia e obrigatoria de proposito: daqui a dois meses, "por que esse
// corretor tem R$ 300?" precisa de resposta, e "recarga" nao e resposta.
// ============================================================================
export async function creditarCorretor(
  corretorId: string,
  valor: number,
  referencia: string
): Promise<Resultado> {
  await exigirAdmin()

  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, erro: 'Informe um valor maior que zero.' }
  }
  if (!referencia.trim()) {
    return {
      ok: false,
      erro: 'Informe a referência (data do PIX, últimos dígitos, o que te ajude a achar depois).',
    }
  }

  const { error } = await supabaseAdmin().rpc('creditar_corretor', {
    p_corretor_id: corretorId,
    p_valor: valor,
    p_referencia: referencia.trim(),
  })

  if (error) {
    console.error('[creditarCorretor]', error)
    if (error.message?.includes('CORRETOR_NAO_ENCONTRADO')) {
      return { ok: false, erro: 'Corretor não encontrado.' }
    }
    if (error.message?.includes('VALOR_INVALIDO')) {
      return { ok: false, erro: 'Valor inválido.' }
    }
    return { ok: false, erro: 'Falha ao creditar. Nada foi lançado.' }
  }

  revalidatePath('/admin/recargas')
  revalidatePath('/admin/corretores')
  return { ok: true }
}

import { redirect } from 'next/navigation'
import { getUsuario } from './supabase/session'
import { supabaseAdmin } from './supabase/admin'

// ============================================================================
// CONTROLE DE ACESSO
//
// Tudo que decide quem pode ver o que esta neste arquivo, de proposito: e uma
// leitura de 60 linhas para auditar o sistema inteiro.
//
// REGRA: toda pagina protegida e TODA Server Action chama um destes guards na
// PRIMEIRA linha. Server Action e um endpoint HTTP publico -- o fato de o botao
// que a dispara estar numa pagina protegida nao protege nada. Quem souber o id
// da action pode chama-la direto.
// ============================================================================

/** Admin e definido por ADMIN_EMAILS no ambiente. Sem tabela de papeis. */
function emailsAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Garante que quem chamou e admin. Redireciona para /login se nao for.
 * Retorna o email do admin.
 */
export async function exigirAdmin(): Promise<string> {
  const usuario = await getUsuario()
  if (!usuario?.email) redirect('/login')

  if (!emailsAdmin().includes(usuario.email.toLowerCase())) {
    // Nao distingo "nao logado" de "logado sem permissao": a resposta e a
    // mesma, e isso evita confirmar quais emails sao admin.
    redirect('/login')
  }

  return usuario.email
}

export type Corretor = {
  id: string
  nome: string
  email: string
  creditos: number
  ativo: boolean
}

/**
 * Garante que quem chamou e um corretor cadastrado e ativo.
 *
 * Sessao valida NAO basta: o usuario precisa ter linha em corretores. Um
 * usuario de autenticacao sem cadastro (ou desativado) cai no /login.
 */
export async function exigirCorretor(): Promise<Corretor> {
  const usuario = await getUsuario()
  if (!usuario?.email) redirect('/login')

  const { data: corretor, error } = await supabaseAdmin()
    .from('corretores')
    .select('id, nome, email, creditos, ativo')
    .ilike('email', usuario.email)
    .maybeSingle()

  if (error) {
    console.error('[exigirCorretor] falha ao buscar corretor:', error)
    redirect('/login')
  }

  if (!corretor || !corretor.ativo) redirect('/sem-acesso')

  return corretor as Corretor
}

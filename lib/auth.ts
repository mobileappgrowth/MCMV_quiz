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

  if (!ehAdmin(usuario.email)) {
    // Nao distingo "nao logado" de "logado sem permissao": a resposta e a
    // mesma, e isso evita confirmar quais emails sao admin.
    redirect('/login')
  }

  return usuario.email
}

/**
 * Este email e admin? Exportado porque o callback do magic link precisa saber
 * para onde mandar a pessoa depois do login -- admin vai para /admin, corretor
 * vai para /painel. Mandar admin para /painel o expulsaria, porque ele nao tem
 * (nem deve ter) linha em corretores.
 */
export function ehAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return emailsAdmin().includes(email.toLowerCase())
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

/**
 * Quem esta olhando a vitrine: um corretor cadastrado, ou eu, em vistoria.
 */
export type VisitanteVitrine =
  | { tipo: 'corretor'; corretor: Corretor }
  | { tipo: 'admin'; email: string }

/**
 * Guard do /painel. Libera o admin para OLHAR a vitrine sem virar corretor.
 *
 * Por que nao resolvi isso criando uma linha em `corretores` para o meu email:
 * essa linha me daria saldo, e um clique meu em "revelar" gastaria credito de
 * verdade e consumiria a exclusividade do interesse -- ele sairia da vitrine de
 * todos os corretores, vendido para mim, sem estorno e sem ninguem para ligar
 * para o lead. A vistoria precisa ser INCAPAZ de comprar, nao apenas
 * desencorajada.
 *
 * Por isso as acoes que movem dinheiro (revelarContato, salvarFeedback) seguem
 * chamando exigirCorretor(), nunca este guard: sem linha em `corretores`, o
 * admin e recusado la mesmo que chame a Server Action na mao, com o botao
 * escondido ou nao. O botao desabilitado na tela e conveniencia; a recusa no
 * servidor e a garantia.
 *
 * Admin que por acaso tambem esteja cadastrado como corretor entra como admin:
 * entre as duas leituras, a que nao gasta dinheiro e a certa.
 */
export async function exigirCorretorOuAdmin(): Promise<VisitanteVitrine> {
  const usuario = await getUsuario()
  if (!usuario?.email) redirect('/login')

  if (ehAdmin(usuario.email)) return { tipo: 'admin', email: usuario.email }

  return { tipo: 'corretor', corretor: await exigirCorretor() }
}

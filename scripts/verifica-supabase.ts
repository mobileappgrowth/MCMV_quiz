// ============================================================================
// VERIFICACAO DA INTEGRACAO COM O SUPABASE
//
//   npm run verifica
//
// Somente leitura. Nao escreve nada, nao apaga nada. Pode rodar quantas vezes
// quiser, inclusive contra producao.
//
// Para que serve: quando a vitrine aparecer vazia, o login nao funcionar ou o
// /admin te jogar de volta pro login, este comando diz QUAL das oito coisas
// esta errada, em vez de voce ter que descobrir pelo navegador.
//
// Zero dependencia nova: Node roda TypeScript direto e o cliente do Supabase
// ja esta no projeto.
// ============================================================================
import { createClient } from '@supabase/supabase-js'

const TABELAS = [
  'leads',
  'corretores',
  'desbloqueios',
  'transacoes_credito',
  'feedbacks',
  'consentimentos',
  'empreendimentos',
  'empreendimentos_log',
  'interesses',
]

let falhas = 0
let avisos = 0

function ok(titulo: string, detalhe = '') {
  console.log(`  OK    ${titulo}${detalhe ? ` -- ${detalhe}` : ''}`)
}
function falha(titulo: string, comoResolver: string) {
  falhas++
  console.log(`  FALHA ${titulo}`)
  console.log(`        > ${comoResolver}`)
}
function aviso(titulo: string, detalhe: string) {
  avisos++
  console.log(`  AVISO ${titulo}`)
  console.log(`        > ${detalhe}`)
}

// ---------------------------------------------------------------------------
console.log('\n1. Variaveis de ambiente\n')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

if (!url) falha('NEXT_PUBLIC_SUPABASE_URL', 'copie de Project Settings > API para .env.local')
else ok('NEXT_PUBLIC_SUPABASE_URL', url)

if (!anonKey) falha('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'copie de Project Settings > API')
else ok('NEXT_PUBLIC_SUPABASE_ANON_KEY', `${anonKey.slice(0, 12)}...`)

if (!serviceKey) falha('SUPABASE_SERVICE_ROLE_KEY', 'copie de Project Settings > API')
else ok('SUPABASE_SERVICE_ROLE_KEY', `${serviceKey.slice(0, 12)}...`)

// Trava de seguranca: se a service_role tiver virado publica, nada mais importa.
for (const chave of Object.keys(process.env)) {
  if (chave.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|SECRET/i.test(chave)) {
    falha(
      `${chave} tem prefixo NEXT_PUBLIC_`,
      'essa variavel vai para o navegador. Renomeie removendo NEXT_PUBLIC_ e ' +
        'ROTACIONE a chave no painel do Supabase: considere a atual vazada.'
    )
  }
}

if (adminEmails.length === 0) {
  falha('ADMIN_EMAILS', 'sem isso o /admin te redireciona pro login. Ponha seu email.')
} else {
  ok('ADMIN_EMAILS', adminEmails.join(', '))
}

if (!url || !anonKey || !serviceKey) {
  console.log('\nFaltam chaves. Pare aqui e preencha .env.local.\n')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anonimo = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---------------------------------------------------------------------------
console.log('\n2. Conexao\n')

{
  const { error } = await admin.from('corretores').select('id').limit(1)
  if (error && error.code === '42P01') {
    ok('o projeto responde', 'mas falta aplicar as migrations (ver passo 3)')
  } else if (error) {
    falha(
      'conexao com o projeto',
      `${error.message} -- confira se a URL e a service_role key sao do MESMO projeto`
    )
    console.log('')
    process.exit(1)
  } else {
    ok('o projeto responde e a service_role key e valida')
  }
}

// ---------------------------------------------------------------------------
console.log('\n3. Migrations aplicadas\n')

const faltando: string[] = []
for (const tabela of TABELAS) {
  const { error } = await admin.from(tabela).select('*', { head: true, count: 'exact' })
  if (error?.code === '42P01') faltando.push(tabela)
}

if (faltando.length > 0) {
  falha(
    `tabelas ausentes: ${faltando.join(', ')}`,
    'rode `npm run sql` e cole a saida no SQL Editor do Supabase'
  )
} else {
  ok(`as ${TABELAS.length} tabelas existem`)
}

{
  const { error } = await admin.from('vitrine').select('id', { head: true })
  if (error?.code === '42P01') {
    falha('a view `vitrine` nao existe', 'aplique supabase/migrations/0003_vitrine.sql')
  } else if (error) {
    falha('a view `vitrine`', error.message)
  } else {
    ok('a view `vitrine` existe')
  }
}

// ---------------------------------------------------------------------------
console.log('\n4. O contato nao sai do servidor\n')

// Prova estrutural pela via contraria: PEDIR a coluna e esperar que FALHE.
// Se o Supabase responde "column does not exist", a coluna nao existe na view
// -- e nenhuma consulta a ela pode vazar contato.
for (const coluna of [
  'nome',
  'telefone',
  'pontuacao',
  'poder_de_compra',
  'lead_id',
  'qtd_interesses',
]) {
  const { error } = await admin.from('vitrine').select(coluna, { head: true })
  if (!error) {
    falha(
      `a view vitrine EXPOE a coluna ${coluna}`,
      'isso quebra o produto. Recrie a view sem essa coluna (0003_vitrine.sql).'
    )
  } else {
    ok(`a view vitrine nao tem a coluna ${coluna}`)
  }
}

{
  const { data, error } = await anonimo.from('leads').select('telefone').limit(1)
  if (error) {
    ok('a anon key nao le `leads`', error.message)
  } else if ((data?.length ?? 0) > 0) {
    falha(
      'a anon key LEU linhas de `leads`',
      'o RLS nao esta protegendo. Reaplique 0002_rls.sql e confira se alguma ' +
        'policy foi criada a mao no painel.'
    )
  } else {
    ok('a anon key nao le `leads`', '0 linhas')
  }
}

{
  const { data, error } = await anonimo.from('vitrine').select('id').limit(1)
  if (error) {
    ok('a anon key nao le `vitrine`', error.message)
  } else if ((data?.length ?? 0) > 0) {
    falha('a anon key LEU linhas de `vitrine`', 'reaplique 0003_vitrine.sql')
  } else {
    ok('a anon key nao le `vitrine`', '0 linhas')
  }
}

// ---------------------------------------------------------------------------
console.log('\n5. Seu acesso de admin\n')

{
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) {
    falha('listar usuarios de autenticacao', error.message)
  } else {
    const existentes = new Set(
      data.users.map((u) => (u.email ?? '').toLowerCase()).filter(Boolean)
    )
    for (const email of adminEmails) {
      if (existentes.has(email)) {
        ok(`${email} tem usuario de autenticacao`)
      } else {
        falha(
          `${email} NAO tem usuario de autenticacao`,
          'o login nao cria contas, entao voce nao consegue entrar. Rode `npm run admin:criar`'
        )
      }
    }
    ok('usuarios de autenticacao no projeto', String(data.users.length))
  }
}

// ---------------------------------------------------------------------------
console.log('\n6. Estado dos dados\n')

for (const [rotulo, filtro] of [
  ['leads na fila (novo)', 'novo'],
  ['leads verificados', 'verificado'],
  ['leads descartados', 'descartado'],
] as const) {
  const { count } = await admin
    .from('leads')
    .select('*', { head: true, count: 'exact' })
    .eq('status', filtro)
  ok(rotulo, String(count ?? 0))
}

{
  const { count } = await admin.from('corretores').select('*', { head: true, count: 'exact' })
  if ((count ?? 0) === 0) {
    aviso(
      'nenhum corretor cadastrado',
      'a vitrine so abre para corretor cadastrado. Cadastre em /admin/corretores'
    )
  } else {
    ok('corretores cadastrados', String(count))
  }
}

{
  const { count } = await admin.from('desbloqueios').select('*', { head: true, count: 'exact' })
  ok('desbloqueios', String(count ?? 0))
}

// ---------------------------------------------------------------------------
console.log('\n7. O que eu nao consigo verificar daqui\n')
console.log('  As Redirect URLs do magic link. Confira em Authentication >')
console.log('  URL Configuration que existem:')
console.log('    http://localhost:3000/auth/callback')
console.log('    https://SEU-DOMINIO.vercel.app/auth/callback')
console.log('  Sem isso o email chega, mas o link nao loga.')

// ---------------------------------------------------------------------------
console.log('')
if (falhas > 0) {
  console.log(`${falhas} ${falhas === 1 ? 'falha' : 'falhas'}. Resolva as de cima primeiro.\n`)
  process.exit(1)
}
console.log(
  avisos > 0
    ? `Integracao de pe, com ${avisos} ${avisos === 1 ? 'aviso' : 'avisos'}.\n`
    : 'Integracao de pe.\n'
)

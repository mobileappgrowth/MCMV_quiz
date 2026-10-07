// ============================================================================
// CRIA O SEU USUARIO DE AUTENTICACAO
//
//   npm run admin:criar
//
// Por que isto existe: o login tem shouldCreateUser: false, para que ninguem
// crie conta digitando um email. Isso vale para voce tambem -- sem um usuario
// de autenticacao, voce nao consegue entrar no /admin do seu proprio produto.
//
// Este script cria o usuario para cada email em ADMIN_EMAILS. Idempotente:
// rodar duas vezes nao faz nada na segunda.
//
// NAO cria linha em `corretores`, de proposito. Admin nao e corretor: voce nao
// compra leads de si mesmo, e um admin com saldo seria so confusao.
// ============================================================================
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

if (!url || !serviceKey) {
  console.error(
    '\nFaltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Preencha .env.local a partir de .env.example.\n'
  )
  process.exit(1)
}

if (adminEmails.length === 0) {
  console.error(
    '\nADMIN_EMAILS esta vazia. Ponha seu email la primeiro -- e ela que\n' +
      'define quem entra no /admin.\n'
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: existentes, error: erroLista } = await admin.auth.admin.listUsers({
  perPage: 200,
})

if (erroLista) {
  console.error(`\nFalha ao listar usuarios: ${erroLista.message}\n`)
  process.exit(1)
}

const jaExistem = new Set(
  existentes.users.map((u) => (u.email ?? '').toLowerCase()).filter(Boolean)
)

console.log('')
let criados = 0

for (const email of adminEmails) {
  if (jaExistem.has(email)) {
    console.log(`  ja existia   ${email}`)
    continue
  }

  // email_confirm: true porque o magic link ja e a prova de posse do email.
  // Sem isso o Supabase manda um email de confirmacao que nao precisa existir.
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true })

  if (error) {
    console.log(`  FALHA        ${email} -- ${error.message}`)
  } else {
    console.log(`  criado       ${email}`)
    criados++
  }
}

console.log(
  criados > 0
    ? `\n${criados} ${criados === 1 ? 'usuario criado' : 'usuarios criados'}. ` +
        'Entre em /login com esse email e abra /admin.\n'
    : '\nNada a fazer. Entre em /login e abra /admin.\n'
)

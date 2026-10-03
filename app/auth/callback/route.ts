import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSessionSupabase } from '@/lib/supabase/session'
import { ehAdmin } from '@/lib/auth'

// ============================================================================
// DESTINO DO MAGIC LINK
//
// O Supabase entrega a credencial em DUAS FORMAS diferentes, dependendo do
// fluxo e do template de email configurado:
//
//   ?code=...                     fluxo PKCE
//   ?token_hash=...&type=magiclink  verificacao por token
//
// A primeira versao deste arquivo so tratava `code`. Com o outro formato ela
// caia no "link invalido" e devolvia a pessoa para o login -- que e
// exatamente o sintoma de "recebi o link, mas voltei para a tela de email".
// Agora trata as duas.
//
// Todo erro vai para /login?erro=<mensagem do Supabase>, e a tela de login
// mostra. Redirecionar em silencio deixa a pessoa sem nada para agir.
// ============================================================================

function paraLogin(origin: string, mensagem: string) {
  return NextResponse.redirect(
    `${origin}/login?erro=${encodeURIComponent(mensagem)}`
  )
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // O Supabase tambem pode mandar o erro direto na URL.
  const erroNaUrl = searchParams.get('error_description') ?? searchParams.get('error')
  if (erroNaUrl) return paraLogin(origin, erroNaUrl)

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const tipo = searchParams.get('type')

  const supabase = await createSessionSupabase()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return paraLogin(origin, error.message)
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tipo as EmailOtpType,
    })
    if (error) return paraLogin(origin, error.message)
  } else {
    // Sem credencial nenhuma na URL. O caso classico e o fluxo implicito, que
    // entrega o token no fragmento (#access_token=...) -- e fragmento nunca
    // chega ao servidor.
    return paraLogin(
      origin,
      'O link nao trouxe credencial reconhecivel. Se o endereco tinha um "#" ' +
        'no meio, o template de email do Supabase esta no fluxo implicito: ' +
        'troque para o template padrao de Magic Link.'
    )
  }

  // Admin e corretor moram em telas diferentes. Mandar admin para /painel o
  // expulsaria, porque ele nao tem linha em corretores -- e nao deve ter.
  const { data } = await supabase.auth.getUser()
  return NextResponse.redirect(
    ehAdmin(data.user?.email) ? `${origin}/admin` : `${origin}/painel`
  )
}

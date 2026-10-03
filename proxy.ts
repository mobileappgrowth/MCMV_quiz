import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================================================
// PROXY (era middleware.ts -- renomeado: o Next 16 deprecou aquele nome)
//
// Faz uma coisa so: renovar o cookie de sessao do Supabase. Sem isso o login
// por magic link expira em ~1h e o corretor cai fora sem entender por que.
// Nao decide permissao: quem decide sao os guards em lib/auth.ts.
//
// ----------------------------------------------------------------------------
// DUAS DECISOES DE ROBUSTEZ, APRENDIDAS DA PIOR FORMA
//
// 1. O MATCHER COBRE SO AS ROTAS AUTENTICADAS.
//    Na primeira versao ele cobria o site inteiro. Resultado: rodando sem as
//    variaveis do Supabase, TODA pagina devolvia 500 -- inclusive a landing
//    page, que nao toca no Supabase. Em producao isso significaria perder a
//    captacao de leads por causa de um env var errado.
//    A landing page e a tela de obrigado agora nao dependem de nada disto.
//
// 2. FALHA MACIA SE FALTAR CONFIGURACAO.
//    Sem as variaveis, deixa a requisicao passar em vez de explodir. A pagina
//    protegida la na frente redireciona pro login, que e degradacao
//    aceitavel. Um 500 nao e.
// ============================================================================

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Falha macia: sem configuracao, nao ha sessao para renovar.
  if (!url || !anonKey) {
    console.warn(
      '[proxy] NEXT_PUBLIC_SUPABASE_URL ou _ANON_KEY ausente: sessao nao ' +
        'renovada. Confira as variaveis de BUILD do Worker.'
    )
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  await supabase.auth.getUser()

  return response
}

export const config = {
  // So onde existe sessao para renovar. A landing page (/), /obrigado e os
  // assets ficam de fora de proposito.
  matcher: ['/painel/:path*', '/admin/:path*'],
}

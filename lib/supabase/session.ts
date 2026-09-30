import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// ============================================================================
// SESSAO NO SERVIDOR -- anon key + cookies
//
// Responde "quem esta logado?" dentro de Server Components, Server Actions e
// Route Handlers. Usa a anon key, entao NAO serve para ler dados de leads --
// para isso use supabaseAdmin depois de confirmar quem e o usuario.
// ============================================================================

export async function createSessionSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components nao podem escrever cookies. O middleware ja
            // cuidou do refresh, entao ignorar aqui e o comportamento correto.
          }
        },
      },
    }
  )
}

/** Retorna o usuario autenticado, ou null. */
export async function getUsuario() {
  const supabase = await createSessionSupabase()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

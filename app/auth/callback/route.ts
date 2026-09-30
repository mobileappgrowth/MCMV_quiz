import { NextResponse, type NextRequest } from 'next/server'
import { createSessionSupabase } from '@/lib/supabase/session'

// Destino do magic link. Troca o code da URL por um cookie de sessao.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=link_invalido`)
  }

  const supabase = await createSessionSupabase()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=link_expirado`)
  }

  // O Dia 2 troca este destino pela vitrine.
  return NextResponse.redirect(`${origin}/painel`)
}

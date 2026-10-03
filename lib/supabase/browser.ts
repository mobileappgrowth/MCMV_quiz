'use client'

import { createBrowserClient } from '@supabase/ssr'

// ============================================================================
// CLIENTE DO NAVEGADOR -- anon key
//
// Usado APENAS para autenticacao: enviar o magic link e ler a sessao.
//
// Nao use para ler dados de leads. Nao porque seja proibido por convencao,
// mas porque nao funciona: RLS esta ligado sem policies (0002_rls.sql), logo
// toda consulta feita com esta chave volta vazia. Leitura de dados acontece
// em codigo de servidor.
// ============================================================================

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

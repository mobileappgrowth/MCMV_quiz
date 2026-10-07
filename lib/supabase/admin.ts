import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// CLIENTE ADMIN -- SOMENTE SERVIDOR
//
// Usa a service_role key, que BYPASSA Row Level Security. Com ela se le e
// escreve qualquer linha de qualquer tabela, inclusive nome e telefone.
//
// Nunca importe este arquivo em um componente de cliente (arquivo com
// 'use client' no topo) nem em nada alcancado por um deles.
//
// Duas travas impedem o vazamento:
//  1. A variavel nao tem prefixo NEXT_PUBLIC_, logo o Next nao a inclui no
//     bundle do navegador. Um import de cliente receberia undefined.
//  2. O guard em supabaseAdmin() joga erro em tempo de execucao se a funcao
//     for chamada no navegador, transformando um erro silencioso em erro alto.
//
// A criacao e preguicosa (na primeira chamada, nao no import) para que o
// `next build` funcione sem as variaveis de ambiente presentes.
// ============================================================================

let cliente: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      'supabaseAdmin() foi chamado no navegador. Este modulo usa a ' +
        'service_role key e deve existir apenas no servidor. Verifique a cadeia ' +
        'de imports do componente de cliente que chegou aqui.'
    )
  }

  if (cliente) return cliente

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL nao definida')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY nao definida')

  cliente = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return cliente
}

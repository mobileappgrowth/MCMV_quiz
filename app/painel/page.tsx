import { redirect } from 'next/navigation'
import { getUsuario } from '@/lib/supabase/session'

// Placeholder do Dia 1: prova que o magic link funcionou e que o servidor
// reconhece a sessao. A vitrine de verdade e o Dia 2.
export default async function Painel() {
  const usuario = await getUsuario()
  if (!usuario) redirect('/login')

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Login funcionando</h1>
      <p className="text-gray-700">
        Sessao ativa como <strong>{usuario.email}</strong>.
      </p>
      <p className="mt-4 text-gray-600">A vitrine entra aqui no Dia 2.</p>
    </main>
  )
}

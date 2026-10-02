import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { reais } from '@/lib/preco'
import { FormCorretor } from './form-corretor'
import { NavAdmin } from '../nav'

export const dynamic = 'force-dynamic'

export default async function Corretores() {
  await exigirAdmin()

  const { data: corretores } = await supabaseAdmin()
    .from('corretores')
    .select('id, nome, email, telefone, creci, creditos, ativo, criado_em')
    .order('criado_em', { ascending: false })

  return (
    <main className="mx-auto max-w-2xl p-4">
      <NavAdmin atual="corretores" />

      <h1 className="mb-1 text-2xl font-bold">Cadastrar corretor</h1>
      <p className="mb-6 text-sm text-gray-600">
        O cadastro cria o acesso e a conta. Sem passar por aqui, o corretor nao
        consegue entrar: o login nao cria contas sozinho.
      </p>

      <FormCorretor />

      <h2 className="mt-10 mb-3 text-lg font-bold">
        {corretores?.length ?? 0} cadastrados
      </h2>

      <div className="flex flex-col gap-3">
        {corretores?.map((c) => (
          <div key={c.id} className="border border-gray-300 p-3 text-sm">
            <p className="font-medium">
              {c.nome}
              {!c.ativo && <span className="ml-2 text-red-700">(inativo)</span>}
            </p>
            <p className="text-gray-600">{c.email}</p>
            <p className="text-gray-600">
              {c.creci ? `CRECI ${c.creci} · ` : ''}
              {c.telefone ?? 'sem telefone'}
            </p>
            <p className="mt-1">Saldo: {reais(Number(c.creditos))}</p>
          </div>
        ))}
        {corretores?.length === 0 && (
          <p className="text-gray-600">Nenhum corretor ainda.</p>
        )}
      </div>
    </main>
  )
}

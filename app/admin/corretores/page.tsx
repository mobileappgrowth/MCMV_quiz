import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { reais } from '@/lib/preco'
import { FormCorretor } from './form-corretor'

export const dynamic = 'force-dynamic'

export default async function Corretores() {
  await exigirAdmin()

  const { data: corretores } = await supabaseAdmin()
    .from('corretores')
    .select('id, nome, email, telefone, creci, creditos, ativo, criado_em')
    .order('criado_em', { ascending: false })

  return (
    <main className="mx-auto max-w-[900px] p-5 pb-12">
      <h1 className="mb-1 text-2xl font-extrabold tracking-[-0.01em]">Cadastrar corretor</h1>
      <p className="mb-6 text-sm text-apagado">
        O cadastro cria o acesso e a conta. Sem passar por aqui, o corretor
        não consegue entrar: o login não cria contas sozinho.
      </p>

      <FormCorretor />

      <h2 className="mt-10 mb-3 text-[17px] font-extrabold">
        {corretores?.length ?? 0} cadastrados
      </h2>

      <div className="flex flex-col gap-3">
        {corretores?.map((c) => (
          <div key={c.id} className="rounded-[10px] border border-linha bg-white p-4 text-sm">
            <p className="text-[16px] font-extrabold">
              {c.nome}
              {!c.ativo && (
                <span className="ml-2 rounded bg-vermelho-tenue px-2 py-0.5 text-[11px] font-bold text-vermelho">
                  INATIVO
                </span>
              )}
            </p>
            <p className="text-apagado">{c.email}</p>
            <p className="text-apagado">
              {c.creci ? `CRECI ${c.creci} · ` : ''}
              {c.telefone ?? 'sem telefone'}
            </p>
            <p className="mt-1.5 font-bold">Saldo: {reais(Number(c.creditos))}</p>
          </div>
        ))}
        {corretores?.length === 0 && (
          <p className="text-apagado">Nenhum corretor ainda.</p>
        )}
      </div>
    </main>
  )
}

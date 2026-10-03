import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { reais } from '@/lib/preco'
import { NavAdmin } from '../nav'
import { FormRecarga } from './form-recarga'

export const dynamic = 'force-dynamic'

export default async function Recargas() {
  await exigirAdmin()

  const { data: corretores } = await supabaseAdmin()
    .from('corretores')
    .select('id, nome, email, creditos, ativo')
    .eq('ativo', true)
    .order('nome')
    .returns<
      { id: string; nome: string; email: string; creditos: number; ativo: boolean }[]
    >()

  const { data: ultimas } = await supabaseAdmin()
    .from('transacoes_credito')
    .select('id, valor, tipo, referencia, criado_em, corretores(nome)')
    .order('criado_em', { ascending: false })
    .limit(30)
    .returns<
      {
        id: string
        valor: number
        tipo: string
        referencia: string | null
        criado_em: string
        corretores: { nome: string } | null
      }[]
    >()

  return (
    <main className="mx-auto max-w-2xl p-4">
      <NavAdmin atual="recargas" />

      <h1 className="mb-1 text-2xl font-bold">Creditar corretor</h1>
      <p className="mb-6 text-sm text-gray-600">
        O corretor faz o PIX e manda o comprovante. Voce confere e credita aqui.
        A transacao e o saldo mudam juntos -- nunca divergem.
      </p>

      <FormRecarga corretores={corretores ?? []} />

      <h2 className="mt-10 mb-3 text-lg font-bold">Ultimos lancamentos</h2>
      <div className="flex flex-col gap-2 text-sm">
        {ultimas?.map((t) => (
          <div key={t.id} className="flex justify-between gap-2 border-b border-gray-200 py-2">
            <div>
              <p className="font-medium">{t.corretores?.nome ?? 'Corretor removido'}</p>
              <p className="text-xs text-gray-600">
                {t.referencia ?? 'sem referencia'} ·{' '}
                {new Date(t.criado_em).toLocaleString('pt-BR')}
              </p>
            </div>
            <span
              className={`shrink-0 font-medium ${
                Number(t.valor) >= 0 ? 'text-green-700' : 'text-gray-700'
              }`}
            >
              {Number(t.valor) >= 0 ? '+' : ''}
              {reais(Number(t.valor))}
            </span>
          </div>
        ))}
        {(ultimas?.length ?? 0) === 0 && (
          <p className="text-gray-600">Nenhum lancamento ainda.</p>
        )}
      </div>
    </main>
  )
}

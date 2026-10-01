import { exigirCorretor } from '@/lib/auth'
import { RENDA_FAIXAS, DIAS_NA_VITRINE } from '@/lib/config'
import { reais } from '@/lib/preco'
import { listarVitrine, cidadesNaVitrine } from './dados'
import { CartaoLead } from './cartao-lead'

// ============================================================================
// VITRINE
//
// Server Component: a consulta roda no servidor e o navegador do corretor
// recebe apenas o que listarVitrine() devolve -- que nao inclui nome nem
// telefone, nem na view, nem na lista de colunas.
//
// Os filtros vivem na URL (?cidade=...), nao em estado de cliente. Assim o
// corretor pode guardar o link de "Campinas, 2 quartos" nos favoritos, e eu
// nao preciso de state manager.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string; bairro?: string; renda_faixa?: string }>
}) {
  const corretor = await exigirCorretor()
  const filtros = await searchParams

  const [leads, cidades] = await Promise.all([
    listarVitrine(filtros),
    cidadesNaVitrine(),
  ])

  return (
    <div className="mx-auto max-w-md pb-10">
      {/* Saldo sempre visivel no topo. */}
      <header className="sticky top-0 border-b border-gray-300 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-600">Seu saldo</p>
            <p className="text-xl font-bold">{reais(Number(corretor.creditos))}</p>
          </div>
          <a
            href="/painel/recarga"
            className="border border-gray-800 px-4 py-3 text-sm font-medium"
          >
            Recarregar
          </a>
        </div>
      </header>

      <main className="p-4">
        <form method="GET" className="mb-6 flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              name="cidade"
              defaultValue={filtros.cidade ?? ''}
              className="w-full border border-gray-400 p-3 text-sm"
            >
              <option value="">Todas as cidades</option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              name="bairro"
              defaultValue={filtros.bairro ?? ''}
              placeholder="Bairro"
              className="w-full border border-gray-400 p-3 text-sm"
            />
          </div>
          <select
            name="renda_faixa"
            defaultValue={filtros.renda_faixa ?? ''}
            className="w-full border border-gray-400 p-3 text-sm"
          >
            <option value="">Todas as faixas de renda</option>
            {RENDA_FAIXAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-gray-800 p-3 text-sm font-medium text-white">
            Filtrar
          </button>
        </form>

        <h1 className="mb-4 text-lg font-bold">
          {leads.length} {leads.length === 1 ? 'lead disponivel' : 'leads disponiveis'}
        </h1>

        {leads.length === 0 && (
          <p className="text-gray-600">
            Nenhum lead com esses filtros. Leads ficam na vitrine por{' '}
            {DIAS_NA_VITRINE} dias e saem assim que outro corretor desbloqueia.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {leads.map((lead) => (
            <CartaoLead key={lead.id} lead={lead} saldo={Number(corretor.creditos)} />
          ))}
        </div>
      </main>
    </div>
  )
}

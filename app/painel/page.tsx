import { exigirCorretor } from '@/lib/auth'
import { RENDA_FAIXAS, DIAS_NA_VITRINE } from '@/lib/config'
import { reais } from '@/lib/preco'
import { listarInteresses, cidadesNaVitrine } from './dados'
import { CartaoInteresse } from './cartao-interesse'

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

  const [interesses, cidades] = await Promise.all([
    listarInteresses(corretor.id, filtros),
    cidadesNaVitrine(corretor.id),
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
              {cidades.map((c: string) => (
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
          {interesses.length}{' '}
          {interesses.length === 1 ? 'interesse disponivel' : 'interesses disponiveis'}
        </h1>

        {interesses.length === 0 && (
          <p className="text-gray-600">
            Nenhum interesse com esses filtros. Eles ficam na vitrine por{' '}
            {DIAS_NA_VITRINE} dias e saem assim que outro corretor revela o
            contato. Voce ve os interesses dos seus empreendimentos e os da
            vitrine geral.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {interesses.map((interesse) => (
            <CartaoInteresse
              key={interesse.id}
              interesse={interesse}
              saldo={Number(corretor.creditos)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

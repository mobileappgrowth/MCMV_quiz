import Link from 'next/link'
import { exigirCorretorOuAdmin } from '@/lib/auth'
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
//
// DUAS LEITURAS DESTA MESMA TELA:
//   corretor -> a vitrine dele (os empreendimentos dele + a vitrine geral),
//               com saldo, recarga e o botao de revelar.
//   admin    -> vistoria: a vitrine inteira, sem filtro de dono, sem saldo e
//               sem botao de compra. Serve para eu ver o que o corretor ve
//               antes de mandar o link, e para conferir o preco que o motor
//               gravou em cada interesse.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string; bairro?: string; renda_faixa?: string }>
}) {
  const visitante = await exigirCorretorOuAdmin()
  const filtros = await searchParams

  // null = vistoria: listarInteresses nao aplica o filtro de dono.
  const corretorId =
    visitante.tipo === 'corretor' ? visitante.corretor.id : null

  const [interesses, cidades] = await Promise.all([
    listarInteresses(corretorId, filtros),
    cidadesNaVitrine(corretorId),
  ])

  // O cartao usa isto para decidir se mostra o botao que cobra.
  const comprador =
    visitante.tipo === 'corretor'
      ? {
          saldo: Number(visitante.corretor.creditos),
          nome: visitante.corretor.nome,
        }
      : null

  return (
    <div className="mx-auto max-w-md pb-10">
      {/* Saldo sempre visivel no topo -- ou o aviso de vistoria, no meu caso. */}
      <header className="sticky top-0 border-b border-gray-300 bg-white p-4">
        {comprador ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-600">Seu saldo</p>
              <p className="text-xl font-bold">{reais(comprador.saldo)}</p>
            </div>
            <div className="flex gap-2">
              <a
                href="/painel/meus-leads"
                className="border border-gray-500 px-3 py-3 text-sm"
              >
                Meus leads
              </a>
              <a
                href="/painel/recarga"
                className="border border-gray-800 px-4 py-3 text-sm font-medium"
              >
                Recarregar
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-amber-800">
                Vistoria de admin
              </p>
              <p className="text-sm text-gray-700">
                Vitrine inteira, sem filtro de dono. Nao da para comprar daqui.
              </p>
            </div>
            <Link
              href="/admin"
              className="shrink-0 border border-gray-800 px-4 py-3 text-sm font-medium"
            >
              Admin
            </Link>
          </div>
        )}
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
            contato.{' '}
            {comprador
              ? 'Voce ve os interesses dos seus empreendimentos e os da vitrine geral.'
              : 'Na vistoria aparecem todos, inclusive os dos empreendimentos sem dono.'}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {interesses.map((interesse) => (
            <CartaoInteresse
              key={interesse.id}
              interesse={interesse}
              comprador={comprador}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

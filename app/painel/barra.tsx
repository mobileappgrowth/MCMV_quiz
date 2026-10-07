import Link from 'next/link'
import { Marca } from '@/components/marca'
import { reais } from '@/lib/preco'

// ============================================================================
// BARRA E ABAS DO PAINEL
//
// Uma copia so, usada pela vitrine, por Meus leads e pela recarga. O saldo
// precisa estar visivel em todas: e o numero que decide se o corretor clica em
// revelar, e escondido ele vira surpresa na hora da cobranca.
//
// corretor null = vistoria do admin: sem saldo, sem recarga, sem abas.
// ============================================================================

export type CorretorDaBarra = { nome: string; creditos: number } | null

export function BarraPainel({ corretor }: { corretor: CorretorDaBarra }) {
  return (
    <div className="bg-marinho text-white">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/painel">
          <Marca claro sufixo={corretor?.nome ?? undefined} />
        </Link>

        {corretor ? (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-medium text-sobre-marinho">Saldo</p>
              <p className="text-[22px] font-extrabold">
                {reais(corretor.creditos)}
              </p>
            </div>
            <Link
              href="/painel/recarga"
              className="rounded-lg bg-amarelo px-4 py-3 text-sm font-extrabold text-marinho hover:bg-amarelo-hover"
            >
              Recarregar
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-amarelo">Vistoria</p>
              <p className="text-sm text-sobre-marinho">
                Vitrine inteira, sem comprar
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border-2 border-sobre-marinho px-4 py-3 text-sm font-bold hover:border-white"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export function Abas({
  atual,
  vitrine,
  meus,
}: {
  atual: 'vitrine' | 'meus'
  vitrine: number
  meus: number
}) {
  const itens = [
    { chave: 'vitrine' as const, href: '/painel', rotulo: 'Vitrine', n: vitrine },
    {
      chave: 'meus' as const,
      href: '/painel/meus-leads',
      rotulo: 'Meus leads',
      n: meus,
    },
  ]

  return (
    <div className="flex gap-6 border-b-2 border-linha">
      {itens.map((i) =>
        i.chave === atual ? (
          <span
            key={i.chave}
            className="-mb-0.5 border-b-[3px] border-marinho px-1 py-3 text-[15px] font-extrabold"
          >
            {i.rotulo} · {i.n}
          </span>
        ) : (
          <Link
            key={i.chave}
            href={i.href}
            className="px-1 py-3 text-[15px] font-semibold text-apagado hover:text-marinho"
          >
            {i.rotulo} · {i.n}
          </Link>
        )
      )}
    </div>
  )
}

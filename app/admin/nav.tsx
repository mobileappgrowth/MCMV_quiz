'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Marca } from '@/components/marca'

// ============================================================================
// NAV DO ADMIN
//
// Uma copia so: com cinco telas, cinco copias ja divergem. Quem esta ativo sai
// do caminho da URL, nao de uma prop -- assim nenhuma pagina precisa se
// lembrar de dizer onde esta, e nenhuma pode mentir.
// ============================================================================

const ITENS = [
  { href: '/admin', rotulo: 'Fila', exato: true },
  // O arquivo: todos os leads, em qualquer estado, com contato.
  { href: '/admin/leads', rotulo: 'Leads' },
  { href: '/admin/empreendimentos', rotulo: 'Empreendimentos' },
  { href: '/admin/corretores', rotulo: 'Corretores' },
  { href: '/admin/recargas', rotulo: 'Recargas' },
  // A vitrine do corretor em modo vistoria: sem saldo e sem botao de compra.
  { href: '/painel', rotulo: 'Vitrine (vistoria)' },
]

export function NavAdmin({ fila }: { fila: number }) {
  const caminho = usePathname()

  return (
    <div className="bg-marinho text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 px-5">
        <div className="py-4">
          <Marca claro sufixo="Admin" />
        </div>

        <nav className="flex flex-wrap">
          {ITENS.map((i) => {
            const ativo = i.exato ? caminho === i.href : caminho.startsWith(i.href)
            return (
              <Link
                key={i.href}
                href={i.href}
                className={`flex items-center gap-2 px-3 py-4.5 text-sm ${
                  ativo
                    ? 'border-b-[3px] border-amarelo font-bold'
                    : 'font-semibold text-sobre-marinho hover:text-white'
                }`}
              >
                {i.rotulo}
                {i.href === '/admin' && fila > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      ativo
                        ? 'bg-amarelo text-marinho'
                        : 'bg-marinho-claro text-white'
                    }`}
                  >
                    {fila}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

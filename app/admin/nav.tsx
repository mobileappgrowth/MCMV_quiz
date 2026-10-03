import Link from 'next/link'

// Nav do admin num lugar so: com tres telas, tres copias ja divergem.
const ITENS = [
  { chave: 'fila', href: '/admin', rotulo: 'Fila de verificacao' },
  { chave: 'empreendimentos', href: '/admin/empreendimentos', rotulo: 'Empreendimentos' },
  { chave: 'corretores', href: '/admin/corretores', rotulo: 'Corretores' },
] as const

export function NavAdmin({ atual }: { atual: (typeof ITENS)[number]['chave'] }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-4 text-sm">
      {ITENS.map((i) =>
        i.chave === atual ? (
          <span key={i.chave} className="font-medium">
            {i.rotulo}
          </span>
        ) : (
          <Link key={i.chave} href={i.href} className="text-blue-700 underline">
            {i.rotulo}
          </Link>
        )
      )}
    </nav>
  )
}

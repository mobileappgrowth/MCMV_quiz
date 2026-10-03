import Link from 'next/link'
import { exigirCorretor } from '@/lib/auth'
import { PIX } from '@/lib/config'
import { reais } from '@/lib/preco'

// Recarga e PIX manual, aprovada no admin. Sem gateway de pagamento.
export const dynamic = 'force-dynamic'

export default async function Recarga() {
  const corretor = await exigirCorretor()

  return (
    <main className="mx-auto max-w-md p-4">
      <Link href="/painel" className="text-sm text-blue-700 underline">
        Voltar para a vitrine
      </Link>

      <h1 className="mt-6 mb-1 text-2xl font-bold">Recarregar creditos</h1>
      <p className="mb-6 text-sm text-gray-600">
        Saldo atual: {reais(Number(corretor.creditos))}
      </p>

      <ol className="mb-6 flex flex-col gap-3 text-sm">
        <li>
          <strong>1.</strong> Faca um PIX do valor que quiser para a chave abaixo.
        </li>
        <li>
          <strong>2.</strong> Me mande o comprovante no WhatsApp.
        </li>
        <li>
          <strong>3.</strong> Eu credito e o saldo aparece aqui.
        </li>
      </ol>

      <div className="mb-4 border border-gray-400 p-4">
        <p className="mb-1 text-xs text-gray-600">Chave PIX</p>
        <p className="mb-3 font-mono text-lg break-all">{PIX.chave}</p>
        <p className="text-xs text-gray-600">Favorecido</p>
        <p className="font-medium">{PIX.nome_favorecido}</p>
      </div>

      <a
        href={`https://wa.me/${PIX.whatsapp_suporte}?text=${encodeURIComponent(
          `Oi! Fiz um PIX para recarregar meus creditos. Sou ${corretor.nome} (${corretor.email}).`
        )}`}
        target="_blank"
        rel="noopener"
        className="block bg-green-700 p-4 text-center font-medium text-white"
      >
        Mandar comprovante no WhatsApp
      </a>
    </main>
  )
}

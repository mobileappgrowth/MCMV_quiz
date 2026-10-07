import Link from 'next/link'
import { exigirCorretor } from '@/lib/auth'
import { PIX, PRECOS } from '@/lib/config'
import { reais } from '@/lib/preco'
import { BarraPainel } from '../barra'

// Recarga e PIX manual, aprovada no admin. Sem gateway de pagamento.
export const dynamic = 'force-dynamic'

const PASSOS = [
  'Faça um PIX do valor que quiser para a chave abaixo.',
  'Mande o comprovante no WhatsApp.',
  'Eu credito e o saldo aparece aqui.',
]

export default async function Recarga() {
  const corretor = await exigirCorretor()

  return (
    <div className="min-h-screen bg-fundo">
      <BarraPainel
        corretor={{ nome: corretor.nome, creditos: Number(corretor.creditos) }}
      />

      <main className="mx-auto flex max-w-[560px] flex-col gap-4.5 p-5 pb-12">
        <Link href="/painel" className="text-sm font-semibold text-link">
          ← Voltar para a vitrine
        </Link>

        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.01em]">
            Recarregar créditos
          </h1>
          <p className="text-[15px] font-medium text-apagado">
            Saldo atual: {reais(Number(corretor.creditos))}
          </p>
        </div>

        <ol className="overflow-hidden rounded-xl border border-linha bg-white">
          {PASSOS.map((texto, i) => (
            <li
              key={texto}
              className={`flex gap-3.5 px-5 py-4 ${
                i < PASSOS.length - 1 ? 'border-b border-divisor' : ''
              }`}
            >
              <span className="font-mono text-[13px] font-semibold text-link">
                0{i + 1}
              </span>
              <span className="text-[15px] font-medium">{texto}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3.5 rounded-xl bg-marinho p-5 text-white">
          <div>
            <p className="text-xs font-medium text-sobre-marinho">Chave PIX</p>
            <p className="font-mono text-xl font-semibold break-all">
              {PIX.chave}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-sobre-marinho">Favorecido</p>
            <p className="font-bold">{PIX.nome_favorecido}</p>
          </div>
        </div>

        <a
          href={`https://wa.me/${PIX.whatsapp_suporte}?text=${encodeURIComponent(
            `Oi! Fiz um PIX para recarregar meus créditos. Sou ${corretor.nome} (${corretor.email}).`
          )}`}
          target="_blank"
          rel="noopener"
          className="rounded-lg bg-verde p-4 text-center font-extrabold text-white hover:bg-verde-hover"
        >
          Mandar comprovante no WhatsApp
        </a>

        {/* O que o credito compra. Sem isto, "recarregue" e um pedido de
            dinheiro sem unidade de medida. */}
        <p className="text-sm/[1.5] text-apagado">
          Um interesse verificado em empreendimento custa a partir de{' '}
          {reais(PRECOS.empreendimento.verificado_antigo)} (
          {reais(PRECOS.empreendimento.verificado_fresco)} nas primeiras horas).
          Perfil só declarado,{' '}
          {reais(PRECOS.empreendimento.nao_verificado)}. O selo do motor ajusta
          o valor para mais ou para menos.
        </p>
      </main>
    </div>
  )
}

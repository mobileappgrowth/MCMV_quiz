'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { reais } from '@/lib/preco'
import { revelarContato } from './acoes'
import type { ContatoRevelado } from '@/lib/contato'

// ============================================================================
// REVELAR -- confirmacao em dois passos
//
// Passo 1: o botao.
// Passo 2: o modal, com o preco, o saldo agora e o saldo depois, e so entao o
//          botao que cobra.
//
// Dois passos nao e burocracia: o credito e pre-pago e nao tem estorno. Um
// toque acidental na vitrine, num celular, custaria dinheiro de verdade. O
// saldo depois aparece calculado porque "voce vai ficar com R$ 10" para a mao
// de quem ia tocar sem pensar.
//
// Revelado, o contato aparece aqui mesmo: mandar o corretor procurar em outra
// aba o que ele acabou de comprar e a melhor forma de gerar uma mensagem de
// "paguei e nao recebi".
// ============================================================================

export function BotaoRevelar({
  interesseId,
  preco,
  saldo,
  nomeCorretor,
}: {
  interesseId: string
  preco: number
  saldo: number
  nomeCorretor: string
}) {
  const [aberto, setAberto] = useState(false)
  const [contato, setContato] = useState<ContatoRevelado | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ofereceRecarga, setOfereceRecarga] = useState(false)
  const [ocupado, executar] = useTransition()

  const temSaldo = saldo >= preco
  const saldoDepois = saldo - preco

  function confirmar() {
    setErro(null)
    executar(async () => {
      const r = await revelarContato(interesseId, preco)
      if (r.ok) {
        setContato(r.contato)
        setAberto(false)
      } else {
        setErro(r.erro)
        setOfereceRecarga(r.recarregar ?? false)
      }
    })
  }

  // --- revelado ---
  if (contato) {
    const primeiro = contato.nome.trim().split(/\s+/)[0]
    const sobre = contato.empreendimento_nome
      ? `sobre o ${contato.empreendimento_nome}`
      : 'sobre as opcoes de imovel que voce procura'
    const mensagem = `Oi, ${primeiro}! Aqui e ${nomeCorretor}. Voce pediu contato ${sobre}. Posso te passar as informacoes?`

    return (
      <div className="border border-green-700 p-3">
        <p className="mb-1 text-xs text-green-700">Contato liberado</p>
        <p className="font-bold">{contato.nome}</p>
        <p className="mb-3 text-lg">{contato.telefone}</p>
        <a
          href={`https://wa.me/55${contato.telefone}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener"
          className="block bg-green-700 p-4 text-center font-medium text-white"
        >
          Abrir no WhatsApp
        </a>
        <p className="mt-2 text-center text-xs text-gray-600">
          Tambem esta em{' '}
          <Link href="/painel/meus-leads" className="underline">
            Meus leads
          </Link>
          , com o formulario de retorno.
        </p>
      </div>
    )
  }

  // --- modal de confirmacao ---
  if (aberto) {
    return (
      <div className="border-2 border-gray-800 p-4">
        <p className="mb-3 font-bold">Confirmar a revelacao?</p>

        <dl className="mb-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between border-b border-gray-200 py-1">
            <dt className="text-gray-600">Custo</dt>
            <dd className="font-medium">{reais(preco)}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <dt className="text-gray-600">Saldo agora</dt>
            <dd>{reais(saldo)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-gray-600">Saldo depois</dt>
            <dd className="font-bold">{reais(saldoDepois)}</dd>
          </div>
        </dl>

        <p className="mb-4 text-xs text-gray-600">
          O credito sai agora e nao tem estorno. Em troca, este interesse passa a
          ser so seu: sai da vitrine de todos os outros corretores.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAberto(false)}
            disabled={ocupado}
            className="flex-1 border border-gray-500 p-4 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={ocupado}
            className="flex-1 bg-gray-800 p-4 font-medium text-white disabled:opacity-50"
          >
            {ocupado ? 'Revelando...' : 'Confirmar'}
          </button>
        </div>

        {erro && (
          <div role="alert" className="mt-3">
            <p className="text-sm text-red-700">{erro}</p>
            {ofereceRecarga && (
              <Link
                href="/painel/recarga"
                className="mt-2 block border border-gray-800 p-3 text-center text-sm font-medium"
              >
                Recarregar creditos
              </Link>
            )}
          </div>
        )}
      </div>
    )
  }

  // --- passo 1 ---
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={!temSaldo}
        className="w-full bg-gray-800 p-4 font-medium text-white disabled:opacity-50"
      >
        Revelar contato por {reais(preco)}
      </button>
      {!temSaldo && (
        <p className="mt-2 text-center text-xs text-gray-600">
          Saldo insuficiente.{' '}
          <Link href="/painel/recarga" className="underline">
            Recarregar
          </Link>
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {erro}
        </p>
      )}
    </>
  )
}

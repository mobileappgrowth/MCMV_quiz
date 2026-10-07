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
// Passo 2: a folha de confirmacao, com o preco, o saldo agora e o saldo
//          depois, e so entao o botao que cobra.
//
// Dois passos nao e burocracia: o credito e pre-pago e nao tem estorno. Um
// toque acidental na vitrine, num celular, custaria dinheiro de verdade. O
// saldo depois aparece calculado porque "voce vai ficar com R$ 10" para a mao
// de quem ia tocar sem pensar.
//
// A folha sobe por cima da tela inteira, nao dentro do cartao: assim o preco e
// o saldo ficam sozinhos no campo de visao no momento em que o dinheiro sai.
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
      <div className="rounded-lg border border-verde">
        <p className="rounded-t-[7px] bg-verde-tenue px-3 py-2 text-xs font-bold text-verde-texto">
          ✓ Contato liberado · exclusivo seu
        </p>
        <div className="p-3">
          <p className="text-[17px] font-extrabold">{contato.nome}</p>
          <p className="mb-3 font-mono text-[19px] font-semibold">
            {contato.telefone}
          </p>
          <a
            href={`https://wa.me/55${contato.telefone}?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noopener"
            className="block rounded-lg bg-verde p-4 text-center font-extrabold text-white hover:bg-verde-hover"
          >
            Chamar no WhatsApp
          </a>
          <p className="mt-2 text-center text-xs text-apagado">
            Tambem esta em{' '}
            <Link href="/painel/meus-leads" className="text-link underline">
              Meus leads
            </Link>
            , com o formulario de retorno.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* --- passo 1 --- */}
      {temSaldo ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="w-full rounded-lg bg-marinho p-4 font-extrabold text-white hover:bg-marinho-hover"
        >
          Revelar contato · {reais(preco)}
        </button>
      ) : (
        <Link
          href="/painel/recarga"
          className="block rounded-lg border-2 border-campo p-3 text-center hover:border-sobre-marinho"
        >
          <span className="block text-[15px] font-extrabold text-apagado">
            {reais(preco)} · saldo insuficiente
          </span>
          <span className="block text-[13px] font-semibold text-link">
            Recarregar para revelar
          </span>
        </Link>
      )}

      {erro && !aberto && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-vermelho-tenue px-3 py-2 text-sm font-semibold text-vermelho"
        >
          {erro}
        </p>
      )}

      {/* --- passo 2: a folha --- */}
      {aberto && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-marinho/55 p-4"
          onClick={() => !ocupado && setAberto(false)}
        >
          <div
            className="flex w-full max-w-[440px] flex-col gap-4 rounded-[14px] bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[22px] font-extrabold">Revelar este contato?</p>

            <dl className="rounded-lg border border-linha">
              <div className="flex justify-between border-b border-divisor px-3.5 py-3 text-[15px] font-medium">
                <dt>Custo</dt>
                <dd className="font-bold">{reais(preco)}</dd>
              </div>
              <div className="flex justify-between border-b border-divisor px-3.5 py-3 text-[15px] font-medium">
                <dt className="text-apagado">Saldo agora</dt>
                <dd>{reais(saldo)}</dd>
              </div>
              <div className="flex justify-between px-3.5 py-3 text-[15px] font-medium">
                <dt className="text-apagado">Saldo depois</dt>
                <dd className="font-extrabold">{reais(saldoDepois)}</dd>
              </div>
            </dl>

            <p className="text-sm/[1.45] text-apagado-escuro">
              O credito sai agora e nao tem estorno. Em troca, este interesse
              passa a ser so seu: sai da vitrine de todos os outros corretores.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={ocupado}
                className="rounded-lg border-2 border-campo px-4.5 py-4 font-bold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={ocupado}
                className="flex-1 rounded-lg bg-marinho py-4 font-extrabold text-white hover:bg-marinho-hover disabled:opacity-50"
              >
                {ocupado ? 'Revelando...' : `Confirmar · ${reais(preco)}`}
              </button>
            </div>

            {erro && (
              <div role="alert">
                <p className="rounded-lg bg-vermelho-tenue px-3.5 py-3 text-sm font-semibold text-vermelho">
                  {erro}
                </p>
                {ofereceRecarga && (
                  <Link
                    href="/painel/recarga"
                    className="mt-2 block rounded-lg border-2 border-campo p-3 text-center text-sm font-bold"
                  >
                    Recarregar creditos
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

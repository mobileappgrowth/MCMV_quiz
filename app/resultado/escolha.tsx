'use client'

import { useState, useTransition } from 'react'
import { CardEmpreendimento } from '@/components/card-empreendimento'
import { Marca } from '@/components/marca'
import {
  CONSENTIMENTO_CONTATO_GERAL,
  CONSENTIMENTO_INTERESSES,
} from '@/lib/config'
import type { EmpreendimentoMatch } from '@/lib/match'
import { salvarInteresses } from './actions'

// ============================================================================
// ESCOLHA DOS EMPREENDIMENTOS
//
// REGRAS QUE ESTE COMPONENTE SUSTENTA, e que sao o produto:
//
//   nada pre-marcado      -- todo checkbox nasce vazio
//   sem "selecionar todos"-- marcar em lote nao e escolha informada
//   sem teto              -- a pessoa marca quantos quiser
//   contador dinamico     -- "voce vai receber contato de N empresas", para
//                            que ela saiba o que esta aceitando ANTES de
//                            aceitar. E o oposto de um formulario que entrega
//                            o telefone para quem pagar mais.
//
// Quem nao marca nenhum recebe a pergunta de contato geral, que aparece
// sozinha quando a contagem chega a zero -- sem tela extra.
//
// A barra de baixo e fixa de proposito: o contador precisa estar sob os olhos
// no momento do toque, nao no topo de uma pagina que a pessoa ja rolou.
// ============================================================================

export function Escolha({
  opcoes,
  cidade,
}: {
  opcoes: EmpreendimentoMatch[]
  cidade: string
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [querGeral, setQuerGeral] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function enviar() {
    setErro(null)
    iniciar(async () => {
      const r = await salvarInteresses([...marcados], querGeral)
      if (r?.erro) setErro(r.erro)
    })
  }

  const n = marcados.size
  const temOpcoes = opcoes.length > 0

  // Aqui a tela deixa de ser uma coluna de celular: o resultado e uma lista de
  // cartoes, e no desktop duas colunas poupam metade da rolagem. O cabecalho
  // marinho atravessa a tela inteira, como no painel.
  return (
    <div className="min-h-screen bg-fundo-fora">
      <header className="bg-marinho text-white">
        <div className="mx-auto max-w-[900px] px-5 pt-5 pb-7">
          <div className="mb-6">
            <Marca claro />
          </div>
          <h1 className="max-w-[640px] text-[27px]/[1.2] font-extrabold tracking-[-0.01em] text-pretty sm:text-[32px]/[1.15]">
            {temOpcoes
              ? 'Encontramos opcoes para o seu perfil'
              : 'Nao encontramos opcoes no momento'}
          </h1>
          <p className="mt-2.5 max-w-[560px] text-[15px]/[1.5] text-sobre-marinho-claro">
            {temOpcoes
              ? 'Marque aqueles sobre os quais voce quer receber contato. Pode marcar quantos quiser, ou nenhum.'
              : `Ainda nao temos empreendimentos cadastrados que sirvam para o seu perfil em ${cidade}.`}
          </p>
        </div>
      </header>

        <main className="mx-auto flex max-w-[900px] flex-col gap-4 px-5 py-6 pb-44">
          <div className="grid gap-4 sm:grid-cols-2">
          {opcoes.map((e) => {
            const marcado = marcados.has(e.id)
            return (
              <CardEmpreendimento key={e.id} emp={e}>
                {/* Desmarcado por padrao, sempre. O <label> envolve a faixa
                    inteira: o alvo de toque e a linha, nao o quadradinho. */}
                <label
                  className={`mt-4 flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3.5 ${
                    marcado
                      ? 'border-marinho bg-amarelo-tenue'
                      : 'border-campo hover:border-sobre-marinho'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(e.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`flex size-6 shrink-0 items-center justify-center rounded-[5px] text-sm font-extrabold ${
                      marcado
                        ? 'bg-marinho text-amarelo'
                        : 'border-2 border-circulo bg-white'
                    }`}
                  >
                    {marcado ? '✓' : ''}
                  </span>
                  <span
                    className={`text-[15px] ${marcado ? 'font-bold' : 'font-semibold'}`}
                  >
                    Quero receber contato sobre este
                  </span>
                </label>
              </CardEmpreendimento>
            )
          })}
          </div>

          {/* A pergunta de contato geral aparece quando nada esta marcado. */}
          {n === 0 && (
            <section className="rounded-[10px] border-[1.5px] border-linha p-4">
              <h2 className="mb-3 text-[17px]/[1.3] font-extrabold text-pretty">
                Quer que um corretor da regiao entre em contato com outras
                opcoes?
              </h2>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3.5 ${
                  querGeral
                    ? 'border-marinho bg-amarelo-tenue'
                    : 'border-campo hover:border-sobre-marinho'
                }`}
              >
                <input
                  type="checkbox"
                  checked={querGeral}
                  onChange={(e) => setQuerGeral(e.target.checked)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-[5px] text-sm font-extrabold ${
                    querGeral
                      ? 'bg-marinho text-amarelo'
                      : 'border-2 border-circulo bg-white'
                  }`}
                >
                  {querGeral ? '✓' : ''}
                </span>
                <span className="text-sm/[1.45] text-apagado-escuro">
                  {CONSENTIMENTO_CONTATO_GERAL.texto}
                </span>
              </label>
            </section>
          )}

          {n > 0 && (
            <p className="text-sm/[1.45] text-apagado">
              {CONSENTIMENTO_INTERESSES.texto}
            </p>
          )}

          {erro && (
            <p
              role="alert"
              className="rounded-lg bg-vermelho-tenue px-3.5 py-3 text-sm font-semibold text-vermelho"
            >
              {erro}
            </p>
          )}
        </main>

        {/* ---------------------------------------------------------------- */}
        {/* BARRA FIXA                                                        */}
        {/* ---------------------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 border-t border-linha bg-white p-4">
        {/* No celular o contador fica acima do botao; no desktop os dois ficam
            na mesma linha, porque ali a barra inteira cabe no olhar. */}
        <div className="mx-auto flex max-w-[900px] flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm font-bold sm:text-left">
            {n === 0
              ? querGeral
                ? 'Um corretor da regiao vai entrar em contato'
                : 'Nenhum empreendimento marcado'
              : `Voce vai receber contato de ${n} ${n === 1 ? 'empresa' : 'empresas'}`}
          </p>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="w-full rounded-lg bg-amarelo py-4 text-base font-extrabold text-marinho hover:bg-amarelo-hover disabled:opacity-50 sm:w-auto sm:px-10"
          >
            {enviando ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

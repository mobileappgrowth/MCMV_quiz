'use client'

import { useState, useTransition } from 'react'
import { CardEmpreendimento } from '@/components/card-empreendimento'
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

  return (
    <main className="mx-auto max-w-md p-4 pb-32">
      <h1 className="mb-1 text-2xl font-bold">
        {opcoes.length > 0
          ? 'Encontramos opcoes para o seu perfil'
          : 'Nao encontramos opcoes no momento'}
      </h1>
      <p className="mb-6 text-gray-600">
        {opcoes.length > 0
          ? 'Marque aqueles sobre os quais voce quer receber contato. Pode marcar quantos quiser, ou nenhum.'
          : `Ainda nao temos empreendimentos cadastrados que sirvam para o seu perfil em ${cidade}.`}
      </p>

      <div className="flex flex-col gap-6">
        {opcoes.map((e) => (
          <CardEmpreendimento key={e.id} emp={e}>
            {/* Desmarcado por padrao, sempre. */}
            <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-gray-200 pt-4">
              <input
                type="checkbox"
                checked={marcados.has(e.id)}
                onChange={() => alternar(e.id)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="text-sm font-medium">
                Quero receber contato sobre este
              </span>
            </label>
          </CardEmpreendimento>
        ))}
      </div>

      {/* A pergunta de contato geral aparece quando nada esta marcado. */}
      {n === 0 && (
        <section className="mt-8 border border-gray-400 p-4">
          <h2 className="mb-2 font-bold">
            Quer que um corretor da regiao entre em contato com outras opcoes?
          </h2>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={querGeral}
              onChange={(e) => setQuerGeral(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            <span className="text-sm text-gray-700">
              {CONSENTIMENTO_CONTATO_GERAL.texto}
            </span>
          </label>
        </section>
      )}

      {n > 0 && (
        <p className="mt-6 text-sm text-gray-700">
          {CONSENTIMENTO_INTERESSES.texto}
        </p>
      )}

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {erro}
        </p>
      )}

      {/* Barra fixa: o contador precisa estar visivel no momento do toque, nao
          no topo de uma pagina que a pessoa ja rolou. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-300 bg-white p-4">
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-center text-sm font-medium">
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
            className="w-full bg-gray-800 p-4 text-lg font-medium text-white disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </main>
  )
}

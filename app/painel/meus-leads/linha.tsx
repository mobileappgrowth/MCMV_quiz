'use client'

import { useState, useTransition } from 'react'
import { reais } from '@/lib/preco'
import { salvarFeedback } from '../acoes'

// ============================================================================
// UM LEAD COMPRADO, com o formulario de retorno em tres cliques
//
// Quatro perguntas de sim/nao e um comentario opcional. Cada uma comeca SEM
// resposta: um padrao pre-marcado viraria ruido no dado, e o dado aqui e o que
// diz se o motor esta calibrado -- depois de 50 leads, cruzar o selo com
// agendou_visita mostra se os pesos estao certos.
// ============================================================================

const PERGUNTAS = [
  { campo: 'atendeu', rotulo: 'Atendeu?' },
  { campo: 'tem_renda', rotulo: 'Tem a renda?' },
  { campo: 'tem_restricao', rotulo: 'Tem restricao?' },
  { campo: 'agendou_visita', rotulo: 'Agendou visita?' },
] as const

type Campo = (typeof PERGUNTAS)[number]['campo']

export function LinhaMeuLead({
  desbloqueioId,
  nome,
  telefone,
  local,
  empreendimento,
  precoPago,
  diasDesdeCaptacao,
  nomeCorretor,
  jaRespondeu,
}: {
  desbloqueioId: string
  nome: string
  telefone: string
  local: string
  empreendimento: string | null
  precoPago: number
  diasDesdeCaptacao: number
  nomeCorretor: string
  jaRespondeu: boolean
}) {
  const [respostas, setRespostas] = useState<Record<Campo, boolean | null>>({
    atendeu: null,
    tem_renda: null,
    tem_restricao: null,
    agendou_visita: null,
  })
  const [comentario, setComentario] = useState('')
  const [enviado, setEnviado] = useState(jaRespondeu)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, executar] = useTransition()

  const primeiro = nome.trim().split(/\s+/)[0]
  const sobre = empreendimento
    ? `sobre o ${empreendimento}`
    : 'sobre as opcoes de imovel que voce procura'
  const mensagem = `Oi, ${primeiro}! Aqui e ${nomeCorretor}. Voce pediu contato ${sobre}. Posso te passar as informacoes?`

  function enviar() {
    setErro(null)
    executar(async () => {
      const r = await salvarFeedback(desbloqueioId, { ...respostas, comentario })
      if (r.ok) setEnviado(true)
      else setErro(r.erro)
    })
  }

  return (
    <article className="border border-gray-400 p-4">
      <p className="text-xs text-gray-600">
        {empreendimento ?? 'Busca aberta'} · {reais(precoPago)} ·{' '}
        {diasDesdeCaptacao} {diasDesdeCaptacao === 1 ? 'dia' : 'dias'} de captado
      </p>
      <h2 className="mt-1 font-bold">{nome}</h2>
      <p className="text-lg">{telefone}</p>
      <p className="mb-3 text-sm text-gray-600">{local}</p>

      <a
        href={`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`}
        target="_blank"
        rel="noopener"
        className="mb-4 block bg-green-700 p-4 text-center font-medium text-white"
      >
        Abrir no WhatsApp
      </a>

      {enviado ? (
        <p className="border-t border-gray-200 pt-3 text-sm text-green-700">
          Retorno registrado. Obrigado -- e com isso que eu calibro a
          verificacao.
        </p>
      ) : (
        <div className="border-t border-gray-200 pt-3">
          <p className="mb-2 text-sm font-medium">Como foi?</p>
          <div className="mb-3 flex flex-col gap-2">
            {PERGUNTAS.map((p) => (
              <div key={p.campo} className="flex items-center justify-between gap-2">
                <span className="text-sm">{p.rotulo}</span>
                <div className="flex gap-1">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() =>
                        setRespostas((r) => ({
                          ...r,
                          [p.campo]: r[p.campo] === v ? null : v,
                        }))
                      }
                      className={`border px-4 py-2 text-sm ${
                        respostas[p.campo] === v
                          ? 'border-gray-800 bg-gray-800 text-white'
                          : 'border-gray-400'
                      }`}
                    >
                      {v ? 'Sim' : 'Nao'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            placeholder="Comentario (opcional)"
            className="mb-3 w-full border border-gray-400 p-2 text-sm"
          />

          <button
            type="button"
            onClick={enviar}
            disabled={ocupado}
            className="w-full border border-gray-700 p-3 text-sm font-medium disabled:opacity-50"
          >
            {ocupado ? 'Enviando...' : 'Enviar retorno'}
          </button>

          {erro && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

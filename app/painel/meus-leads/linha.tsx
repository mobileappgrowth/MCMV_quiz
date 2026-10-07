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
//
// O telefone em fonte monoespacada de proposito: numero para ler e digitar,
// nao texto. Com Public Sans, 1 e l confundem na pressa.
// ============================================================================

const PERGUNTAS = [
  { campo: 'atendeu', rotulo: 'Atendeu?' },
  { campo: 'tem_renda', rotulo: 'Tem a renda?' },
  { campo: 'tem_restricao', rotulo: 'Tem restrição?' },
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
    : 'sobre as opções de imóvel que você procura'
  const mensagem = `Oi, ${primeiro}! Aqui é ${nomeCorretor}. Você pediu contato ${sobre}. Posso te passar as informações?`

  function enviar() {
    setErro(null)
    executar(async () => {
      const r = await salvarFeedback(desbloqueioId, { ...respostas, comentario })
      if (r.ok) setEnviado(true)
      else setErro(r.erro)
    })
  }

  return (
    <article className="overflow-hidden rounded-[10px] border border-linha bg-white">
      <p className="flex flex-wrap justify-between gap-2 bg-verde-tenue px-5 py-2.5 text-[13px] font-bold text-verde-texto">
        <span>{empreendimento ?? 'Busca aberta'}</span>
        <span className="font-medium">
          {reais(precoPago)} · captado há {diasDesdeCaptacao}{' '}
          {diasDesdeCaptacao === 1 ? 'dia' : 'dias'}
        </span>
      </p>

      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-[24px] font-extrabold tracking-[-0.01em]">
            {nome}
          </h2>
          <p className="text-sm font-medium text-apagado">{local}</p>
        </div>

        <p className="font-mono text-[22px] font-semibold tracking-[-0.01em]">
          {telefone}
        </p>

        <div className="flex flex-wrap gap-2.5">
          <a
            href={`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noopener"
            className="flex-[2_1_220px] rounded-lg bg-verde p-4 text-center font-extrabold text-white hover:bg-verde-hover"
          >
            Chamar no WhatsApp
          </a>
          <a
            href={`tel:${telefone}`}
            className="flex-[1_1_120px] rounded-lg border-2 border-campo p-4 text-center font-extrabold hover:border-sobre-marinho"
          >
            Ligar
          </a>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RETORNO                                                            */}
      {/* ------------------------------------------------------------------ */}
      {enviado ? (
        <p className="border-t border-divisor px-5 py-4 text-sm font-semibold text-verde">
          Retorno registrado. Obrigado — é com isso que eu calibro a
          verificação.
        </p>
      ) : (
        <div className="flex flex-col gap-3 border-t border-divisor p-5">
          <div>
            <p className="text-[17px] font-extrabold">Como foi o contato?</p>
            <p className="text-sm text-apagado">
              Seu retorno ajuda a melhorar a verificação do próximo.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {PERGUNTAS.map((p) => (
              <div
                key={p.campo}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm font-medium">{p.rotulo}</span>
                <div className="flex gap-1.5">
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
                      aria-pressed={respostas[p.campo] === v}
                      className={`rounded-lg px-4 py-2.5 text-sm ${
                        respostas[p.campo] === v
                          ? 'bg-marinho font-bold text-white'
                          : 'border-2 border-campo font-semibold hover:border-sobre-marinho'
                      }`}
                    >
                      {v ? 'Sim' : 'Não'}
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
            placeholder="Comentário (opcional)"
            className="w-full resize-y rounded-lg border-2 border-campo p-3 text-sm outline-none focus:border-marinho"
          />

          <button
            type="button"
            onClick={enviar}
            disabled={ocupado}
            className="rounded-lg border-2 border-campo p-3.5 text-sm font-bold hover:border-sobre-marinho disabled:opacity-50"
          >
            {ocupado ? 'Enviando...' : 'Enviar retorno'}
          </button>

          {erro && (
            <p
              role="alert"
              className="rounded-lg bg-vermelho-tenue px-3.5 py-3 text-sm font-semibold text-vermelho"
            >
              {erro}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

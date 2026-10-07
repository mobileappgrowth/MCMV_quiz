'use client'

import { useState, useTransition } from 'react'
import { verificarLead, descartarLead, salvarNota } from './actions'
import { rotuloSelo, type Selo } from '@/lib/motor'

// ============================================================================
// FICHA DE UM LEAD NA FILA
//
// E a tela da ligacao: telefone grande e clicavel no topo, os dados do quiz
// em grade, as notas, e os botoes de decisao embaixo.
//
// Aprovar exige escolher o selo verificado: um toque, sem passo extra. Nao ha
// botao generico de "aprovar" de proposito -- sem selo, o cartao da vitrine
// nao teria o que mostrar, e o preco cheio nao se sustenta.
// ============================================================================

const SELOS: Selo[] = ['forte', 'medio', 'a_confirmar']

type LeadFila = {
  id: string
  nome: string
  telefone: string
  local: string
  notas: string | null
  dias: number
  qtdInteresses: number
  qualificacao: [string, string][]
  seloDeclarado: string | null
  pontuacao: number | null
}

export function LinhaFila({ lead }: { lead: LeadFila }) {
  const [nota, setNota] = useState(lead.notas ?? '')
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, executar] = useTransition()

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setAviso(null)
    executar(async () => {
      const r = await acao()
      if (!r.ok) setAviso(r.erro ?? 'Falha na operação.')
    })
  }

  return (
    <section className="overflow-hidden rounded-[10px] border border-linha bg-white">
      {/* --- cabecalho: quem e, e o botao de ligar --- */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-divisor p-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-[-0.01em]">
            {lead.nome}
          </h2>
          <p className="text-sm font-medium text-apagado">
            {lead.local} · captado há {lead.dias}{' '}
            {lead.dias === 1 ? 'dia' : 'dias'} ·{' '}
            {lead.qtdInteresses === 0
              ? 'nenhum interesse'
              : `${lead.qtdInteresses} ${lead.qtdInteresses === 1 ? 'interesse' : 'interesses'}`}
          </p>
        </div>
        <a
          href={`https://wa.me/55${lead.telefone}`}
          target="_blank"
          rel="noopener"
          className="rounded-lg bg-verde px-4 py-3 font-mono text-[15px] font-semibold whitespace-nowrap text-white hover:bg-verde-hover"
        >
          {lead.telefone} ↗
        </a>
      </div>

      {/* O selo que o motor deu a partir do que a pessoa digitou. E um ponto de
          partida para a ligacao, nao um veredito -- quem decide o selo
          verificado e voce, depois de falar com ela. */}
      <p className="border-b border-divisor bg-fundo px-5 py-2.5 text-sm">
        Declarado pelo quiz:{' '}
        <strong>{rotuloSelo(lead.seloDeclarado)}</strong>
        {lead.pontuacao !== null && (
          <span className="text-apagado"> ({lead.pontuacao} pontos)</span>
        )}
      </p>

      <dl className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-px border-b border-divisor bg-divisor">
        {lead.qualificacao.map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-white px-5 py-2.5">
            <dt className="text-[11px] font-medium text-apagado">{rotulo}</dt>
            <dd className="text-sm font-bold">{valor || '-'}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Notas da verificação</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="O que ela disse na ligação."
            className="w-full resize-y rounded-lg border-2 border-campo p-3 text-[15px] outline-none focus:border-marinho"
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-bold">Aprovar como:</p>
          <div className="flex flex-wrap gap-2">
            {SELOS.map((selo) => (
              <button
                key={selo}
                type="button"
                disabled={ocupado}
                onClick={() => rodar(() => verificarLead(lead.id, selo))}
                className={`flex-1 rounded-lg px-4 py-3.5 text-[15px] font-extrabold disabled:opacity-50 ${
                  selo === lead.seloDeclarado
                    ? 'bg-verde text-white hover:bg-verde-hover'
                    : 'border-2 border-verde text-verde-texto hover:bg-verde-tenue'
                }`}
              >
                {rotuloSelo(selo)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-apagado">
            O realçado é o que o motor sugeriu. Quem decide é a ligação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => rodar(() => salvarNota(lead.id, nota))}
            className="flex-1 rounded-lg border-2 border-campo px-4 py-3.5 text-[15px] font-bold hover:border-sobre-marinho disabled:opacity-50"
          >
            Salvar nota
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => rodar(() => descartarLead(lead.id))}
            className="flex-1 rounded-lg border-2 border-vermelho-linha px-4 py-3.5 text-[15px] font-bold text-vermelho disabled:opacity-50"
          >
            Descartar
          </button>
        </div>

        {aviso && (
          <p
            role="alert"
            className="rounded-lg bg-vermelho-tenue px-3.5 py-3 text-sm font-semibold text-vermelho"
          >
            {aviso}
          </p>
        )}
      </div>
    </section>
  )
}

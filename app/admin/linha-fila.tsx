'use client'

import { useState, useTransition } from 'react'
import { verificarLead, descartarLead, salvarNota } from './actions'
import { reais } from '@/lib/preco'

type LeadFila = {
  id: string
  nome: string
  telefone: string
  notas: string | null
  dias: number
  precoSeAprovarAgora: number
  qualificacao: [string, string][]
}

export function LinhaFila({ lead }: { lead: LeadFila }) {
  const [nota, setNota] = useState(lead.notas ?? '')
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, executar] = useTransition()

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setAviso(null)
    executar(async () => {
      const r = await acao()
      if (!r.ok) setAviso(r.erro ?? 'Falha na operacao.')
    })
  }

  // Link de WhatsApp pronto: e dessa tela que eu faco a ligacao de verificacao.
  const whatsapp = `https://wa.me/55${lead.telefone}`

  return (
    <section className="border border-gray-400 p-4">
      <div className="mb-3">
        <h2 className="text-lg font-bold">{lead.nome}</h2>
        <p className="text-gray-700">
          <a href={whatsapp} target="_blank" rel="noopener" className="text-blue-700 underline">
            {lead.telefone}
          </a>
        </p>
        <p className="text-sm text-gray-600">
          Captado ha {lead.dias} {lead.dias === 1 ? 'dia' : 'dias'} &middot; se
          aprovar agora, entra a {reais(lead.precoSeAprovarAgora)}
        </p>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {lead.qualificacao.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-2 border-b border-gray-200 py-1">
            <dt className="text-gray-600">{rotulo}</dt>
            <dd className="text-right font-medium">{valor || '-'}</dd>
          </div>
        ))}
      </dl>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">Notas da verificacao</span>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="O que ela disse na ligacao."
          className="w-full border border-gray-400 p-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => rodar(() => salvarNota(lead.id, nota))}
          className="border border-gray-500 px-4 py-3 text-sm disabled:opacity-50"
        >
          Salvar nota
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => rodar(() => verificarLead(lead.id))}
          className="bg-green-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          Verificado &middot; {reais(lead.precoSeAprovarAgora)}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => rodar(() => descartarLead(lead.id))}
          className="border border-red-700 px-4 py-3 text-sm text-red-700 disabled:opacity-50"
        >
          Descartar
        </button>
      </div>

      {aviso && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {aviso}
        </p>
      )}
    </section>
  )
}

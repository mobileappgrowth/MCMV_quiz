'use client'

import { useState, useTransition } from 'react'
import { reais } from '@/lib/preco'
import { creditarCorretor } from '../actions'

export function FormRecarga({
  corretores,
}: {
  corretores: { id: string; nome: string; email: string; creditos: number }[]
}) {
  const [corretorId, setCorretorId] = useState('')
  const [valor, setValor] = useState('')
  const [referencia, setReferencia] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, executar] = useTransition()

  const escolhido = corretores.find((c) => c.id === corretorId)
  const numero = Number(valor.replace(/\./g, '').replace(',', '.'))

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    setAviso(null)
    executar(async () => {
      const r = await creditarCorretor(corretorId, numero, referencia)
      if (r.ok) {
        setAviso({
          tipo: 'ok',
          texto: `${reais(numero)} creditados para ${escolhido?.nome}.`,
        })
        setValor('')
        setReferencia('')
      } else {
        setAviso({ tipo: 'erro', texto: r.erro })
      }
    })
  }

  return (
    <form onSubmit={enviar}>
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">Corretor</span>
        <select
          value={corretorId}
          onChange={(e) => setCorretorId(e.target.value)}
          required
          className="w-full border border-gray-400 p-3"
        >
          <option value="">Escolha</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — saldo {reais(Number(c.creditos))}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">Valor (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          className="w-full border border-gray-400 p-3"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">Referencia</span>
        <span className="mb-1 block text-xs text-gray-600">
          Data do PIX, ultimos digitos, o que te ajude a achar isto daqui a dois
          meses. &quot;Recarga&quot; nao e referencia.
        </span>
        <input
          type="text"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          required
          className="w-full border border-gray-400 p-3"
        />
      </label>

      {escolhido && Number.isFinite(numero) && numero > 0 && (
        <p className="mb-3 text-sm text-gray-700">
          {escolhido.nome} fica com{' '}
          <strong>{reais(Number(escolhido.creditos) + numero)}</strong>.
        </p>
      )}

      <button
        type="submit"
        disabled={ocupado}
        className="w-full bg-gray-800 p-4 font-medium text-white disabled:opacity-50"
      >
        {ocupado ? 'Creditando...' : 'Creditar'}
      </button>

      {aviso && (
        <p
          role="alert"
          className={`mt-4 text-sm ${aviso.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}
        >
          {aviso.texto}
        </p>
      )}
    </form>
  )
}

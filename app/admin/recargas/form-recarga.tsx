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
    <form onSubmit={enviar} className="rounded-[10px] border border-linha bg-white p-5">
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-bold">Corretor</span>
        <select
          value={corretorId}
          onChange={(e) => setCorretorId(e.target.value)}
          required
          className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
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
        <span className="mb-1 block text-sm font-bold">Valor (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
          className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
        />
      </label>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-bold">Referencia</span>
        <span className="mb-1 block text-xs text-apagado">
          Data do PIX, ultimos digitos, o que te ajude a achar isto daqui a dois
          meses. &quot;Recarga&quot; nao e referencia.
        </span>
        <input
          type="text"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          required
          className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
        />
      </label>

      {escolhido && Number.isFinite(numero) && numero > 0 && (
        <p className="mb-3 rounded-lg bg-fundo px-3.5 py-3 text-sm text-apagado-escuro">
          {escolhido.nome} fica com{' '}
          <strong>{reais(Number(escolhido.creditos) + numero)}</strong>.
        </p>
      )}

      <button
        type="submit"
        disabled={ocupado}
        className="w-full rounded-lg bg-marinho p-4 font-extrabold text-white hover:bg-marinho-hover disabled:opacity-50"
      >
        {ocupado ? 'Creditando...' : 'Creditar'}
      </button>

      {aviso && (
        <p
          role="alert"
          className={`mt-4 rounded-lg px-3.5 py-3 text-sm font-semibold ${
            aviso.tipo === 'ok'
              ? 'bg-verde-tenue text-verde-texto'
              : 'bg-vermelho-tenue text-vermelho'
          }`}
        >
          {aviso.texto}
        </p>
      )}
    </form>
  )
}

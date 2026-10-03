'use client'

import { useState, useTransition } from 'react'
import { cadastrarCorretor } from '../actions'

const VAZIO = { nome: '', email: '', telefone: '', creci: '' }

export function FormCorretor() {
  const [campos, setCampos] = useState(VAZIO)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, executar] = useTransition()

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setAviso(null)
    executar(async () => {
      const r = await cadastrarCorretor(campos)
      if (r.ok) {
        setAviso({ tipo: 'ok', texto: `${campos.nome} cadastrado. Ja pode entrar pelo /login.` })
        setCampos(VAZIO)
      } else {
        setAviso({ tipo: 'erro', texto: r.erro })
      }
    })
  }

  function campo(nome: keyof typeof VAZIO, rotulo: string, tipo = 'text') {
    return (
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">{rotulo}</span>
        <input
          type={tipo}
          value={campos[nome]}
          onChange={(e) => setCampos({ ...campos, [nome]: e.target.value })}
          className="w-full border border-gray-400 p-3"
        />
      </label>
    )
  }

  return (
    <form onSubmit={enviar}>
      {campo('nome', 'Nome')}
      {campo('email', 'Email (e por onde ele entra)', 'email')}
      {campo('telefone', 'Telefone', 'tel')}
      {campo('creci', 'CRECI')}

      <button
        type="submit"
        disabled={ocupado}
        className="w-full bg-gray-800 p-4 font-medium text-white disabled:opacity-50"
      >
        {ocupado ? 'Cadastrando...' : 'Cadastrar e liberar acesso'}
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

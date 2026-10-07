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
        setAviso({ tipo: 'ok', texto: `${campos.nome} cadastrado. Já pode entrar pelo /login.` })
        setCampos(VAZIO)
      } else {
        setAviso({ tipo: 'erro', texto: r.erro })
      }
    })
  }

  function campo(nome: keyof typeof VAZIO, rotulo: string, tipo = 'text') {
    return (
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-bold">{rotulo}</span>
        <input
          type={tipo}
          value={campos[nome]}
          onChange={(e) => setCampos({ ...campos, [nome]: e.target.value })}
          className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
        />
      </label>
    )
  }

  return (
    <form onSubmit={enviar} className="rounded-[10px] border border-linha bg-white p-5">
      {campo('nome', 'Nome')}
      {campo('email', 'Email (é por onde ele entra)', 'email')}
      {campo('telefone', 'Telefone', 'tel')}
      {campo('creci', 'CRECI')}

      <button
        type="submit"
        disabled={ocupado}
        className="w-full rounded-lg bg-marinho p-4 font-extrabold text-white hover:bg-marinho-hover disabled:opacity-50"
      >
        {ocupado ? 'Cadastrando...' : 'Cadastrar e liberar acesso'}
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

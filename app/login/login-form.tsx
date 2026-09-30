'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/browser'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'enviado'>('inicial')
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    setEstado('enviando')

    const supabase = createBrowserSupabase()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErro('Nao conseguimos enviar o link. Confira o email e tente de novo.')
      setEstado('inicial')
      return
    }

    setEstado('enviado')
  }

  if (estado === 'enviado') {
    return (
      <div>
        <p className="mb-2 font-medium">Link enviado para {email}.</p>
        <p className="text-gray-600">
          Abra o email no celular e toque no link. Ele vale por uma hora.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar}>
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-400 p-3 text-lg"
        />
      </label>

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="w-full bg-gray-800 p-4 text-lg font-medium text-white disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Enviando...' : 'Enviar link de acesso'}
      </button>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {erro}
        </p>
      )}
    </form>
  )
}

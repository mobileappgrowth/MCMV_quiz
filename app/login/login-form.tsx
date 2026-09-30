'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/browser'

// ============================================================================
// LOGIN -- somente para quem ja esta cadastrado.
//
// shouldCreateUser: false e a trava. Sem ela, qualquer pessoa que digitasse um
// email criaria um usuario de autenticacao no projeto. O cadastro de corretor e
// feito a mao no admin, que cria o usuario de autenticacao e a linha em
// corretores na mesma acao.
//
// Consequencia: email nao cadastrado recebe erro explicito, nao um link que
// nunca chega. Com um punhado de corretores conhecidos e onboarding pessoal,
// dizer "fale com o administrador" evita uma ligacao de suporte.
// ============================================================================

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
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      // O Supabase responde otp_disabled quando o email nao existe e a criacao
      // esta desligada. Qualquer outro erro e falha de envio de verdade.
      const naoCadastrado =
        error.code === 'otp_disabled' || /signups not allowed/i.test(error.message)

      setErro(
        naoCadastrado
          ? 'Este email nao esta cadastrado. Fale com o administrador para liberar seu acesso.'
          : 'Nao conseguimos enviar o link agora. Tente de novo em alguns minutos.'
      )
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

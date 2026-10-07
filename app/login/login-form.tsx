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
  // Segunda linha da mensagem: o que fazer a respeito.
  const [detalhe, setDetalhe] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    setDetalhe(null)
    setEstado('enviando')

    // As NEXT_PUBLIC_ sao embutidas no bundle durante o BUILD. Se faltarem la,
    // chegam aqui como undefined e createBrowserSupabase() lanca excecao.
    // Checar antes transforma "o botao travou" em uma instrucao acionavel.
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setErro('O aplicativo esta sem a configuracao do Supabase.')
      setDetalhe(
        'As variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
          'precisam estar nas variaveis de BUILD (nao so nas de execucao), e o ' +
          'build precisa ser refeito depois de salva-las.'
      )
      setEstado('inicial')
      return
    }

    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        // Mensagem por causa. "Nao funcionou" nao ajuda ninguem a consertar.
        const status = (error as { status?: number }).status
        const msg = error.message ?? ''

        if (error.code === 'otp_disabled' || /signups not allowed/i.test(msg)) {
          setErro('Este email nao esta cadastrado.')
          setDetalhe(
            'O login nao cria contas. Peca ao administrador para cadastrar, ou ' +
              '-- se voce e o administrador -- crie o usuario em Supabase > ' +
              'Authentication > Users > Add user, com Auto Confirm ligado.'
          )
        } else if (status === 429 || /rate limit/i.test(msg)) {
          setErro('Limite de envio de emails atingido.')
          setDetalhe(
            'O servico de email embutido do Supabase tem limite baixo por hora. ' +
              'Espere alguns minutos, ou configure um SMTP proprio em ' +
              'Authentication > Emails.'
          )
        } else if (/redirect/i.test(msg)) {
          setErro('A URL de redirecionamento nao esta liberada.')
          setDetalhe(
            `Adicione ${window.location.origin}/auth/callback em Supabase > ` +
              'Authentication > URL Configuration > Redirect URLs.'
          )
        } else {
          setErro('Nao conseguimos enviar o link.')
          setDetalhe(msg)
        }
        setEstado('inicial')
        return
      }

      setEstado('enviado')
    } catch (e) {
      // Rede caida, chave invalida, CORS. Sem isto o botao ficava preso em
      // "Enviando..." e a tela nao dizia nada.
      console.error('[login]', e)
      setErro('Falha inesperada ao enviar o link.')
      setDetalhe(e instanceof Error ? e.message : String(e))
      setEstado('inicial')
    }
  }

  if (estado === 'enviado') {
    return (
      <div className="flex flex-col gap-4">
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-verde-tenue text-[22px] font-extrabold text-verde"
        >
          ✓
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[22px] font-extrabold">Link enviado</p>
          <p className="text-[15px]/[1.45] text-apagado">
            Enviamos para <strong className="text-marinho">{email}</strong>.
            Abra o email no celular e toque no link. Ele vale por uma hora.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEstado('inicial')}
          className="text-sm font-semibold text-apagado"
        >
          Usar outro email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4.5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold">Entrar no painel</h1>
        <p className="text-[15px]/[1.45] text-apagado">
          Mandamos um link de acesso para o seu email. Sem senha.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="voce@imobiliaria.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border-2 border-campo p-4 text-[17px] font-medium text-marinho outline-none focus:border-marinho"
        />
      </label>

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="rounded-lg bg-marinho p-4 font-extrabold text-white hover:bg-marinho-hover disabled:opacity-50"
      >
        {estado === 'enviando' ? 'Enviando...' : 'Enviar link de acesso'}
      </button>

      {erro && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-lg bg-vermelho-tenue p-3.5"
        >
          <p className="text-sm font-bold text-vermelho">{erro}</p>
          {detalhe && <p className="text-sm text-apagado-escuro">{detalhe}</p>}
        </div>
      )}
    </form>
  )
}

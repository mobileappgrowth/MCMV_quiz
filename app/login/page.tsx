import { LoginForm } from './login-form'

// Login unico: corretor e admin entram pela mesma porta. Quem e quem se decide
// depois, por email, no callback.
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-2 text-2xl font-bold">Entrar</h1>
      <p className="mb-6 text-gray-600">
        Digite seu email. Enviamos um link de acesso, sem senha.
      </p>

      {/* O callback redireciona para ca com ?erro=... quando o link falha.
          Antes esta pagina ignorava o parametro: a pessoa voltava para a mesma
          tela sem explicacao nenhuma, e nao havia o que fazer a respeito. */}
      {erro && (
        <div role="alert" className="mb-6 border border-red-700 p-3">
          <p className="text-sm font-medium text-red-700">
            O link de acesso nao funcionou.
          </p>
          <p className="mt-1 text-sm text-gray-700">{erro}</p>
          <p className="mt-2 text-sm text-gray-600">
            Links de acesso valem uma hora e servem uma vez so. Peca um novo
            abaixo, e abra-o no mesmo aparelho e navegador em que pediu.
          </p>
        </div>
      )}

      <LoginForm />
    </main>
  )
}

import { Marca } from '@/components/marca'
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
    <main className="flex min-h-screen items-center justify-center bg-marinho p-6">
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <Marca claro sufixo="Corretores" />

        <div className="flex flex-col gap-4.5 rounded-xl bg-white p-7">
          {/* O callback redireciona para ca com ?erro=... quando o link falha.
              Antes esta pagina ignorava o parametro: a pessoa voltava para a
              mesma tela sem explicacao nenhuma, e nao havia o que fazer a
              respeito. */}
          {erro && (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-lg bg-vermelho-tenue p-3.5"
            >
              <p className="text-sm font-bold text-vermelho">
                O link de acesso não funcionou.
              </p>
              <p className="text-sm text-apagado-escuro">{erro}</p>
              <p className="text-[13px] text-apagado">
                Links de acesso valem uma hora e servem uma vez só. Peça um
                novo abaixo, e abra-o no mesmo aparelho e navegador em que
                pediu.
              </p>
            </div>
          )}

          <LoginForm />
        </div>

        <p className="text-center text-[13px] font-medium text-sobre-marinho">
          Não é corretor?{' '}
          <a href="/" className="underline">
            Ver as opções de imóvel
          </a>
        </p>
      </div>
    </main>
  )
}

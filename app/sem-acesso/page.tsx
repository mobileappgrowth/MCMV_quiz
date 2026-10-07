import { Marca } from '@/components/marca'

// Usuario autenticado, mas sem cadastro em corretores (ou desativado).
// Separado do /login de proposito: dizer "entre de novo" a quem ja esta logado
// gera um loop e uma ligacao de suporte.
export default function SemAcesso() {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-marinho p-6">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">
        <Marca claro sufixo="Corretores" />
        <div className="flex flex-col gap-3 rounded-xl bg-white p-7">
          <h1 className="text-2xl font-extrabold">Acesso ainda nao liberado</h1>
          <p className="text-apagado-escuro">
            Seu login funcionou, mas sua conta de corretor ainda nao esta ativa.
          </p>
          <p className="text-apagado-escuro">
            Fale com o administrador para liberar. Nao precisa cadastrar de
            novo.
          </p>
        </div>
      </div>
    </main>
  )
}

// Usuario autenticado, mas sem cadastro em corretores (ou desativado).
// Separado do /login de proposito: dizer "entre de novo" a quem ja esta logado
// gera um loop e uma ligacao de suporte.
export default function SemAcesso() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-4 text-2xl font-bold">Acesso ainda nao liberado</h1>
      <p className="mb-3 text-gray-700">
        Seu login funcionou, mas sua conta de corretor ainda nao esta ativa.
      </p>
      <p className="text-gray-700">
        Fale com o administrador para liberar. Nao precisa cadastrar de novo.
      </p>
    </main>
  )
}

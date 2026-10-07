import { exigirAdmin } from '@/lib/auth'
import { Formulario } from '../formulario'

export const dynamic = 'force-dynamic'

export default async function NovoEmpreendimento() {
  await exigirAdmin()

  return (
    <main className="mx-auto max-w-[900px] p-5 pb-12">
      <h1 className="mb-1 text-2xl font-extrabold tracking-[-0.01em]">Cadastrar empreendimento</h1>
      <p className="mb-6 text-sm text-apagado">
        Nasce como rascunho, invisivel. Salvar incompleto e permitido; publicar
        e que exige o conjunto.
      </p>
      <Formulario />
    </main>
  )
}

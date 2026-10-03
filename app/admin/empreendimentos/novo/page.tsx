import { exigirAdmin } from '@/lib/auth'
import { NavAdmin } from '../../nav'
import { Formulario } from '../formulario'

export const dynamic = 'force-dynamic'

export default async function NovoEmpreendimento() {
  await exigirAdmin()

  return (
    <main className="mx-auto max-w-2xl p-4">
      <NavAdmin atual="empreendimentos" />
      <h1 className="mb-1 text-2xl font-bold">Cadastrar empreendimento</h1>
      <p className="mb-6 text-sm text-gray-600">
        Nasce como rascunho, invisivel. Salvar incompleto e permitido; publicar
        e que exige o conjunto.
      </p>
      <Formulario />
    </main>
  )
}

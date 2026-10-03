import { supabaseAdmin } from '@/lib/supabase/admin'
import { reais } from '@/lib/preco'

// ============================================================================
// CONTADORES -- texto, sem grafico
//
// Cinco numeros que dizem se o negocio funciona. Contados em memoria porque o
// volume e de dezenas por semana: montar group by pela API custaria mais
// codigo do que economiza.
//
// A TAXA DE DESBLOQUEIO e a mais importante das cinco. Interesse que fica na
// vitrine e nao vende significa uma de duas coisas: o preco esta alto, ou o
// perfil nao serve para quem esta olhando. Nenhuma das duas aparece nos outros
// quatro numeros.
// ============================================================================

export async function Contadores() {
  const db = supabaseAdmin()

  const inicioDoMes = new Date()
  inicioDoMes.setDate(1)
  inicioDoMes.setHours(0, 0, 0, 0)

  const [leads, interesses, desbloqueios] = await Promise.all([
    db.from('leads').select('status').returns<{ status: string }[]>(),
    db.from('interesses').select('id').returns<{ id: string }[]>(),
    db
      .from('desbloqueios')
      .select('preco_pago, criado_em')
      .returns<{ preco_pago: number; criado_em: string }[]>(),
  ])

  const todos = leads.data ?? []
  const totalInteresses = interesses.data?.length ?? 0
  const vendas = desbloqueios.data ?? []

  const captados = todos.length
  const verificados = todos.filter((l) => l.status === 'verificado').length
  const descartados = todos.filter((l) => l.status === 'descartado').length

  const receitaDoMes = vendas
    .filter((d) => new Date(d.criado_em) >= inicioDoMes)
    .reduce((s, d) => s + Number(d.preco_pago), 0)

  const taxa =
    totalInteresses > 0 ? (vendas.length / totalInteresses) * 100 : 0

  const linhas: [string, string][] = [
    ['Leads captados', String(captados)],
    ['Verificados', `${verificados}${captados ? ` (${Math.round((verificados / captados) * 100)}%)` : ''}`],
    ['Descartados pelo motor', String(descartados)],
    ['Interesses gerados', String(totalInteresses)],
    ['Interesses vendidos', String(vendas.length)],
    ['Taxa de desbloqueio', `${taxa.toFixed(1)}%`],
    ['Receita do mes', reais(receitaDoMes)],
  ]

  return (
    <section className="mt-10 border-t border-gray-300 pt-6">
      <h2 className="mb-3 text-lg font-bold">Numeros</h2>
      <dl className="flex flex-col gap-1 text-sm">
        {linhas.map(([rotulo, valor]) => (
          <div
            key={rotulo}
            className="flex justify-between gap-2 border-b border-gray-200 py-1"
          >
            <dt className="text-gray-700">{rotulo}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-gray-600">
        A taxa de desbloqueio e a que mais importa. Interesse que fica na vitrine
        e nao vende quer dizer preco alto ou perfil que nao serve para quem esta
        olhando -- e isso nao aparece nos outros numeros.
      </p>
    </section>
  )
}

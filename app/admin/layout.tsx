import { exigirAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NavAdmin } from './nav'

// ============================================================================
// MOLDURA DO ADMIN
//
// O guard esta aqui E em cada pagina. Nao e redundancia inutil: o layout
// protege as telas que alguem acrescentar amanha e esquecer de guardar, e o
// guard da pagina protege contra o layout ser trocado. Cada um sozinho ja
// basta; os dois juntos sobrevivem a um descuido.
//
// A contagem da fila mora aqui para o numero no menu valer em todas as telas:
// e ele que me diz que tem gente esperando ligacao enquanto eu cadastro
// empreendimento.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await exigirAdmin()

  const { count } = await supabaseAdmin()
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'novo')

  return (
    <div className="min-h-screen bg-fundo">
      <NavAdmin fila={count ?? 0} />
      {children}
    </div>
  )
}

import Link from 'next/link'
import { exigirCorretor } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { diasDesde, reais } from '@/lib/preco'
import { LinhaMeuLead } from './linha'

// ============================================================================
// MEUS LEADS -- os interesses que este corretor ja comprou
//
// Aqui o contato APARECE, e e correto: existe desbloqueio ligando este corretor
// a estes interesses. A consulta filtra por corretor_id antes de tocar em nome
// e telefone -- nenhum corretor ve o que outro comprou.
// ============================================================================

export const dynamic = 'force-dynamic'

type Compra = {
  id: string
  preco_pago: number
  criado_em: string
  interesses: {
    id: string
    criado_em: string
    leads: { nome: string; telefone: string; cidade: string; bairro: string | null } | null
    empreendimentos: { nome: string } | null
  } | null
  feedbacks: { id: string }[]
}

export default async function MeusLeads() {
  const corretor = await exigirCorretor()

  const { data: compras } = await supabaseAdmin()
    .from('desbloqueios')
    .select(
      'id, preco_pago, criado_em, ' +
        'interesses(id, criado_em, leads(nome, telefone, cidade, bairro), empreendimentos(nome)), ' +
        'feedbacks(id)'
    )
    .eq('corretor_id', corretor.id)
    .order('criado_em', { ascending: false })
    .returns<Compra[]>()

  const total = (compras ?? []).reduce((s, c) => s + Number(c.preco_pago), 0)

  return (
    <div className="mx-auto max-w-md pb-10">
      <header className="border-b border-gray-300 p-4">
        <nav className="mb-3 flex gap-4 text-sm">
          <Link href="/painel" className="text-blue-700 underline">
            Vitrine
          </Link>
          <span className="font-medium">Meus leads</span>
        </nav>
        <p className="text-sm text-gray-600">
          {compras?.length ?? 0}{' '}
          {compras?.length === 1 ? 'contato revelado' : 'contatos revelados'} ·{' '}
          {reais(total)} investidos
        </p>
      </header>

      <main className="p-4">
        {(compras?.length ?? 0) === 0 && (
          <p className="text-gray-600">
            Voce ainda nao revelou nenhum contato. Os que revelar aparecem aqui,
            com o formulario de retorno.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {compras?.map((c) =>
            c.interesses?.leads ? (
              <LinhaMeuLead
                key={c.id}
                desbloqueioId={c.id}
                nome={c.interesses.leads.nome}
                telefone={c.interesses.leads.telefone}
                local={[c.interesses.leads.bairro, c.interesses.leads.cidade]
                  .filter(Boolean)
                  .join(', ')}
                empreendimento={c.interesses.empreendimentos?.nome ?? null}
                precoPago={Number(c.preco_pago)}
                diasDesdeCaptacao={diasDesde(c.interesses.criado_em)}
                nomeCorretor={corretor.nome}
                jaRespondeu={(c.feedbacks?.length ?? 0) > 0}
              />
            ) : null
          )}
        </div>
      </main>
    </div>
  )
}

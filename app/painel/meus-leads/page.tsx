import { exigirCorretor } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { diasDesde, reais } from '@/lib/preco'
import { listarInteresses } from '../dados'
import { BarraPainel, Abas } from '../barra'
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

  const [{ data: compras }, naVitrine] = await Promise.all([
    supabaseAdmin()
      .from('desbloqueios')
      .select(
        'id, preco_pago, criado_em, ' +
          'interesses(id, criado_em, leads(nome, telefone, cidade, bairro), empreendimentos(nome)), ' +
          'feedbacks(id)'
      )
      .eq('corretor_id', corretor.id)
      .order('criado_em', { ascending: false })
      .returns<Compra[]>(),
    listarInteresses(corretor.id),
  ])

  const total = (compras ?? []).reduce((s, c) => s + Number(c.preco_pago), 0)

  return (
    <div className="min-h-screen bg-fundo">
      <BarraPainel
        corretor={{ nome: corretor.nome, creditos: Number(corretor.creditos) }}
      />

      <main className="mx-auto flex max-w-[720px] flex-col gap-4.5 p-5 pb-12">
        <Abas
          atual="meus"
          vitrine={naVitrine.length}
          meus={compras?.length ?? 0}
        />

        <p className="text-[13px] font-bold tracking-[0.04em] text-apagado">
          {compras?.length ?? 0}{' '}
          {compras?.length === 1 ? 'contato revelado' : 'contatos revelados'} ·{' '}
          {reais(total)} investidos
        </p>

        {(compras?.length ?? 0) === 0 && (
          <p className="rounded-[10px] border-[1.5px] border-dashed border-tracejado px-6 py-8 text-base/[1.5] text-apagado">
            Você ainda não revelou nenhum contato. Os que revelar aparecem
            aqui, com nome, WhatsApp e o formulário de retorno.
          </p>
        )}

        <div className="flex flex-col gap-3.5">
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

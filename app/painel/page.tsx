import { exigirCorretorOuAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { DIAS_NA_VITRINE } from '@/lib/config'
import { listarInteresses, cidadesNaVitrine } from './dados'
import { CartaoInteresse } from './cartao-interesse'
import { BarraPainel, Abas } from './barra'
import { Filtros } from './filtros'

// ============================================================================
// VITRINE
//
// Server Component: a consulta roda no servidor e o navegador do corretor
// recebe apenas o que listarInteresses() devolve -- que nao inclui nome nem
// telefone, nem na view, nem na lista de colunas.
//
// Os filtros vivem na URL (?cidade=...), nao em estado de cliente. Assim o
// corretor pode guardar o link de "Contagem, faixa 2" nos favoritos, e eu nao
// preciso de state manager.
//
// DUAS LEITURAS DESTA MESMA TELA:
//   corretor -> a vitrine dele (os empreendimentos dele + a vitrine geral),
//               com saldo, recarga e o botao de revelar.
//   admin    -> vistoria: a vitrine inteira, sem filtro de dono, sem saldo e
//               sem botao de compra.
// ============================================================================

export const dynamic = 'force-dynamic'

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string; bairro?: string; renda_faixa?: string }>
}) {
  const visitante = await exigirCorretorOuAdmin()
  const filtros = await searchParams

  // null = vistoria: listarInteresses nao aplica o filtro de dono.
  const corretorId =
    visitante.tipo === 'corretor' ? visitante.corretor.id : null

  const [interesses, cidades, comprados] = await Promise.all([
    listarInteresses(corretorId, filtros),
    cidadesNaVitrine(corretorId),
    contarComprados(corretorId),
  ])

  const comprador =
    visitante.tipo === 'corretor'
      ? {
          saldo: Number(visitante.corretor.creditos),
          nome: visitante.corretor.nome,
        }
      : null

  return (
    <div className="min-h-screen bg-fundo">
      <BarraPainel corretor={comprador ? { nome: comprador.nome, creditos: comprador.saldo } : null} />

      <main className="mx-auto flex max-w-[1120px] flex-col gap-4.5 p-5 pb-12">
        {comprador && (
          <Abas atual="vitrine" vitrine={interesses.length} meus={comprados} />
        )}

        <Filtros atuais={filtros} cidades={cidades} />

        <h1 className="text-[13px] font-bold tracking-[0.04em] text-apagado">
          {interesses.length}{' '}
          {interesses.length === 1
            ? 'interesse disponível'
            : 'interesses disponíveis'}
        </h1>

        {interesses.length === 0 && (
          <p className="rounded-[10px] border-[1.5px] border-dashed border-tracejado px-6 py-8 text-base/[1.5] text-apagado text-pretty">
            Nenhum interesse com esses filtros. Eles ficam na vitrine por{' '}
            {DIAS_NA_VITRINE} dias e saem assim que outro corretor revela o
            contato.{' '}
            {comprador
              ? 'Você vê os interesses dos seus empreendimentos e os da vitrine geral.'
              : 'Na vistoria aparecem todos, inclusive os dos empreendimentos sem dono.'}
          </p>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {interesses.map((interesse) => (
            <CartaoInteresse
              key={interesse.id}
              interesse={interesse}
              comprador={comprador}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

/** Quantos este corretor ja comprou. So para o numero da aba. */
async function contarComprados(corretorId: string | null): Promise<number> {
  if (!corretorId) return 0
  const { count } = await supabaseAdmin()
    .from('desbloqueios')
    .select('id', { count: 'exact', head: true })
    .eq('corretor_id', corretorId)
  return count ?? 0
}

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { HORAS_CARENCIA_PAUSADO } from '@/lib/config'
import { Formulario } from '../formulario'
import { ControlePublicacao } from './controle-publicacao'

export const dynamic = 'force-dynamic'

type Emp = Record<string, string | number | boolean | null>

export default async function EditarEmpreendimento({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirAdmin()
  const { id } = await params

  const { data: emp } = await supabaseAdmin()
    .from('empreendimentos')
    .select('*')
    .eq('id', id)
    .maybeSingle<Emp>()

  if (!emp) notFound()

  const { data: log } = await supabaseAdmin()
    .from('empreendimentos_log')
    .select('campo, valor_antes, valor_depois, criado_em')
    .eq('empreendimento_id', id)
    .order('criado_em', { ascending: false })
    .limit(60)
    .returns<
      {
        campo: string
        valor_antes: string | null
        valor_depois: string | null
        criado_em: string
      }[]
    >()

  const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  const arquivado = emp.status_publicacao === 'arquivado'

  const { count: interesses } = await supabaseAdmin()
    .from('interesses')
    .select('*', { head: true, count: 'exact' })
    .eq('empreendimento_id', id)

  return (
    <main className="mx-auto max-w-[900px] p-5 pb-12">
      <h1 className="mb-1 text-2xl font-extrabold tracking-[-0.01em]">{texto(emp.nome)}</h1>
      <p className="mb-6 text-sm text-apagado">
        {interesses ?? 0} {interesses === 1 ? 'interesse gerado' : 'interesses gerados'}
        {' · '}
        {HORAS_CARENCIA_PAUSADO}h de carência ao pausar
      </p>

      <ControlePublicacao
        id={id}
        statusAtual={texto(emp.status_publicacao)}
        pausadoMotivo={texto(emp.pausado_motivo)}
        arquivadoMotivo={texto(emp.arquivado_motivo)}
      />

      {arquivado ? (
        <p className="mt-8 rounded-[10px] border border-linha bg-white p-5 text-sm/[1.45] text-apagado-escuro">
          Arquivado não é editável. O cadastro permanece de propósito: apagar
          quebraria a rastreabilidade dos interesses já gerados e cobrados.
        </p>
      ) : (
        <div className="mt-8">
          <Formulario
            id={id}
            inicial={{
              nome: texto(emp.nome),
              construtora: texto(emp.construtora),
              cidade: texto(emp.cidade),
              bairro: texto(emp.bairro),
              tipologias: texto(emp.tipologias),
              quartos: texto(emp.quartos),
              garagem: emp.garagem === null ? '' : emp.garagem ? 'sim' : 'nao',
              faixa_tamanho: texto(emp.faixa_tamanho),
              preco_de: texto(emp.preco_de),
              preco_ate: texto(emp.preco_ate),
              status: texto(emp.status),
              descricao: texto(emp.descricao),
              foto_url: texto(emp.foto_url),
              fonte_material: texto(emp.fonte_material),
              autorizacao:
                emp.autorizacao === null ? '' : emp.autorizacao ? 'sim' : 'nao',
            }}
          />
        </div>
      )}

      {/* O log existe para responder a uma construtora que questione o que foi
          publicado: o que estava no ar, quando, e o que mudou. */}
      <section className="mt-10 rounded-[10px] border border-linha bg-white p-5">
        <h2 className="mb-3 text-[17px] font-extrabold">Histórico</h2>
        {(log?.length ?? 0) === 0 && (
          <p className="text-sm text-apagado">Nada registrado ainda.</p>
        )}
        <ul className="flex flex-col gap-2 text-sm">
          {log?.map((l, i) => (
            <li key={i} className="border-b border-divisor pb-2 last:border-0">
              <span className="font-medium">
                {l.campo === '_autor' ? 'por' : l.campo}
              </span>{' '}
              {l.campo === '_autor' ? (
                <span>{l.valor_depois}</span>
              ) : (
                <>
                  <span className="text-apagado line-through">
                    {l.valor_antes ?? 'vazio'}
                  </span>{' '}
                  <span>&rarr; {l.valor_depois ?? 'vazio'}</span>
                </>
              )}
              <span className="block text-xs text-apagado">
                {new Date(l.criado_em).toLocaleString('pt-BR')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

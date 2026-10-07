import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { reais } from '@/lib/preco'

export const dynamic = 'force-dynamic'

const ROTULO_PUB: Record<string, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisao',
  publicado: 'Publicado',
  pausado: 'Pausado',
  arquivado: 'Arquivado',
}

type Linha = {
  id: string
  nome: string
  construtora: string | null
  cidade: string | null
  bairro: string | null
  preco_de: number | null
  status_publicacao: string
  dono_corretor_id: string | null
  criado_em: string
}

export default async function Empreendimentos() {
  await exigirAdmin()

  const { data: emps } = await supabaseAdmin()
    .from('empreendimentos')
    .select(
      'id, nome, construtora, cidade, bairro, preco_de, status_publicacao, dono_corretor_id, criado_em'
    )
    .order('criado_em', { ascending: false })
    .returns<Linha[]>()

  const publicados = (emps ?? []).filter((e) => e.status_publicacao === 'publicado')

  return (
    <main className="mx-auto max-w-[900px] p-5 pb-12">
      <h1 className="mb-1 text-2xl font-extrabold tracking-[-0.01em]">
        {emps?.length ?? 0} empreendimentos
      </h1>
      <p className="mb-6 text-sm text-apagado">
        {publicados.length} publicados. So os publicados aparecem na tela de
        resultado do quiz, entao o catalogo precisa existir antes de rodar midia.
      </p>

      <Link
        href="/admin/empreendimentos/novo"
        className="mb-8 block rounded-lg bg-marinho p-4 text-center font-extrabold text-white hover:bg-marinho-hover"
      >
        Cadastrar empreendimento
      </Link>

      <div className="flex flex-col gap-3">
        {emps?.map((e) => (
          <Link
            key={e.id}
            href={`/admin/empreendimentos/${e.id}`}
            className="block rounded-[10px] border border-linha bg-white p-4 hover:border-sobre-marinho"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[16px] font-extrabold">{e.nome}</p>
                <p className="text-sm text-apagado">
                  {e.construtora}
                  {e.bairro ? ` · ${e.bairro}` : ''}
                  {e.cidade ? `, ${e.cidade}` : ''}
                </p>
                {e.preco_de !== null && (
                  <p className="text-sm text-apagado">
                    A partir de {reais(Number(e.preco_de))}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded border px-2 py-1 text-[11px] font-bold tracking-[0.04em] uppercase ${
                  e.status_publicacao === 'publicado'
                    ? 'border-verde text-verde'
                    : e.status_publicacao === 'arquivado'
                      ? 'border-campo text-apagado'
                      : 'border-amarelo-linha text-apagado-escuro'
                }`}
              >
                {ROTULO_PUB[e.status_publicacao] ?? e.status_publicacao}
              </span>
            </div>
            {e.dono_corretor_id && (
              <p className="mt-1 text-xs text-apagado">
                Estoque de corretor: a responsabilidade pelo conteudo e dele.
              </p>
            )}
          </Link>
        ))}
        {emps?.length === 0 && (
          <p className="rounded-[10px] border-[1.5px] border-dashed border-tracejado px-6 py-8 text-apagado">
            Nenhum empreendimento ainda. Sem catalogo, a tela de resultado do
            quiz nao tem o que mostrar e todo mundo cai na vitrine geral.
          </p>
        )}
      </div>
    </main>
  )
}

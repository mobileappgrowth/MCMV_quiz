import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { diasDesde } from '@/lib/preco'
import { rotuloDe, rotuloBooleano } from '@/lib/quiz'
import { CartaoLead, type LeadCompleto } from './cartao-lead'

// ============================================================================
// TODOS OS LEADS
//
// A fila (/admin) mostra so quem esta esperando ligacao. Depois que o lead e
// aprovado ou descartado ele sai de la -- e ate agora saia da sua vista para
// sempre. Esta tela e o arquivo: tudo que entrou, em qualquer estado, com nome
// e telefone.
//
// Com a fila ela nao se confunde: la e trabalho do dia (ligar, aprovar), aqui
// e consulta (quem era aquela pessoa de Betim, o que o motor achou dela, por
// que foi descartada).
//
// SOBRE O CONTATO: esta e a segunda e ultima tela onde nome e telefone
// aparecem sem desbloqueio. Igual a fila, e pelo mesmo motivo -- sou eu, e e
// o meu proprio dado. O guard esta no layout do /admin e nesta pagina.
// ============================================================================

export const dynamic = 'force-dynamic'

// Teto de linhas por carga. Com dezenas de leads por semana demora meses para
// chegar perto; quando chegar, a busca e o filtro de status resolvem antes de
// precisar de paginacao.
const TETO = 200

const ESTADOS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'novo', rotulo: 'Na fila' },
  { valor: 'verificado', rotulo: 'Verificados' },
  { valor: 'descartado', rotulo: 'Descartados' },
] as const

/**
 * A busca vai para o banco como ilike. Tiro os caracteres que quebram a
 * sintaxe do filtro `or` do PostgREST -- virgula, parenteses e ponto separam
 * clausulas la dentro, e um nome com virgula viraria uma consulta diferente
 * da pedida.
 */
function limpaBusca(q: string): string {
  return q.replace(/[,()*%.]/g, ' ').trim().slice(0, 60)
}

export default async function Leads({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  await exigirAdmin()
  const { status = '', q = '' } = await searchParams
  const busca = limpaBusca(q)

  // Colunas explicitas, como em toda consulta do projeto. Aqui nome e telefone
  // ENTRAM de proposito: e a tela do dono.
  let consulta = supabaseAdmin()
    .from('leads')
    .select(
      'id, criado_em, cidade, bairro, quartos, garagem, enquadramento, ' +
        'renda_faixa, renda_formal, renda_composta, nome_limpo, fgts_tempo, ' +
        'fgts_saldo, regularizacao_andamento, ja_financiou, ' +
        'entrada_disponivel, prazo_compra, nome, telefone, status, ' +
        'verificado_em, notas_verificacao, vinculo_renda, selo_declarado, ' +
        'selo_verificado, pontuacao, qtd_interesses, quer_contato_geral, ' +
        'motivo_descarte',
      { count: 'exact' }
    )

  if (status) consulta = consulta.eq('status', status)
  if (busca) {
    consulta = consulta.or(
      `nome.ilike.%${busca}%,telefone.ilike.%${busca}%,` +
        `cidade.ilike.%${busca}%,bairro.ilike.%${busca}%`
    )
  }

  const { data, count, error } = await consulta
    .order('criado_em', { ascending: false }) // o mais recente primeiro
    .limit(TETO)
    .returns<LinhaLead[]>()

  if (error) {
    return (
      <main className="mx-auto max-w-[1200px] p-5">
        <p className="rounded-lg bg-vermelho-tenue p-4 font-semibold text-vermelho">
          Falha ao carregar os leads: {error.message}
        </p>
      </main>
    )
  }

  const leads = data ?? []
  const total = count ?? leads.length

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 p-5 pb-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <h1 className="text-[26px] font-extrabold tracking-[-0.01em]">
          {total} {total === 1 ? 'lead captado' : 'leads captados'}
        </h1>
        <p className="text-sm text-apagado">
          Todos os leads, em qualquer estado. A fila mostra so quem ainda
          espera ligação.
        </p>
      </div>

      <Filtros status={status} q={q} />

      {leads.length === 0 && (
        <p className="rounded-[10px] border-[1.5px] border-dashed border-tracejado px-6 py-10 text-base text-apagado">
          {busca || status
            ? 'Nenhum lead com esses filtros.'
            : 'Nenhum lead ainda. Os que responderem o quiz aparecem aqui.'}
        </p>
      )}

      {leads.length < total && (
        <p className="text-sm text-apagado">
          Mostrando os {leads.length} mais recentes de {total}. Use a busca ou
          o filtro de estado para chegar nos outros.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {leads.map((l) => (
          <CartaoLead key={l.id} lead={paraCartao(l)} />
        ))}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------

function Filtros({ status, q }: { status: string; q: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Os estados sao links, nao campos: um toque filtra e o estado mora na
          URL. O mesmo que a vitrine do corretor faz. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold tracking-[0.06em] text-apagado uppercase">
          Estado
        </span>
        {ESTADOS.map((e) => {
          const alvo = new URLSearchParams()
          if (e.valor) alvo.set('status', e.valor)
          if (q.trim()) alvo.set('q', q.trim())
          const href = alvo.toString()
            ? `/admin/leads?${alvo}`
            : '/admin/leads'
          const ativo = status === e.valor
          return (
            <Link
              key={e.rotulo}
              href={href}
              className={`rounded-full px-3.5 py-2.5 text-[13px] whitespace-nowrap ${
                ativo
                  ? 'bg-marinho font-bold text-white'
                  : 'border-[1.5px] border-campo bg-white font-semibold hover:border-sobre-marinho'
              }`}
            >
              {e.rotulo}
            </Link>
          )
        })}
      </div>

      <form method="GET" action="/admin/leads" className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, telefone, cidade ou bairro"
          className="w-full max-w-[420px] rounded-lg border-[1.5px] border-campo bg-white px-3.5 py-2.5 text-sm outline-none focus:border-marinho"
        />
        <button
          type="submit"
          className="rounded-lg border-[1.5px] border-campo bg-white px-4 text-sm font-bold hover:border-sobre-marinho"
        >
          Buscar
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

type LinhaLead = {
  id: string
  criado_em: string
  cidade: string
  bairro: string | null
  quartos: number | null
  garagem: boolean | null
  enquadramento: string | null
  renda_faixa: string | null
  renda_formal: boolean | null
  renda_composta: boolean | null
  nome_limpo: string | null
  fgts_tempo: string | null
  fgts_saldo: string | null
  regularizacao_andamento: boolean | null
  ja_financiou: boolean | null
  entrada_disponivel: string | null
  prazo_compra: string | null
  nome: string
  telefone: string
  status: string
  verificado_em: string | null
  notas_verificacao: string | null
  vinculo_renda: string | null
  selo_declarado: string | null
  selo_verificado: string | null
  pontuacao: number | null
  qtd_interesses: number
  quer_contato_geral: boolean | null
  motivo_descarte: string | null
}

/** Traduz a linha do banco para o que o cartao precisa, ja em rotulo legivel. */
function paraCartao(l: LinhaLead): LeadCompleto {
  return {
    id: l.id,
    nome: l.nome,
    telefone: l.telefone,
    local: [l.bairro, l.cidade].filter(Boolean).join(', '),
    status: l.status,
    dias: diasDesde(l.criado_em),
    criadoEm: l.criado_em,
    verificadoEm: l.verificado_em,
    qtdInteresses: l.qtd_interesses,
    querContatoGeral: l.quer_contato_geral ?? false,
    seloDeclarado: l.selo_declarado,
    seloVerificado: l.selo_verificado,
    pontuacao: l.pontuacao,
    motivoDescarte: l.motivo_descarte,
    notas: l.notas_verificacao,
    qualificacao: [
      ['Quartos', l.quartos ? String(l.quartos) : '-'],
      ['Garagem', rotuloBooleano(l.garagem, 'Precisa', 'Não precisa')],
      ['Prazo', rotuloDe('prazo_compra', l.prazo_compra)],
      ['Renda', rotuloDe('renda_faixa', l.renda_faixa)],
      ['Enquadramento', l.enquadramento ?? '-'],
      ['Vínculo', rotuloDe('vinculo_renda', l.vinculo_renda)],
      ['Compõe renda', rotuloBooleano(l.renda_composta, 'Sim', 'Não')],
      ['Nome', rotuloDe('nome_limpo', l.nome_limpo)],
      [
        'Regularizando',
        rotuloBooleano(l.regularizacao_andamento, 'Sim', 'Ainda não'),
      ],
      ['FGTS (tempo)', rotuloDe('fgts_tempo', l.fgts_tempo)],
      ['FGTS (saldo)', rotuloDe('fgts_saldo', l.fgts_saldo)],
      ['Já financiou', rotuloBooleano(l.ja_financiou, 'Sim', 'Não')],
      ['Entrada', rotuloDe('entrada_disponivel', l.entrada_disponivel)],
    ],
  }
}

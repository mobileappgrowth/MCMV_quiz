import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { PRECOS, HORAS_FRESCO } from '@/lib/config'
import { diasDesde, precoNaAprovacao, reais } from '@/lib/preco'
import { rotuloDe, rotuloBooleano } from '@/lib/quiz'
import { LinhaFila } from './linha-fila'

// ============================================================================
// FILA DE VERIFICACAO
//
// Esta e a UNICA tela do produto onde nome e telefone aparecem sem desbloqueio,
// e isso e correto: sou eu, admin, e e exatamente o que preciso para ligar.
// O guard exigirAdmin() e o que separa esta tela do resto.
// ============================================================================

export const dynamic = 'force-dynamic'

// O supabase-js so infere tipos a partir de um `select` escrito como literal
// unico. A lista aqui e longa e quebrada em linhas, entao declaro o tipo da
// linha a mao. Vale a pena: lista explicita de colunas e a regra do projeto, e
// nenhuma lista explicita mente sobre o que foi pedido.
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
  ja_financiou: boolean | null
  entrada_disponivel: string | null
  prazo_compra: string | null
  nome: string
  telefone: string
  notas_verificacao: string | null
}

export default async function Admin() {
  await exigirAdmin()

  const { data: leads, error } = await supabaseAdmin()
    .from('leads')
    .select(
      'id, criado_em, cidade, bairro, quartos, garagem, enquadramento, ' +
        'renda_faixa, renda_formal, renda_composta, nome_limpo, fgts_tempo, ' +
        'ja_financiou, entrada_disponivel, prazo_compra, nome, telefone, ' +
        'notas_verificacao'
    )
    .eq('status', 'novo')
    .order('criado_em', { ascending: true }) // mais antigo primeiro: ligo na ordem
    .returns<LinhaLead[]>()

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-red-700">Falha ao carregar a fila: {error.message}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <nav className="mb-6 flex gap-4 text-sm">
        <span className="font-medium">Fila de verificacao</span>
        <Link href="/admin/corretores" className="text-blue-700 underline">
          Corretores
        </Link>
      </nav>

      <h1 className="mb-1 text-2xl font-bold">
        {leads.length} {leads.length === 1 ? 'lead' : 'leads'} na fila
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Ligue, confirme o perfil e aprove. O lead so entra na vitrine depois da
        aprovacao. O preco congela no momento em que voce aprova:{' '}
        {reais(PRECOS.verificado_fresco)} ate {HORAS_FRESCO}h de captado,{' '}
        {reais(PRECOS.verificado_antigo)} depois.
      </p>

      {leads.length === 0 && (
        <p className="text-gray-600">
          Nada para verificar agora. Leads novos do quiz aparecem aqui.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {leads.map((lead) => (
          <LinhaFila
            key={lead.id}
            lead={{
              id: lead.id,
              nome: lead.nome,
              telefone: lead.telefone,
              notas: lead.notas_verificacao,
              dias: diasDesde(lead.criado_em),
              precoSeAprovarAgora: precoNaAprovacao(lead.criado_em),
              qualificacao: [
                ['Local', [lead.bairro, lead.cidade].filter(Boolean).join(', ')],
                ['Quartos', lead.quartos ? String(lead.quartos) : '-'],
                ['Garagem', rotuloBooleano(lead.garagem, 'Precisa', 'Nao precisa')],
                ['Prazo', rotuloDe('prazo_compra', lead.prazo_compra)],
                ['Renda', rotuloDe('renda_faixa', lead.renda_faixa)],
                ['Enquadramento', lead.enquadramento ?? '-'],
                ['Vinculo', rotuloBooleano(lead.renda_formal, 'Carteira assinada', 'Informal')],
                ['Compoe renda', rotuloBooleano(lead.renda_composta, 'Sim', 'Nao')],
                ['Nome', rotuloDe('nome_limpo', lead.nome_limpo)],
                ['FGTS', rotuloDe('fgts_tempo', lead.fgts_tempo)],
                ['Ja financiou', rotuloBooleano(lead.ja_financiou, 'Sim', 'Nao')],
                ['Entrada', rotuloDe('entrada_disponivel', lead.entrada_disponivel)],
              ],
            }}
          />
        ))}
      </div>
    </main>
  )
}

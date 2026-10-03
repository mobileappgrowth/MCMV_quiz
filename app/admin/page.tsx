import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { PRECOS, precosConfigurados } from '@/lib/config'
import { diasDesde, reais } from '@/lib/preco'
import { rotuloDe, rotuloBooleano } from '@/lib/quiz'
import { rotuloMotivo } from '@/lib/motor'
import { LinhaFila } from './linha-fila'
import { NavAdmin } from './nav'

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
  vinculo_renda: string | null
  fgts_saldo: string | null
  regularizacao_andamento: boolean | null
  selo_declarado: string | null
  pontuacao: number | null
  qtd_interesses: number
}

export default async function Admin() {
  await exigirAdmin()

  const { data: leads, error } = await supabaseAdmin()
    .from('leads')
    .select(
      'id, criado_em, cidade, bairro, quartos, garagem, enquadramento, ' +
        'renda_faixa, renda_formal, renda_composta, nome_limpo, fgts_tempo, ' +
        'ja_financiou, entrada_disponivel, prazo_compra, nome, telefone, ' +
        'notas_verificacao, vinculo_renda, fgts_saldo, ' +
        'regularizacao_andamento, selo_declarado, pontuacao, qtd_interesses'
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

  // Descartados pelo motor, agrupados por motivo. Com dezenas de leads por
  // semana, contar em memoria custa menos que montar um group by pela API.
  const { data: descartados } = await supabaseAdmin()
    .from('leads')
    .select('motivo_descarte')
    .eq('status', 'descartado')
    .not('motivo_descarte', 'is', null)
    .returns<{ motivo_descarte: string }[]>()

  const porMotivo = new Map<string, number>()
  for (const d of descartados ?? []) {
    porMotivo.set(d.motivo_descarte, (porMotivo.get(d.motivo_descarte) ?? 0) + 1)
  }

  return (
    <main className="mx-auto max-w-2xl p-4">
      <NavAdmin atual="fila" />

      {/* Sem o preco do produto, o motor nao avalia capacidade: nao elimina
          ninguem por isso e nao da ponto nenhum de capacidade. Falha para o
          lado seguro, mas todo mundo sai com selo mais baixo do que merece. */}
      {!precosConfigurados() && (
        <div className="mb-6 border border-red-700 p-3">
          <p className="text-sm font-medium text-red-700">
            O preco do produto nao esta configurado.
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Preencha PRECO_PRODUTO_POR_CIDADE em lib/config.ts. Enquanto estiver
            zerado, o motor nao avalia capacidade: ninguem e eliminado por esse
            criterio, e ninguem ganha os pontos dele -- os selos saem mais
            baixos do que deveriam.
          </p>
        </div>
      )}

      <h1 className="mb-1 text-2xl font-bold">
        {leads.length} {leads.length === 1 ? 'lead' : 'leads'} na fila
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Ligue, confirme o perfil e aprove. Aprovar sobe TODOS os interesses do
        lead da faixa de perfil declarado ({reais(PRECOS.empreendimento.nao_verificado)}{' '}
        por empreendimento, {reais(PRECOS.geral.nao_verificado)} na vitrine
        geral) para a de verificado ({reais(PRECOS.empreendimento.verificado_fresco)}{' '}
        e {reais(PRECOS.geral.verificado)}), com o multiplicador do selo por
        cima. Quem marcou quatro empreendimentos tem quatro precos subindo.
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
              qtdInteresses: lead.qtd_interesses,
              seloDeclarado: lead.selo_declarado,
              pontuacao: lead.pontuacao,
              qualificacao: [
                ['Local', [lead.bairro, lead.cidade].filter(Boolean).join(', ')],
                ['Quartos', lead.quartos ? String(lead.quartos) : '-'],
                ['Garagem', rotuloBooleano(lead.garagem, 'Precisa', 'Nao precisa')],
                ['Prazo', rotuloDe('prazo_compra', lead.prazo_compra)],
                ['Renda', rotuloDe('renda_faixa', lead.renda_faixa)],
                ['Enquadramento', lead.enquadramento ?? '-'],
                ['Vinculo', rotuloDe('vinculo_renda', lead.vinculo_renda)],
                ['Compoe renda', rotuloBooleano(lead.renda_composta, 'Sim', 'Nao')],
                ['Nome', rotuloDe('nome_limpo', lead.nome_limpo)],
                [
                  'Regularizando',
                  rotuloBooleano(lead.regularizacao_andamento, 'Sim', 'Ainda nao'),
                ],
                ['FGTS (tempo)', rotuloDe('fgts_tempo', lead.fgts_tempo)],
                ['FGTS (saldo)', rotuloDe('fgts_saldo', lead.fgts_saldo)],
                ['Ja financiou', rotuloBooleano(lead.ja_financiou, 'Sim', 'Nao')],
                ['Entrada', rotuloDe('entrada_disponivel', lead.entrada_disponivel)],
              ],
            }}
          />
        ))}
      </div>

      {/* O motor descarta sem passar por voce. Estes numeros sao o unico jeito
          de perceber se ele esta matando lead bom que voce pagou anuncio para
          trazer. Um motivo disparado demais e sinal de parametro errado. */}
      {porMotivo.size > 0 && (
        <section className="mt-10 border-t border-gray-300 pt-6">
          <h2 className="mb-1 text-lg font-bold">Descartados pelo motor</h2>
          <p className="mb-3 text-sm text-gray-600">
            Nao passaram pelos eliminatorios e nao entraram na fila. Se um motivo
            crescer demais, o parametro dele provavelmente esta errado.
          </p>
          <dl className="flex flex-col gap-1 text-sm">
            {[...porMotivo.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([motivo, quantos]) => (
                <div
                  key={motivo}
                  className="flex justify-between gap-2 border-b border-gray-200 py-1"
                >
                  <dt className="text-gray-700">{rotuloMotivo(motivo)}</dt>
                  <dd className="font-medium">{quantos}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
    </main>
  )
}

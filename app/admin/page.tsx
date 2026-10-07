import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exigirAdmin } from '@/lib/auth'
import { PRECOS, precosConfigurados } from '@/lib/config'
import { diasDesde, reais } from '@/lib/preco'
import { rotuloDe, rotuloBooleano } from '@/lib/quiz'
import { rotuloMotivo } from '@/lib/motor'
import { LinhaFila } from './linha-fila'
import { Contadores } from './contadores'

// ============================================================================
// FILA DE VERIFICACAO
//
// Esta e a UNICA tela do produto onde nome e telefone aparecem sem desbloqueio,
// e isso e correto: sou eu, admin, e e exatamente o que preciso para ligar.
// O guard exigirAdmin() e o que separa esta tela do resto.
//
// LISTA A ESQUERDA, FICHA A DIREITA. A tela e feita para ligar em sequencia:
// a lista mostra quem falta, a ficha mostra com quem estou falando. Qual lead
// esta aberto vive na URL (?lead=...), nao em estado de cliente -- um toque
// troca de ficha, o botao de voltar do navegador funciona, e nada disso
// precisa de JavaScript.
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

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  await exigirAdmin()
  const { lead: pedido } = await searchParams

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
      <main className="mx-auto max-w-[1200px] p-5">
        <p className="rounded-lg bg-vermelho-tenue p-4 font-semibold text-vermelho">
          Falha ao carregar a fila: {error.message}
        </p>
      </main>
    )
  }

  // O lead da URL, ou o primeiro da fila. Depois de aprovar um, ele sai da
  // consulta e o ?lead= aponta para quem nao existe mais -- cair no proximo da
  // fila e exatamente o comportamento que eu quero entre uma ligacao e outra.
  const aberto = leads.find((l) => l.id === pedido) ?? leads[0]

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
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 p-5 pb-12">
      {/* ESTADO DELIBERADO, nao pendencia: o Albert escolheu deixar
          PRECO_PRODUTO_POR_CIDADE em branco ate o catalogo existir, em vez de
          chutar um numero numa regua de eliminatorio. Por isso o aviso e ambar
          e descritivo -- um alarme vermelho todo dia por uma decisao tomada
          vira ruido, e ruido ensina a ignorar avisos de verdade. */}
      {!precosConfigurados() && (
        <div className="rounded-lg bg-amarelo-tenue p-4">
          <p className="font-bold">
            O motor esta rodando sem avaliar capacidade.
          </p>
          <p className="mt-1 text-sm/[1.45] text-apagado-escuro">
            PRECO_PRODUTO_POR_CIDADE esta em branco, entao ninguem e eliminado
            por capacidade e os 20 pontos dela nao sao dados a ninguem -- o
            maximo possivel vira 80, e selo Forte passa a exigir perfil quase
            perfeito. Quem decide o selo que vale e voce, na ligacao. Quando
            tiver catalogo, o numero e o preco do imovel de entrada que voce
            realmente vende em cada cidade.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <h1 className="text-[26px] font-extrabold tracking-[-0.01em]">
          {leads.length} {leads.length === 1 ? 'lead para ligar' : 'leads para ligar'}
        </h1>
        <p className="text-sm text-apagado">
          Aprovar sobe TODOS os interesses do lead de perfil declarado (
          {reais(PRECOS.empreendimento.nao_verificado)} /{' '}
          {reais(PRECOS.geral.nao_verificado)}) para verificado (
          {reais(PRECOS.empreendimento.verificado_fresco)} /{' '}
          {reais(PRECOS.geral.verificado)}), com o multiplicador do selo.
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="rounded-[10px] border-[1.5px] border-dashed border-tracejado px-6 py-10 text-base text-apagado">
          Nada para verificar agora. Leads novos do quiz aparecem aqui.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          {/* --- a fila --- */}
          <ol className="flex-[1_1_260px] overflow-hidden rounded-[10px] border border-linha bg-white">
            <li className="border-b border-divisor px-4 py-2.5 text-[11px] font-semibold tracking-[0.06em] text-apagado uppercase">
              Mais antigo primeiro
            </li>
            {leads.map((l) => {
              const selecionado = l.id === aberto?.id
              const dias = diasDesde(l.criado_em)
              const sub = `${[l.bairro, l.cidade].filter(Boolean).join(', ')} · ha ${dias} ${dias === 1 ? 'dia' : 'dias'}`
              return (
                <li key={l.id}>
                  <Link
                    href={`/admin?lead=${l.id}`}
                    className={`block border-b px-4 py-3.5 ${
                      selecionado
                        ? 'border-l-4 border-b-amarelo-linha border-l-amarelo bg-amarelo-tenue pl-3'
                        : 'border-b-divisor hover:bg-fundo'
                    }`}
                  >
                    <span
                      className={`block text-[15px] ${selecionado ? 'font-extrabold' : 'font-semibold'}`}
                    >
                      {l.nome}
                    </span>
                    <span className="block text-[13px] font-medium text-apagado">
                      {sub}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>

          {/* --- a ficha --- */}
          {aberto && (
            <div className="flex-[3_1_440px]">
              <LinhaFila
                lead={{
                  id: aberto.id,
                  nome: aberto.nome,
                  telefone: aberto.telefone,
                  local: [aberto.bairro, aberto.cidade].filter(Boolean).join(', '),
                  notas: aberto.notas_verificacao,
                  dias: diasDesde(aberto.criado_em),
                  qtdInteresses: aberto.qtd_interesses,
                  seloDeclarado: aberto.selo_declarado,
                  pontuacao: aberto.pontuacao,
                  qualificacao: [
                    ['Quartos', aberto.quartos ? String(aberto.quartos) : '-'],
                    ['Garagem', rotuloBooleano(aberto.garagem, 'Precisa', 'Nao precisa')],
                    ['Prazo', rotuloDe('prazo_compra', aberto.prazo_compra)],
                    ['Renda', rotuloDe('renda_faixa', aberto.renda_faixa)],
                    ['Enquadramento', aberto.enquadramento ?? '-'],
                    ['Vinculo', rotuloDe('vinculo_renda', aberto.vinculo_renda)],
                    ['Compoe renda', rotuloBooleano(aberto.renda_composta, 'Sim', 'Nao')],
                    ['Nome', rotuloDe('nome_limpo', aberto.nome_limpo)],
                    [
                      'Regularizando',
                      rotuloBooleano(aberto.regularizacao_andamento, 'Sim', 'Ainda nao'),
                    ],
                    ['FGTS (tempo)', rotuloDe('fgts_tempo', aberto.fgts_tempo)],
                    ['FGTS (saldo)', rotuloDe('fgts_saldo', aberto.fgts_saldo)],
                    ['Ja financiou', rotuloBooleano(aberto.ja_financiou, 'Sim', 'Nao')],
                    ['Entrada', rotuloDe('entrada_disponivel', aberto.entrada_disponivel)],
                  ],
                }}
              />
            </div>
          )}
        </div>
      )}

      <Contadores />

      {/* O motor descarta sem passar por voce. Estes numeros sao o unico jeito
          de perceber se ele esta matando lead bom que voce pagou anuncio para
          trazer. Um motivo disparado demais e sinal de parametro errado. */}
      {porMotivo.size > 0 && (
        <section className="rounded-[10px] border border-linha bg-white p-5">
          <h2 className="text-[17px] font-extrabold">Descartados pelo motor</h2>
          <p className="mt-1 mb-3 text-sm text-apagado">
            Nao passaram pelos eliminatorios e nao entraram na fila. Se um
            motivo crescer demais, o parametro dele provavelmente esta errado.
          </p>
          <dl className="flex flex-col">
            {[...porMotivo.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([motivo, quantos]) => (
                <div
                  key={motivo}
                  className="flex justify-between gap-2 border-b border-divisor py-2 text-sm last:border-0"
                >
                  <dt className="text-apagado-escuro">{rotuloMotivo(motivo)}</dt>
                  <dd className="font-bold">{quantos}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
    </main>
  )
}

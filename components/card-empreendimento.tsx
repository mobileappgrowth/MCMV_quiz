import { reais } from '@/lib/preco'

// ============================================================================
// CARD DO EMPREENDIMENTO
//
// O MESMO componente em dois lugares: a pre-visualizacao no admin e a tela de
// resultado do quiz. E de proposito -- a especificacao pede pre-visualizacao
// "exatamente como ele aparece na tela de resultado", e duas copias divergiriam
// na primeira mudanca, transformando a pre-visualizacao em mentira.
//
// REGRAS DE CONTEUDO que este componente sustenta:
//
//   "A partir de"      -- nunca preco fechado de unidade, tabela, condicao de
//                         pagamento, taxa ou parcela. Orientar sobre condicao
//                         de financiamento e atividade de correspondente
//                         bancario, que nao somos.
//   Proporcao fixa     -- a foto vive numa caixa 16:9 com object-cover. Foto
//                         fora de proporcao e cortada, nunca deforma o card.
//                         E a unica garantia possivel: foto_url aponta para
//                         imagem de terceiro, que nao temos como medir aqui.
//   Nome real          -- empreendimento e construtora pelo nome, sem sugerir
//                         parceria, representacao ou autorizacao que nao exista.
// ============================================================================

export type CardEmpreendimento = {
  id: string
  nome: string | null
  construtora: string | null
  cidade: string | null
  bairro: string | null
  tipologias: string | null
  quartos: number | null
  garagem: boolean | null
  preco_de: number | null
  preco_ate: number | null
  status: string | null
  descricao: string | null
  foto_url: string | null
}

const ROTULO_OBRA: Record<string, string> = {
  lancamento: 'Lancamento',
  obras: 'Em obras',
  pronto: 'Pronto para morar',
}

export function CardEmpreendimento({
  emp,
  children,
}: {
  emp: CardEmpreendimento
  /** O checkbox na tela de resultado. A pre-visualizacao nao passa nada. */
  children?: React.ReactNode
}) {
  const atributos = [
    emp.quartos ? `${emp.quartos} quartos` : null,
    emp.tipologias,
    emp.garagem === null ? null : emp.garagem ? 'com garagem' : 'sem garagem',
    emp.status ? (ROTULO_OBRA[emp.status] ?? emp.status) : null,
  ].filter(Boolean)

  return (
    <article className="overflow-hidden rounded-[10px] border border-linha bg-white">
      {/* Caixa de proporcao fixa: o card nao quebra, qualquer que seja a foto. */}
      <div
        className="flex aspect-video w-full items-center justify-center"
        style={{
          backgroundImage: emp.foto_url
            ? undefined
            : 'repeating-linear-gradient(135deg, var(--color-foto) 0 10px, var(--color-foto-claro) 10px 20px)',
        }}
      >
        {emp.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={emp.foto_url}
            alt={emp.nome ?? 'Empreendimento'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-mono text-xs font-medium text-sobre-marinho">
            sem foto
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-[18px] font-extrabold">{emp.nome ?? 'Sem nome'}</h3>
        <p className="text-sm font-medium text-apagado">
          {emp.construtora ?? 'Sem construtora'}
          {[emp.bairro, emp.cidade].filter(Boolean).length > 0 &&
            ` · ${[emp.bairro, emp.cidade].filter(Boolean).join(', ')}`}
        </p>

        {atributos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {atributos.map((a) => (
              <span
                key={a}
                className="rounded-md bg-fundo px-2.5 py-1.5 text-[13px] font-medium text-apagado-escuro"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Faixa e "a partir de". Nunca valor fechado.
            Cada metade fica inteira na mesma linha: "A partir de R$" quebrando
            longe do valor transforma preco em charada. */}
        {emp.preco_de !== null && (
          <p className="mt-3 font-bold">
            <span className="whitespace-nowrap">
              A partir de {reais(Number(emp.preco_de))}
            </span>
            {emp.preco_ate !== null && (
              <span className="font-normal whitespace-nowrap text-apagado">
                {' '}
                ate {reais(Number(emp.preco_ate))}
              </span>
            )}
          </p>
        )}

        {emp.descricao && (
          <p className="mt-2 text-sm/[1.45] text-apagado-escuro">
            {emp.descricao}
          </p>
        )}

        {children}
      </div>
    </article>
  )
}

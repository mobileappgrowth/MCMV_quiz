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
  return (
    <article className="border border-gray-400">
      {/* Caixa de proporcao fixa: o card nao quebra, qualquer que seja a foto. */}
      <div className="aspect-video w-full bg-gray-200">
        {emp.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={emp.foto_url}
            alt={emp.nome ?? 'Empreendimento'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold">{emp.nome ?? 'Sem nome'}</h3>
        <p className="text-sm text-gray-600">
          {emp.construtora ?? 'Sem construtora'}
        </p>
        <p className="text-sm text-gray-600">
          {[emp.bairro, emp.cidade].filter(Boolean).join(', ') || 'Sem local'}
        </p>

        <p className="mt-2 text-sm">
          {[
            emp.quartos ? `${emp.quartos} quartos` : null,
            emp.tipologias,
            emp.garagem === null ? null : emp.garagem ? 'com garagem' : 'sem garagem',
            emp.status ? ROTULO_OBRA[emp.status] ?? emp.status : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {/* Faixa e "a partir de". Nunca valor fechado. */}
        {emp.preco_de !== null && (
          <p className="mt-2 font-medium">
            A partir de {reais(Number(emp.preco_de))}
            {emp.preco_ate !== null && (
              <span className="font-normal text-gray-600">
                {' '}
                até {reais(Number(emp.preco_ate))}
              </span>
            )}
          </p>
        )}

        {emp.descricao && (
          <p className="mt-2 text-sm text-gray-700">{emp.descricao}</p>
        )}

        {children}
      </div>
    </article>
  )
}

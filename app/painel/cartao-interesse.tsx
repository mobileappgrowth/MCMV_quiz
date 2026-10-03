import { diasDesde, reais } from '@/lib/preco'
import { rotuloDe, rotuloBooleano } from '@/lib/quiz'
import { rotuloSelo } from '@/lib/motor'
import { emCarencia, type InteresseVitrine } from './dados'
import { BotaoRevelar } from './botao-revelar'

// ============================================================================
// CARTAO DA VITRINE -- um INTERESSE, nao um lead
//
// Server Component, sem 'use client': o que chega ao navegador e o HTML
// renderizado, nao as props serializadas.
//
// SOBRE O CONTATO "BORRADO":
// A barra cinza abaixo nao esconde o nome nem o telefone. Nao existe nome nem
// telefone neste componente -- o tipo InteresseVitrine nao tem esses campos, a
// consulta nao os pede e a view nao os tem.
//
// A barra e um placeholder sobre AUSENCIA. A diferenca importa: um blur de CSS
// sobre o valor real deixa o dado no HTML, a um Ctrl+U de distancia. O efeito
// visual e o mesmo; a garantia e oposta.
//
// O MESMO VALE PARA O QUE NAO ESTA AQUI: quantos empreendimentos a pessoa
// marcou nao e escondido, e ausente. Nem lead_id nem qtd_interesses chegam ao
// componente, entao nao ha como contar.
// ============================================================================

export function CartaoInteresse({
  interesse,
  saldo,
  nomeCorretor,
}: {
  interesse: InteresseVitrine
  saldo: number
  nomeCorretor: string
}) {
  const dias = diasDesde(interesse.criado_em)
  const preco = Number(interesse.preco ?? 0)

  // O selo tem duas formas, e a diferenca e o produto: declarado sai do quiz,
  // verificado sou eu confirmando no telefone. O cartao diz qual dos dois e --
  // vender um pelo outro seria vender o que nao foi entregue.
  const verificado = interesse.selo_verificado !== null
  const selo = interesse.selo_verificado ?? interesse.selo_declarado

  const temEmpreendimento = interesse.empreendimento_id !== null

  const atributos: [string, string][] = [
    ['Quartos', interesse.quartos ? String(interesse.quartos) : '-'],
    ['Garagem', rotuloBooleano(interesse.garagem, 'Precisa', 'Nao precisa')],
    ['Renda', rotuloDe('renda_faixa', interesse.renda_faixa)],
    [
      'Vinculo',
      rotuloBooleano(interesse.renda_formal, 'Carteira assinada', 'Informal'),
    ],
    ['Nome', rotuloDe('nome_limpo', interesse.nome_limpo)],
    ['Prazo', rotuloDe('prazo_compra', interesse.prazo_compra)],
  ]

  return (
    <article className="border border-gray-400 p-4">
      {/* O que a pessoa pediu. E a primeira coisa que o corretor precisa ver:
          decide se o lead serve para o estoque dele antes de olhar o perfil. */}
      <div className="mb-3 border-b border-gray-200 pb-3">
        {temEmpreendimento ? (
          <>
            <h2 className="font-bold">{interesse.empreendimento_nome}</h2>
            <p className="text-sm text-gray-600">
              {interesse.construtora}
              {interesse.empreendimento_bairro
                ? ` · ${interesse.empreendimento_bairro}`
                : ''}
              {interesse.empreendimento_cidade
                ? `, ${interesse.empreendimento_cidade}`
                : ''}
            </p>
            {interesse.preco_de !== null && (
              <p className="text-sm text-gray-600">
                A partir de {reais(Number(interesse.preco_de))}
              </p>
            )}
            {emCarencia(interesse) && (
              <p className="mt-2 border border-amber-700 px-2 py-1 text-xs text-amber-800">
                Este empreendimento saiu do ar. O interesse continua valido, mas
                sai da vitrine em breve.
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="font-bold">Busca aberta</h2>
            <p className="text-sm text-gray-600">
              Nao marcou empreendimento. Aceitou contato sobre outras opcoes em{' '}
              {interesse.bairro ? `${interesse.bairro}, ` : ''}
              {interesse.cidade}.
            </p>
          </>
        )}
      </div>

      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-xs text-gray-600">
          Captado ha {dias} {dias === 1 ? 'dia' : 'dias'}
        </p>
        {selo && (
          <span
            className={`shrink-0 border px-2 py-1 text-center text-xs font-medium ${
              verificado
                ? 'border-green-700 text-green-700'
                : 'border-gray-500 text-gray-600'
            }`}
          >
            {rotuloSelo(selo)}
            <span className="block text-[10px] font-normal">
              {verificado ? 'perfil verificado' : 'perfil declarado'}
            </span>
          </span>
        )}
      </div>

      <dl className="mb-4 flex flex-col gap-1 text-sm">
        {atributos.map(([rotulo, valor]) => (
          <div
            key={rotulo}
            className="flex justify-between gap-2 border-b border-gray-200 py-1"
          >
            <dt className="text-gray-600">{rotulo}</dt>
            <dd className="text-right font-medium">{valor}</dd>
          </div>
        ))}
      </dl>

      {/* Placeholder de contato. Nao ha valor por baixo -- veja o comentario no
          topo do arquivo antes de "melhorar" isto com um blur. */}
      <div className="mb-4 bg-gray-100 p-3">
        <p className="mb-2 text-xs text-gray-600">Contato</p>
        <div className="mb-2 h-4 w-32 rounded bg-gray-300" aria-hidden="true" />
        <div className="h-4 w-40 rounded bg-gray-300" aria-hidden="true" />
        <p className="sr-only">Nome e telefone liberados apos o desbloqueio.</p>
      </div>

      <BotaoRevelar
        interesseId={interesse.id}
        preco={preco}
        saldo={saldo}
        nomeCorretor={nomeCorretor}
      />
    </article>
  )
}

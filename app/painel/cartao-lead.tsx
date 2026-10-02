import { diasDesde, reais } from '@/lib/preco'
import { rotuloDe, rotuloBooleano } from '@/lib/quiz'
import { rotuloSelo } from '@/lib/motor'
import type { LeadVitrine } from './dados'

// ============================================================================
// CARTAO DA VITRINE
//
// Server Component, sem 'use client': nao recebe props via serializacao para o
// cliente, e nao ha handler de evento aqui. O que chega ao navegador e o HTML
// renderizado.
//
// SOBRE O CONTATO "BORRADO":
// A barra cinza abaixo nao esconde o nome nem o telefone. Nao existe nome nem
// telefone neste componente -- o tipo LeadVitrine nao tem esses campos, a
// consulta nao os pede e a view nao os tem.
//
// A barra e um placeholder sobre AUSENCIA. A diferenca importa: um blur de CSS
// sobre o valor real deixa o dado no HTML, a um Ctrl+U de distancia. O efeito
// visual e o mesmo; a garantia e oposta.
// ============================================================================

export function CartaoLead({
  lead,
  saldo,
}: {
  lead: LeadVitrine
  saldo: number
}) {
  const dias = diasDesde(lead.criado_em)
  const preco = Number(lead.preco ?? 0)
  const temSaldo = saldo >= preco

  // O selo tem duas formas, e a diferenca e o produto: declarado sai do quiz,
  // verificado sou eu confirmando no telefone. O cartao diz qual dos dois e --
  // vender um pelo outro seria vender o que nao foi entregue.
  const verificado = lead.selo_verificado !== null
  const selo = lead.selo_verificado ?? lead.selo_declarado

  const atributos: [string, string][] = [
    ['Quartos', lead.quartos ? String(lead.quartos) : '-'],
    ['Garagem', rotuloBooleano(lead.garagem, 'Precisa', 'Nao precisa')],
    ['Renda', rotuloDe('renda_faixa', lead.renda_faixa)],
    ['Vinculo', rotuloBooleano(lead.renda_formal, 'Carteira assinada', 'Informal')],
    ['Nome', rotuloDe('nome_limpo', lead.nome_limpo)],
    ['Prazo', rotuloDe('prazo_compra', lead.prazo_compra)],
  ]

  return (
    <article className="border border-gray-400 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">
            {lead.bairro ? `${lead.bairro}, ` : ''}
            {lead.cidade}
          </h2>
          <p className="text-xs text-gray-600">
            Captado ha {dias} {dias === 1 ? 'dia' : 'dias'}
          </p>
        </div>
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
          <div key={rotulo} className="flex justify-between gap-2 border-b border-gray-200 py-1">
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

      <button
        type="button"
        disabled
        className="w-full bg-gray-800 p-4 font-medium text-white disabled:opacity-50"
      >
        Desbloquear por {reais(preco)}
      </button>
      <p className="mt-2 text-center text-xs text-gray-600">
        {temSaldo
          ? 'O desbloqueio entra no Dia 3.'
          : `Saldo insuficiente. Recarregue para desbloquear.`}
      </p>
    </article>
  )
}

import { diasDesde, reais } from '@/lib/preco'
import { rotuloDe, rotuloCurto, rotuloBooleano } from '@/lib/quiz'
import { rotuloSelo } from '@/lib/motor'
import { HORAS_FRESCO } from '@/lib/config'
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
  comprador,
}: {
  interesse: InteresseVitrine
  /**
   * null = vistoria do admin. O cartao mostra tudo o que o corretor veria,
   * inclusive o preco, mas nao oferece o botao de revelar: admin nao compra.
   * Isto e so a tela -- a recusa de verdade esta em revelarContato(), que exige
   * linha em `corretores`.
   */
  comprador: { saldo: number; nome: string } | null
}) {
  const dias = diasDesde(interesse.criado_em)
  const preco = Number(interesse.preco ?? 0)

  // O selo tem duas formas, e a diferenca e o produto: declarado sai do quiz,
  // verificado sou eu confirmando no telefone. O cartao diz qual dos dois e --
  // vender um pelo outro seria vender o que nao foi entregue.
  const verificado = interesse.selo_verificado !== null
  const selo = interesse.selo_verificado ?? interesse.selo_declarado

  const temEmpreendimento = interesse.empreendimento_id !== null
  const horas = (Date.now() - new Date(interesse.criado_em).getTime()) / 3_600_000
  const fresco = horas < HORAS_FRESCO

  const atributos: [string, string][] = [
    ['Quartos', interesse.quartos ? String(interesse.quartos) : '-'],
    ['Garagem', rotuloBooleano(interesse.garagem, 'Precisa', 'Nao precisa')],
    ['Renda', rotuloDe('renda_faixa', interesse.renda_faixa)],
    [
      'Vinculo',
      rotuloBooleano(interesse.renda_formal, 'Carteira assinada', 'Informal'),
    ],
    ['Nome', rotuloDe('nome_limpo', interesse.nome_limpo)],
    ['Prazo', rotuloCurto('prazo_compra', interesse.prazo_compra)],
  ]

  return (
    <article className="flex flex-col overflow-hidden rounded-[10px] border border-linha bg-white">
      {/* O que a pessoa pediu. E a primeira coisa que o corretor precisa ver:
          decide se o lead serve para o estoque dele antes de olhar o perfil. */}
      <div className="flex justify-between gap-2 border-b border-divisor p-4">
        <div className="min-w-0">
          {temEmpreendimento ? (
            <>
              <h2 className="text-[18px] font-extrabold">
                {interesse.empreendimento_nome}
              </h2>
              <p className="text-[13px] font-medium text-apagado">
                {interesse.construtora}
                {interesse.empreendimento_bairro
                  ? ` · ${interesse.empreendimento_bairro}`
                  : ''}
                {interesse.empreendimento_cidade
                  ? `, ${interesse.empreendimento_cidade}`
                  : ''}
              </p>
              {interesse.preco_de !== null && (
                <p className="text-[13px] font-medium text-apagado">
                  A partir de {reais(Number(interesse.preco_de))}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="text-[18px] font-extrabold">Busca aberta</h2>
              <p className="text-[13px] font-medium text-apagado">
                Nao marcou empreendimento ·{' '}
                {interesse.bairro ? `${interesse.bairro}, ` : ''}
                {interesse.cidade}
              </p>
            </>
          )}
        </div>

        <div className="shrink-0 text-right">
          {/* A idade e o que justifica o preco. "Fresco" e so o que ainda esta
              dentro da janela de HORAS_FRESCO -- nao e etiqueta de vendedor. */}
          {fresco ? (
            <span className="inline-block rounded bg-amarelo px-2 py-1 text-[11px] font-extrabold tracking-[0.04em]">
              FRESCO · {dias === 0 ? 'hoje' : `${dias}d`}
            </span>
          ) : (
            <span className="inline-block rounded bg-divisor px-2 py-1 text-[11px] font-bold tracking-[0.04em] text-apagado">
              {dias} {dias === 1 ? 'DIA' : 'DIAS'}
            </span>
          )}
          {selo && (
            <p
              className={`mt-1.5 text-xs font-semibold ${
                verificado ? 'text-verde' : 'text-apagado'
              }`}
            >
              {verificado ? '✓ ' : ''}
              {rotuloSelo(selo)}
              <span className="block text-[10px] font-normal text-apagado">
                {verificado ? 'perfil verificado' : 'perfil declarado'}
              </span>
            </p>
          )}
        </div>
      </div>

      {emCarencia(interesse) && (
        <p className="border-b border-divisor bg-amarelo-tenue px-4 py-2 text-xs font-semibold text-apagado-escuro">
          Este empreendimento saiu do ar. O interesse continua valido, mas sai
          da vitrine em breve.
        </p>
      )}

      {/* Grade de atributos: linhas de 1px feitas com o fundo aparecendo entre
          as celulas. Menos borda para o olho, e nenhuma borda dupla.
          Duas colunas em qualquer tela -- o cartao tem a mesma largura no
          celular e dentro da grade do desktop, entao um ponto de quebra por
          largura de JANELA mediria a coisa errada. */}
      <dl className="grid grid-cols-2 gap-px bg-divisor">
        {atributos.map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-white px-3.5 py-2.5">
            <dt className="text-[11px] font-medium text-apagado">{rotulo}</dt>
            <dd className="text-sm font-bold">{valor}</dd>
          </div>
        ))}
      </dl>

      {/* Placeholder de contato. Nao ha valor por baixo -- veja o comentario no
          topo do arquivo antes de "melhorar" isto com um blur. */}
      <div className="flex items-center gap-3 bg-fundo px-4 py-3.5">
        <div
          aria-hidden="true"
          className="size-[34px] shrink-0 rounded-full bg-linha"
        />
        <div className="flex flex-1 flex-col gap-1.5" aria-hidden="true">
          <div className="h-2.5 w-[55%] rounded-sm bg-campo" />
          <div className="h-2.5 w-[70%] rounded-sm bg-campo" />
        </div>
        <p className="text-right text-[11px] font-medium text-apagado">
          contato
          <br />
          exclusivo
        </p>
        <p className="sr-only">Nome e telefone liberados apos o desbloqueio.</p>
      </div>

      <div className="mt-auto p-3">
        {comprador ? (
          <BotaoRevelar
            interesseId={interesse.id}
            preco={preco}
            saldo={comprador.saldo}
            nomeCorretor={comprador.nome}
          />
        ) : (
          <div className="rounded-lg border-[1.5px] border-dashed border-tracejado p-3 text-center">
            <p className="text-sm font-bold text-apagado">
              Valeria {reais(preco)} para o corretor
            </p>
            <p className="mt-1 text-xs text-apagado">
              Vistoria: aqui nao se compra. O contato esta na fila do /admin.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

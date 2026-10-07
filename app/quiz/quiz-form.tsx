'use client'

import { useState, useTransition } from 'react'
import { passosVisiveis, totalPassos, type PassoOpcoes } from '@/lib/quiz'
import { CONSENTIMENTO } from '@/lib/config'
import { Marca } from '@/components/marca'
import { salvarLead, type RespostasQuiz } from './actions'

// ============================================================================
// QUIZ -- uma pergunta por tela.
//
// Estado inteiro em dois useState. Nada e gravado no banco antes do envio
// final: um lead so existe quando a pessoa chega ao fim e aceita o termo.
//
// Passo 0            -> cidade e bairro
// Passos do meio      -> perguntas de botao (um toque avanca)
// Ultimo passo        -> consentimento, nome e WhatsApp
//
// Os passos do meio NAO sao fixos: dependem das respostas. Renda acima do teto
// do programa pula FGTS e composicao; quem declara restricao ganha uma pergunta
// extra. Por isso a lista e recalculada a cada render, em vez de ser um indice
// num array constante.
//
// SOBRE O VISUAL: coluna de 480px centrada, cabecalho marinho fixo com a barra
// de progresso, e botao de 17px de altura interna. O alvo de toque grande nao e
// estetica -- e quem responde isso no onibus, com uma mao.
// ============================================================================

export function QuizForm() {
  const [passo, setPasso] = useState(0)
  const [respostas, setRespostas] = useState<RespostasQuiz>({})
  const [erro, setErro] = useState<string | null>(null)
  // Nota tranquilizadora da resposta recem-escolhida. Quando preenchida, a tela
  // segura a pessoa com um "Continuar" em vez de avancar sozinha.
  const [nota, setNota] = useState<string | null>(null)
  const [enviando, iniciarEnvio] = useTransition()

  const visiveis = passosVisiveis(respostas)
  const total = totalPassos(respostas)
  const ultimoPasso = total - 1
  const passoAtual: PassoOpcoes | undefined = visiveis[passo - 1]

  function responder(campo: string, valor: string) {
    setRespostas((atual) => ({ ...atual, [campo]: valor }))
  }

  function avancar() {
    setErro(null)
    setNota(null)
    setPasso((p) => Math.min(p + 1, ultimoPasso))
  }

  function voltar() {
    setErro(null)
    setNota(null)
    setPasso((p) => Math.max(p - 1, 0))
  }

  /**
   * Escolher uma opcao normalmente avanca. A excecao e quando a resposta tem
   * nota: ai a tela mostra a nota e espera um toque em Continuar.
   */
  function escolher(campo: string, valor: string, notaDaResposta?: string) {
    responder(campo, valor)
    if (notaDaResposta) {
      setNota(notaDaResposta)
      return
    }
    avancar()
  }

  function enviar() {
    setErro(null)
    iniciarEnvio(async () => {
      // Em caso de sucesso a action redireciona e nada retorna.
      const resultado = await salvarLead(respostas)
      if (resultado?.erro) setErro(resultado.erro)
    })
  }

  const noLocal = passo === 0
  const noContato = passo === ultimoPasso

  return (
    <div className="flex min-h-screen justify-center bg-fundo-fora sm:items-center sm:p-6">
      {/* No celular a coluna ocupa a tela inteira, como um aplicativo. A partir
          de sm ela vira um cartao centrado com altura minima fixa: sem isso o
          quiz no desktop era uma tira branca com um vazio de meia tela empurrando
          o "Continuar" para o rodape. A altura minima tambem mantem o botao
          sempre no mesmo lugar entre uma pergunta de duas opcoes e uma de cinco. */}
      <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-white sm:min-h-[620px] sm:overflow-hidden sm:rounded-2xl sm:shadow-[0_20px_40px_-20px_rgba(15,35,64,0.3)]">
        {/* ---------------------------------------------------------------- */}
        {/* CABECALHO E PROGRESSO                                            */}
        {/* ---------------------------------------------------------------- */}
        <header className="bg-marinho px-5 pt-5 pb-6 text-white">
          <div className="mb-4 flex items-center justify-between">
            <Marca claro />
            <p className="text-sm font-semibold text-amarelo">
              {passo + 1}/{total}
            </p>
          </div>
          {/* A barra usa o total dos passos VISIVEIS. Quem segue o caminho
              curto ve a barra andar mais rapido -- nunca uma barra que
              encolhe, que e o que acontece se o total mudar debaixo dela. */}
          <div
            className="h-2 overflow-hidden rounded-full bg-marinho-claro"
            role="progressbar"
            aria-valuenow={passo + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          >
            <div
              className="h-2 rounded-full bg-amarelo transition-[width] duration-300"
              style={{ width: `${((passo + 1) / total) * 100}%` }}
            />
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* PERGUNTA                                                          */}
        {/* ---------------------------------------------------------------- */}
        <main className="flex flex-1 flex-col px-5 pt-7 pb-5">
          {noLocal && (
            <TelaLocalizacao respostas={respostas} responder={responder} />
          )}

          {!noLocal && !noContato && passoAtual && (
            <TelaOpcoes
              passo={passoAtual}
              selecionado={respostas[passoAtual.campo]}
              nota={nota}
              escolher={(valor) =>
                escolher(passoAtual.campo, valor, passoAtual.notas?.[valor])
              }
            />
          )}

          {noContato && (
            <TelaContato respostas={respostas} responder={responder} />
          )}

          {erro && (
            <p
              role="alert"
              className="mt-3.5 rounded-lg bg-vermelho-tenue px-3.5 py-3 text-sm font-semibold text-vermelho"
            >
              {erro}
            </p>
          )}

          <div className="min-h-6 flex-1" />

          {/* -------------------------------------------------------------- */}
          {/* NAVEGACAO                                                       */}
          {/*                                                                 */}
          {/* "Continuar" so aparece onde o toque na opcao NAO avanca sozinho: */}
          {/* localizacao, contato, e a tela que mostrou uma nota. Nas demais  */}
          {/* um botao a mais seria um toque a mais por pergunta.              */}
          {/* -------------------------------------------------------------- */}
          <div className="flex gap-2.5">
            {passo > 0 && (
              <button
                type="button"
                onClick={voltar}
                className="rounded-lg border-2 border-campo px-4.5 py-4 font-bold hover:border-sobre-marinho"
              >
                Voltar
              </button>
            )}

            {noLocal && (
              <BotaoAvancar
                onClick={() => {
                  if (!(respostas.cidade ?? '').trim()) {
                    setErro('Informe a cidade.')
                    return
                  }
                  avancar()
                }}
              >
                Continuar
              </BotaoAvancar>
            )}

            {!noLocal && !noContato && nota && (
              <BotaoAvancar onClick={avancar}>Continuar</BotaoAvancar>
            )}

            {noContato && (
              <BotaoAvancar onClick={enviar} desabilitado={enviando}>
                {enviando ? 'Enviando...' : 'Quero ver as opcoes'}
              </BotaoAvancar>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PECAS
// ---------------------------------------------------------------------------

function BotaoAvancar({
  onClick,
  desabilitado,
  children,
}: {
  onClick: () => void
  desabilitado?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className="flex-1 rounded-lg bg-amarelo py-4 text-base font-extrabold text-marinho hover:bg-amarelo-hover disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function Titulo({ tema, pergunta, ajuda }: { tema: string; pergunta: string; ajuda?: string }) {
  return (
    <div className="mb-5.5">
      <p className="mb-2 text-[13px] font-bold tracking-[0.06em] text-link uppercase">
        {tema}
      </p>
      <h1 className="text-[27px]/[1.2] font-extrabold tracking-[-0.01em] text-pretty">
        {pergunta}
      </h1>
      {ajuda && <p className="mt-2 text-base/[1.45] text-apagado">{ajuda}</p>}
    </div>
  )
}

function Campo({
  rotulo,
  opcional,
  ...props
}: {
  rotulo: string
  opcional?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold">
        {rotulo}
        {opcional && (
          <span className="font-normal text-apagado"> (opcional)</span>
        )}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border-2 border-campo p-4 text-lg font-medium text-marinho outline-none focus:border-marinho"
      />
    </label>
  )
}

function TelaLocalizacao({
  respostas,
  responder,
}: {
  respostas: RespostasQuiz
  responder: (campo: string, valor: string) => void
}) {
  return (
    <div>
      <Titulo
        tema="O lugar"
        pergunta="Onde voce quer morar?"
        ajuda="Informe a cidade. O bairro e opcional, mas ajuda a achar o imovel certo."
      />
      <div className="flex flex-col gap-4">
        <Campo
          rotulo="Cidade"
          autoComplete="address-level2"
          placeholder="Ex: Contagem"
          value={respostas.cidade ?? ''}
          onChange={(e) => responder('cidade', e.target.value)}
        />
        <Campo
          rotulo="Bairro"
          opcional
          placeholder="Ex: Eldorado"
          value={respostas.bairro ?? ''}
          onChange={(e) => responder('bairro', e.target.value)}
        />
      </div>
    </div>
  )
}

function TelaOpcoes({
  passo,
  selecionado,
  nota,
  escolher,
}: {
  passo: PassoOpcoes
  selecionado: string | undefined
  nota: string | null
  escolher: (valor: string) => void
}) {
  return (
    <div>
      <Titulo tema={passo.tema} pergunta={passo.pergunta} ajuda={passo.ajuda} />

      <div className="flex flex-col gap-2.5">
        {passo.opcoes.map((opcao) => {
          const marcada = selecionado === opcao.valor
          return (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => escolher(opcao.valor)}
              aria-pressed={marcada}
              className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left text-[17px] ${
                marcada
                  ? 'border-marinho bg-amarelo-tenue font-bold'
                  : 'border-campo font-semibold hover:border-sobre-marinho'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-5.5 shrink-0 rounded-full ${
                  marcada ? 'border-7 border-marinho' : 'border-2 border-circulo'
                }`}
              />
              {opcao.rotulo}
            </button>
          )
        })}
      </div>

      {/* A pessoa acabou de admitir algo que ela teme que a desqualifique.
          Responder na hora, e nao tres telas adiante, e o que evita o abandono. */}
      {nota && (
        <p className="mt-5 rounded-lg bg-fundo p-4 text-[15px]/[1.45] text-apagado-escuro">
          {nota}
        </p>
      )}
    </div>
  )
}

function TelaContato({
  respostas,
  responder,
}: {
  respostas: RespostasQuiz
  responder: (campo: string, valor: string) => void
}) {
  const aceitou = respostas.consentimento === 'sim'

  return (
    <div>
      <Titulo
        tema="Quase la"
        pergunta="Para onde mando as opcoes?"
        ajuda="Vamos falar com voce pelo WhatsApp antes de qualquer visita."
      />

      <div className="flex flex-col gap-4">
        <Campo
          rotulo="Seu nome"
          autoComplete="name"
          value={respostas.nome ?? ''}
          onChange={(e) => responder('nome', e.target.value)}
        />
        <Campo
          rotulo="WhatsApp com DDD"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(31) 99999-9999"
          value={respostas.telefone ?? ''}
          onChange={(e) => responder('telefone', e.target.value)}
        />

        {/* Desmarcado por padrao. A versao do texto vem de lib/config.ts e e
            gravada junto com IP e user agent no momento do envio.
            O <label> envolve tudo: a area de toque e a caixa inteira, nao um
            quadradinho de 20px. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-fundo p-3.5">
          <input
            type="checkbox"
            checked={aceitou}
            onChange={(e) =>
              responder('consentimento', e.target.checked ? 'sim' : 'nao')
            }
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className={`flex size-6 shrink-0 items-center justify-center rounded-[5px] text-sm font-extrabold ${
              aceitou
                ? 'bg-marinho text-amarelo'
                : 'border-2 border-sobre-marinho bg-white'
            }`}
          >
            {aceitou ? '✓' : ''}
          </span>
          <span className="text-sm/[1.45] text-apagado-escuro">
            {CONSENTIMENTO.texto}
          </span>
        </label>
      </div>
    </div>
  )
}

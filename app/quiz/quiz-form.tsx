'use client'

import { useState, useTransition } from 'react'
import { passosVisiveis, totalPassos, type PassoOpcoes } from '@/lib/quiz'
import { CONSENTIMENTO } from '@/lib/config'
import { salvarLead, type RespostasQuiz } from './actions'

// ============================================================================
// QUIZ -- 12 telas, uma pergunta por vez.
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
// Dia 1: sem estilizacao. Os tamanhos aqui existem so para caber no dedo
// durante o teste no celular. O visual e o Dia 4.
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
      // Em caso de sucesso a action redireciona para /obrigado e nada retorna.
      const resultado = await salvarLead(respostas)
      if (resultado?.erro) setErro(resultado.erro)
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-4">
      {/* barra de progresso */}
      <div className="mb-6">
        <div className="h-2 w-full bg-gray-200">
          <div
            className="h-2 bg-gray-800"
            style={{ width: `${((passo + 1) / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Pergunta {passo + 1} de {total}
        </p>
      </div>

      <div className="flex-1">
        {passo === 0 && (
          <TelaLocalizacao
            respostas={respostas}
            responder={responder}
            avancar={() => {
              if (!(respostas.cidade ?? '').trim()) {
                setErro('Informe a cidade.')
                return
              }
              avancar()
            }}
          />
        )}

        {passo >= 1 && passoAtual && (
          <TelaOpcoes
            passo={passoAtual}
            selecionado={respostas[passoAtual.campo]}
            nota={nota}
            continuar={avancar}
            escolher={(valor) =>
              escolher(passoAtual.campo, valor, passoAtual.notas?.[valor])
            }
          />
        )}

        {passo === ultimoPasso && (
          <TelaContato
            respostas={respostas}
            responder={responder}
            enviando={enviando}
            enviar={enviar}
          />
        )}

        {erro && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      {passo > 0 && (
        <button
          type="button"
          onClick={voltar}
          className="mt-6 py-3 text-sm text-gray-600 underline"
        >
          Voltar
        </button>
      )}
    </main>
  )
}

// ---------------------------------------------------------------------------

function TelaLocalizacao({
  respostas,
  responder,
  avancar,
}: {
  respostas: RespostasQuiz
  responder: (campo: string, valor: string) => void
  avancar: () => void
}) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Onde voce quer morar?</h1>
      <p className="mb-6 text-gray-600">
        Informe a cidade. O bairro e opcional, mas ajuda a achar o imovel certo.
      </p>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Cidade</span>
        <input
          type="text"
          autoComplete="address-level2"
          value={respostas.cidade ?? ''}
          onChange={(e) => responder('cidade', e.target.value)}
          className="w-full border border-gray-400 p-3 text-lg"
        />
      </label>

      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium">Bairro (opcional)</span>
        <input
          type="text"
          value={respostas.bairro ?? ''}
          onChange={(e) => responder('bairro', e.target.value)}
          className="w-full border border-gray-400 p-3 text-lg"
        />
      </label>

      <button
        type="button"
        onClick={avancar}
        className="w-full bg-gray-800 p-4 text-lg font-medium text-white"
      >
        Continuar
      </button>
    </div>
  )
}

function TelaOpcoes({
  passo,
  selecionado,
  nota,
  escolher,
  continuar,
}: {
  passo: PassoOpcoes
  selecionado: string | undefined
  nota: string | null
  escolher: (valor: string) => void
  continuar: () => void
}) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{passo.pergunta}</h1>
      {passo.ajuda && <p className="mb-6 text-gray-600">{passo.ajuda}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {passo.opcoes.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => escolher(opcao.valor)}
            className={`w-full border p-4 text-left text-lg ${
              selecionado === opcao.valor
                ? 'border-gray-800 bg-gray-100 font-medium'
                : 'border-gray-400'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>

      {/* A pessoa acabou de admitir algo que ela teme que a desqualifique.
          Responder na hora, e nao tres telas adiante, e o que evita o abandono. */}
      {nota && (
        <div className="mt-6">
          <p className="mb-4 bg-gray-100 p-4 text-gray-700">{nota}</p>
          <button
            type="button"
            onClick={continuar}
            className="w-full bg-gray-800 p-4 text-lg font-medium text-white"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  )
}

function TelaContato({
  respostas,
  responder,
  enviando,
  enviar,
}: {
  respostas: RespostasQuiz
  responder: (campo: string, valor: string) => void
  enviando: boolean
  enviar: () => void
}) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Para onde mando as opcoes?</h1>
      <p className="mb-6 text-gray-600">
        Vamos falar com voce pelo WhatsApp antes de qualquer visita.
      </p>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Seu nome</span>
        <input
          type="text"
          autoComplete="name"
          value={respostas.nome ?? ''}
          onChange={(e) => responder('nome', e.target.value)}
          className="w-full border border-gray-400 p-3 text-lg"
        />
      </label>

      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium">WhatsApp com DDD</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="11999999999"
          value={respostas.telefone ?? ''}
          onChange={(e) => responder('telefone', e.target.value)}
          className="w-full border border-gray-400 p-3 text-lg"
        />
      </label>

      {/* Desmarcado por padrao. A versao do texto vem de lib/config.ts e e
          gravada junto com IP e user agent no momento do envio. */}
      <label className="mb-6 flex gap-3">
        <input
          type="checkbox"
          checked={respostas.consentimento === 'sim'}
          onChange={(e) => responder('consentimento', e.target.checked ? 'sim' : 'nao')}
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span className="text-sm text-gray-700">{CONSENTIMENTO.texto}</span>
      </label>

      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="w-full bg-gray-800 p-4 text-lg font-medium text-white disabled:opacity-50"
      >
        {enviando ? 'Enviando...' : 'Quero ver as opcoes'}
      </button>
    </div>
  )
}

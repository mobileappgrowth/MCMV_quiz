'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CardEmpreendimento } from '@/components/card-empreendimento'
import { TETO_PRECO_MCMV } from '@/lib/config'
import { reais } from '@/lib/preco'
import {
  criarEmpreendimento,
  salvarEmpreendimento,
  type CamposEmpreendimento,
} from './actions'

// ============================================================================
// FORMULARIO DE EMPREENDIMENTO
//
// UM formulario so, usado para criar e editar, em tres blocos: identificacao,
// produto e material. Dois formularios divergiriam na primeira mudanca.
//
// Rascunho salva incompleto de proposito: cadastrar e um trabalho de varias
// sessoes, e perder o que ja foi digitado por falta de um campo e a melhor
// forma de fazer alguem desistir. Quem cobra o conjunto completo e o PUBLICAR.
// ============================================================================

const VAZIO: CamposEmpreendimento = {
  nome: '',
  construtora: '',
  cidade: '',
  bairro: '',
  tipologias: '',
  quartos: '',
  garagem: '',
  faixa_tamanho: '',
  preco_de: '',
  preco_ate: '',
  status: '',
  descricao: '',
  foto_url: '',
  fonte_material: '',
  autorizacao: '',
}

function numero(v: string): number | null {
  const t = v.trim().replace(/\./g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function Formulario({
  id,
  inicial,
}: {
  id?: string
  inicial?: Partial<CamposEmpreendimento>
}) {
  const router = useRouter()
  const [campos, setCampos] = useState<CamposEmpreendimento>({
    ...VAZIO,
    ...inicial,
  })
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(
    null
  )
  const [ocupado, executar] = useTransition()

  function mudar(nome: keyof CamposEmpreendimento, valor: string) {
    setCampos((c) => ({ ...c, [nome]: valor }))
  }

  const precoDe = numero(campos.preco_de)
  const precoAte = numero(campos.preco_ate)

  // Validacoes locais: avisam enquanto se digita, em vez de so na gravacao.
  const erroFaixa =
    precoDe !== null && precoAte !== null && precoAte < precoDe
      ? 'O preco final nao pode ser menor que o inicial.'
      : null

  const avisoMcmv =
    TETO_PRECO_MCMV > 0 && precoDe !== null && precoDe > TETO_PRECO_MCMV
      ? `Acima do teto do MCMV configurado (${reais(TETO_PRECO_MCMV)}). ` +
        'Isso nao bloqueia: pode ser proposital, para o publico fora do programa.'
      : null

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setAviso(null)
    if (erroFaixa) {
      setAviso({ tipo: 'erro', texto: erroFaixa })
      return
    }
    executar(async () => {
      const r = id
        ? await salvarEmpreendimento(id, campos)
        : await criarEmpreendimento(campos)
      if (!r.ok) {
        setAviso({ tipo: 'erro', texto: r.erro })
        return
      }
      if (!id && r.id) {
        router.push(`/admin/empreendimentos/${r.id}`)
        return
      }
      setAviso({ tipo: 'ok', texto: 'Salvo.' })
    })
  }

  function campo(
    nome: keyof CamposEmpreendimento,
    rotulo: string,
    extra?: { tipo?: string; ajuda?: string }
  ) {
    return (
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">{rotulo}</span>
        {extra?.ajuda && (
          <span className="mb-1 block text-xs text-gray-600">{extra.ajuda}</span>
        )}
        <input
          type={extra?.tipo ?? 'text'}
          value={campos[nome]}
          onChange={(e) => mudar(nome, e.target.value)}
          className="w-full border border-gray-400 p-3"
        />
      </label>
    )
  }

  function selecao(
    nome: keyof CamposEmpreendimento,
    rotulo: string,
    opcoes: [string, string][]
  ) {
    return (
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium">{rotulo}</span>
        <select
          value={campos[nome]}
          onChange={(e) => mudar(nome, e.target.value)}
          className="w-full border border-gray-400 p-3"
        >
          <option value="">Nao informado</option>
          {opcoes.map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <form onSubmit={enviar}>
      <fieldset className="mb-8">
        <legend className="mb-3 text-lg font-bold">1. Identificacao</legend>
        {campo('nome', 'Nome do empreendimento')}
        {campo('construtora', 'Construtora', {
          ajuda:
            'Nome real. Divulgar e diferente de representar: nao sugira parceria que nao existe.',
        })}
        {campo('cidade', 'Cidade')}
        {campo('bairro', 'Bairro')}
        {selecao('status', 'Status da obra', [
          ['lancamento', 'Lancamento'],
          ['obras', 'Em obras'],
          ['pronto', 'Pronto para morar'],
        ])}
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 text-lg font-bold">2. Produto</legend>
        {campo('tipologias', 'Tipologias', { ajuda: 'Ex.: 2 e 3 quartos, 45 a 62 m2' })}
        {campo('quartos', 'Quartos', { tipo: 'number' })}
        {selecao('garagem', 'Garagem', [
          ['sim', 'Tem garagem'],
          ['nao', 'Sem garagem'],
        ])}
        {campo('faixa_tamanho', 'Faixa de tamanho')}
        {campo('preco_de', 'Preco a partir de (R$)', {
          ajuda: 'So faixa. Nunca valor de unidade, tabela, parcela ou condicao.',
        })}
        {campo('preco_ate', 'Preco ate (R$)')}
        {erroFaixa && <p className="mb-3 text-sm text-red-700">{erroFaixa}</p>}
        {avisoMcmv && <p className="mb-3 text-sm text-amber-800">{avisoMcmv}</p>}
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 text-lg font-bold">3. Material</legend>
        {campo('foto_url', 'URL da foto', {
          ajuda:
            'Material oficial da construtora ou producao propria. Nunca puxe imagem de site de terceiro: ser publico nao remove o direito autoral.',
        })}
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">Descricao</span>
          <textarea
            value={campos.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            rows={4}
            className="w-full border border-gray-400 p-3"
          />
        </label>
        {campo('fonte_material', 'Fonte do material', {
          ajuda:
            'De onde vieram foto e descricao. Obrigatorio para publicar: e a resposta a uma construtora que pergunte.',
        })}
        {selecao('autorizacao', 'Houve autorizacao expressa da construtora?', [
          ['sim', 'Sim'],
          ['nao', 'Nao'],
        ])}
      </fieldset>

      <fieldset className="mb-8">
        <legend className="mb-3 text-lg font-bold">Pre-visualizacao</legend>
        <p className="mb-3 text-sm text-gray-600">
          E o mesmo componente da tela de resultado do quiz, nao uma imitacao. O
          que voce ve aqui e o que a pessoa ve la.
        </p>
        <div className="max-w-sm">
          <CardEmpreendimento
            emp={{
              id: id ?? 'previa',
              nome: campos.nome || null,
              construtora: campos.construtora || null,
              cidade: campos.cidade || null,
              bairro: campos.bairro || null,
              tipologias: campos.tipologias || null,
              quartos: numero(campos.quartos),
              garagem: campos.garagem === '' ? null : campos.garagem === 'sim',
              preco_de: precoDe,
              preco_ate: precoAte,
              status: campos.status || null,
              descricao: campos.descricao || null,
              foto_url: campos.foto_url || null,
            }}
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={ocupado}
        className="w-full bg-gray-800 p-4 font-medium text-white disabled:opacity-50"
      >
        {ocupado ? 'Salvando...' : id ? 'Salvar alteracoes' : 'Criar rascunho'}
      </button>

      {aviso && (
        <p
          role="alert"
          className={`mt-4 text-sm ${aviso.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}
        >
          {aviso.texto}
        </p>
      )}
    </form>
  )
}

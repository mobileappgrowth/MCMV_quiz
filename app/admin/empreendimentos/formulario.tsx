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
      ? 'O preço final não pode ser menor que o inicial.'
      : null

  const avisoMcmv =
    TETO_PRECO_MCMV > 0 && precoDe !== null && precoDe > TETO_PRECO_MCMV
      ? `Acima do teto do MCMV configurado (${reais(TETO_PRECO_MCMV)}). ` +
        'Isso não bloqueia: pode ser proposital, para o público fora do programa.'
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
        <span className="mb-1 block text-sm font-bold">{rotulo}</span>
        {extra?.ajuda && (
          <span className="mb-1 block text-xs text-apagado">{extra.ajuda}</span>
        )}
        <input
          type={extra?.tipo ?? 'text'}
          value={campos[nome]}
          onChange={(e) => mudar(nome, e.target.value)}
          className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
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
        <span className="mb-1 block text-sm font-bold">{rotulo}</span>
        <select
          value={campos[nome]}
          onChange={(e) => mudar(nome, e.target.value)}
          className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
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
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <fieldset className="rounded-[10px] border border-linha bg-white p-5">
        <legend className="mb-3 px-1 text-[17px] font-extrabold">1. Identificação</legend>
        {campo('nome', 'Nome do empreendimento')}
        {campo('construtora', 'Construtora', {
          ajuda:
            'Nome real. Divulgar é diferente de representar: não sugira parceria que não existe.',
        })}
        {campo('cidade', 'Cidade')}
        {campo('bairro', 'Bairro')}
        {selecao('status', 'Status da obra', [
          ['lancamento', 'Lançamento'],
          ['obras', 'Em obras'],
          ['pronto', 'Pronto para morar'],
        ])}
      </fieldset>

      <fieldset className="rounded-[10px] border border-linha bg-white p-5">
        <legend className="mb-3 px-1 text-[17px] font-extrabold">2. Produto</legend>
        {campo('tipologias', 'Tipologias', { ajuda: 'Ex.: 2 e 3 quartos, 45 a 62 m2' })}
        {campo('quartos', 'Quartos', { tipo: 'number' })}
        {selecao('garagem', 'Garagem', [
          ['sim', 'Tem garagem'],
          ['nao', 'Sem garagem'],
        ])}
        {campo('faixa_tamanho', 'Faixa de tamanho')}
        {campo('preco_de', 'Preço a partir de (R$)', {
          ajuda: 'Só faixa. Nunca valor de unidade, tabela, parcela ou condição.',
        })}
        {campo('preco_ate', 'Preço até (R$)')}
        {erroFaixa && (
          <p className="mb-3 rounded-lg bg-vermelho-tenue px-3.5 py-3 text-sm font-semibold text-vermelho">
            {erroFaixa}
          </p>
        )}
        {avisoMcmv && (
          <p className="mb-3 rounded-lg bg-amarelo-tenue px-3.5 py-3 text-sm text-apagado-escuro">
            {avisoMcmv}
          </p>
        )}
      </fieldset>

      <fieldset className="rounded-[10px] border border-linha bg-white p-5">
        <legend className="mb-3 px-1 text-[17px] font-extrabold">3. Material</legend>
        {campo('foto_url', 'URL da foto', {
          ajuda:
            'Material oficial da construtora ou produção própria. Nunca puxe imagem de site de terceiro: ser público não remove o direito autoral.',
        })}
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-bold">Descrição</span>
          <textarea
            value={campos.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            rows={4}
            className="w-full rounded-lg border-2 border-campo p-3 outline-none focus:border-marinho"
          />
        </label>
        {campo('fonte_material', 'Fonte do material', {
          ajuda:
            'De onde vieram foto e descrição. Obrigatório para publicar: é a resposta a uma construtora que pergunte.',
        })}
        {selecao('autorizacao', 'Houve autorização expressa da construtora?', [
          ['sim', 'Sim'],
          ['nao', 'Nao'],
        ])}
      </fieldset>

      <fieldset className="rounded-[10px] border border-linha bg-white p-5">
        <legend className="mb-3 px-1 text-[17px] font-extrabold">Pré-visualização</legend>
        <p className="mb-3 text-sm text-apagado">
          É o mesmo componente da tela de resultado do quiz, não uma imitação.
          O que você vê aqui é o que a pessoa vê lá.
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
        className="w-full rounded-lg bg-marinho p-4 font-extrabold text-white hover:bg-marinho-hover disabled:opacity-50"
      >
        {ocupado ? 'Salvando...' : id ? 'Salvar alteracoes' : 'Criar rascunho'}
      </button>

      {aviso && (
        <p
          role="alert"
          className={`rounded-lg px-3.5 py-3 text-sm font-semibold ${
            aviso.tipo === 'ok'
              ? 'bg-verde-tenue text-verde-texto'
              : 'bg-vermelho-tenue text-vermelho'
          }`}
        >
          {aviso.texto}
        </p>
      )}
    </form>
  )
}

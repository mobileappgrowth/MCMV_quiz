'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { rotuloSelo, rotuloMotivo } from '@/lib/motor'
import { devolverParaFila } from '../actions'

// ============================================================================
// UM LEAD NO ARQUIVO
//
// Mostra o essencial sempre, e o questionário inteiro dentro de um <details>.
// Nativo do navegador de propósito: abrir e fechar é a única interação, e isso
// não justifica estado de cliente nem um byte de JavaScript.
//
// A única ação aqui é devolver um descartado para a fila. Editar perfil não
// existe: o que a pessoa respondeu é registro do que ela disse, e corrigir
// isso por fora apagaria a diferença entre o que ela declarou e o que você
// apurou na ligação -- que é exatamente o produto.
// ============================================================================

export type LeadCompleto = {
  id: string
  nome: string
  telefone: string
  local: string
  status: string
  dias: number
  criadoEm: string
  verificadoEm: string | null
  qtdInteresses: number
  querContatoGeral: boolean
  seloDeclarado: string | null
  seloVerificado: string | null
  pontuacao: number | null
  motivoDescarte: string | null
  notas: string | null
  qualificacao: [string, string][]
}

const ESTILO_ESTADO: Record<string, string> = {
  novo: 'bg-amarelo text-marinho',
  verificado: 'bg-verde-tenue text-verde-texto',
  descartado: 'bg-vermelho-tenue text-vermelho',
}

const ROTULO_ESTADO: Record<string, string> = {
  novo: 'NA FILA',
  verificado: 'VERIFICADO',
  descartado: 'DESCARTADO',
}

export function CartaoLead({ lead }: { lead: LeadCompleto }) {
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, executar] = useTransition()

  function devolver() {
    setErro(null)
    executar(async () => {
      const r = await devolverParaFila(lead.id)
      if (!r.ok) setErro(r.erro)
    })
  }

  return (
    <article className="overflow-hidden rounded-[10px] border border-linha bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-extrabold">{lead.nome}</h2>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] ${
                ESTILO_ESTADO[lead.status] ?? 'bg-divisor text-apagado'
              }`}
            >
              {ROTULO_ESTADO[lead.status] ?? lead.status.toUpperCase()}
            </span>
          </div>

          <p className="text-[13px] font-medium text-apagado">
            {lead.local} · captado há {lead.dias}{' '}
            {lead.dias === 1 ? 'dia' : 'dias'} ·{' '}
            {lead.qtdInteresses === 0
              ? lead.querContatoGeral
                ? 'busca aberta'
                : 'nenhum interesse'
              : `${lead.qtdInteresses} ${lead.qtdInteresses === 1 ? 'interesse' : 'interesses'}`}
          </p>

          <p className="mt-1 text-[13px]">
            <span className="text-apagado">Declarado:</span>{' '}
            <strong>{rotuloSelo(lead.seloDeclarado)}</strong>
            {lead.pontuacao !== null && (
              <span className="text-apagado"> ({lead.pontuacao} pts)</span>
            )}
            {lead.seloVerificado && (
              <>
                <span className="text-apagado"> · Verificado:</span>{' '}
                <strong className="text-verde-texto">
                  {rotuloSelo(lead.seloVerificado)}
                </strong>
              </>
            )}
          </p>
        </div>

        <a
          href={`https://wa.me/55${lead.telefone}`}
          target="_blank"
          rel="noopener"
          className="shrink-0 rounded-lg bg-verde px-4 py-3 font-mono text-sm font-semibold whitespace-nowrap text-white hover:bg-verde-hover"
        >
          {lead.telefone} ↗
        </a>
      </div>

      {lead.motivoDescarte && (
        <p className="border-t border-divisor bg-vermelho-tenue px-4 py-2 text-[13px] font-semibold text-vermelho">
          Descartado pelo motor: {rotuloMotivo(lead.motivoDescarte)}
        </p>
      )}

      {lead.notas && (
        <p className="border-t border-divisor bg-fundo px-4 py-2.5 text-[13px]/[1.45] text-apagado-escuro">
          <span className="font-bold">Notas da ligação:</span> {lead.notas}
        </p>
      )}

      {/* O questionário inteiro, fechado por padrão: a lista precisa caber na
          tela para servir de arquivo. */}
      <details className="border-t border-divisor">
        <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-bold text-link">
          Ver o que ela respondeu
        </summary>
        <dl className="grid grid-cols-2 gap-px border-t border-divisor bg-divisor sm:grid-cols-4">
          {lead.qualificacao.map(([rotulo, valor]) => (
            <div key={rotulo} className="bg-white px-4 py-2.5">
              <dt className="text-[11px] font-medium text-apagado">{rotulo}</dt>
              <dd className="text-sm font-bold">{valor || '-'}</dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="flex flex-wrap items-center gap-2 border-t border-divisor px-4 py-3">
        {lead.status === 'novo' && (
          <Link
            href={`/admin?lead=${lead.id}`}
            className="rounded-lg border-2 border-campo px-4 py-2.5 text-sm font-bold hover:border-sobre-marinho"
          >
            Abrir na fila
          </Link>
        )}

        {/* O motor descarta sozinho, antes de voce ver. Se ele errar, este
            botão é o resgate. */}
        {lead.status === 'descartado' && (
          <button
            type="button"
            onClick={devolver}
            disabled={ocupado}
            className="rounded-lg border-2 border-campo px-4 py-2.5 text-sm font-bold hover:border-sobre-marinho disabled:opacity-50"
          >
            {ocupado ? 'Devolvendo...' : 'Devolver para a fila'}
          </button>
        )}

        {lead.status === 'verificado' && lead.verificadoEm && (
          <p className="text-[13px] text-apagado">
            Verificado em{' '}
            {new Date(lead.verificadoEm).toLocaleDateString('pt-BR')}
          </p>
        )}

        {erro && (
          <p role="alert" className="text-sm font-semibold text-vermelho">
            {erro}
          </p>
        )}
      </div>
    </article>
  )
}

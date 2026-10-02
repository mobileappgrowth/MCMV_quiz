'use client'

import { useState, useTransition } from 'react'
import { mudarPublicacao } from '../actions'

// ============================================================================
// CICLO DE PUBLICACAO
//
//   rascunho    invisivel
//   em_revisao  aguardando aprovacao (estoque cadastrado por corretor)
//   publicado   entra no match do quiz
//   pausado     sai do match; interesses existentes ficam na carencia e depois
//               saem da venda
//   arquivado   sai de tudo, e tira da vitrine os interesses nao vendidos
//
// Pausar e arquivar EXIGEM motivo. Daqui a tres meses, "por que esse sumiu?"
// precisa ter resposta -- unidades esgotadas, obra suspensa, erro de
// informacao, pedido da construtora.
//
// Arquivar e definitivo e pede confirmacao: os interesses ja vendidos
// permanecem no historico e nao geram estorno.
// ============================================================================

const DESTINOS: Record<string, { valor: string; rotulo: string }[]> = {
  rascunho: [
    { valor: 'em_revisao', rotulo: 'Enviar para revisao' },
    { valor: 'publicado', rotulo: 'Publicar' },
  ],
  em_revisao: [
    { valor: 'publicado', rotulo: 'Publicar' },
    { valor: 'rascunho', rotulo: 'Voltar para rascunho' },
  ],
  publicado: [{ valor: 'pausado', rotulo: 'Pausar' }],
  pausado: [{ valor: 'publicado', rotulo: 'Retomar' }],
  arquivado: [],
}

export function ControlePublicacao({
  id,
  statusAtual,
  pausadoMotivo,
  arquivadoMotivo,
}: {
  id: string
  statusAtual: string
  pausadoMotivo: string
  arquivadoMotivo: string
}) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, executar] = useTransition()

  function ir(destino: string, pedeMotivo: boolean) {
    setErro(null)
    if (pedeMotivo && !motivo.trim()) {
      setErro('Informe o motivo. Daqui a tres meses voce vai querer saber.')
      return
    }
    if (destino === 'arquivado') {
      const certeza = window.confirm(
        'Arquivar e definitivo e nao tem volta.\n\n' +
          'Os interesses ainda nao vendidos saem da vitrine na hora. Os ja ' +
          'vendidos permanecem no historico e nao geram estorno.\n\nConfirmar?'
      )
      if (!certeza) return
    }
    executar(async () => {
      const r = await mudarPublicacao(
        id,
        destino as Parameters<typeof mudarPublicacao>[1],
        motivo
      )
      if (!r.ok) setErro(r.erro)
      else setMotivo('')
    })
  }

  const destinos = DESTINOS[statusAtual] ?? []
  const precisaMotivo = statusAtual === 'publicado' || statusAtual === 'pausado'

  return (
    <section className="border border-gray-400 p-4">
      <p className="mb-1 text-sm text-gray-600">Estado da publicacao</p>
      <p className="mb-3 text-lg font-bold">{statusAtual}</p>

      {pausadoMotivo && statusAtual === 'pausado' && (
        <p className="mb-3 text-sm text-gray-700">
          Motivo da pausa: {pausadoMotivo}
        </p>
      )}
      {arquivadoMotivo && (
        <p className="mb-3 text-sm text-gray-700">
          Motivo do arquivamento: {arquivadoMotivo}
        </p>
      )}

      {statusAtual === 'arquivado' ? (
        <p className="text-sm text-gray-600">
          Arquivado e definitivo. Se precisar dele de volta, cadastre um novo --
          o historico deste fica intacto.
        </p>
      ) : (
        <>
          {(precisaMotivo || true) && (
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium">
                Motivo {precisaMotivo ? '(obrigatorio para pausar e arquivar)' : ''}
              </span>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Unidades esgotadas, obra suspensa, pedido da construtora..."
                className="w-full border border-gray-400 p-3 text-sm"
              />
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            {destinos.map((d) => (
              <button
                key={d.valor}
                type="button"
                disabled={ocupado}
                onClick={() => ir(d.valor, d.valor === 'pausado')}
                className="border border-gray-700 px-4 py-3 text-sm disabled:opacity-50"
              >
                {d.rotulo}
              </button>
            ))}
            <button
              type="button"
              disabled={ocupado}
              onClick={() => ir('arquivado', true)}
              className="border border-red-700 px-4 py-3 text-sm text-red-700 disabled:opacity-50"
            >
              Arquivar
            </button>
          </div>
        </>
      )}

      {erro && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {erro}
        </p>
      )}
    </section>
  )
}

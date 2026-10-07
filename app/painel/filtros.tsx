import Link from 'next/link'
import { RENDA_FAIXAS } from '@/lib/config'
import type { FiltrosVitrine } from './dados'

// ============================================================================
// FILTROS DA VITRINE
//
// Cidade e faixa sao CHIPS QUE SAO LINKS, nao campos de formulario. Tres
// consequencias boas: um toque filtra (em vez de escolher-e-submeter), o
// estado mora na URL -- o corretor guarda "Contagem, faixa 2" nos favoritos --
// e a tela inteira continua funcionando sem JavaScript.
//
// Bairro e texto livre, entao precisa de formulario. Os outros dois filtros
// viajam nele como campos ocultos: sem isso, filtrar por bairro apagaria a
// cidade escolhida.
// ============================================================================

/** Monta ?cidade=&bairro=&renda_faixa= trocando uma chave e preservando o resto. */
function comFiltro(
  atuais: FiltrosVitrine,
  chave: keyof FiltrosVitrine,
  valor: string
): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...atuais, [chave]: valor })) {
    if (v?.trim()) p.set(k, v.trim())
  }
  const q = p.toString()
  return q ? `/painel?${q}` : '/painel'
}

function Chip({
  href,
  ativo,
  children,
}: {
  href: string
  ativo: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-2.5 text-[13px] whitespace-nowrap ${
        ativo
          ? 'bg-marinho font-bold text-white'
          : 'border-[1.5px] border-campo bg-white font-semibold hover:border-sobre-marinho'
      }`}
    >
      {children}
    </Link>
  )
}

function Grupo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold tracking-[0.06em] text-apagado uppercase">
        {rotulo}
      </span>
      {children}
    </div>
  )
}

export function Filtros({
  atuais,
  cidades,
}: {
  atuais: FiltrosVitrine
  cidades: string[]
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {cidades.length > 1 && (
        <Grupo rotulo="Cidade">
          <Chip href={comFiltro(atuais, 'cidade', '')} ativo={!atuais.cidade}>
            Todas
          </Chip>
          {cidades.map((c) => (
            <Chip
              key={c}
              href={comFiltro(atuais, 'cidade', c)}
              ativo={atuais.cidade === c}
            >
              {c}
            </Chip>
          ))}
        </Grupo>
      )}

      <Grupo rotulo="Faixa">
        <Chip
          href={comFiltro(atuais, 'renda_faixa', '')}
          ativo={!atuais.renda_faixa}
        >
          Todas
        </Chip>
        {RENDA_FAIXAS.map((f) => (
          <Chip
            key={f.valor}
            href={comFiltro(atuais, 'renda_faixa', f.valor)}
            ativo={atuais.renda_faixa === f.valor}
          >
            {f.curto}
          </Chip>
        ))}
      </Grupo>

      <form method="GET" action="/painel" className="flex gap-2">
        <input type="hidden" name="cidade" value={atuais.cidade ?? ''} />
        <input
          type="hidden"
          name="renda_faixa"
          value={atuais.renda_faixa ?? ''}
        />
        <input
          name="bairro"
          defaultValue={atuais.bairro ?? ''}
          placeholder="Filtrar por bairro"
          className="w-full rounded-lg border-[1.5px] border-campo bg-white px-3.5 py-2.5 text-sm outline-none focus:border-marinho"
        />
        <button
          type="submit"
          className="rounded-lg border-[1.5px] border-campo bg-white px-4 text-sm font-bold hover:border-sobre-marinho"
        >
          Buscar
        </button>
      </form>
    </div>
  )
}

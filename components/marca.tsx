// ============================================================================
// MARCA
//
// O quadrado amarelo girado e a palavra MCMV. Aparece na landing, no quiz, no
// obrigado, no login, no painel e no admin -- uma copia so, para as seis nao
// divergirem.
//
// O quadrado e um elemento vazio de proposito: nao e informacao, e decoracao.
// Quem usa leitor de tela ouve "MCMV" e nada mais.
// ============================================================================

export function Marca({
  sufixo,
  claro = false,
}: {
  /** "Admin", "Corretores", o nome do corretor. Opcional. */
  sufixo?: string
  /** true quando a marca esta sobre o marinho. */
  claro?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        aria-hidden="true"
        className="size-5 shrink-0 rotate-45 rounded-[3px] bg-amarelo"
      />
      <div
        className={`text-[17px] font-extrabold tracking-[0.02em] ${
          claro ? 'text-white' : 'text-marinho'
        }`}
      >
        MCMV
      </div>
      {sufixo && (
        <div
          className={`text-sm font-medium ${
            claro ? 'text-sobre-marinho' : 'text-apagado'
          }`}
        >
          {sufixo}
        </div>
      )}
    </div>
  )
}

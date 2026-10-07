import { Marca } from '@/components/marca'

// ============================================================================
// OBRIGADO
//
// Ultima tela do funil. A unica funcao dela e tirar a ansiedade: o que ja
// aconteceu, o que vem agora, e que nao ha mais nada a fazer. A lista de tres
// passos existe para isso -- ela responde "e agora?" antes da pergunta nascer.
//
// Nao promete prazo ("em ate 24h"), porque quem liga sou eu e um prazo
// quebrado custa mais que um prazo nao prometido.
// ============================================================================

const PASSOS = [
  {
    marca: '✓',
    cor: 'text-verde',
    titulo: 'Respostas enviadas',
    texto: null,
  },
  {
    marca: '02',
    cor: 'text-link',
    titulo: 'Mensagem no WhatsApp',
    texto: 'Fique de olho no numero que voce cadastrou.',
  },
  {
    marca: '03',
    cor: 'text-sobre-marinho',
    titulo: 'Contato do corretor da sua regiao',
    texto: null,
  },
]

export default function Obrigado() {
  return (
    <div className="flex min-h-screen justify-center bg-fundo-fora sm:items-center sm:p-6">
      <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-white sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:shadow-[0_20px_40px_-20px_rgba(15,35,64,0.3)]">
        <header className="flex flex-col gap-7 bg-marinho px-5 pt-5 pb-10 text-white">
          <Marca claro />
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-amarelo text-[26px] font-extrabold text-marinho"
          >
            ✓
          </div>
          <h1 className="text-[30px]/[1.15] font-extrabold tracking-[-0.01em]">
            Recebemos seu cadastro.
          </h1>
        </header>

        <main className="flex flex-col gap-5 px-5 py-7">
          <p className="text-[17px]/[1.5] text-apagado-escuro">
            Vou entrar em contato pelo WhatsApp para entender melhor o que voce
            procura e confirmar as informacoes.
          </p>

          <ol className="flex flex-col rounded-[10px] border-[1.5px] border-linha">
            {PASSOS.map((p, i) => (
              <li
                key={p.titulo}
                className={`flex gap-3.5 p-4 ${
                  i < PASSOS.length - 1 ? 'border-b border-divisor' : ''
                }`}
              >
                <span
                  className={`font-mono text-[13px] font-semibold ${p.cor}`}
                  aria-hidden="true"
                >
                  {p.marca}
                </span>
                <div>
                  <p
                    className={`font-semibold ${
                      i === PASSOS.length - 1 ? 'text-apagado' : ''
                    }`}
                  >
                    {p.titulo}
                  </p>
                  {p.texto && (
                    <p className="text-sm text-apagado">{p.texto}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="text-[15px] text-apagado">
            Nao precisa fazer mais nada agora.
          </p>
        </main>
      </div>
    </div>
  )
}

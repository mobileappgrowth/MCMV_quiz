import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Minha Casa Minha Vida - Descubra se você se enquadra',
  description:
    'Responda poucas perguntas e descubra as opções de financiamento com entrada baixa na sua cidade.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // A cor da barra do navegador no celular acompanha o cabecalho marinho.
  themeColor: '#0f2340',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* O navegador so descobriria a fonte depois de baixar e interpretar o
            CSS. Na landing isso custa um ida-e-volta em cima do titulo, que e
            justamente o que a pessoa esta esperando para ler. Carregamos so o
            subconjunto latino do Public Sans -- o resto nao esta no caminho
            critico. O crossOrigin e obrigatorio mesmo sendo do nosso dominio:
            sem ele o navegador baixa o arquivo duas vezes. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fontes/public-sans-latin.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-white font-sans text-marinho antialiased">
        {children}
      </body>
    </html>
  )
}

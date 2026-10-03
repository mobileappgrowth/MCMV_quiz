import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Minha Casa Minha Vida - Descubra se voce se enquadra',
  description:
    'Responda 12 perguntas rapidas e descubra as opcoes de financiamento com entrada baixa na sua cidade.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}

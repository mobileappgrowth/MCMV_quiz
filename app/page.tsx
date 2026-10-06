import Link from 'next/link'
import { CIDADES_ROTULO } from '@/lib/config'
import { Marca } from '@/components/marca'

// ============================================================================
// LANDING
//
// E a tela que define o custo por lead: cada ponto de conversao aqui vale mais
// que qualquer otimizacao no resto do sistema. Por isso ela e estatica, sem
// 'use client', sem imagem externa e sem fonte de terceiro -- o HTML chega
// pronto e a tipografia vem do nosso dominio.
//
// O QUE ELA NAO PROMETE, E POR QUE:
//   "pre-aprovado"    -- aprovacao e da Caixa. O termo nao aparece em lugar
//                        nenhum do projeto.
//   numero de perguntas -- o quiz ramifica, entao o total muda por pessoa.
//                        Anunciar "12 perguntas" seria errado para quem segue
//                        o caminho curto e envelheceria a cada mudanca.
//   depoimento        -- nao existe depoimento real ainda, e inventar um e
//                        fabricar registro. O lugar dele e o bloco "Como
//                        funciona", que explica o processo de verdade.
//   parceria          -- "corretor parceiro da regiao" e o que somos. Nao
//                        sugerimos vinculo com construtora nem com o governo,
//                        e o rodape diz isso com todas as letras.
// ============================================================================

export const metadata = {
  title: 'Minha Casa Minha Vida - Descubra se voce se enquadra',
}

const PASSOS = [
  {
    n: '01',
    titulo: 'Responda o quiz',
    texto:
      'Renda, FGTS, quartos e onde voce quer morar. Um toque por pergunta.',
  },
  {
    n: '02',
    titulo: 'A gente confirma pelo WhatsApp',
    texto: 'Uma conversa rapida para entender o que voce procura.',
  },
  {
    n: '03',
    titulo: 'Um corretor da sua regiao te atende',
    texto: 'So um. Seu contato nao fica circulando por ai.',
  },
]

export default function Home() {
  return (
    <div className="bg-white text-marinho">
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-marinho text-white">
        <header className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 p-5">
          <Marca claro />
          <Link
            href="/login"
            className="py-2.5 text-sm font-semibold text-sobre-marinho hover:text-white"
          >
            Sou corretor
          </Link>
        </header>

        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-10 px-5 pt-6 pb-14 sm:pt-8 sm:pb-16">
          <div className="flex flex-1 basis-[340px] flex-col gap-5">
            <p className="text-[13px] font-bold tracking-[0.08em] text-amarelo uppercase">
              Minha Casa Minha Vida
            </p>
            <h1 className="text-[34px]/[1.08] font-extrabold tracking-[-0.02em] text-pretty sm:text-[44px]/[1.08]">
              Descubra se voce se enquadra e quanto precisa de entrada.
            </h1>
            <p className="max-w-[520px] text-[17px]/[1.5] text-sobre-marinho-claro text-pretty sm:text-lg/[1.5]">
              Sao poucas perguntas, uma por tela. A gente confere tudo com voce
              pelo WhatsApp e mostra opcoes com entrada baixa em{' '}
              {CIDADES_ROTULO}.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/quiz"
                className="rounded-lg bg-amarelo px-7 py-5 text-lg font-extrabold text-marinho hover:bg-amarelo-hover"
              >
                Comecar agora →
              </Link>
              <p className="text-sm font-medium text-sobre-marinho">
                Leva cerca de 2 minutos · Sem custo
              </p>
            </div>
          </div>

          {/* O lugar da foto. Marcado, nao preenchido com banco de imagem: a
              foto certa e de imovel de entrada da regiao, e ela vai entrar
              aqui quando existir. */}
          <div
            className="flex flex-1 basis-[300px] items-center justify-center rounded-xl p-4 text-center font-mono text-xs font-medium text-sobre-marinho"
            style={{
              aspectRatio: '4 / 3',
              backgroundImage:
                'repeating-linear-gradient(135deg, var(--color-foto) 0 10px, var(--color-foto-claro) 10px 20px)',
            }}
          >
            foto: familia na frente do novo apartamento
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* COMO FUNCIONA                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto flex max-w-[1080px] flex-col gap-7 px-5 py-12 sm:py-14">
        <h2 className="text-[26px] font-extrabold tracking-[-0.01em] sm:text-[28px]">
          Como funciona
        </h2>
        <div className="flex flex-wrap gap-4">
          {PASSOS.map((p) => (
            <div
              key={p.n}
              className="flex flex-1 basis-[260px] flex-col gap-2.5 rounded-[10px] border-[1.5px] border-linha p-6"
            >
              <p className="font-mono text-[13px] font-semibold text-link">
                {p.n}
              </p>
              <h3 className="text-[19px] font-extrabold">{p.titulo}</h3>
              <p className="text-base/[1.5] text-apagado">{p.texto}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3.5 rounded-[10px] bg-fundo px-6 py-5">
          <div
            aria-hidden="true"
            className="mt-[7px] size-2.5 shrink-0 rounded-full bg-verde"
          />
          <p className="text-base/[1.5] text-apagado-escuro text-pretty">
            <strong className="text-marinho">
              Seus dados nao ficam publicos.
            </strong>{' '}
            Compartilhamos seu contato so com um corretor parceiro da regiao, e
            voce pode pedir para remover a qualquer momento.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FECHAMENTO                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-amarelo">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-5 px-5 py-10">
          <p className="text-[24px] font-extrabold text-marinho sm:text-[26px]">
            Pronto para descobrir?
          </p>
          <Link
            href="/quiz"
            className="rounded-lg bg-marinho px-6 py-4 text-[17px] font-extrabold text-white hover:bg-marinho-hover"
          >
            Comecar o quiz
          </Link>
        </div>
      </div>

      <footer className="mx-auto max-w-[1080px] px-5 py-6 text-[13px] text-apagado">
        Servico independente de orientacao. Nao somos a Caixa nem orgao do
        governo.
      </footer>
    </div>
  )
}

# Design

Referencia visual do projeto, exportada do prototipo que o Albert aprovou em
6 de outubro de 2026.

- `direcoes-visuais.dc.html` — as tres direcoes propostas. A escolhida foi a
  **1b, "Chave na mao"**: marinho e amarelo, Public Sans, sem frescura.
- `prototipo.dc.html` — o prototipo clicavel na direcao 1b, nove telas:
  landing, quiz, obrigado, login, vitrine, lead desbloqueado, recarga, admin
  fila e admin corretores.

Os dois arquivos sao markup do canvas de design e dependem do `support.js` do
export original para rodar como prototipo navegavel. Sem ele continuam
legiveis como referencia: todo estilo esta inline, cor por cor.

## Os tokens vivem no codigo, nao aqui

As cores, as fontes e os raios saiam destes arquivos uma unica vez e viraram
tokens em `app/globals.css`. **Componente nao escreve hexadecimal** — usa
`bg-marinho`, `text-apagado`, `border-linha`. Mudar a marca e mexer no
`@theme` de um arquivo so.

## O prototipo e anterior ao pivo

Ele foi sincronizado em 1 de outubro, quando a unidade de venda ainda era o
lead. Por isso nao tem a tela de resultado, nao tem o admin de
empreendimentos, e a vitrine lista leads com o bairro no titulo. Onde ele
diverge do que esta no ar, **manda o que esta no ar** — as divergencias estao
listadas no topo do `CLAUDE.md`. Em particular:

- os precos dele (R$ 70 / R$ 45) sao antigos; valem os de `lib/config.ts`
- "Responda 12 perguntas" nao vale: o quiz ramifica e o total muda por pessoa
- "Numero errado vira credito de volta" e promessa de estorno, que nao existe
  no produto e nao foi escrita em tela nenhuma

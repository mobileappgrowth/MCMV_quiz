# CLAUDE.md — Plataforma de leads MCMV

Especificacao do projeto e memoria permanente do agente. Leia antes de mexer em
qualquer coisa.

## Divergencias entre esta especificacao e o que esta no ar

Mantidas aqui no topo porque a especificacao abaixo esta preservada como foi
escrita, e seguir uma linha desatualizada custa caro.

**Deploy: Cloudflare Workers, nao Vercel.** A secao "Stack" e o Dia 5 dizem
Vercel. O projeto foi migrado para Cloudflare Workers via
[vinext](https://github.com/cloudflare/vinext) a pedido do Albert, em 1 de
outubro de 2026. `npx vinext check` reporta 100% de compatibilidade com este
codigo. Ver a secao de deploy no README.

**O deploy foi antecipado.** Era Dia 5; virou pre-requisito, porque nao ha
maquina local -- o trabalho e todo na nuvem e nao existe `npm run dev` para o
Albert. Sem deploy, nenhuma tela pode ser aberta.

**O quiz tem 14 perguntas, nao 12.** O motor de qualificacao precisa de dois
dados que a lista original nao coletava: o SALDO do FGTS (e nao so o tempo) e
tres niveis de formalidade da renda (e nao um booleano), porque a tabela de
pontuacao separa MEI/autonomo comprovado de informal sem comprovacao. Mais a
pergunta condicional de regularizacao, so para quem declara restricao.

**Faixa vira numero pelo PISO.** Renda, entrada e saldo de FGTS entram nas
contas pelo piso da faixa, nunca pelo meio. Superestimar capacidade empurra lead
fraco para a fila e gasta ligacao com quem nao fecha.

**A unidade de venda e o INTERESSE, nao o lead** (2 de outubro de 2026). A
pessoa marca empreendimentos no fim do quiz e cada marcacao vira um interesse
vendavel. A especificacao abaixo, da secao "Modelo de dados" em diante, ja
reflete isso -- mas duas coisas divergem dela:

- Os dois indices unicos parciais ficam em `interesses`, nao em `desbloqueios`:
  a especificacao os coloca sobre `(lead_id, empreendimento_id)`, colunas que
  `desbloqueios` nao tem. `desbloqueios` ganha `unique (interesse_id)`, e o
  efeito pedido e preservado inteiro.
- `leads` mantem `selo_declarado` e `selo_verificado` em vez de um unico `selo`:
  a regra de produto manda o cartao mostrar qual das duas formas e, e uma coluna
  so nao da conta disso.

**`lead_id` nunca sai na vitrine.** Com ele no payload, o corretor contaria
quantos interesses a mesma pessoa gerou -- proibido "em hipotese alguma". Esta
na mesma categoria de nome e telefone: ausente, nao escondido.

**`PRECO_PRODUTO_POR_CIDADE` esta zerado.** Nenhum valor foi inventado. Com
zero, o motor nao avalia capacidade: nao elimina ninguem e nao da ponto nenhum.
O /admin avisa em vermelho enquanto estiver assim.

---

## Contexto

Estou construindo o MVP de um marketplace de leads imobiliários focado em Minha Casa Minha Vida, na região de Contagem e Betim (MG).

Como funciona: pessoas interessadas em comprar imóvel respondem um quiz numa landing page. Eu ligo pessoalmente para cada uma e verifico se o interesse é real e se o perfil de crédito fecha. Os leads verificados vão para uma vitrine onde corretores logados veem todos os dados de qualificação, mas **não** veem nome nem telefone. Para revelar o contato, o corretor gasta crédito pré-pago. Cada lead é vendido uma única vez, com exclusividade.

Meus dois clientes iniciais são corretores autônomos e equipes de plantão de estande. O produto que eu vendo não é contato, é perfil verificado e exclusivo.

Sou o único usuário do admin. O volume inicial é baixo: dezenas de leads por semana, poucos corretores. Otimize para eu conseguir construir, entender e mudar isso sozinho, não para escala.

## Stack e regras de trabalho

Use Next.js (App Router, TypeScript), Supabase para banco e autenticação, Tailwind, deploy na **Cloudflare Workers** (ver divergências no topo). Autenticação por magic link, sem senha. Mobile primeiro em todas as telas: corretor e lead acessam pelo celular.

O que **não** fazer neste MVP:

- Nenhum gateway de pagamento. Recarga de crédito é PIX manual, aprovada por mim no admin.
- Nenhum gráfico, dashboard analítico ou biblioteca de charts.
- Nenhuma dependência além do necessário. Sem state manager, sem ORM em cima do Supabase, sem framework de UI além do Tailwind.
- Nenhuma abstração antecipada. Código direto e legível vale mais que arquitetura.

Antes de começar cada dia do plano, me mostre o que pretende fazer e espere confirmação. Não avance para o dia seguinte sozinho.

## Regra crítica: o contato nunca sai do servidor

Esta é a regra mais importante do projeto. Se ela quebrar, não existe produto.

Nome e telefone do lead **nunca** podem trafegar para o navegador do corretor antes do desbloqueio. Esconder no CSS, no componente ou no filtro do front é falha grave. Trate assim:

- A listagem da vitrine seleciona colunas explícitas. Nunca `select *`.
- Nome e telefone só saem por um endpoint dedicado, que confere se existe registro em `desbloqueios` ligando aquele corretor àquele lead.
- Row Level Security ligado em todas as tabelas. A leitura pública da vitrine passa por uma view sem as colunas sensíveis.
- A chave `service_role` do Supabase só existe no servidor. Nunca em código de cliente, nunca em variável com prefixo `NEXT_PUBLIC_`.

A exclusividade também é regra de banco, não de aplicação: constraint `UNIQUE` em `desbloqueios.lead_id`. Dois corretores clicando no mesmo lead ao mesmo tempo precisam resultar em um sucesso e um erro claro, nunca em dois desbloqueios.

O débito de crédito e a criação do desbloqueio acontecem numa única transação atômica, via função no Postgres. Se qualquer parte falhar, nada é cobrado.

Ao terminar o Dia 2, escreva um teste que prove que o telefone não aparece na resposta da API de listagem.

## Modelo de dados

Crie as migrations do Supabase com estas tabelas.

**leads** — `id`, `criado_em`, `cidade`, `bairro`, `quartos`, `garagem`, `faixa_tamanho`, `enquadramento` (mcmv\_faixa1 / mcmv\_faixa2 / mcmv\_faixa3 / fora\_mcmv), `renda_faixa`, `renda_formal` (bool), `renda_composta` (bool), `nome_limpo` (sim / nao / nao\_sei), `fgts_tempo`, `ja_financiou` (bool), `entrada_disponivel`, `prazo_compra`, `nome`, `telefone`, `status` (novo / verificado / descartado / vendido), `verificado_em`, `notas_verificacao`, `preco`, `consentimento_id`.

**corretores** — `id`, `nome`, `telefone`, `creci`, `email`, `creditos`, `ativo`, `criado_em`.

**desbloqueios** — `id`, `lead_id` (UNIQUE), `corretor_id`, `preco_pago`, `criado_em`.

**transacoes\_credito** — `id`, `corretor_id`, `valor`, `tipo` (recarga / consumo), `referencia`, `criado_em`. O saldo do corretor é a soma desta tabela; guarde também em `corretores.creditos` como cache, atualizado na mesma transação.

**feedbacks** — `id`, `desbloqueio_id`, `atendeu` (bool), `tem_renda` (bool), `tem_restricao` (bool), `agendou_visita` (bool), `comentario`, `criado_em`.

**consentimentos** — `id`, `texto_versao`, `ip`, `user_agent`, `criado_em`.

O consentimento fica em tabela separada de propósito: o texto vai mudar e eu preciso conseguir provar depois qual versão cada pessoa aceitou.

## Telas

### Landing page com quiz (pública)

Uma pergunta por tela, barra de progresso, botões grandes, sem teclado quando possível. A ordem importa: comece pelas perguntas fáceis e deixe as sensíveis para o fim, quando a pessoa já investiu atenção.

1. Cidade e bairro de interesse
2. Quantos quartos
3. Precisa de garagem
4. Prazo: quando pretende comprar
5. Faixa de renda familiar
6. Renda formal (carteira assinada) ou informal
7. Vai compor renda com outra pessoa
8. Situação do nome: limpo, com restrição, não sei
9. Tempo de FGTS
10. Já financiou imóvel antes
11. Quanto tem de entrada
12. Consentimento, nome e WhatsApp

O consentimento é checkbox **desmarcado** por padrão, com o texto: os dados serão compartilhados com corretores e imobiliárias parceiras da região para apresentação de imóveis, e podem ser removidos a qualquer momento por solicitação. Grave a versão do texto, IP e user agent.

Tela final: agradecimento avisando que entrarei em contato pelo WhatsApp.

### Painel do corretor

Login por magic link. Saldo de créditos sempre visível no topo, com botão de recarga que mostra a chave PIX e meu WhatsApp.

Vitrine: lista de cartões, cada um mostrando bairro, cidade, quartos, garagem, faixa de renda, formal ou informal, situação do nome, prazo de compra, dias desde a captação e selo de verificado. Nome e telefone aparecem borrados, com o preço e o botão de desbloquear.

Filtros simples no topo: cidade, bairro, faixa de renda. Nada além disso.

Ao desbloquear: modal confirmando o débito, depois revela os dados com um botão que abre o WhatsApp já com mensagem pronta.

Aba "Meus leads": os já desbloqueados, cada um com o formulário de feedback em três cliques (atendeu, tem renda, tem restrição, agendou visita, comentário opcional).

### Admin (só eu)

Fila de verificação: leads com status `novo`, com os dados do quiz, o telefone visível, e botões para marcar verificado, descartado, ou anotar. O lead só entra na vitrine depois que eu aprovo.

Aprovação de recarga: informo corretor e valor, o sistema credita e registra a transação.

Contadores simples em texto: leads captados, verificados, vendidos, receita do mês, taxa de desbloqueio. Sem gráficos.

## Motor de qualificação

As respostas do quiz não servem só para exibir no cartão. Elas alimentam um motor que produz três saídas: o enquadramento, o selo e o preço. Implemente como função pura, em um único arquivo, com os parâmetros em config.

### Passo 1 — Enquadramento

Classifica pela renda bruta familiar nas faixas do MCMV. Os tetos mudam por decreto, então deixe em config e confirme os valores vigentes antes de subir. Renda acima do teto do programa marca o lead como `fora_mcmv`: não é descarte, é outro produto, e sai do funil principal.

### Passo 2 — Capacidade estimada

```
parcela_maxima  = renda_bruta × comprometimento        (config, padrão 0,28)
financiavel     = parcela_maxima × multiplicador_faixa (config, padrão 120)
poder_de_compra = financiavel + fgts_saldo + entrada_disponivel
```

O multiplicador é uma aproximação de SAC em 360 meses: cada R$ 1,00 de parcela inicial sustenta de R$ 110 a R$ 145 de financiamento, dependendo da taxa da faixa. Isso é triagem, não simulação. Nunca exiba esse número como valor aprovado, nem para o lead nem para o corretor.

Compare `poder_de_compra` com o preço típico do produto na região, também em config por cidade.

### Passo 3 — Eliminatórios

Avaliados antes da pontuação. Qualquer um verdadeiro manda o lead para `descartado` sem entrar na fila de verificação:

- Cidade fora da área de atuação
- `poder_de_compra` abaixo de 70% do produto mais barato da região
- Renda familiar abaixo do mínimo configurado

Já ter financiado imóvel não elimina, mas restringe o acesso ao programa. Marque como alerta e trate no Passo 6.

### Passo 4 — Pontuação

| Fator | Condição | Pontos |
| --- | --- | --- |
| Formalidade da renda | CLT, servidor ou aposentado | 30 |
|  | MEI ou autônomo com 6+ meses de comprovação | 15 |
|  | Informal sem comprovação | 0 |
| Situação do nome | Declarado limpo | 25 |
|  | Não sabe | 10 |
|  | Declara restrição | 0 |
| Capacidade | Poder de compra ≥ preço do produto | 20 |
|  | Entre 85% e 100% do preço | 10 |
|  | Entre 70% e 85% | 0 |
| FGTS | 3+ anos de regime e saldo ≥ R$ 5 mil | 10 |
|  | 3+ anos, saldo menor | 5 |
|  | Menos de 3 anos ou nenhum | 0 |
| Composição de renda | Vai compor com outra pessoa | 5 |
| Histórico | Nunca financiou imóvel | 5 |
| Prazo | Pretende comprar em até 3 meses | 5 |
|  | De 3 a 6 meses | 3 |
|  | Acima de 6 meses | 0 |

### Passo 5 — Selo

- **Forte**: 70 pontos ou mais
- **Médio**: de 45 a 69
- **A confirmar**: abaixo de 45

### Passo 6 — Travas

Aplicadas depois do selo, e sempre rebaixam:

- Restrição de nome declarada nunca sobe de **Médio**
- Renda informal sem comprovação nunca sobe de **Médio**
- Já financiou imóvel nunca sobe de **Médio**

Um lead com dois ou mais desses cai direto para **A confirmar**, qualquer que seja a pontuação.

### Regras de produto

A pontuação nunca aparece para o lead. Em nenhuma tela, em nenhuma mensagem. O quiz termina igual para todo mundo.

Grave `regra_versao` em cada lead. Quando você recalibrar os pesos, os leads antigos continuam explicáveis.

O selo tem duas formas: declarado, saído do quiz, e verificado, confirmado por mim no telefone. O cartão da vitrine mostra qual dos dois é. Só o verificado sustenta o preço cheio.

A vitrine exibe faixa de renda, nunca o valor declarado. Situação do nome aparece como etiqueta, não como dado detalhado.

Não use "pré-aprovado" em lugar nenhum. O termo correto é perfil declarado, ou perfil verificado. Aprovação é da Caixa.

### Ramificação do quiz

O motor também decide o caminho das perguntas:

- Renda acima do teto do programa pula FGTS e composição, e segue por um caminho curto
- Quem declara restrição recebe uma pergunta extra sobre regularização em andamento
- Quem marca "não sei" sobre o nome recebe uma linha explicando que isso não impede o atendimento

### Calibração

Depois dos primeiros 50 leads com feedback, cruze o selo com `agendou_visita`. Se os Fortes não agendam mais que os Médios, os pesos estão errados e o que precisa mudar são as perguntas, não o preço.

## Preço, frescor e exclusividade

Grave o preço em cada lead no momento da aprovação, em vez de calcular na hora de exibir. Deixe os valores num arquivo de configuração para eu mexer sem redeploy.

| Situação do lead | Preço |
| --- | --- |
| Verificado, menos de 72h | R$ 70 |
| Verificado, 72h ou mais | R$ 45 |
| Não verificado | R$ 30 |

O lead sai da vitrine automaticamente depois de 10 dias. Mostre no cartão a idade em dias: é o que justifica o preço e cria urgência sem escassez inventada.

Exclusividade total: um lead desbloqueado some da vitrine dos outros corretores. Não existe lead compartilhado neste MVP.

## Ordem de construção

Siga esta ordem. Pare ao fim de cada dia e me mostre o resultado antes de continuar.

**Dia 1** — Projeto Next.js, Supabase, migrations, autenticação. Quiz funcionando ponta a ponta e gravando lead + consentimento. Sem estilização ainda.

**Dia 2** — Admin de verificação. Vitrine com contato escondido e RLS. Critério de pronto: eu consigo abrir o DevTools, olhar a aba de rede e não achar telefone nenhum na resposta da listagem.

**Dia 3** — Créditos, desbloqueio em transação atômica, revelação do contato, botão de WhatsApp, formulário de feedback.

**Dia 4** — Caprichar na landing page. Aqui vale tempo, porque ela define meu custo por lead. Título sobre entrada baixa e financiamento, foto de imóvel de entrada, prova social, carregamento rápido no 4G.

**Dia 5** — Teste no celular de verdade, checagem final de segurança dos contatos. (O deploy saiu daqui e virou pré-requisito; ver divergências no topo.)

## Fora do escopo

Não construa nada disso, mesmo que pareça natural ou rápido. Se achar que algo aqui é indispensável, me pergunte antes.

- Agendamento de visitas e calendário
- Varredura ou importação de imóveis de outros sites
- Planos mensais e assinatura
- Gateway de pagamento
- Notificações automáticas por email ou push
- Painel para imobiliária ou construtora
- Aplicativo nativo
- Testes automatizados além do único teste de vazamento de contato
- Internacionalização, tema escuro, animações

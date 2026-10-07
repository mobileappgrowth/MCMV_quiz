# CLAUDE.md — Plataforma de leads MCMV

Especificacao VIGENTE do projeto e memoria permanente do agente. Leia antes de
mexer em qualquer coisa.

## Divergencias entre esta especificacao e o que esta no ar

Mantidas aqui no topo porque o corpo abaixo esta preservado como foi escrito, e
seguir uma linha desatualizada custa caro.

**Deploy: Cloudflare Workers, nao Vercel.** A secao "Stack" e o Dia 5 dizem
Vercel. O projeto foi migrado para Cloudflare Workers via
[vinext](https://github.com/cloudflare/vinext) a pedido do Albert, em 1 de
outubro de 2026. `npx vinext check` reporta 100% de compatibilidade.

**O deploy foi antecipado.** Era Dia 5; virou pre-requisito, porque nao ha
maquina local -- o trabalho e todo na nuvem e nao existe `npm run dev` para o
Albert. Sem deploy, nenhuma tela pode ser aberta.

**O quiz tem 14 perguntas, nao 12.** O motor precisa do SALDO do FGTS (e nao so
do tempo) e de tres niveis de formalidade da renda (e nao de um booleano),
porque a tabela de pontuacao separa MEI/autonomo comprovado de informal sem
comprovacao. Mais a pergunta condicional de regularizacao, so para quem declara
restricao. `leads` mantem `renda_formal` como booleano derivado, para o cartao,
e ganha `vinculo_renda` com os tres niveis.

**Os dois indices unicos parciais ficam em `interesses`, nao em
`desbloqueios`.** A regra critica os coloca sobre `(lead_id,
empreendimento_id)` -- colunas que `desbloqueios` nao tem, porque a definicao da
tabela so lhe da `interesse_id`. O par (lead, empreendimento) existe em
`interesses`, entao e la que a unicidade cabe; `desbloqueios` ganha
`unique (interesse_id)`. O efeito pedido e preservado inteiro.

**`leads` tem `selo_declarado` e `selo_verificado`, nao um unico `selo`.** A
regra de produto manda o cartao mostrar qual das duas formas e, e uma coluna so
nao da conta disso.

**`lead_id` e `qtd_interesses` nunca saem na vitrine.** Com o id do lead no
payload, o corretor agruparia as linhas e contaria quantos empreendimentos a
mesma pessoa marcou -- proibido "em hipotese alguma". Estao na mesma categoria
de nome e telefone: ausentes, nao escondidos.

**Faixa vira numero pelo PISO.** Renda, entrada e saldo de FGTS entram nas
contas pelo piso da faixa, nunca pelo meio. Superestimar capacidade empurra lead
fraco para a fila e gasta ligacao com quem nao fecha.

**Interesse nao verificado APARECE na vitrine**, com etiqueta de perfil
declarado e preco menor (decisao do Albert, 2 de outubro). A secao do admin diz
que o lead so entra depois da aprovacao; prevalece a tabela de precos, que tem
linhas para nao verificado.

**Visibilidade literal.** O corretor ve os interesses dos empreendimentos DELE
mais a vitrine geral. Consequencia assumida: os interesses do catalogo
cadastrado pelo Albert nao aparecem para corretor nenhum. Atras de
`INTERESSES_SEM_DONO_VISIVEIS_PARA_TODOS` em `lib/config.ts`, revertivel numa
linha.

**`PRECO_PRODUTO_POR_CIDADE` fica em branco, por decisao do Albert** (7 de
outubro): nao chutar preco numa regua de eliminatorio, porque lead morto por
numero inventado some sem passar pela fila. Com zero, o motor nao avalia
capacidade -- nao elimina ninguem por isso e nao da os 20 pontos dela, entao o
maximo vira 80 e Forte exige perfil quase perfeito. Nao e pendencia: o /admin
mostra isso como estado, em ambar, nao como alarme. O numero a colocar, quando
houver catalogo, e o preco cheio do imovel de entrada que ele realmente vende
em cada cidade -- na pratica o `preco_de` do empreendimento mais barato dali.
Nao confundir com `TETO_PRECO_MCMV`, que e o teto do programa por decreto e so
valida o cadastro de empreendimento.

**O admin abre `/painel` em modo vistoria.** A pedido do Albert, 6 de outubro.
Ve a vitrine inteira (sem o filtro de dono, entao tambem os interesses do
catalogo cadastrado por ele) e o preco de cada interesse, sem saldo e sem botao
de revelar. Nao existe linha em `corretores` para o email de admin: ela daria
saldo, e um clique em revelar gastaria credito e consumiria a exclusividade do
interesse. As acoes que movem dinheiro seguem exigindo corretor cadastrado, no
servidor. Nome e telefone continuam fora da consulta para todo mundo, admin
incluido -- quem precisa do telefone e a fila do /admin.

**O admin tem uma tela de leads alem da fila** (`/admin/leads`), a pedido do
Albert, 7 de outubro. A fila mostra so `status = novo`; depois de aprovar ou
descartar, o lead sumia da vista para sempre. A tela nova e o arquivo: todos os
leads em qualquer estado, com nome, telefone, o que a pessoa respondeu, o selo
declarado e o verificado, e o motivo do descarte. Permite devolver um
descartado para a fila -- o motor descarta sozinho, e se um parametro estiver
mal calibrado esse botao e o resgate. Verificado nao volta: a aprovacao ja
subiu o preco de todos os interesses do lead.

---
## Contexto

Estou construindo o MVP de um marketplace de leads imobiliários focado em Minha Casa Minha Vida, na região de Contagem e Betim (MG).

Como funciona: pessoas interessadas em comprar imóvel respondem um quiz numa landing page. No fim, veem os empreendimentos da região compatíveis com o poder de compra delas e marcam aqueles sobre os quais querem receber contato, sem limite de quantidade. Cada marcação vira um **interesse**. Eu ligo pessoalmente para cada pessoa e verifico se o perfil fecha. Os interesses verificados vão para uma vitrine onde corretores logados veem os dados de qualificação, mas **não** veem nome nem telefone. O crédito pré-pago só é debitado quando o corretor clica para revelar o contato. Cada interesse é vendido uma única vez: a exclusividade é por empreendimento, não por pessoa.

Quem não marca nenhum empreendimento recebe uma pergunta extra: quer que um corretor da região entre em contato com outras opções? Quem aceita entra numa vitrine geral, onde o lead é exclusivo no sentido clássico — vendido uma vez e some. Quem recusa sai do funil e fica só como dado agregado.

A unidade de venda, portanto, é o interesse, não o lead.

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

A exclusividade também é regra de banco, não de aplicação. Em `desbloqueios`, dois índices únicos parciais: um sobre (`lead_id`, `empreendimento_id`) quando há empreendimento, outro sobre `lead_id` quando `empreendimento_id` é nulo, que é o caso da vitrine geral. Dois corretores clicando ao mesmo tempo no mesmo item precisam resultar em um sucesso e um erro claro, nunca em dois desbloqueios.

O débito de crédito e a criação do desbloqueio acontecem numa única transação atômica, via função no Postgres. Se qualquer parte falhar, nada é cobrado.

Ao terminar o Dia 2, escreva um teste que prove que o telefone não aparece na resposta da API de listagem.

## Modelo de dados

Crie as migrations do Supabase com estas tabelas.

**leads** — `id`, `criado_em`, `cidade`, `bairro`, `quartos`, `garagem`, `faixa_tamanho`, `enquadramento`, `renda_faixa`, `renda_formal` (bool), `renda_composta` (bool), `nome_limpo` (sim / nao / nao\_sei), `fgts_tempo`, `fgts_saldo`, `ja_financiou` (bool), `entrada_disponivel`, `prazo_compra`, `nome`, `telefone`, `poder_de_compra`, `selo` (forte / medio / a\_confirmar), `regra_versao`, `qtd_interesses`, `quer_contato_geral` (bool), `status` (novo / verificado / descartado), `verificado_em`, `notas_verificacao`, `consentimento_id`.

`qtd_interesses` é dado interno de calibração. Nunca exiba na vitrine.

**corretores** — `id`, `nome`, `telefone`, `creci`, `email`, `creditos`, `ativo`, `criado_em`.

**empreendimentos** — `id`, `nome`, `construtora`, `cidade`, `bairro`, `tipologias`, `quartos`, `garagem`, `preco_de`, `preco_ate`, `status` (lancamento / obras / pronto), `descricao`, `foto_url`, `dono_corretor_id` (nulo quando é cadastro meu, preenchido quando o estoque é de um cliente), `ativo`, `criado_em`. Cadastro manual por mim no admin. Não publique preço fechado nem condição de financiamento de empreendimento de terceiro: use faixa e "a partir de".

**interesses** — `id`, `lead_id`, `empreendimento_id`, `criado_em`, `preco`, `visualizacoes`, `consentimento_id`. Uma linha por empreendimento que a pessoa marcou. O lead que não marcou nenhum e aceitou contato geral gera uma linha com `empreendimento_id` nulo.

**desbloqueios** — `id`, `interesse_id`, `corretor_id`, `preco_pago`, `criado_em`. Índices únicos parciais conforme a regra crítica acima.

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

Tela de resultado: de 3 a 8 empreendimentos compatíveis com cidade, bairro, quartos e, principalmente, com o `poder_de_compra` calculado pelo motor. Cada card traz foto, nome, bairro, tipologia, faixa de preço e um checkbox **desmarcado** com o texto "quero receber contato sobre este".

Sem botão de selecionar todos. Sem nada pré-marcado. Sem teto de escolhas: a pessoa marca quantos quiser. Um contador dinâmico mostra "você vai receber contato de N empresas", para que a escolha seja informada.

Se ela não marcar nenhum, uma pergunta final: quer que um corretor da região entre em contato com outras opções? Sim grava `quer_contato_geral` e cria um interesse sem empreendimento. Não encerra o funil.

Tela de agradecimento avisando que entrarei em contato pelo WhatsApp.

### Painel do corretor

Login por magic link. Saldo de créditos sempre visível no topo, com botão de recarga que mostra a chave PIX e meu WhatsApp.

Vitrine: lista de **interesses**, não de leads. Cada cartão mostra o empreendimento pedido (ou "busca aberta", quando é da vitrine geral), bairro, cidade, quartos, garagem, faixa de renda, formal ou informal, situação do nome, selo do motor, prazo de compra, dias desde a captação e se é verificado. Nome e telefone aparecem borrados, com o preço e o botão de revelar.

O corretor só vê interesses dos empreendimentos dele, mais a vitrine geral. Não exiba em hipótese alguma quantos empreendimentos a pessoa marcou, nem quantos outros interesses ela gerou.

Nada é empurrado e nada é cobrado por aparecer na vitrine. O crédito só sai no clique de revelar.

Filtros simples no topo: cidade, bairro, faixa de renda. Nada além disso.

Ao revelar: modal explícito com o preço, o saldo atual e o saldo depois, e confirmação em dois passos. Débito e revelação na mesma transação. Depois, os dados aparecem com um botão que abre o WhatsApp já com mensagem pronta citando o empreendimento.

Aba "Meus leads": os já desbloqueados, cada um com o formulário de feedback em três cliques (atendeu, tem renda, tem restrição, agendou visita, comentário opcional).

### Admin (só eu)

Fila de verificação: leads com status `novo`, com os dados do quiz, o telefone visível, e botões para marcar verificado, descartado, ou anotar. O lead só entra na vitrine depois que eu aprovo.

Cadastro de empreendimentos: CRUD simples, com os campos da tabela. É o que alimenta a tela de resultado do quiz, então precisa existir antes de rodar mídia.

Aprovação de recarga: informo corretor e valor, o sistema credita e registra a transação.

Contadores simples em texto: leads captados, verificados, vendidos, receita do mês, taxa de desbloqueio. Sem gráficos.

## Publicação de empreendimentos

### Regras de conteúdo

Foto e texto vêm do material oficial de divulgação da construtora ou são produção própria. Nunca puxe imagem do site de terceiro, mesmo sendo empreendimento público: ser público não remove o direito autoral.

Identifique empreendimento e construtora pelo nome real, sem sugerir parceria, representação ou autorização que não exista. "Divulgamos este empreendimento" e "somos parceiros da construtora X" são coisas diferentes do ponto de vista jurídico.

Nada de preço de unidade, tabela, condição de pagamento, taxa de juros ou valor de parcela. Só faixa e "a partir de". Orientar sobre condição de financiamento é atividade de correspondente bancário.

Quando o empreendimento é cadastrado por um cliente (`dono_corretor_id` preenchido), a responsabilidade pelo conteúdo é dele, e isso precisa constar no termo de uso do corretor. Ainda assim, a publicação passa por aprovação minha.

### Campos adicionais na tabela

Acrescente a `empreendimentos`: `status_publicacao` (rascunho / em\_revisao / publicado / pausado / arquivado), `fonte_material` (texto livre: de onde vieram foto e descrição), `autorizacao` (bool, se houve autorização expressa da construtora), `publicado_em`, `pausado_em`, `pausado_motivo`, `atualizado_em`, `atualizado_por`.

### Formulário

Um formulário só, usado para criar e editar, em três blocos: identificação (nome, construtora, cidade, bairro, status da obra), produto (tipologias, quartos, garagem, faixa de tamanho, `preco_de`, `preco_ate`), e material (foto, descrição, `fonte_material`, `autorizacao`).

Obrigatórios para publicar: nome, construtora, cidade, bairro, quartos, `preco_de` e `fonte_material`. Rascunho salva incompleto.

Validações: `preco_ate` maior ou igual a `preco_de`; faixa de preço coerente com o enquadramento MCMV configurado; foto com limite de tamanho e proporção fixa, para o card não quebrar.

Pré-visualização do card exatamente como ele aparece na tela de resultado, antes de publicar. É a forma mais rápida de pegar erro de texto e foto cortada.

### Ciclo de vida

Rascunho é invisível. Publicado entra no match do quiz. Pausado sai do match. Arquivado sai de tudo.

Nunca exclua um empreendimento: arquivar preserva o histórico dos interesses já gerados e vendidos. Exclusão quebraria a rastreabilidade do que foi cobrado.

Pausar e arquivar pedem motivo, que fica registrado. Motivos típicos: unidades esgotadas, obra suspensa, erro de informação, pedido da construtora.

### Efeito sobre interesses existentes

Pausar não apaga nada. Os interesses já criados continuam na vitrine por até 72 horas, com etiqueta de que o empreendimento saiu do ar, e depois são retirados da venda.

Arquivar retira imediatamente da vitrine todos os interesses ainda não vendidos daquele empreendimento. Os já vendidos permanecem no histórico e não geram estorno.

Editar um empreendimento não altera os interesses já vendidos: o corretor comprou com a informação que estava no ar. Guarde `atualizado_em` para conseguir reconstruir isso.

### Auditoria

Toda alteração grava quem, quando e o que mudou, em uma tabela `empreendimentos_log` com `empreendimento_id`, `campo`, `valor_antes`, `valor_depois`, `autor_id`, `criado_em`. Serve para responder a uma construtora que questione o que foi publicado.

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

| Situação | Preço |
| --- | --- |
| Interesse em empreendimento, verificado, menos de 72h | R$ 90 |
| Interesse em empreendimento, verificado, 72h ou mais | R$ 60 |
| Interesse em empreendimento, não verificado | R$ 30 |
| Vitrine geral, verificado | R$ 60 |
| Vitrine geral, não verificado | R$ 25 |

Selo **forte** adiciona um multiplicador configurável sobre o valor da linha, padrão 1,3. Selo **a confirmar** aplica 0,7.

O lead sai da vitrine automaticamente depois de 10 dias. Mostre no cartão a idade em dias: é o que justifica o preço e cria urgência sem escassez inventada.

Exclusividade total: um lead desbloqueado some da vitrine dos outros corretores. Não existe lead compartilhado neste MVP.

## Ordem de construção

Siga esta ordem. Pare ao fim de cada dia e me mostre o resultado antes de continuar.

**Dia 1** — Projeto Next.js, Supabase, migrations, autenticação. Quiz funcionando ponta a ponta e gravando lead + consentimento. Sem estilização ainda.

**Dia 2** — Cadastro de empreendimentos, motor de qualificação, tela de resultado com seleção de interesses. Admin de verificação.

**Dia 3** — Vitrine de interesses com contato escondido e RLS, créditos, revelação em transação atômica, WhatsApp, feedback. Critério de pronto: eu consigo abrir o DevTools, olhar a aba de rede e não achar telefone nenhum na resposta da listagem.

**Dia 4** — Caprichar na landing page. Aqui vale tempo, porque ela define meu custo por lead. Título sobre entrada baixa e financiamento, foto de imóvel de entrada, prova social, carregamento rápido no 4G.

**Dia 5** — Teste no celular de verdade, checagem final de segurança dos contatos. (O deploy saiu daqui e virou pré-requisito; ver divergências no topo.)

## Fora do escopo

Não construa nada disso, mesmo que pareça natural ou rápido. Se achar que algo aqui é indispensável, me pergunte antes.

- Agendamento de visitas e calendário
- Varredura, scraping ou importação automática de imóveis de outros sites — o catálogo é cadastrado à mão
- Planos mensais e assinatura
- Gateway de pagamento
- Notificações automáticas por email ou push
- Painel para imobiliária ou construtora gerenciar o próprio estoque
- Aplicativo nativo
- Testes automatizados além do único teste de vazamento de contato
- Internacionalização, tema escuro, animações

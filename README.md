# MCMV Quiz — marketplace de leads imobiliarios

Leads de Minha Casa Minha Vida, verificados por telefone e vendidos com
exclusividade a corretores.

## A regra que nao pode quebrar

**Nome e telefone do lead nunca trafegam para o navegador do corretor antes do
desbloqueio.** Nao e uma preferencia de UX: e o produto. Se o contato vaza, nao
ha nada para vender.

Como isso e sustentado no codigo:

| Camada | Garantia |
|---|---|
| Postgres | RLS ligado em todas as tabelas, zero policies (`0002_rls.sql`). Com a anon key nao se le uma linha. |
| Postgres | `GRANT` revogado de `anon` e `authenticated`. Se uma policy aparecer por engano, ainda falta o privilegio. |
| Postgres | `UNIQUE` em `desbloqueios.lead_id`. Exclusividade e constraint, nao `if` de aplicacao. |
| Servidor | `SUPABASE_SERVICE_ROLE_KEY` sem prefixo `NEXT_PUBLIC_`: o Next nao a coloca no bundle. |
| Servidor | `lib/supabase/admin.ts` joga erro se chamado no navegador. |
| Postgres | A view `vitrine` nao tem as colunas `nome` e `telefone`. Nenhuma consulta a ela pode vazar contato. |
| Postgres | A view e `security_invoker = true`: se exposta, herda o RLS de `leads`, que nega. |
| Consulta | A vitrine seleciona colunas explicitas. **Nunca `select *`.** |
| Teste | `npm run test:vazamento` falha se o contato aparecer na listagem. |
| Deploy | O bundle do Worker nao e servido: buscar por HTTP o arquivo que referencia a chave secreta devolve **404**, enquanto um asset legitimo devolve 200. |

Ao mexer no projeto, essa tabela e a checklist.

## Se voce nao tem terminal

O setup abaixo pressupoe um terminal com o repo clonado. **Sem maquina local,
nada disso roda** -- e o caminho e outro, todo pelo navegador:

| Em vez de | Faca |
|---|---|
| `npm run sql` | abra `setup-supabase.sql` e cole no SQL Editor do Supabase |
| `cp .env.example .env.local` | cadastre as variaveis no painel da Cloudflare (ver abaixo) |
| `npm run admin:criar` | Supabase > Authentication > Users > Add user, com *Auto Confirm User* ligado |
| `npm run verifica` | peca a uma sessao do Claude Code com os secrets no ambiente |
| `npm run dev` | deploy na Cloudflare: e a unica forma de abrir o app |

`setup-supabase.sql` e **gerado** a partir de `supabase/migrations/`. Quando as
migrations mudarem, ele e regerado com `npm run sql > setup-supabase.sql` --
nao edite o arquivo direto.

Nesse modo, os scripts de diagnostico (`verifica`, `admin:criar`,
`test:vazamento`) rodam numa sessao de Claude Code na nuvem com as chaves
cadastradas como secrets do ambiente, nao na sua maquina.

## Setup

Quatro passos. O terceiro e um comando que te diz se os outros deram certo.

### 1. Criar o projeto no Supabase

Em [supabase.com](https://supabase.com), crie um projeto. Em **Project
Settings > API**, copie a URL, a `anon` key e a `service_role` key.

```bash
cp .env.example .env.local
```

Preencha as tres, mais `ADMIN_EMAILS` com o seu email.

`SUPABASE_SERVICE_ROLE_KEY` ignora todo o RLS. Nunca commite, nunca renomeie
com `NEXT_PUBLIC_`, nunca cole em chat. Se ela vazar, rotacione no painel.

### 2. Aplicar as migrations

```bash
npm run sql
```

Imprime as migrations concatenadas na ordem certa. Cole no **SQL Editor** do
Supabase e rode uma vez. Le os arquivos de verdade, entao nunca fica
desatualizado em relacao a `supabase/migrations/`.

### 3. Verificar

```bash
npm run verifica
```

Checa oito coisas e diz qual esta errada: chaves presentes, conexao, as 6
tabelas, a view, o contato inacessivel, a anon key bloqueada, seu usuario de
admin, e o estado dos dados. Somente leitura -- pode rodar quantas vezes
quiser, inclusive contra producao.

Rode isto antes de abrir o navegador. Quando a vitrine aparecer vazia ou o
login nao funcionar, rode de novo: ele responde o porque.

### 4. Criar seu acesso de admin

```bash
npm run admin:criar
```

O login tem `shouldCreateUser: false`, para que ninguem crie conta digitando um
email. **Isso vale para voce tambem:** sem este passo, voce nao entra no
`/admin` do seu proprio produto. O comando cria o usuario de autenticacao para
cada email em `ADMIN_EMAILS`. Idempotente.

### 5. Liberar o redirect do magic link

**Authentication > URL Configuration**, em *Redirect URLs*:

```
http://localhost:3000/auth/callback
https://SEU-WORKER.workers.dev/auth/callback
```

Sem isso o email chega, mas o link nao loga. E a unica coisa do setup que
`npm run verifica` nao consegue checar.

### 6. Rodar

```bash
npm install
npm run dev
```

| Rota | O que e |
|---|---|
| `/` | quiz publico |
| `/login` | magic link |
| `/painel` | vitrine (exige corretor cadastrado e ativo) |
| `/painel/recarga` | chave PIX |
| `/admin` | fila de verificacao (exige email em `ADMIN_EMAILS`) |
| `/admin/corretores` | cadastro manual de corretor |

### Primeiro teste de ponta a ponta

1. `/` -- responda o quiz inteiro e envie.
2. `/admin` -- o lead aparece na fila com o telefone. Aprove.
3. `/admin/corretores` -- cadastre um corretor com um email seu que funcione.
4. `/login` com o email do corretor, abra o link no celular.
5. `/painel` -- o lead aparece sem contato. **Confira no DevTools.**

### Limite de email do Supabase

O servico de email embutido do Supabase tem limite baixo de envios por hora, e
o valor muda. Com poucos corretores isso costuma passar, mas se os magic links
pararem de chegar, e a primeira suspeita -- confira o limite atual em
**Authentication > Rate Limits**. Configurar SMTP proprio (Resend, Postmark)
resolve, e e uma mudanca de painel, nao de codigo.

## Deploy (Cloudflare Workers)

O app roda em Cloudflare Workers via [vinext](https://github.com/cloudflare/vinext),
que reimplementa a API do Next.js sobre Vite. `npx vinext check` reporta 100%
de compatibilidade com este codigo -- os 5 imports do Next que usamos
(`next/cache`, `next/link`, `next/server`, `next/headers`, `next/navigation`)
sao todos integralmente suportados.

### Configuracao no painel

**Workers & Pages > Create > Import a repository**, aponte para este repo.

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |

Cada push na branch configurada vira um deploy.

### Se o build falhar com "package.json nao encontrado"

Ele clonou a branch errada. Esta mensagem nao tem nada a ver com Node, npm ou
vinext: a branch que a Cloudflare clonou nao tem o projeto.

**Settings > Controle da ramificacao** precisa apontar para a branch que tem o
codigo. O padrao da Cloudflare e `main`.

E a parte que custa tempo: **"Retry deployment" reexecuta o snapshot antigo de
configuracao.** Depois de trocar a branch, um retry ainda clona a antiga, e voce
conclui errado que a troca nao pegou. Dispare um **push novo** na branch certa
em vez de usar retry.

### Se o deploy falhar com "Aborting the upload operation because of conflicts"

O `cloudflare.config.ts` e a fonte da verdade da configuracao do Worker. O
`cf deploy` compara o que esta nele com o que esta no painel e **aborta** se
divergir, para nao apagar silenciosamente o que foi configurado la.

Consequencia: **uma variavel adicionada so pelo painel, como `var` comum,
quebra o proximo deploy.** Ou ela e declarada no `cloudflare.config.ts`, ou e
cadastrada como **Secret** -- secrets nao entram nessa comparacao.

A divisao adotada:

| Variavel | Onde vive | Por que |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `cloudflare.config.ts`, repassada do ambiente de build | publica por natureza; repassar em vez de fixar mantem o repo livre de valores de um projeto especifico |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | painel, como **Secret** | ignora todo o RLS; nunca no repositorio |
| `ADMIN_EMAILS` | painel, como **Secret** | como `var` comum quebraria o deploy |

**A lista de variaveis de execucao do painel deve ficar vazia.** Tudo que nao
for Secret vem do `cloudflare.config.ts`.

### A armadilha das variaveis: LEIA ANTES

A Cloudflare tem **dois lugares diferentes** para variaveis, e eles nao se
enxergam:

- **Settings > Builds > Build variables and secrets** -- existe so durante o build
- **Settings > Variables and Secrets** -- existe so em execucao

Variavel de build **nao** e visivel em execucao, e vice-versa. Cadastre assim:

| Variavel | Build | Execucao | Por que |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **sim** | **sim** | embutida no bundle do navegador no build, E lida pelo codigo de servidor em execucao |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **sim** | **sim** | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | nao | **sim, como Secret** | nunca no build: mantem a chave fora de log e cache de build |
| `ADMIN_EMAILS` | nao | **sim** | so o servidor decide quem e admin |

As duas primeiras vao nos dois lugares de proposito. Custa nada e elimina uma
classe inteira de falha confusa.

Se faltar uma variavel de build, **o build passa e o app quebra em execucao** --
falha no lugar errado, longe da causa. `npm run verifica` (numa sessao com as
chaves) diz qual.

### O que acontece se a configuracao estiver errada

Por desenho, as falhas sao assimetricas:

- **A landing page e `/obrigado` continuam de pe.** `proxy.ts` cobre so
  `/painel` e `/admin`, e falha macia se faltar configuracao. Sua captacao de
  leads nao cai por causa de um env var errado. Verificado: `/` responde 200
  sem nenhuma variavel do Supabase definida.
- **`/painel` e `/admin` devolvem 500.** De proposito: em rota protegida,
  falhar fechado e mais seguro que redirecionar silenciosamente.

### Escotilha de emergencia

Se um upgrade quebrar o vinext, `npm run build:next` constroi com o Next.js de
verdade. Nao faz deploy, mas responde "o problema e meu codigo ou o adaptador?"
em um comando. O `next` segue instalado so para isso.

### Vulnerabilidade conhecida (nao acionavel)

`npm audit` reporta 4 moderadas na cadeia
`vinext > @vercel/og > satori > fflate`. E a geracao de imagem OG, que este
projeto nao usa -- o caminho vulneravel (descompactar ZIP64 malformado ao ler
fonte) nunca e alcancado. `npm audit fix --force` **rebaixa** o vinext para
0.2.1. Deixe como esta.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (vite, porta 3000) |
| `npm run build` | build de producao (vinext) |
| `npm run start` | roda o Worker construido localmente |
| `npm run deploy` | deploy manual na Cloudflare |
| `npm run build:next` | escotilha: build com o Next.js de verdade |
| `npm run lint` | checagem de tipos (`tsc --noEmit`) |
| `npm run sql` | imprime as migrations para colar no Supabase |
| `npm run verifica` | diagnostica a integracao (somente leitura) |
| `npm run admin:criar` | cria seu usuario de autenticacao de admin |
| `npm run test:vazamento` | prova que o contato nao vaza na listagem |

### O teste de vazamento

```bash
npm run test:vazamento
```

Precisa de `.env.local` apontando para um Supabase **de teste** com as tres
migrations aplicadas. Insere um lead com telefone-sentinela, roda a consulta
real da vitrine e apaga o lead no fim.

Quatro asserções, e a primeira e a que faz as outras valerem:

1. **Controle positivo** — o telefone sentinela esta no banco e o servidor o
   encontra. Sem isso, um setup que falhou deixaria o teste verde sem provar
   nada: asserção negativa passa de graca quando nao ha dado nenhum.
2. `listarVitrine()` nao devolve telefone nem nome.
3. `select *` na view nao traz as colunas de contato.
4. A anon key nao le `leads` nem `vitrine`.

### A checagem no DevTools

O teste cobre a funcao. Para conferir o que de fato sai pela rede:

1. Abra `/painel` logado como corretor, com o DevTools na aba **Network**.
2. Procure a requisicao do documento (`painel`) e veja a resposta.
3. Busque (Ctrl+F) o telefone de um lead que esta na vitrine.
4. Repita nas requisicoes `?_rsc=...`, que e onde o Next serializa props de
   Server Components. **E o esconderijo menos obvio de um vazamento.**

Nenhuma das duas deve conter o telefone.

## Onde mexer

**`lib/config.ts`** concentra tudo que muda por decisao de negocio: preco,
janela de 72h, 10 dias na vitrine, faixas de renda MCMV, texto e versao do
consentimento, chave PIX. Editar esse arquivo nao exige entender o resto.

Mudou o texto do consentimento? **Incremente `CONSENTIMENTO.versao`.** Reescrever
mantendo a versao destroi a prova de qual redacao cada pessoa aceitou — que e a
razao de `consentimentos` ser uma tabela separada.

## Estrutura

```
app/
  page.tsx              landing + quiz (publico)
  quiz/
    quiz-form.tsx       12 telas, uma pergunta por vez
    actions.ts          grava consentimento + lead (servidor)
  obrigado/             confirmacao pos-envio
  login/                magic link
  auth/callback/        troca o code por sessao
  painel/
    page.tsx            vitrine (Server Component)
    dados.ts            listarVitrine -- colunas explicitas
    cartao-lead.tsx     cartao sem contato
    recarga/            chave PIX + WhatsApp
  admin/
    page.tsx            fila de verificacao (telefone visivel: sou eu)
    actions.ts          aprovar, descartar, anotar, cadastrar corretor
    corretores/         cadastro manual de corretor
  sem-acesso/           logado, mas sem cadastro de corretor
lib/
  auth.ts               quem pode ver o que -- todo o controle de acesso
  config.ts             knobs de negocio
  preco.ts              preco na aprovacao, idade do lead
  quiz.ts               perguntas e derivacao do enquadramento
  supabase/
    admin.ts            service_role — SOMENTE SERVIDOR
    browser.ts          anon — so autenticacao
    session.ts          quem esta logado, no servidor
scripts/
  verifica-supabase.ts  diagnostico da integracao
  criar-admin.ts        cria seu usuario de autenticacao
  sql.ts                concatena as migrations
supabase/migrations/    SQL versionado
testes/                 o unico teste: vazamento de contato
proxy.ts                renova o cookie de sessao (so em /painel e /admin)
vite.config.ts          build vinext
cloudflare.config.ts    definicao do Worker
```

## Progresso

- [x] **Dia 1** — projeto, migrations, autenticacao, quiz gravando ponta a ponta
- [x] **Dia 2** — admin de verificacao, vitrine com contato escondido, teste de vazamento
- [ ] **Dia 3** — creditos, desbloqueio atomico, revelacao, WhatsApp, feedback
- [ ] **Dia 4** — landing page
- [x] **Deploy** — Cloudflare Workers via vinext (antecipado: sem maquina local, e a unica forma de abrir o app)
- [ ] **Dia 5** — teste no celular, checagem final

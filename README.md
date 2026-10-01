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

Ao mexer no projeto, essa tabela e a checklist.

## Se voce nao tem terminal

O setup abaixo pressupoe um terminal com o repo clonado. **Sem maquina local,
nada disso roda** -- e o caminho e outro, todo pelo navegador:

| Em vez de | Faca |
|---|---|
| `npm run sql` | abra `setup-supabase.sql` e cole no SQL Editor do Supabase |
| `cp .env.example .env.local` | cadastre as variaveis no painel da Vercel |
| `npm run admin:criar` | Supabase > Authentication > Users > Add user, com *Auto Confirm User* ligado |
| `npm run verifica` | peca a uma sessao do Claude Code com os secrets no ambiente |
| `npm run dev` | deploy na Vercel: e a unica forma de abrir o app |

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
https://SEU-DOMINIO.vercel.app/auth/callback
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

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de producao |
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
middleware.ts           renova o cookie de sessao
```

## Progresso

- [x] **Dia 1** — projeto, migrations, autenticacao, quiz gravando ponta a ponta
- [x] **Dia 2** — admin de verificacao, vitrine com contato escondido, teste de vazamento
- [ ] **Dia 3** — creditos, desbloqueio atomico, revelacao, WhatsApp, feedback
- [ ] **Dia 4** — landing page
- [ ] **Dia 5** — deploy, teste no celular, checagem final

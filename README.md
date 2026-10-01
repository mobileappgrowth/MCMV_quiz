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

## Setup

### 1. Criar o projeto no Supabase

Em [supabase.com](https://supabase.com), crie um projeto. Depois vá em
**Project Settings > API** e copie as tres chaves.

### 2. Aplicar as migrations

No painel do Supabase, **SQL Editor > New query**. Cole e rode, nesta ordem:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_vitrine.sql`

Rodar fora de ordem falha (a segunda depende das tabelas da primeira).

### 3. Liberar o redirect do magic link

**Authentication > URL Configuration**, em *Redirect URLs*, adicione:

```
http://localhost:3000/auth/callback
https://SEU-DOMINIO.vercel.app/auth/callback
```

Sem isso o link do email chega, mas nao loga.

### 4. Variaveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as chaves do passo 1. `SUPABASE_SERVICE_ROLE_KEY` e secreta:
nunca commite, nunca renomeie com `NEXT_PUBLIC_`.

### 5. Rodar

```bash
npm install
npm run dev
```

- `/` — quiz publico
- `/login` — magic link
- `/painel` — exige sessao

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de producao |
| `npm run lint` | checagem de tipos (`tsc --noEmit`) |
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

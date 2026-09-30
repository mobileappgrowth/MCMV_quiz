-- ============================================================================
-- 0001_schema.sql  -- Schema inicial do marketplace de leads MCMV
-- Aplicar no painel do Supabase: SQL Editor > New query > colar > Run
-- ============================================================================

-- Tipos fechados. Um valor errado vira erro de banco, nao linha suja.
create type enquadramento_mcmv as enum (
  'mcmv_faixa1', 'mcmv_faixa2', 'mcmv_faixa3', 'fora_mcmv'
);

create type lead_status as enum (
  'novo', 'verificado', 'descartado', 'vendido'
);

create type situacao_nome as enum ('sim', 'nao', 'nao_sei');

create type tipo_transacao as enum ('recarga', 'consumo');


-- ---------------------------------------------------------------------------
-- consentimentos
-- Tabela separada de proposito: o texto muda com o tempo e precisamos provar
-- depois qual versao exata cada pessoa aceitou. IP e user agent sao lidos no
-- servidor, nunca enviados pelo navegador.
-- ---------------------------------------------------------------------------
create table consentimentos (
  id           uuid primary key default gen_random_uuid(),
  texto_versao text not null,
  ip           text,
  user_agent   text,
  criado_em    timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- leads
-- nome e telefone sao as colunas sensiveis. Nunca aparecem na view da vitrine.
-- ---------------------------------------------------------------------------
create table leads (
  id                 uuid primary key default gen_random_uuid(),
  criado_em          timestamptz not null default now(),

  -- qualificacao (visivel na vitrine antes do desbloqueio)
  cidade             text not null,
  bairro             text,
  quartos            smallint,
  garagem            boolean,
  faixa_tamanho      text,
  enquadramento      enquadramento_mcmv,
  renda_faixa        text,
  renda_formal       boolean,
  renda_composta     boolean,
  nome_limpo         situacao_nome,
  fgts_tempo         text,
  ja_financiou       boolean,
  entrada_disponivel text,
  prazo_compra       text,

  -- SENSIVEL: so sai do servidor pelo endpoint de revelacao, apos desbloqueio
  nome               text not null,
  telefone           text not null,

  -- operacao
  status             lead_status not null default 'novo',
  verificado_em      timestamptz,
  notas_verificacao  text,
  preco              numeric(10, 2),

  consentimento_id   uuid references consentimentos (id)
);

-- A vitrine lista sempre por status + idade.
create index leads_status_criado_em_idx on leads (status, criado_em desc);
create index leads_cidade_idx on leads (cidade);


-- ---------------------------------------------------------------------------
-- corretores
-- O vinculo com a autenticacao e por email: o magic link do Supabase coloca o
-- email no JWT, e as policies comparam com esta coluna. Sem coluna extra,
-- sem sincronizacao para dar errado.
-- ---------------------------------------------------------------------------
create table corretores (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  telefone  text,
  creci     text,
  email     text not null unique,
  -- Cache do saldo. A verdade e a soma de transacoes_credito; esta coluna e
  -- atualizada na MESMA transacao, pela funcao do Dia 3.
  creditos  numeric(10, 2) not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Comparacao de email no login e case-insensitive.
create unique index corretores_email_lower_idx on corretores (lower(email));


-- ---------------------------------------------------------------------------
-- desbloqueios
-- A EXCLUSIVIDADE E ESTA CONSTRAINT. Nao e regra de aplicacao: dois corretores
-- clicando no mesmo lead no mesmo instante resultam em um insert e um erro de
-- unique violation. Nunca em dois desbloqueios.
-- ---------------------------------------------------------------------------
create table desbloqueios (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null unique references leads (id),
  corretor_id uuid not null references corretores (id),
  preco_pago  numeric(10, 2) not null,
  criado_em   timestamptz not null default now()
);

create index desbloqueios_corretor_id_idx on desbloqueios (corretor_id, criado_em desc);


-- ---------------------------------------------------------------------------
-- transacoes_credito
-- Livro-caixa append-only. Soma = saldo real do corretor.
-- recarga: valor positivo. consumo: valor negativo.
-- ---------------------------------------------------------------------------
create table transacoes_credito (
  id          uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references corretores (id),
  valor       numeric(10, 2) not null,
  tipo        tipo_transacao not null,
  referencia  text,
  criado_em   timestamptz not null default now()
);

create index transacoes_credito_corretor_id_idx on transacoes_credito (corretor_id, criado_em desc);


-- ---------------------------------------------------------------------------
-- feedbacks
-- O que o corretor reporta depois de ligar. E o dado que diz se a verificacao
-- esta funcionando.
-- ---------------------------------------------------------------------------
create table feedbacks (
  id             uuid primary key default gen_random_uuid(),
  desbloqueio_id uuid not null references desbloqueios (id),
  atendeu        boolean,
  tem_renda      boolean,
  tem_restricao  boolean,
  agendou_visita boolean,
  comentario     text,
  criado_em      timestamptz not null default now()
);

create index feedbacks_desbloqueio_id_idx on feedbacks (desbloqueio_id);

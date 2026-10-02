-- ############################################################################
-- #  ARQUIVO GERADO -- nao edite aqui.
-- #
-- #  Fonte da verdade: supabase/migrations/*.sql
-- #  Regenerado por: npm run sql > setup-supabase.sql
-- #
-- #  Existe para quem nao tem terminal: abra este arquivo, copie TUDO, cole no
-- #  SQL Editor do Supabase e rode uma vez. Nao precisa rodar em partes.
-- #
-- #  JA APLICOU UMA VERSAO ANTERIOR? Rode so a migration nova
-- #  (supabase/migrations/0004_motor.sql). Rodar este arquivo inteiro de novo
-- #  falha no primeiro CREATE TYPE, porque os tipos ja existem.
-- ############################################################################

-- ============================================================
-- SETUP DO BANCO -- gerado por `npm run sql`
-- Cole tudo no SQL Editor do Supabase e rode uma vez.
-- 4 migrations: 0001_schema.sql, 0002_rls.sql, 0003_vitrine.sql, 0004_motor.sql
-- ============================================================


-- >>>>> 0001_schema.sql >>>>>

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


-- >>>>> 0002_rls.sql >>>>>

-- ============================================================================
-- 0002_rls.sql  -- Row Level Security
--
-- POSTURA DESTE ARQUIVO: RLS ligado em TODAS as tabelas, com ZERO policies.
--
-- No Postgres, "RLS ligado + nenhuma policy" significa NEGAR TUDO para qualquer
-- role que respeite RLS (anon e authenticated). Nao e um esqueleto a preencher:
-- e a configuracao final desejada para o Dia 1.
--
-- Consequencia pratica: com a anon key (a chave que existe no navegador do
-- corretor) NAO se le nem se escreve uma linha de nenhuma tabela. A anon key
-- serve apenas para autenticacao (magic link), que usa o schema auth, nao estas
-- tabelas. Todo acesso a dados passa por codigo de servidor usando service_role.
--
-- Isso protege nome e telefone por construcao: mesmo que alguem pegue a anon
-- key do bundle JavaScript (ela e publica por design) e chame a API REST do
-- Supabase diretamente, a resposta e vazia.
--
-- O Dia 2 adiciona a view da vitrine, sem as colunas sensiveis. Novas policies
-- devem ser adicionadas em migrations novas, nunca editando este arquivo.
-- ============================================================================

alter table leads               enable row level security;
alter table corretores          enable row level security;
alter table desbloqueios        enable row level security;
alter table transacoes_credito  enable row level security;
alter table feedbacks           enable row level security;
alter table consentimentos      enable row level security;

-- Cinto e suspensorio: alem do RLS, retiramos o privilegio de tabela dos roles
-- publicos. Se um dia uma policy for adicionada por engano, o grant ainda
-- precisa existir para que a leitura aconteca.
revoke all on leads              from anon, authenticated;
revoke all on corretores         from anon, authenticated;
revoke all on desbloqueios       from anon, authenticated;
revoke all on transacoes_credito from anon, authenticated;
revoke all on feedbacks          from anon, authenticated;
revoke all on consentimentos     from anon, authenticated;


-- >>>>> 0003_vitrine.sql >>>>>

-- ============================================================================
-- 0003_vitrine.sql  -- View da vitrine
--
-- Esta view e a segunda camada de defesa do contato. A primeira e a consulta
-- com colunas explicitas no codigo; esta aqui existe para o dia em que eu
-- escrever um `select *` desleixado: nao ha nome nem telefone para vazar,
-- porque estas colunas NAO EXISTEM na view.
--
-- Nao adicione `nome` nem `telefone` aqui. Nunca. Se precisar do contato, use
-- o endpoint dedicado que confere o registro em desbloqueios.
--
-- DUAS REGRAS ESTRUTURAIS vivem aqui, nao no codigo:
--   1. status = 'verificado'  -- lead so entra na vitrine depois que eu aprovo
--   2. sem registro em desbloqueios  -- exclusividade: vendido, sai da vitrine
--
-- A JANELA DE 10 DIAS NAO ESTA AQUI, de proposito. Esta em DIAS_NA_VITRINE, em
-- lib/config.ts, e e aplicada na consulta. Se estivesse no SQL, mudar de 10
-- para 7 exigiria uma migration. Regra estrutural no banco, knob de negocio no
-- config.
--
-- security_invoker = true: a view roda com os privilegios de quem consulta, nao
-- do dono. Assim, se um dia ela for exposta ao role authenticated por engano,
-- ela herda o RLS de leads -- que nega tudo. Sem isso, uma view seria uma porta
-- dos fundos em volta do RLS.
-- ============================================================================

create view vitrine with (security_invoker = true) as
select
  l.id,
  l.criado_em,
  l.cidade,
  l.bairro,
  l.quartos,
  l.garagem,
  l.faixa_tamanho,
  l.enquadramento,
  l.renda_faixa,
  l.renda_formal,
  l.renda_composta,
  l.nome_limpo,
  l.fgts_tempo,
  l.ja_financiou,
  l.entrada_disponivel,
  l.prazo_compra,
  l.preco,
  l.verificado_em
  -- l.nome      <- AUSENTE DE PROPOSITO
  -- l.telefone  <- AUSENTE DE PROPOSITO
from leads l
where l.status = 'verificado'
  and not exists (
    select 1 from desbloqueios d where d.lead_id = l.id
  );

-- Mesma postura das tabelas: os roles publicos nao tem privilegio nenhum.
-- A vitrine e lida por codigo de servidor com service_role.
revoke all on vitrine from anon, authenticated;


-- >>>>> 0004_motor.sql >>>>>

-- ============================================================================
-- 0004_motor.sql  -- Motor de qualificacao
--
-- Acrescenta o que o motor produz e o que ele precisa, e recria a view da
-- vitrine com o selo.
--
-- Aplicar DEPOIS de 0001, 0002 e 0003.
-- ============================================================================

-- Selo de qualificacao. Existe em duas formas: o declarado, que sai do quiz, e
-- o verificado, que sou eu confirmando no telefone. So o verificado sustenta o
-- preco cheio.
create type selo_qualificacao as enum ('forte', 'medio', 'a_confirmar');

-- Formalidade da renda em tres niveis. O booleano renda_formal continua
-- existindo e passa a ser derivado deste: o cartao da vitrine mostra "formal ou
-- informal", mas a pontuacao precisa separar MEI/autonomo comprovado de
-- informal sem comprovacao -- 15 pontos de diferenca.
create type vinculo_renda as enum (
  'clt_servidor_aposentado',
  'mei_autonomo_comprovado',
  'informal'
);

alter table leads
  -- Entrada nova do quiz: saldo do FGTS em faixa. O motor precisa do valor,
  -- nao so do tempo -- tanto no poder de compra quanto no criterio de 5 mil.
  add column fgts_saldo text,

  -- Entrada nova do quiz: tres niveis de formalidade.
  add column vinculo_renda vinculo_renda,

  -- Pergunta extra, so para quem declara restricao de nome.
  add column regularizacao_andamento boolean,

  -- Saidas do motor. Gravadas para a decisao ser explicavel depois.
  add column pontuacao smallint,
  add column selo_declarado selo_qualificacao,
  add column selo_verificado selo_qualificacao,
  add column poder_de_compra numeric(12, 2),

  -- Versao da regra que produziu as saidas acima. Sem isto, recalibrar os
  -- pesos torna os leads antigos inexplicaveis.
  add column regra_versao text,

  -- Qual eliminatorio descartou o lead. Sem isto, "a regra esta matando lead
  -- bom?" fica sem resposta -- e lead descartado por engano e dinheiro de
  -- anuncio no lixo.
  add column motivo_descarte text;

create index leads_motivo_descarte_idx on leads (motivo_descarte)
  where motivo_descarte is not null;

-- ---------------------------------------------------------------------------
-- View da vitrine, recriada com o selo.
--
-- O QUE NAO ENTRA, E POR QUE:
--   nome, telefone   -- a regra critica do projeto
--   pontuacao        -- o corretor ve o SELO, nao o numero. Expor a pontuacao
--                       transforma cada lead numa negociacao sobre o calculo.
--   poder_de_compra  -- e triagem, nao simulacao. Exibido, viraria "valor
--                       aprovado", e aprovacao e da Caixa.
-- ---------------------------------------------------------------------------
drop view if exists vitrine;

create view vitrine with (security_invoker = true) as
select
  l.id,
  l.criado_em,
  l.cidade,
  l.bairro,
  l.quartos,
  l.garagem,
  l.faixa_tamanho,
  l.enquadramento,
  l.renda_faixa,
  l.renda_formal,
  l.renda_composta,
  l.nome_limpo,
  l.fgts_tempo,
  l.ja_financiou,
  l.entrada_disponivel,
  l.prazo_compra,
  l.preco,
  l.verificado_em,
  l.selo_declarado,
  l.selo_verificado
  -- l.nome             <- AUSENTE DE PROPOSITO
  -- l.telefone         <- AUSENTE DE PROPOSITO
  -- l.pontuacao        <- AUSENTE DE PROPOSITO
  -- l.poder_de_compra  <- AUSENTE DE PROPOSITO
from leads l
where l.status = 'verificado'
  and not exists (
    select 1 from desbloqueios d where d.lead_id = l.id
  );

revoke all on vitrine from anon, authenticated;


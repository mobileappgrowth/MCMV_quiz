-- ############################################################################
-- #  ARQUIVO GERADO -- nao edite aqui.
-- #
-- #  Fonte da verdade: supabase/migrations/*.sql
-- #  Regenerado por: npm run sql > setup-supabase.sql
-- #
-- #  COLE TUDO NO SQL EDITOR DO SUPABASE E RODE. Quantas vezes precisar.
-- #
-- #  E seguro rodar por cima de um banco que ja tem dados: tipos, tabelas,
-- #  colunas e indices so sao criados se faltarem, e a unica operacao
-- #  destrutiva (a troca de `desbloqueios` no 0005) e guardada para acontecer
-- #  uma vez so. Verificado com tres passadas sobre um banco com venda
-- #  registrada: zero erros, zero dado perdido.
-- ############################################################################

-- ============================================================
-- SETUP DO BANCO -- gerado por `npm run sql`
-- Cole tudo no SQL Editor do Supabase e rode uma vez.
-- 6 migrations: 0001_schema.sql, 0002_rls.sql, 0003_vitrine.sql, 0004_motor.sql, 0005_interesses.sql, 0006_revelacao.sql
-- ============================================================


-- >>>>> 0001_schema.sql >>>>>

-- ============================================================================
-- 0001_schema.sql  -- Schema inicial do marketplace de leads MCMV
-- Aplicar no painel do Supabase: SQL Editor > New query > colar > Run
-- ============================================================================

-- Tipos fechados. Um valor errado vira erro de banco, nao linha suja.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'enquadramento_mcmv') then
    create type enquadramento_mcmv as enum (
      'mcmv_faixa1', 'mcmv_faixa2', 'mcmv_faixa3', 'fora_mcmv'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'novo', 'verificado', 'descartado', 'vendido'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'situacao_nome') then
    create type situacao_nome as enum ('sim', 'nao', 'nao_sei');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'tipo_transacao') then
    create type tipo_transacao as enum ('recarga', 'consumo');
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- consentimentos
-- Tabela separada de proposito: o texto muda com o tempo e precisamos provar
-- depois qual versao exata cada pessoa aceitou. IP e user agent sao lidos no
-- servidor, nunca enviados pelo navegador.
-- ---------------------------------------------------------------------------
create table if not exists consentimentos (
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
create table if not exists leads (
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
create index if not exists leads_status_criado_em_idx on leads (status, criado_em desc);
create index if not exists leads_cidade_idx on leads (cidade);


-- ---------------------------------------------------------------------------
-- corretores
-- O vinculo com a autenticacao e por email: o magic link do Supabase coloca o
-- email no JWT, e as policies comparam com esta coluna. Sem coluna extra,
-- sem sincronizacao para dar errado.
-- ---------------------------------------------------------------------------
create table if not exists corretores (
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
create unique index if not exists corretores_email_lower_idx on corretores (lower(email));


-- ---------------------------------------------------------------------------
-- desbloqueios
-- A EXCLUSIVIDADE E ESTA CONSTRAINT. Nao e regra de aplicacao: dois corretores
-- clicando no mesmo lead no mesmo instante resultam em um insert e um erro de
-- unique violation. Nunca em dois desbloqueios.
-- ---------------------------------------------------------------------------
create table if not exists desbloqueios (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null unique references leads (id),
  corretor_id uuid not null references corretores (id),
  preco_pago  numeric(10, 2) not null,
  criado_em   timestamptz not null default now()
);

create index if not exists desbloqueios_corretor_id_idx on desbloqueios (corretor_id, criado_em desc);


-- ---------------------------------------------------------------------------
-- transacoes_credito
-- Livro-caixa append-only. Soma = saldo real do corretor.
-- recarga: valor positivo. consumo: valor negativo.
-- ---------------------------------------------------------------------------
create table if not exists transacoes_credito (
  id          uuid primary key default gen_random_uuid(),
  corretor_id uuid not null references corretores (id),
  valor       numeric(10, 2) not null,
  tipo        tipo_transacao not null,
  referencia  text,
  criado_em   timestamptz not null default now()
);

create index if not exists transacoes_credito_corretor_id_idx on transacoes_credito (corretor_id, criado_em desc);


-- ---------------------------------------------------------------------------
-- feedbacks
-- O que o corretor reporta depois de ligar. E o dado que diz se a verificacao
-- esta funcionando.
-- ---------------------------------------------------------------------------
create table if not exists feedbacks (
  id             uuid primary key default gen_random_uuid(),
  desbloqueio_id uuid not null references desbloqueios (id),
  atendeu        boolean,
  tem_renda      boolean,
  tem_restricao  boolean,
  agendou_visita boolean,
  comentario     text,
  criado_em      timestamptz not null default now()
);

create index if not exists feedbacks_desbloqueio_id_idx on feedbacks (desbloqueio_id);


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

-- GUARDA DE IDEMPOTENCIA
--
-- Esta versao da view seleciona leads.preco, coluna que a migration 0005
-- remove quando o preco passa a viver no interesse. Rodar o historico completo
-- uma segunda vez quebraria aqui.
--
-- Ela e substituida por 0004 e depois por 0005 de qualquer forma: existe como
-- registro do que a vitrine era nesta altura, nao como estado final.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'leads' and column_name = 'preco'
  ) then
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
  end if;
end $$;


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
do $$
begin
  if not exists (select 1 from pg_type where typname = 'selo_qualificacao') then
    create type selo_qualificacao as enum ('forte', 'medio', 'a_confirmar');
  end if;
end $$;

-- Formalidade da renda em tres niveis. O booleano renda_formal continua
-- existindo e passa a ser derivado deste: o cartao da vitrine mostra "formal ou
-- informal", mas a pontuacao precisa separar MEI/autonomo comprovado de
-- informal sem comprovacao -- 15 pontos de diferenca.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'vinculo_renda') then
    create type vinculo_renda as enum (
      'clt_servidor_aposentado',
      'mei_autonomo_comprovado',
      'informal'
    );
  end if;
end $$;

alter table leads
  -- Entrada nova do quiz: saldo do FGTS em faixa. O motor precisa do valor,
  -- nao so do tempo -- tanto no poder de compra quanto no criterio de 5 mil.
  add column if not exists fgts_saldo text,

  -- Entrada nova do quiz: tres niveis de formalidade.
  add column if not exists vinculo_renda vinculo_renda,

  -- Pergunta extra, so para quem declara restricao de nome.
  add column if not exists regularizacao_andamento boolean,

  -- Saidas do motor. Gravadas para a decisao ser explicavel depois.
  add column if not exists pontuacao smallint,
  add column if not exists selo_declarado selo_qualificacao,
  add column if not exists selo_verificado selo_qualificacao,
  add column if not exists poder_de_compra numeric(12, 2),

  -- Versao da regra que produziu as saidas acima. Sem isto, recalibrar os
  -- pesos torna os leads antigos inexplicaveis.
  add column if not exists regra_versao text,

  -- Qual eliminatorio descartou o lead. Sem isto, "a regra esta matando lead
  -- bom?" fica sem resposta -- e lead descartado por engano e dinheiro de
  -- anuncio no lixo.
  add column if not exists motivo_descarte text;

create index if not exists leads_motivo_descarte_idx on leads (motivo_descarte)
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
-- GUARDA DE IDEMPOTENCIA: mesma razao do 0003 -- esta versao ainda seleciona
-- leads.preco, que o 0005 remove. Substituida pelo 0005 de qualquer forma.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'leads' and column_name = 'preco'
  ) then

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
  end if;
end $$;


-- >>>>> 0005_interesses.sql >>>>>

-- ============================================================================
-- 0005_interesses.sql  -- A unidade de venda passa a ser o INTERESSE
--
-- Ate aqui se vendia o lead: uma pessoa, uma venda. Agora a pessoa marca, no
-- fim do quiz, os empreendimentos sobre os quais quer receber contato, e CADA
-- MARCACAO vira um interesse vendavel. Quem marca quatro gera quatro unidades
-- de venda, cada uma exclusiva por empreendimento. Quem nao marca nenhum e
-- aceita contato generico gera um interesse sem empreendimento -- a vitrine
-- geral, onde vale a exclusividade classica.
--
-- Aplicar DEPOIS de 0001, 0002, 0003 e 0004.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- EMPREENDIMENTOS
--
-- Catalogo cadastrado a mao. Alimenta a tela de resultado do quiz, entao
-- precisa existir antes de rodar midia.
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'status_obra') then
    create type status_obra as enum ('lancamento', 'obras', 'pronto');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'status_publicacao') then
    create type status_publicacao as enum (
      'rascunho',    -- invisivel
      'em_revisao',  -- aguardando minha aprovacao
      'publicado',   -- entra no match do quiz
      'pausado',     -- sai do match, mas os interesses ficam na carencia
      'arquivado'    -- sai de tudo
    );
  end if;
end $$;

create table if not exists empreendimentos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  construtora   text not null,
  cidade        text not null,
  bairro        text not null,
  tipologias    text,
  quartos       smallint,
  garagem       boolean,
  faixa_tamanho text,

  -- SO FAIXA E "A PARTIR DE". Nunca preco de unidade, tabela, condicao de
  -- pagamento, taxa ou valor de parcela: orientar sobre condicao de
  -- financiamento e atividade de correspondente bancario.
  preco_de      numeric(12, 2),
  preco_ate     numeric(12, 2),

  status        status_obra,
  descricao     text,
  foto_url      text,

  -- Nulo quando sou eu quem cadastra. Preenchido quando o estoque e de um
  -- corretor cliente -- e ai a responsabilidade pelo conteudo e dele.
  dono_corretor_id uuid references corretores (id),

  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),

  -- --- publicacao ---
  status_publicacao status_publicacao not null default 'rascunho',

  -- De onde vieram foto e descricao. Obrigatorio para publicar: e a resposta
  -- a uma construtora que pergunte de onde saiu o material.
  fonte_material text,
  -- Houve autorizacao expressa da construtora? Divulgar e diferente de
  -- representar: nao sugira parceria que nao existe.
  autorizacao   boolean not null default false,

  publicado_em  timestamptz,
  pausado_em    timestamptz,
  pausado_motivo text,
  arquivado_em  timestamptz,
  arquivado_motivo text,
  atualizado_em timestamptz,
  atualizado_por uuid,

  constraint preco_coerente
    check (preco_de is null or preco_ate is null or preco_ate >= preco_de)
);

create index if not exists empreendimentos_match_idx
  on empreendimentos (status_publicacao, cidade);
create index if not exists empreendimentos_dono_idx
  on empreendimentos (dono_corretor_id)
  where dono_corretor_id is not null;

-- ---------------------------------------------------------------------------
-- EMPREENDIMENTOS_LOG
--
-- Uma linha por campo alterado. Serve para responder a uma construtora que
-- questione o que foi publicado: o que estava no ar, quando, e quem mudou.
-- ---------------------------------------------------------------------------
create table if not exists empreendimentos_log (
  id               uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references empreendimentos (id),
  campo            text not null,
  valor_antes      text,
  valor_depois     text,
  autor_id         uuid,
  criado_em        timestamptz not null default now()
);

create index if not exists empreendimentos_log_emp_idx
  on empreendimentos_log (empreendimento_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- INTERESSES
--
-- Uma linha por empreendimento marcado. empreendimento_id nulo = vitrine
-- geral, de quem nao marcou nenhum e aceitou contato de outras opcoes.
--
-- OS DOIS INDICES UNICOS PARCIAIS MORAM AQUI, e nao em desbloqueios.
--
-- A especificacao os coloca em `desbloqueios`, sobre (lead_id,
-- empreendimento_id) -- mas desbloqueios nao tem essas colunas, so
-- interesse_id. O par (lead, empreendimento) existe aqui, entao e aqui que a
-- unicidade cabe. O efeito pedido e preservado inteiro:
--
--   aqui          -- uma pessoa nao gera dois interesses no mesmo
--                    empreendimento, nem dois interesses gerais
--   desbloqueios  -- cada interesse e vendido uma unica vez
--
-- Dois corretores clicando ao mesmo tempo continuam resultando em um sucesso e
-- uma violacao de constraint. Regra de banco, nao de aplicacao.
-- ---------------------------------------------------------------------------
create table if not exists interesses (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references leads (id),
  empreendimento_id uuid references empreendimentos (id),
  criado_em        timestamptz not null default now(),

  -- Gravado na criacao (perfil declarado) e recalculado quando eu verifico o
  -- lead (perfil verificado). Preco gravado e preco combinado: nao muda
  -- embaixo do corretor que esta olhando a tela.
  preco            numeric(10, 2),

  visualizacoes    integer not null default 0,
  consentimento_id uuid references consentimentos (id)
);

create unique index if not exists interesses_lead_empreendimento_idx
  on interesses (lead_id, empreendimento_id)
  where empreendimento_id is not null;

create unique index if not exists interesses_lead_geral_idx
  on interesses (lead_id)
  where empreendimento_id is null;

create index if not exists interesses_empreendimento_idx
  on interesses (empreendimento_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- DESBLOQUEIOS: passa a apontar para o interesse
--
-- A tabela esta vazia (nao existe ainda acao de desbloqueio na aplicacao),
-- entao recriar e mais limpo que cirurgia de coluna.
--
-- ORDEM IMPORTA, e por dois motivos:
--
--   1. A view `vitrine` do 0004 referencia desbloqueios na subconsulta de
--      exclusividade. Enquanto ela existir, a tabela nao cai.
--   2. feedbacks.desbloqueio_id tem chave estrangeira para ca. Solto a
--      constraint, recrio, e reponho -- explicitamente. `drop table ...
--      cascade` resolveria os dois de uma vez, e e justamente o que nao quero:
--      ele removeria a chave de feedbacks EM SILENCIO, e a tabela passaria a
--      aceitar desbloqueio_id orfao sem ninguem perceber.
-- ---------------------------------------------------------------------------
drop view if exists vitrine;

-- GUARDA DE IDEMPOTENCIA: so troca se a tabela ainda estiver na forma antiga.
--
-- Sem ela, colar este arquivo uma segunda vez APAGARIA os desbloqueios ja
-- vendidos -- e desbloqueio apagado e dinheiro cobrado sem rastro de entrega.
-- Com volume baixo e SQL colado a mao num editor web, rodar duas vezes nao e
-- hipotese remota: e questao de tempo.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'desbloqueios' and column_name = 'lead_id'
  ) then
    alter table feedbacks drop constraint if exists feedbacks_desbloqueio_id_fkey;

    drop table desbloqueios;

    create table desbloqueios (
      id           uuid primary key default gen_random_uuid(),
      interesse_id uuid not null unique references interesses (id),
      corretor_id  uuid not null references corretores (id),
      preco_pago   numeric(10, 2) not null,
      criado_em    timestamptz not null default now()
    );

    create index desbloqueios_corretor_id_idx
      on desbloqueios (corretor_id, criado_em desc);

    alter table feedbacks
      add constraint feedbacks_desbloqueio_id_fkey
      foreign key (desbloqueio_id) references desbloqueios (id);

    -- RECRIAR A TABELA ZEROU O RLS que 0002_rls.sql tinha ligado. Sem estas
    -- duas linhas, `desbloqueios` volta a nascer legivel: no Supabase, tabela
    -- nova em `public` recebe os grants padrao para anon e authenticated, e sem
    -- RLS isso basta para a chave que esta no navegador ler a tabela inteira.
    -- Um Postgres local nao reproduz esses grants, entao o furo passaria no
    -- teste e apareceria so em producao.
    alter table desbloqueios enable row level security;
    revoke all on desbloqueios from anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- LEADS
--
-- A view ja caiu acima, antes do drop de desbloqueios -- entao a coluna preco
-- sai sem ninguem depender dela.
-- ---------------------------------------------------------------------------
alter table leads
  -- Dado interno de calibracao. NUNCA exibido na vitrine: quantos
  -- empreendimentos a pessoa marcou e assunto meu, nao do corretor.
  add column if not exists qtd_interesses integer not null default 0,

  -- Marcou zero empreendimentos e aceitou contato de outras opcoes.
  add column if not exists quer_contato_geral boolean,

  -- O preco agora vive no interesse, porque e o interesse que se vende.
  -- Sai daqui em vez de ficar como peso morto enganoso.
  drop column if exists preco;

-- ---------------------------------------------------------------------------
-- VIEW DA VITRINE, agora sobre INTERESSES
--
-- O QUE NAO ENTRA, E POR QUE:
--   nome, telefone    -- a regra critica do projeto
--   pontuacao         -- o corretor ve o SELO, nao o numero
--   poder_de_compra   -- e triagem, nao simulacao; viraria "valor aprovado"
--   lead_id           -- NOVO, e tao importante quanto os outros: com o id do
--                        lead no payload, o corretor contaria quantos
--                        interesses a mesma pessoa gerou. A especificacao
--                        proibe expor isso "em hipotese alguma", e esconder no
--                        componente nao bastaria -- o dado estaria na resposta.
--   qtd_interesses    -- pelo mesmo motivo
--
-- Filtro estrutural: lead descartado nunca aparece, empreendimento arquivado
-- sai imediatamente, e interesse ja desbloqueado some.
--
-- A CARENCIA DE 72h DO PAUSADO NAO ESTA AQUI, de proposito. A view expoe
-- status_publicacao e pausado_em; quem aplica a janela e a aplicacao, com o
-- valor em lib/config.ts. Regra estrutural no banco, knob de negocio no config.
-- ---------------------------------------------------------------------------
create view vitrine with (security_invoker = true) as
select
  i.id,
  i.criado_em,
  i.preco,
  i.empreendimento_id,

  -- qualificacao do lead
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
  l.selo_declarado,
  l.selo_verificado,
  l.verificado_em,
  l.status as lead_status,

  -- empreendimento pedido; tudo nulo quando e vitrine geral
  e.nome as empreendimento_nome,
  e.construtora,
  e.cidade as empreendimento_cidade,
  e.bairro as empreendimento_bairro,
  e.quartos as empreendimento_quartos,
  e.garagem as empreendimento_garagem,
  e.tipologias,
  e.preco_de,
  e.preco_ate,
  e.status as empreendimento_obra,
  e.foto_url,
  e.status_publicacao,
  e.pausado_em,
  e.dono_corretor_id
from interesses i
join leads l on l.id = i.lead_id
left join empreendimentos e on e.id = i.empreendimento_id
where l.status <> 'descartado'
  and (e.id is null or e.status_publicacao <> 'arquivado')
  and not exists (
    select 1 from desbloqueios d where d.interesse_id = i.id
  );

-- ---------------------------------------------------------------------------
-- RLS nas tabelas novas: mesma postura das outras seis.
-- Ligado, zero policies, grants revogados. Com a anon key nao se le uma linha.
-- ---------------------------------------------------------------------------
alter table empreendimentos     enable row level security;
alter table empreendimentos_log enable row level security;
alter table interesses          enable row level security;

revoke all on empreendimentos     from anon, authenticated;
revoke all on empreendimentos_log from anon, authenticated;
revoke all on interesses          from anon, authenticated;
revoke all on vitrine             from anon, authenticated;


-- >>>>> 0006_revelacao.sql >>>>>

-- ============================================================================
-- 0006_revelacao.sql  -- Debito de credito e revelacao, numa transacao so
--
-- A regra: o debito do credito e a criacao do desbloqueio acontecem juntos. Se
-- qualquer parte falhar, NADA e cobrado.
--
-- Por que isso vira funcao no Postgres, e nao tres chamadas da aplicacao: entre
-- uma chamada e outra o processo pode morrer, a rede pode cair, o Worker pode
-- ser reciclado. Cobrar e nao entregar e o pior resultado possivel -- pior que
-- nao cobrar. Dentro de uma funcao, ou tudo acontece ou nada acontece.
--
-- Aplicar DEPOIS de 0001 a 0005.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- REVELAR UM INTERESSE
--
-- Devolve o id do desbloqueio criado. Levanta excecao com codigo legivel em
-- qualquer impedimento -- a aplicacao traduz para o corretor.
--
-- ORDEM DAS TRAVAS: corretor primeiro, interesse depois. Sempre a mesma ordem,
-- em toda funcao que travar os dois. Ordem invertida entre duas transacoes
-- simultaneas e exatamente como nasce um deadlock.
--
-- NAO e security definer de proposito: roda com o privilegio de quem chama, e
-- quem chama e o codigo de servidor com service_role. Security definer aqui
-- criaria um caminho para executar com privilegio de dono sem precisar dele.
-- ---------------------------------------------------------------------------
create or replace function revelar_interesse(
  p_interesse_id uuid,
  p_corretor_id uuid,
  p_preco_esperado numeric
) returns uuid
language plpgsql
as $$
declare
  v_preco   numeric;
  v_saldo   numeric;
  v_ativo   boolean;
  v_desbloqueio_id uuid;
begin
  -- 1. Trava o corretor. Sem isto, dois cliques simultaneos do MESMO corretor
  --    leriam o mesmo saldo e gastariam o mesmo dinheiro duas vezes.
  select creditos, ativo into v_saldo, v_ativo
  from corretores where id = p_corretor_id
  for update;

  if not found then
    raise exception 'CORRETOR_NAO_ENCONTRADO';
  end if;

  if not v_ativo then
    raise exception 'CORRETOR_INATIVO';
  end if;

  -- 2. Trava o interesse e le o preco do BANCO, nunca o que veio do navegador.
  select preco into v_preco
  from interesses where id = p_interesse_id
  for update;

  if not found then
    raise exception 'INTERESSE_NAO_ENCONTRADO';
  end if;

  if v_preco is null then
    raise exception 'INTERESSE_SEM_PRECO';
  end if;

  -- 3. O preco mudou entre a tela e o clique?
  --    Acontece de verdade: se eu verifico o lead nesse intervalo, o interesse
  --    sobe da faixa de perfil declarado para a de verificado. Cobrar o novo
  --    valor de quem viu o antigo seria desonesto; cobrar o antigo seria vender
  --    verificado a preco de declarado. Recusar e pedir confirmacao de novo e a
  --    unica saida honesta.
  if v_preco <> p_preco_esperado then
    raise exception 'PRECO_MUDOU:%', v_preco;
  end if;

  if v_saldo < v_preco then
    raise exception 'SALDO_INSUFICIENTE:%', v_saldo;
  end if;

  -- 4. O desbloqueio. O indice unico em interesse_id e o que garante a
  --    exclusividade: se outro corretor chegou primeiro, este insert levanta
  --    unique_violation e TODA a transacao volta atras -- inclusive o debito
  --    que viria a seguir. Por isso o insert vem antes do update do saldo.
  insert into desbloqueios (interesse_id, corretor_id, preco_pago)
  values (p_interesse_id, p_corretor_id, v_preco)
  returning id into v_desbloqueio_id;

  -- 5. O livro-caixa. Consumo entra negativo: a soma da tabela e o saldo real.
  insert into transacoes_credito (corretor_id, valor, tipo, referencia)
  values (p_corretor_id, -v_preco, 'consumo', v_desbloqueio_id::text);

  -- 6. O cache em corretores.creditos, na MESMA transacao. Se ele divergir da
  --    soma de transacoes_credito, a soma e quem manda.
  update corretores
  set creditos = creditos - v_preco
  where id = p_corretor_id;

  return v_desbloqueio_id;

exception
  when unique_violation then
    -- Dois corretores no mesmo interesse. Um ganha, o outro ouve isto, e
    -- ninguem e cobrado pelo que nao levou.
    raise exception 'JA_VENDIDO';
end;
$$;

-- ---------------------------------------------------------------------------
-- CREDITAR UM CORRETOR (recarga PIX, aprovada no admin)
--
-- Mesmo cuidado: a transacao e o cache do saldo mudam juntos.
-- ---------------------------------------------------------------------------
create or replace function creditar_corretor(
  p_corretor_id uuid,
  p_valor numeric,
  p_referencia text
) returns void
language plpgsql
as $$
begin
  if p_valor <= 0 then
    raise exception 'VALOR_INVALIDO';
  end if;

  perform 1 from corretores where id = p_corretor_id for update;
  if not found then
    raise exception 'CORRETOR_NAO_ENCONTRADO';
  end if;

  insert into transacoes_credito (corretor_id, valor, tipo, referencia)
  values (p_corretor_id, p_valor, 'recarga', p_referencia);

  update corretores
  set creditos = creditos + p_valor
  where id = p_corretor_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Nenhum role publico executa estas funcoes. Elas movem dinheiro: so o codigo
-- de servidor, com service_role, chega aqui.
-- ---------------------------------------------------------------------------
revoke all on function revelar_interesse(uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function creditar_corretor(uuid, numeric, text) from public, anon, authenticated;


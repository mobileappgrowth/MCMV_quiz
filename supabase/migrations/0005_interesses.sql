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

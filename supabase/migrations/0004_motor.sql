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

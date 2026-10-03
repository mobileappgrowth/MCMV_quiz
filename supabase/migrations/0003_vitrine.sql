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

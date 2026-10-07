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

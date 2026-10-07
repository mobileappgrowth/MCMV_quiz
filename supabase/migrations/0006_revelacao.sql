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

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { listarInteresses } from '../app/painel/dados.ts'

// ============================================================================
// TESTE DE VAZAMENTO DE CONTATO
//
// O unico teste automatizado do projeto, e ele existe por um motivo so: provar
// que nome e telefone do lead NAO saem do servidor na listagem da vitrine.
// Se este teste falhar, nao ha produto -- o que eu vendo e perfil verificado e
// exclusivo, nao contato.
//
// Como rodar:
//   npm run test:vazamento
//
// Precisa de um Supabase com as migrations 0001, 0002 e 0003 aplicadas, e das
// chaves em .env.local (ou no ambiente). USE UM PROJETO DE TESTE: o teste
// insere e apaga um lead, rodando com a chave que ignora RLS.
//
// ----------------------------------------------------------------------------
// SOBRE O DESENHO DESTE TESTE
//
// Asserção negativa ("o telefone nao aparece") passa de graca quando o setup
// falha: se o lead nunca foi inserido, nao ha telefone em lugar nenhum e o
// teste fica verde sem provar nada. Um teste que nao pode falhar nao vale o
// arquivo em que esta escrito.
//
// Por isso o CONTROLE POSITIVO abaixo: antes de afirmar que o telefone nao
// aparece onde nao deve, o teste prova que ele existe e e encontravel onde
// deve. So depois disso as asserções negativas significam algo.
// ============================================================================

const SENTINELA_TELEFONE = '11900000042'
const SENTINELA_NOME = 'SENTINELA Nao Deve Vazar'
// Valores improvaveis de aparecer por acaso, para a varredura no payload.
const SENTINELA_PONTUACAO = 97
const SENTINELA_PODER = 987654.21

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    'Faltam variaveis de ambiente. Crie .env.local a partir de .env.example ' +
      'apontando para um projeto Supabase DE TESTE com as migrations aplicadas.'
  )
}

// Cliente com service_role: e o "servidor". Pode tudo.
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Cliente com a anon key: e exatamente a chave que esta no bundle JavaScript
// servido ao navegador do corretor. Qualquer pessoa pode extrai-la e chamar a
// API REST do Supabase com ela. O que este cliente consegue ler e o que um
// corretor mal-intencionado consegue ler.
const anonimo = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

describe('contato do lead nao vaza na listagem da vitrine', () => {
  let leadId: string
  let consentimentoId: string
  let corretorId: string
  let empreendimentoId: string
  let interesseId: string

  before(async () => {
    const { data: consentimento, error: erroConsentimento } = await admin
      .from('consentimentos')
      .insert({ texto_versao: 'teste', ip: '127.0.0.1', user_agent: 'node:test' })
      .select('id')
      .single()
    assert.equal(erroConsentimento, null, 'setup: falha ao inserir consentimento')
    consentimentoId = consentimento!.id

    // Lead VERIFICADO e recem-criado: cumpre as condicoes da view `vitrine` e
    // cai dentro da janela de DIAS_NA_VITRINE. Ou seja: aparece na listagem.
    const { data: lead, error: erroLead } = await admin
      .from('leads')
      .insert({
        cidade: 'Cidade Sentinela',
        bairro: 'Bairro Sentinela',
        quartos: 2,
        garagem: true,
        renda_faixa: 'ate_2850',
        enquadramento: 'mcmv_faixa1',
        renda_formal: true,
        renda_composta: false,
        nome_limpo: 'sim',
        vinculo_renda: 'clt_servidor_aposentado',
        fgts_tempo: 'mais_3_anos',
        fgts_saldo: '15k_30k',
        ja_financiou: false,
        entrada_disponivel: 'ate_5k',
        prazo_compra: 'imediato',
        nome: SENTINELA_NOME,
        telefone: SENTINELA_TELEFONE,
        status: 'verificado',
        verificado_em: new Date().toISOString(),
        preco: 70,
        // Saidas do motor. Nenhuma delas pode chegar ao corretor: a pontuacao
        // viraria negociacao sobre o calculo, e o poder de compra viraria
        // "valor aprovado" na cabeca de quem le.
        pontuacao: SENTINELA_PONTUACAO,
        poder_de_compra: SENTINELA_PODER,
        selo_declarado: 'forte',
        selo_verificado: 'forte',
        regra_versao: 'teste',
        consentimento_id: consentimentoId,
      })
      .select('id')
      .single()
    assert.equal(erroLead, null, 'setup: falha ao inserir lead')
    leadId = lead!.id

    // A vitrine agora e por corretor: ele ve os interesses dos empreendimentos
    // DELE mais a vitrine geral. Sem um corretor dono, nao haveria o que listar.
    const { data: corretor, error: erroCorretor } = await admin
      .from('corretores')
      .insert({
        nome: 'SENTINELA Corretor',
        email: `sentinela-${Date.now()}@teste.invalido`,
      })
      .select('id')
      .single()
    assert.equal(erroCorretor, null, 'setup: falha ao inserir corretor')
    corretorId = corretor!.id

    const { data: emp, error: erroEmp } = await admin
      .from('empreendimentos')
      .insert({
        nome: 'Residencial Sentinela',
        construtora: 'Construtora Sentinela',
        cidade: 'Cidade Sentinela',
        bairro: 'Bairro Sentinela',
        status_publicacao: 'publicado',
        preco_de: 200000,
        preco_ate: 250000,
        dono_corretor_id: corretorId,
      })
      .select('id')
      .single()
    assert.equal(erroEmp, null, 'setup: falha ao inserir empreendimento')
    empreendimentoId = emp!.id

    const { data: interesse, error: erroInteresse } = await admin
      .from('interesses')
      .insert({
        lead_id: leadId,
        empreendimento_id: empreendimentoId,
        preco: 90,
        consentimento_id: consentimentoId,
      })
      .select('id')
      .single()
    assert.equal(erroInteresse, null, 'setup: falha ao inserir interesse')
    interesseId = interesse!.id
  })

  after(async () => {
    // Ordem inversa da criacao, por causa das chaves estrangeiras.
    if (interesseId) await admin.from('interesses').delete().eq('id', interesseId)
    if (empreendimentoId) {
      await admin.from('empreendimentos').delete().eq('id', empreendimentoId)
    }
    if (corretorId) await admin.from('corretores').delete().eq('id', corretorId)
    if (leadId) await admin.from('leads').delete().eq('id', leadId)
    if (consentimentoId) {
      await admin.from('consentimentos').delete().eq('id', consentimentoId)
    }
  })

  // --------------------------------------------------------------------------
  // CONTROLE POSITIVO
  // Sem isto, tudo abaixo passa de graca se o insert tiver falhado.
  // --------------------------------------------------------------------------
  it('[controle] o telefone sentinela ESTA no banco e e encontravel pelo servidor', async () => {
    const { data, error } = await admin
      .from('leads')
      .select('nome, telefone')
      .eq('id', leadId)
      .single()

    assert.equal(error, null)
    assert.equal(
      data!.telefone,
      SENTINELA_TELEFONE,
      'o lead de teste nao foi gravado: as asserções abaixo nao provariam nada'
    )
    assert.equal(data!.nome, SENTINELA_NOME)
  })

  // --------------------------------------------------------------------------
  // A -- A ASSERÇÃO PRINCIPAL
  // listarVitrine() e a funcao que alimenta /painel. Tudo que ela devolve chega
  // ao navegador do corretor. Nada mais chega.
  // --------------------------------------------------------------------------
  it('A: listarInteresses() nao devolve telefone nem nome', async () => {
    const leads = await listarInteresses(corretorId)

    const nosso = leads.find((l) => l.id === interesseId)
    assert.ok(
      nosso,
      'o interesse sentinela deveria aparecer na vitrine (lead nao descartado, ' +
        'empreendimento publicado e do proprio corretor, sem desbloqueio)'
    )

    // Varredura no payload inteiro, nao campo por campo: pega tambem o caso de
    // uma coluna nova trazer o contato por um nome diferente.
    const payload = JSON.stringify(leads)
    assert.ok(
      !payload.includes(SENTINELA_TELEFONE),
      'VAZAMENTO: o telefone apareceu na resposta da listagem'
    )
    assert.ok(
      !payload.includes(SENTINELA_NOME),
      'VAZAMENTO: o nome apareceu na resposta da listagem'
    )

    // E explicitamente: as chaves nao existem no objeto.
    assert.ok(!('telefone' in nosso), 'VAZAMENTO: a chave telefone existe no objeto')
    assert.ok(!('nome' in nosso), 'VAZAMENTO: a chave nome existe no objeto')
  })

  // --------------------------------------------------------------------------
  // A2 -- As saidas internas do motor tambem nao saem.
  // Nao e a regra critica do projeto, mas e a mesma classe de erro: dado de
  // decisao interna chegando a quem compra.
  // --------------------------------------------------------------------------
  it('A2: listarInteresses() nao devolve pontuacao nem poder de compra', async () => {
    const leads = await listarInteresses(corretorId)
    const nosso = leads.find((l) => l.id === interesseId)
    assert.ok(nosso)

    const payload = JSON.stringify(leads)
    assert.ok(
      !payload.includes(String(SENTINELA_PONTUACAO)),
      'VAZAMENTO: a pontuacao apareceu na listagem'
    )
    assert.ok(
      !payload.includes(String(SENTINELA_PODER)),
      'VAZAMENTO: o poder de compra apareceu na listagem'
    )
    assert.ok(!('pontuacao' in nosso), 'VAZAMENTO: a chave pontuacao existe')
    assert.ok(
      !('poder_de_compra' in nosso),
      'VAZAMENTO: a chave poder_de_compra existe'
    )

    // O selo, ao contrario, DEVE estar: e o produto que o corretor compra.
    assert.equal(nosso.selo_verificado, 'forte')
  })

  // --------------------------------------------------------------------------
  // A3 -- Quantos interesses a pessoa gerou e assunto interno.
  //
  // Com lead_id no payload, o corretor agruparia as linhas e contaria quantos
  // empreendimentos a mesma pessoa marcou. A especificacao proibe expor isso
  // "em hipotese alguma" -- e esconder no componente nao bastaria, porque o
  // dado estaria na resposta.
  // --------------------------------------------------------------------------
  it('A3: listarInteresses() nao devolve lead_id nem qtd_interesses', async () => {
    const leads = await listarInteresses(corretorId)
    const nosso = leads.find((l) => l.id === interesseId)
    assert.ok(nosso)

    assert.ok(!('lead_id' in nosso), 'VAZAMENTO: a chave lead_id existe')
    assert.ok(
      !('qtd_interesses' in nosso),
      'VAZAMENTO: a chave qtd_interesses existe'
    )
    assert.ok(
      !JSON.stringify(leads).includes(leadId),
      'VAZAMENTO: o id do lead aparece na resposta da listagem'
    )
  })

  // --------------------------------------------------------------------------
  // B -- A view nao tem as colunas, nem para quem pede tudo.
  // Prova estrutural: nenhuma consulta a `vitrine` pode vazar contato, por mais
  // desleixada que seja.
  // --------------------------------------------------------------------------
  it('B: select * na view vitrine nao traz as colunas de contato', async () => {
    const { data, error } = await admin
      .from('vitrine')
      .select('*')
      .eq('id', interesseId)

    assert.equal(error, null)
    assert.equal(data!.length, 1)

    const colunas = Object.keys(data![0])
    for (const proibida of [
      'telefone',
      'nome',
      'pontuacao',
      'poder_de_compra',
      'lead_id',
      'qtd_interesses',
    ]) {
      assert.ok(
        !colunas.includes(proibida),
        `VAZAMENTO: a view expoe ${proibida} (${colunas})`
      )
    }

    assert.ok(!JSON.stringify(data).includes(SENTINELA_TELEFONE))
    assert.ok(!JSON.stringify(data).includes(SENTINELA_NOME))
  })

  // --------------------------------------------------------------------------
  // C -- A anon key, que esta no navegador, nao le nada.
  // Mesmo pedindo a tabela `leads` diretamente, por fora da aplicacao.
  // --------------------------------------------------------------------------
  it('C: a anon key nao le a tabela leads', async () => {
    const { data, error } = await anonimo.from('leads').select('nome, telefone')

    // Dois resultados aceitaveis: erro de permissao (grant revogado) ou zero
    // linhas (RLS sem policy). Os dois significam "nao vazou".
    if (!error) {
      assert.equal(
        data?.length ?? 0,
        0,
        'VAZAMENTO: a anon key leu linhas de leads'
      )
    }
    assert.ok(!JSON.stringify(data ?? []).includes(SENTINELA_TELEFONE))
  })

  it('C2: a anon key nao le a view vitrine', async () => {
    const { data, error } = await anonimo.from('vitrine').select('*')

    if (!error) {
      assert.equal(data?.length ?? 0, 0, 'VAZAMENTO: a anon key leu linhas da vitrine')
    }
  })
})

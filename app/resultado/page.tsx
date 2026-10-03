import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  empreendimentosParaOLead,
  type EmpreendimentoMatch,
} from '@/lib/match'
import { Escolha } from './escolha'

// ============================================================================
// TELA DE RESULTADO
//
// O lead vem do cookie httpOnly gravado pela acao do quiz, nunca da URL.
//
// So empreendimentos PUBLICADOS entram no match: rascunho, em revisao, pausado
// e arquivado ficam de fora. Esse filtro e feito aqui, na consulta, e nao
// dentro de lib/match.ts -- o match decide o que SERVE para a pessoa, nao o
// que esta no ar.
// ============================================================================

export const dynamic = 'force-dynamic'

type Lead = {
  id: string
  cidade: string
  bairro: string | null
  quartos: number | null
  garagem: boolean | null
  poder_de_compra: number | null
  qtd_interesses: number
}

export default async function Resultado() {
  const biscoitos = await cookies()
  const leadId = biscoitos.get('lead_resultado')?.value

  // Sem cookie nao ha o que mostrar. Mandar para a home e melhor que uma tela
  // de erro: quem chegou aqui por link velho simplesmente responde o quiz.
  if (!leadId) redirect('/')

  const { data: lead } = await supabaseAdmin()
    .from('leads')
    .select('id, cidade, bairro, quartos, garagem, poder_de_compra, qtd_interesses')
    .eq('id', leadId)
    .maybeSingle<Lead>()

  if (!lead) redirect('/')

  // Ja escolheu: nao reabre a tela. Sem isto, voltar no navegador criaria
  // interesses duplicados -- e o indice unico devolveria um erro feio.
  if (lead.qtd_interesses > 0) redirect('/obrigado')

  const { data: catalogo } = await supabaseAdmin()
    .from('empreendimentos')
    .select(
      'id, nome, construtora, cidade, bairro, tipologias, quartos, garagem, ' +
        'preco_de, preco_ate, status, descricao, foto_url'
    )
    .eq('status_publicacao', 'publicado')
    .returns<EmpreendimentoMatch[]>()

  const opcoes = empreendimentosParaOLead(catalogo ?? [], {
    cidade: lead.cidade,
    bairro: lead.bairro,
    quartos: lead.quartos,
    garagem: lead.garagem,
    // Sem poder de compra calculado, nao da para afirmar que algo cabe.
    // Zero faz o match devolver vazio, e a pessoa cai na pergunta de contato
    // geral -- que e o desfecho honesto, nao um catalogo que ela nao pode pagar.
    poder_de_compra: Number(lead.poder_de_compra ?? 0),
  })

  return <Escolha opcoes={opcoes} cidade={lead.cidade} />
}

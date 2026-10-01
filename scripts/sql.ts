// ============================================================================
// MONTA O SQL DE SETUP
//
//   npm run sql              imprime na tela
//   npm run sql > setup.sql  salva num arquivo
//
// Concatena as migrations na ordem correta, para voce colar de uma vez no SQL
// Editor do Supabase em vez de abrir tres arquivos e acertar a ordem.
//
// Le os arquivos de verdade, nao uma copia: nao existe segunda fonte da verdade
// para sair do ar com a primeira.
// ============================================================================
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const pasta = join(import.meta.dirname, '..', 'supabase', 'migrations')
const arquivos = readdirSync(pasta)
  .filter((f) => f.endsWith('.sql'))
  .sort() // os nomes comecam com numero, entao ordem alfabetica = ordem correta

console.log('-- ============================================================')
console.log('-- SETUP DO BANCO -- gerado por `npm run sql`')
console.log('-- Cole tudo no SQL Editor do Supabase e rode uma vez.')
console.log(`-- ${arquivos.length} migrations: ${arquivos.join(', ')}`)
console.log('-- ============================================================')

for (const arquivo of arquivos) {
  console.log(`\n\n-- >>>>> ${arquivo} >>>>>\n`)
  console.log(readFileSync(join(pasta, arquivo), 'utf8').trimEnd())
}

console.log('')

import { bindings, defineConfig, defineWorker } from "cf/config";

// ============================================================================
// DEFINICAO DO WORKER
//
// Este arquivo e a fonte da verdade da configuracao do Worker. O `cf deploy`
// compara o que esta aqui com o que esta no painel e ABORTA se divergir, para
// nao apagar silenciosamente o que foi configurado la.
//
// Consequencia pratica: variavel adicionada SO pelo painel, como `var` comum,
// quebra o proximo deploy. Ou ela e declarada aqui, ou e cadastrada como
// Secret (secrets nao entram nessa comparacao).
//
// A divisao adotada:
//
//   AQUI, repassadas do ambiente de build:
//     NEXT_PUBLIC_SUPABASE_URL
//     NEXT_PUBLIC_SUPABASE_ANON_KEY
//   Sao publicas por natureza -- vao para o navegador de todo visitante de
//   qualquer forma. Repassar do ambiente em vez de fixar no codigo mantem o
//   repositorio livre de valores de um projeto especifico.
//
//   NO PAINEL, como Secret:
//     SUPABASE_SERVICE_ROLE_KEY   <- ignora todo o RLS; nunca no repositorio
//     ADMIN_EMAILS                <- lista de quem entra no /admin
//
// As duas NEXT_PUBLIC_ precisam continuar cadastradas tambem em
// Settings > Build > variaveis de build: e de la que o `vite build` as le para
// embutir no bundle do navegador. Aqui elas servem ao codigo de SERVIDOR, que
// as le em tempo de execucao.
// ============================================================================

export default defineConfig({
  worker: defineWorker({
    name: "mcmv-quiz",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      NEXT_PUBLIC_SUPABASE_URL: bindings.text(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
      ),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: bindings.text(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
      ),
    },
  }),
});

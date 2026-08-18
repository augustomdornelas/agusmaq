// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Hospedagem: Hostinger compartilhada (Apache servindo public_html, sem Node).
  // O site precisa ser 100% estatico, entao desligamos o Nitro — o default do wrapper
  // e o preset `cloudflare-module`, que gera um Worker da Cloudflare e nao arquivos
  // servivéis por Apache (era a causa do 404/500 apos a migracao).
  nitro: false,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // Continua sendo usado no build para pre-renderizar o shell da SPA.
    server: { entry: "server" },
    // Modo SPA: em vez de renderizar cada rota no servidor, o build gera um unico
    // shell HTML que o Apache devolve para qualquer rota (ver public/.htaccess).
    // Nenhuma funcionalidade e perdida: todo acesso a dados ja acontece no browser
    // via cliente Supabase, e o projeto nao usa nenhum server function.
    spa: {
      enabled: true,
      // Sem isso o shell sairia como `_shell.html`; queremos `index.html` na raiz.
      prerender: { outputPath: "/index" },
    },
  },
});

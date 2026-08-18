import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // As VITE_* precisam ser substituidas tambem no bundle de SSR usado para
  // pre-renderizar o index.html — nao so no bundle do cliente.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    define,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
      // Duas copias de React ou do React Query em memoria quebram hooks e cache.
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      // Evita recarregar no meio de uma escrita de arquivo.
      watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // Continua sendo usado no build para pre-renderizar o shell da SPA.
        server: { entry: "server" },
        // Modo SPA: em vez de renderizar cada rota no servidor, o build gera um unico
        // shell HTML que o Apache devolve para qualquer rota (ver public/.htaccess).
        // O deploy e a Hostinger compartilhada, que nao roda Node.
        spa: {
          enabled: true,
          // Sem isso o shell sairia como `_shell.html`; queremos `index.html` na raiz.
          prerender: { outputPath: "/index" },
        },
        // Falha o build se codigo de servidor for importado pelo bundle do cliente.
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      viteReact(),
    ],
  };
});

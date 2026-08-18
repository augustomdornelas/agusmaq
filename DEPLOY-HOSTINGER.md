# Deploy — Hostinger (hospedagem compartilhada)

O site saiu do Cloudflare Pages e hoje roda como **SPA estática** no Apache/LiteSpeed
da Hostinger. Não existe Node rodando no servidor.

## Como publicar uma nova versão

```sh
npm ci
npm run build
```

Suba **o conteúdo de `dist/client/`** (não a pasta em si) para `public_html/`.
São 3 itens: `index.html`, `favicon.png`, `assets/` — mais o `.htaccess`, que é
copiado de `public/.htaccess` no build e **precisa ir junto** (arquivos ocultos
não aparecem por padrão no Gerenciador de Arquivos).

Não suba `dist/server/` — é subproduto do build, usado só para pré-renderizar o
`index.html`.

## Por que o site quebrou na migração

`vite.config.ts` usava o wrapper `@lovable.dev/vite-tanstack-config`, que liga o
Nitro com o preset `cloudflare-module` por padrão. O build gerava um Worker da
Cloudflare — JavaScript que só executa dentro do runtime da Cloudflare, não
arquivos que um Apache saiba servir. Daí o 404/500.

A correção foi trocar o wrapper por uma config própria do Vite, sem Nitro e em
modo SPA. Nenhuma funcionalidade foi perdida: o projeto não usa nenhum server
function, e todo o acesso a dados já acontecia no navegador pelo cliente
Supabase.

## Variáveis de ambiente

São lidas **no momento do build** (`import.meta.env`), não em runtime. Ficam no
`.env` versionado:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Trocar qualquer uma delas exige um `npm run build` novo e um upload novo.

## Voltar para SSR (se um dia migrar para VPS)

Em `vite.config.ts`, remova o bloco `spa` do `tanstackStart()` e adicione o
plugin do Nitro (`import { nitro } from "nitro/vite"` + `nitro({ preset: "node-server" })`,
depois de `tanstackStart()`). O `nitro` já está nas devDependencies. O build passa
a gerar `.output/server/index.mjs`, que roda com `node .output/server/index.mjs`
atrás de um proxy reverso.

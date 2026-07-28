# Plano

## O que será feito
1. Criar o arquivo `public/_redirects` com a linha solicitada:
   ```
   /* /index.html 200
   ```
   Isso garante que rotas profundas da landing page ou do portal caiam no `index.html` quando servidas estáticamente (público/ preview estático).

## Variáveis de ambiente para conectar no Supabase
Atualmente o projeto **não usa Supabase** — o portal está em modo demonstração com `localStorage`. Quando a integração Supabase for conectada pelo editor Lovable, as variáveis injetadas automaticamente serão:

- `SUPABASE_URL` — URL do projeto (server-side)
- `SUPABASE_PUBLISHABLE_KEY` — chave pública/anon (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` — chave de service role (server-side, secreta)
- `SUPABASE_PROJECT_ID` — ID do projeto (server-side)
- `VITE_SUPABASE_URL` — URL do projeto (cliente/browser)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — chave pública/anon (cliente/browser)
- `VITE_SUPABASE_ANON_KEY` — alias da chave anon no cliente
- `VITE_SUPABASE_PROJECT_ID` — ID do projeto no cliente

Para usar em código:
- Server functions/routes: `process.env.SUPABASE_URL` e `process.env.SUPABASE_PUBLISHABLE_KEY`
- Componentes/browser: `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`

## Após aprovação
Criar `public/_redirects` com a linha acima.
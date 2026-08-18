# Agusmaq

Site institucional, catálogo público de equipamentos e portal interno de gestão
de locações da Agusmaq (Agudos, SP).

## Stack

- TanStack Start (modo SPA) + TanStack Router
- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (Radix)
- Supabase (banco, auth e storage)
- Vite 8

## Desenvolvimento

Requer Node 22.16.0 (ver `.nvmrc`) e npm 10.9.2.

```sh
npm ci
npm run dev      # http://localhost:8080
```

Outros comandos:

```sh
npm run build    # gera dist/client (site estático) — ver DEPLOY-HOSTINGER.md
npm run preview  # serve o build local
npm run lint
npm run format
```

## Variáveis de ambiente

Lidas **no momento do build**, do arquivo `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Elas ficam embutidas no bundle público — use apenas a chave *publishable*
(anon). A proteção dos dados é feita por RLS no Supabase. Nunca coloque a
service role key numa variável `VITE_*`.

## Deploy

Hostinger, hospedagem compartilhada. Ver [DEPLOY-HOSTINGER.md](./DEPLOY-HOSTINGER.md).

## Escopo

Grande evolução do portal Agusmaq/Aguamaq: novas migrations, refatoração da tela de equipamentos, upload de fotos, dashboards individuais, fluxo de aluguel em lote, comprovante/termo PDF com assinatura, e dashboard de cliente.

## Observações importantes antes de começar

Encontrei divergências entre o briefing e o schema já existente no seu Supabase. Preciso confirmar como tratar cada uma antes de rodar migrations, para não quebrar dados atuais:

1. **`clientes.tipo`** — hoje é `'pessoa_fisica' | 'pessoa_juridica'`; briefing pede `'pf' | 'pj'`. Proposta: **manter os valores atuais** e apenas exibir "PF/PJ" na UI (evita migração de dados dos 19 clientes).
2. **`equipamentos.status`** — hoje aceita `'disponivel' | 'alugado' | 'manutencao' | 'inativo'`; briefing lista só os dois primeiros. Proposta: **manter os quatro** (já usados por manutenções).
3. **`alugueis` e `aluguel_itens` já existem** com colunas diferentes do briefing (`data_prevista_devolucao`, `tipo_cobranca`, `status_pagamento`, `forma_pagamento`, `valor_frete`, etc.). Proposta: **estender as tabelas existentes** ao invés de recriar — adicionar apenas `numero` (sequencial), e mapear:
   - `data_fim_prevista` → usar `data_prevista_devolucao` atual
   - `data_devolucao` → usar `data_devolucao_real` atual
   - `tipo_periodo` → usar `tipo_cobranca` atual
   - Manter `status` atual (`orcamento`/`reservado`/`ativo`/`devolvido`/`atrasado`/`cancelado`) e apenas usar os do briefing na UI
4. **Bucket `fotos`** — já existe um bucket `equipamentos` (privado, pois o workspace bloqueia buckets públicos). Proposta: **reutilizar `equipamentos`** e servir imagens via URL assinada, ou pedir que você libere buckets públicos em Settings → Privacy & Security se quiser URLs públicas eternas.

Se concordar com as propostas acima, executo tudo. Se preferir renomear/converter, me diga.

## Migrations

1. `equipamentos`: adicionar `valor_compra numeric NOT NULL DEFAULT 0`, `data_compra date NULL`.
2. `alugueis`: adicionar `numero int UNIQUE` populado via sequence (`alugueis_numero_seq`) com default `nextval(...)`; backfill dos aluguéis atuais em ordem de `created_at`.
3. Nova tabela `configuracoes_empresa` (registro único id=1) com nome, cnpj, endereco, cidade, telefone, email, logo_url, `texto_condicoes_termo`. Seed com texto padrão do termo. GRANTs + RLS (leitura autenticados, escrita admin).
4. (Se optar por bucket novo `fotos` público: criar via ferramenta; senão manter `equipamentos`.)

## Frontend

### Equipamentos (`/portal/equipamentos`)
- Reescrever como accordions por categoria (todos fechados por padrão, ordenados por `categorias.ordem`).
- Cabeçalho com contagem e badge "X disponíveis / Y alugados".
- Busca no topo que expande automaticamente grupos com match e destaca o termo.
- Cards em grade 4:3 `object-cover`, placeholder por categoria (ícone Lucide) quando sem foto.
- Novo formulário com campos `valor_compra` e `data_compra`.

### Upload de fotos
- Componente `PhotoUploader` reutilizável: drag-and-drop, preview, compressão via canvas (max 1200px, JPEG 0.85), upload ao Supabase Storage, retorna URL.
- Lightbox on click (novo componente simples).

### Dashboard do equipamento (`/portal/equipamentos/$id`)
- Reescrever com KPIs: receita total, média mensal, nº aluguéis, dias alugados, taxa de ocupação, ROI, payback (barra), ticket médio.
- Gráficos com Recharts (receita/mês, dias alugado/mês nos últimos 12 meses).
- Histórico de aluguéis com link para cliente.
- Aviso quando `valor_compra = 0`.
- Botão "Alugar" que entra no fluxo com equipamento pré-selecionado.

### Aluguel em lote (`/portal/alugueis/novo`)
- Wizard em 4 etapas (Cliente → Equipamentos → Período → Confirmar).
- Autocomplete de cliente + modal "novo cliente" inline.
- Carrinho de equipamentos com validação de disponibilidade, período editável, valor auto-preenchido.
- Ao confirmar: cria `alugueis` + `aluguel_itens`, atualiza `status` dos equipamentos, redireciona para tela de comprovante.
- Listagem `/portal/alugueis` mantém, adicionando destaque de atrasados e botão Devolver que devolve disponibilidade.

### Comprovante + Termo (`/portal/alugueis/$id/termo`)
- Layout A4 print-ready com CSS `@media print`.
- Parte 1: logo, dados da empresa, dados do cliente, tabela de itens, totais.
- Parte 2: texto do termo com placeholders `[nome_empresa]`, `[numero]`, etc. preenchidos via `replace`.
- Canvas de assinatura digital (biblioteca leve `react-signature-canvas` ou implementação nativa) — desenho vira dataURL renderizada sobre a linha do LOCATÁRIO no PDF.
- Botão "Imprimir/Salvar PDF" chama `window.print()`.
- Acessível a partir da tela do aluguel a qualquer momento.

### Dashboard do cliente (`/portal/clientes/$id`)
- Reescrever com cabeçalho + botão WhatsApp.
- KPIs (total gasto, nº aluguéis, ativos, ticket médio, última locação, alerta de atraso).
- Gráfico gastos/mês, top 5 equipamentos, histórico com link para reimprimir termo.
- Botão "Novo aluguel" pré-selecionando o cliente.

### Configurações (`/portal/configuracoes`)
- Adicionar seção "Empresa" editando `configuracoes_empresa` + upload da logo.
- Editor de texto do termo (`textarea` grande com placeholders documentados).

## Detalhes técnicos

- Store (`src/lib/portal/store.tsx`) ganha métodos: `saveAluguelLote`, `devolverAluguel`, `getAluguelComItens`, `getEstatisticasEquipamento`, `getEstatisticasCliente`, `saveConfiguracoesEmpresa`, `uploadFoto`.
- Cálculos de KPIs feitos no cliente sobre dados já carregados (portal tem volume pequeno).
- Recharts já é candidato natural — vou instalar se não estiver presente.
- Lightbox: componente próprio (dialog fullscreen) para não adicionar dependência.
- Assinatura: `react-signature-canvas` (~5KB).
- Impressão: página dedicada com `@media print { ... }` — não precisa de lib PDF.
- Placeholder por categoria: mapeamento nome→ícone Lucide com fallback `Package`.

## Fora de escopo (não vou mexer)

- Site institucional (`/`).
- Módulos de manutenções, categorias, pagamentos e relatórios (ficam como estão).
- Autenticação e RLS (já em produção).

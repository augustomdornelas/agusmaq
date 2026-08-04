-- Módulo de devolução: uma devolução é sempre parcial por natureza — um
-- aluguel pode ter várias devoluções ao longo do tempo, cada uma cobrindo
-- parte dos itens. A sequência (1ª, 2ª devolução...) é calculada na
-- aplicação, não por trigger com tabela contadora (já deu problema de RLS
-- no módulo de orçamentos).

CREATE TABLE public.devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluguel_id UUID NOT NULL REFERENCES public.alugueis(id) ON DELETE CASCADE,
  sequencia INT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  recebido_por TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  valor_avarias NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devolucoes_aluguel_id ON public.devolucoes(aluguel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucoes TO authenticated;
GRANT ALL ON public.devolucoes TO service_role;
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins devolucoes" ON public.devolucoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.devolucao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucao_id UUID NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
  aluguel_item_id UUID NOT NULL REFERENCES public.aluguel_itens(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL CHECK (quantidade > 0),
  unidades_codigos TEXT[] NOT NULL DEFAULT '{}',
  condicao TEXT NOT NULL DEFAULT 'bom'
    CHECK (condicao IN ('bom','avariado','nao_devolvido')),
  observacao TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_devolucao_itens_devolucao_id ON public.devolucao_itens(devolucao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucao_itens TO authenticated;
GRANT ALL ON public.devolucao_itens TO service_role;
ALTER TABLE public.devolucao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins devolucao_itens" ON public.devolucao_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Texto configurável do termo de devolução (mesmo padrão de
-- texto_condicoes_termo: fica vazio aqui, o texto padrão vive no código).
ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS texto_condicoes_devolucao TEXT NOT NULL DEFAULT '';

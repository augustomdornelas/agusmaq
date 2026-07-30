-- Módulo de Orçamentos: cabeçalho, itens e numeração sequencial anual (ORC-AAAA-NNNN)

CREATE TABLE public.orcamentos_numero_contador (
  ano INTEGER PRIMARY KEY,
  ultimo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviado','aprovado','recusado')),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE NOT NULL DEFAULT (CURRENT_DATE + 7),
  data_inicio_periodo DATE NOT NULL,
  data_fim_periodo DATE NOT NULL,
  quantidade_dias INT NOT NULL DEFAULT 1,
  tipo_cobranca TEXT NOT NULL DEFAULT 'diaria'
    CHECK (tipo_cobranca IN ('diaria','semanal','mensal')),
  desconto_tipo TEXT NOT NULL DEFAULT 'valor'
    CHECK (desconto_tipo IN ('percentual','valor')),
  desconto_valor NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (desconto_tipo <> 'percentual' OR desconto_valor <= 100),
  valor_frete NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  condicoes_pagamento TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  motivo_recusa TEXT NOT NULL DEFAULT '',
  data_decisao DATE,
  historico_status JSONB NOT NULL DEFAULT '[]'::jsonb,
  aluguel_id UUID REFERENCES public.alugueis(id) ON DELETE SET NULL,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT ALL ON public.orcamentos TO service_role;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins orcamentos" ON public.orcamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_orcamentos_updated BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL DEFAULT '',
  quantidade INT NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_tipo TEXT NOT NULL DEFAULT 'valor'
    CHECK (desconto_tipo IN ('percentual','valor')),
  desconto_valor NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (desconto_tipo <> 'percentual' OR desconto_valor <= 100),
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_itens TO authenticated;
GRANT ALL ON public.orcamento_itens TO service_role;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins orcamento_itens" ON public.orcamento_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Geração atômica do número (reinicia a cada ano)
CREATE OR REPLACE FUNCTION public.gerar_numero_orcamento()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  ano_atual INTEGER := EXTRACT(YEAR FROM now())::integer;
  proximo INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public.orcamentos_numero_contador (ano, ultimo) VALUES (ano_atual, 1)
    ON CONFLICT (ano) DO UPDATE SET ultimo = orcamentos_numero_contador.ultimo + 1
    RETURNING ultimo INTO proximo;
  NEW.numero := 'ORC-' || ano_atual || '-' || lpad(proximo::text, 4, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_orcamentos_numero BEFORE INSERT ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_orcamento();

REVOKE EXECUTE ON FUNCTION public.gerar_numero_orcamento() FROM PUBLIC, anon, authenticated;

-- Correções no módulo de Orçamentos
-- 1) RLS bloqueava a trigger de numeração (orcamentos_numero_contador tinha RLS
--    habilitado automaticamente pela plataforma, sem nenhuma política).
-- 2) orcamento_itens precisa registrar quais unidades (códigos de patrimônio)
--    de um equipamento multi-unidade foram reservadas, no mesmo padrão de
--    aluguel_itens.unidades_codigos.

-- 1) Numeração: função SECURITY DEFINER (mesmo padrão de public.has_role) para
-- que a trigger grave no contador independente do papel de quem está logado.
CREATE OR REPLACE FUNCTION public.gerar_numero_orcamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Consistência com o restante do schema: RLS explícito + política admin-only
-- na tabela do contador (defesa em profundidade — a função acima já basta
-- para a trigger funcionar, isso cobre qualquer acesso direto à tabela).
GRANT SELECT, INSERT, UPDATE ON public.orcamentos_numero_contador TO authenticated;
GRANT ALL ON public.orcamentos_numero_contador TO service_role;
ALTER TABLE public.orcamentos_numero_contador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins orcamentos_numero_contador" ON public.orcamentos_numero_contador FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Unidades reservadas por item de orçamento (mesmo padrão de aluguel_itens)
ALTER TABLE public.orcamento_itens
  ADD COLUMN IF NOT EXISTS unidades_codigos text[] NOT NULL DEFAULT '{}';

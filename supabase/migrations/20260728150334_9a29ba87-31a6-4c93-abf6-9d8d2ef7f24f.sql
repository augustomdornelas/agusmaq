-- 1. equipamentos: valor_compra e data_compra
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS valor_compra numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_compra date NULL;

-- 2. alugueis: numero sequencial
CREATE SEQUENCE IF NOT EXISTS public.alugueis_numero_seq;
ALTER TABLE public.alugueis
  ADD COLUMN IF NOT EXISTS numero integer;

-- backfill em ordem de created_at
DO $$
DECLARE r record; n integer := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.alugueis WHERE numero IS NULL) THEN
    FOR r IN SELECT id FROM public.alugueis WHERE numero IS NULL ORDER BY created_at LOOP
      n := nextval('public.alugueis_numero_seq');
      UPDATE public.alugueis SET numero = n WHERE id = r.id;
    END LOOP;
  END IF;
END $$;

ALTER TABLE public.alugueis
  ALTER COLUMN numero SET DEFAULT nextval('public.alugueis_numero_seq'),
  ALTER COLUMN numero SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alugueis_numero_key') THEN
    ALTER TABLE public.alugueis ADD CONSTRAINT alugueis_numero_key UNIQUE (numero);
  END IF;
END $$;

-- avança sequence para além do max
SELECT setval('public.alugueis_numero_seq', GREATEST((SELECT COALESCE(MAX(numero),0) FROM public.alugueis), 1));

-- 3. configuracoes_empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_empresa (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_empresa text NOT NULL DEFAULT 'AGUSMAQ',
  cnpj text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT 'Agudos - SP',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  texto_condicoes_termo text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracoes_empresa TO authenticated;
GRANT ALL ON public.configuracoes_empresa TO service_role;

ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read config empresa" ON public.configuracoes_empresa;
CREATE POLICY "auth read config empresa"
  ON public.configuracoes_empresa FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins write config empresa" ON public.configuracoes_empresa;
CREATE POLICY "admins write config empresa"
  ON public.configuracoes_empresa FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE TRIGGER tg_config_empresa_updated_at
  BEFORE UPDATE ON public.configuracoes_empresa
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- seed
INSERT INTO public.configuracoes_empresa (id, nome_empresa, cidade, texto_condicoes_termo)
VALUES (
  1,
  'AGUSMAQ',
  'Agudos - SP',
  'TERMO DE LOCAÇÃO DE EQUIPAMENTOS Nº [numero]

Por este instrumento, de um lado [nome_empresa], inscrita no CNPJ [cnpj_empresa], com sede em [endereco_empresa], doravante denominada LOCADORA, e de outro lado [nome_cliente], inscrito(a) no CPF/CNPJ [cpf_cnpj_cliente], residente/estabelecido(a) em [endereco_cliente], [cidade_cliente], doravante denominado(a) LOCATÁRIO(A), firmam o presente termo de locação dos equipamentos listados abaixo:

[tabela_equipamentos]

Período: de [data_inicio] a [data_fim] — regime [tipo_periodo]. Valor total: R$ [valor_total].

O(A) LOCATÁRIO(A) se compromete a devolver os bens em perfeito estado de conservação, como atualmente se encontram, ao fim do prazo estabelecido. É vedado ao(à) LOCATÁRIO(A) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros. Em caso de dano, perda ou extravio, o(a) LOCATÁRIO(A) arcará com o custo de reparo ou reposição do equipamento.

[cidade_empresa], [data_emissao]'
)
ON CONFLICT (id) DO NOTHING;

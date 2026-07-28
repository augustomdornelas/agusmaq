-- Multiple codes per equipment
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS codigos_patrimonio text[] NOT NULL DEFAULT '{}';

UPDATE public.equipamentos
  SET codigos_patrimonio = ARRAY[codigo_patrimonio]
  WHERE (codigos_patrimonio IS NULL OR codigos_patrimonio = '{}')
    AND codigo_patrimonio IS NOT NULL
    AND codigo_patrimonio <> '';

-- Which specific units (by code) go out on a rental item
ALTER TABLE public.aluguel_itens
  ADD COLUMN IF NOT EXISTS unidades_codigos text[] NOT NULL DEFAULT '{}';
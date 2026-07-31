-- Foto de capa da categoria (usada no catálogo público). A descrição já existe
-- (categorias.descricao, desde a migration inicial).
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS foto_url text NOT NULL DEFAULT '';

-- Área de Equipamentos: locais, catálogo público, destino do aluguel,
-- detalhamento de manutenções e bucket de anexos.

-- 1) Locais (base/atual dos equipamentos), com FK real
CREATE TABLE public.locais_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Base', -- 'Base' | 'Almoxarifado' | 'Obra'
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.locais_equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins locais_equipamentos" ON public.locais_equipamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.equipamentos
  ADD COLUMN local_base_id uuid REFERENCES public.locais_equipamentos(id) ON DELETE SET NULL,
  ADD COLUMN local_atual_id uuid REFERENCES public.locais_equipamentos(id) ON DELETE SET NULL;

-- 2) Catálogo público
ALTER TABLE public.equipamentos
  ADD COLUMN exibir_catalogo boolean NOT NULL DEFAULT false;

-- 3) Destino/obra do aluguel (separado do cliente)
ALTER TABLE public.alugueis
  ADD COLUMN destino text;

-- 4) Manutenções — tipo, oficina, breakdown de custo, anexos
ALTER TABLE public.manutencoes
  ADD COLUMN tipo text NOT NULL DEFAULT 'preventiva', -- 'preventiva' | 'corretiva' | 'emergencial'
  ADD COLUMN oficina text,
  ADD COLUMN custo_pecas numeric NOT NULL DEFAULT 0,
  ADD COLUMN custo_mao_obra numeric NOT NULL DEFAULT 0,
  ADD COLUMN anexos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5) Bucket de anexos de manutenção (mesmo padrão do bucket "equipamentos")
INSERT INTO storage.buckets (id, name, public) VALUES ('manutencoes-anexos', 'manutencoes-anexos', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "admins select manutencoes-anexos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'manutencoes-anexos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert manutencoes-anexos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manutencoes-anexos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update manutencoes-anexos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'manutencoes-anexos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete manutencoes-anexos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'manutencoes-anexos' AND public.has_role(auth.uid(),'admin'));

-- 6) Leitura pública para a página /catalogo (nenhuma tabela permite leitura
-- anônima hoje — sem isto o catálogo público não retorna nenhuma linha).
-- Somente equipamentos marcados para exibição e categorias ativas ficam visíveis;
-- colunas internas (valor_compra, custo, ROI, manutenções) continuam fora do
-- que o frontend público seleciona/renderiza.
CREATE POLICY "public read categorias ativas" ON public.categorias FOR SELECT TO anon
  USING (ativa = true);
CREATE POLICY "public read equipamentos catalogo" ON public.equipamentos FOR SELECT TO anon
  USING (exibir_catalogo = true);
CREATE POLICY "public read configuracoes_empresa" ON public.configuracoes_empresa FOR SELECT TO anon
  USING (true);

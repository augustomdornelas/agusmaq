import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSearch } from "@/lib/portal/format";
import { CatalogoLayout } from "@/components/catalogo/CatalogoLayout";
import { CategoriaCard } from "@/components/catalogo/CategoriaCard";
import { EquipamentoPublicCard } from "@/components/catalogo/EquipamentoPublicCard";
import { Search } from "lucide-react";

export const Route = createFileRoute("/catalogo/")({
  head: () => ({
    meta: [
      { title: "Catálogo de Equipamentos — Agusmaq" },
      {
        name: "description",
        content: "Equipamentos disponíveis para locação na Agusmaq — Agudos, SP e região.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: CatalogoPage,
});

type CatEquip = {
  id: string;
  nome: string;
  foto_url: string;
  categoria_id: string;
  status: string;
  codigo_patrimonio: string;
};
type CatCategoria = { id: string; nome: string; descricao: string; foto_url: string };

function CatalogoPage() {
  const [categorias, setCategorias] = useState<CatCategoria[]>([]);
  const [itens, setItens] = useState<CatEquip[]>([]);
  const [telefone, setTelefone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [eqRes, catRes, empRes] = await Promise.all([
        supabase
          .from("equipamentos")
          .select("id, nome, foto_url, categoria_id, status, codigo_patrimonio")
          .eq("exibir_catalogo", true),
        (supabase.from as any)("categorias").select("id, nome, descricao, foto_url").eq("ativa", true).order("ordem"),
        (supabase.from as any)("configuracoes_empresa").select("telefone").eq("id", 1).maybeSingle(),
      ]);
      if (!alive) return;
      if (eqRes.error || catRes.error) { setErro(true); setLoading(false); return; }
      setItens((eqRes.data ?? []) as CatEquip[]);
      setCategorias((catRes.data ?? []) as CatCategoria[]);
      setTelefone(((empRes as any)?.data?.telefone as string) || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const equipamentosVisiveis = useMemo(() => itens.filter(e => e.status !== "inativo"), [itens]);

  const countPorCategoria = useMemo(() => {
    const m = new Map<string, number>();
    equipamentosVisiveis.forEach(e => m.set(e.categoria_id, (m.get(e.categoria_id) ?? 0) + 1));
    return m;
  }, [equipamentosVisiveis]);

  const q = normalizeSearch(busca);
  const resultadosBusca = useMemo(() => {
    if (!q) return [];
    return equipamentosVisiveis.filter(e =>
      normalizeSearch(e.nome).includes(q) || normalizeSearch(e.codigo_patrimonio || "").includes(q),
    );
  }, [equipamentosVisiveis, q]);

  return (
    <CatalogoLayout telefone={telefone}>
      <section className="border-b border-[#eef0f4] bg-[#213368] py-14 text-white">
        <div className="container-x">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#f37032]">LOCAÇÃO DE EQUIPAMENTOS</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Catálogo de equipamentos</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">
            Equipamentos disponíveis para locação em Agudos, SP e região.
          </p>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7280]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar equipamento por nome ou código…"
              className="w-full rounded-md border border-[#eef0f4] bg-white pl-9 pr-3 py-3 text-sm text-[#1a1a1a] placeholder:text-[#6e7280] focus:outline-none focus:ring-2 focus:ring-[#f37032]"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm font-semibold text-[#213368]">Carregando catálogo…</p>
        ) : erro ? (
          <p className="py-16 text-center text-sm text-[#6e7280]">Não foi possível carregar o catálogo agora. Tente novamente em instantes.</p>
        ) : q ? (
          resultadosBusca.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#6e7280]">Nenhum equipamento encontrado.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resultadosBusca.map(e => <EquipamentoPublicCard key={e.id} equipamento={e} telefone={telefone} />)}
            </div>
          )
        ) : categorias.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#6e7280]">Nenhuma categoria disponível no momento.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map(c => <CategoriaCard key={c.id} categoria={c} count={countPorCategoria.get(c.id) ?? 0} />)}
          </div>
        )}
      </section>
    </CatalogoLayout>
  );
}

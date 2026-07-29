import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money, normalizeSearch } from "@/lib/portal/format";
import { CatalogoLayout } from "@/components/catalogo/CatalogoLayout";
import { Search, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/catalogo")({
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
  descricao: string;
  foto_url: string;
  valor_diaria: number;
  valor_semanal: number;
  valor_mensal: number;
  categoria_id: string;
  status: string;
};
type CatCategoria = { id: string; nome: string };

function CatalogoPage() {
  const [itens, setItens] = useState<CatEquip[]>([]);
  const [categorias, setCategorias] = useState<CatCategoria[]>([]);
  const [telefone, setTelefone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [catF, setCatF] = useState("todas");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [eqRes, catRes, empRes] = await Promise.all([
        supabase
          .from("equipamentos")
          .select("id, nome, descricao, foto_url, valor_diaria, valor_semanal, valor_mensal, categoria_id, status")
          .eq("exibir_catalogo", true)
          .eq("status", "disponivel"),
        supabase.from("categorias").select("id, nome").eq("ativa", true).order("nome"),
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

  const q = normalizeSearch(busca);
  const filtrados = useMemo(() => itens.filter(e => {
    const okQ = !q || normalizeSearch(e.nome).includes(q) || normalizeSearch(e.descricao || "").includes(q);
    const okC = catF === "todas" || e.categoria_id === catF;
    return okQ && okC;
  }), [itens, q, catF]);

  const categoriasComItens = useMemo(
    () => categorias.filter(c => itens.some(e => e.categoria_id === c.id)),
    [categorias, itens],
  );

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
        <div className="mb-8 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7280]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar equipamento…"
              className="w-full rounded-md border border-[#eef0f4] bg-white pl-9 pr-3 py-3 text-sm text-[#1a1a1a] placeholder:text-[#6e7280] focus:outline-none focus:ring-2 focus:ring-[#f37032]"
            />
          </div>
          <select
            value={catF}
            onChange={e => setCatF(e.target.value)}
            className="rounded-md border border-[#eef0f4] bg-white px-3 py-3 text-sm text-[#1a1a1a]"
          >
            <option value="todas">Todas as categorias</option>
            {categoriasComItens.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm font-semibold text-[#213368]">Carregando catálogo…</p>
        ) : erro ? (
          <p className="py-16 text-center text-sm text-[#6e7280]">Não foi possível carregar o catálogo agora. Tente novamente em instantes.</p>
        ) : filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#6e7280]">Nenhum equipamento encontrado.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map(e => {
              const catNome = categorias.find(c => c.id === e.categoria_id)?.nome ?? "";
              return (
                <Link
                  key={e.id}
                  to="/catalogo/$id"
                  params={{ id: e.id }}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#eef0f4] bg-white transition hover:-translate-y-1 hover:border-[#f37032] hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f4f4]">
                    {e.foto_url ? (
                      <img src={e.foto_url} alt={e.nome} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#6e7280]"><ImageIcon className="h-10 w-10 opacity-40" /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#f37032]">{catNome}</p>
                    <h3 className="mt-1 text-base font-bold text-[#213368]">{e.nome}</h3>
                    {e.descricao && <p className="mt-2 line-clamp-2 flex-1 text-sm text-[#6e7280]">{e.descricao}</p>}
                    <div className="mt-4 flex items-baseline gap-1 border-t border-[#eef0f4] pt-3">
                      <span className="text-lg font-extrabold text-[#213368]">{money(e.valor_diaria)}</span>
                      <span className="text-xs text-[#6e7280]">/dia</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </CatalogoLayout>
  );
}

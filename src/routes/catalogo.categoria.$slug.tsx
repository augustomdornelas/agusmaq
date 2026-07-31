import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSearch } from "@/lib/portal/format";
import { slugify } from "@/lib/portal/slug";
import { CatalogoLayout } from "@/components/catalogo/CatalogoLayout";
import { EquipamentoPublicCard } from "@/components/catalogo/EquipamentoPublicCard";
import { ArrowLeft, Search } from "lucide-react";

type CatCategoria = { id: string; nome: string; descricao: string; foto_url: string };
type CatEquip = { id: string; nome: string; foto_url: string; status: string };

async function loadCategoriaBySlug(slug: string) {
  const catRes = await (supabase.from as any)("categorias").select("id, nome, descricao, foto_url").eq("ativa", true);
  if (catRes.error) throw new Error(catRes.error.message);
  const categoria = ((catRes.data ?? []) as CatCategoria[]).find(c => slugify(c.nome) === slug);
  if (!categoria) throw notFound();

  const [eqRes, empRes] = await Promise.all([
    supabase
      .from("equipamentos")
      .select("id, nome, foto_url, status")
      .eq("exibir_catalogo", true)
      .eq("categoria_id", categoria.id)
      .neq("status", "inativo")
      .order("nome"),
    (supabase.from as any)("configuracoes_empresa").select("telefone").eq("id", 1).maybeSingle(),
  ]);

  return {
    categoria,
    equipamentos: (eqRes.data ?? []) as CatEquip[],
    telefone: ((empRes as any)?.data?.telefone as string) || null,
  };
}

export const Route = createFileRoute("/catalogo/categoria/$slug")({
  loader: ({ params }) => loadCategoriaBySlug(params.slug),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Categoria — Catálogo Agusmaq" }, { name: "robots", content: "noindex, follow" }] };
    const { categoria } = loaderData;
    const description = categoria.descricao?.trim()
      || `Equipamentos da categoria ${categoria.nome} disponíveis para locação na Agusmaq — Agudos, SP e região.`;
    return {
      meta: [
        { title: `${categoria.nome} — Catálogo Agusmaq` },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
      ],
    };
  },
  component: CategoriaDetalhe,
  notFoundComponent: CategoriaNaoEncontrada,
});

function CategoriaDetalhe() {
  const { categoria, equipamentos, telefone } = Route.useLoaderData();
  const [busca, setBusca] = useState("");

  const q = normalizeSearch(busca);
  const filtrados = useMemo(
    () => (!q ? equipamentos : equipamentos.filter(e => normalizeSearch(e.nome).includes(q))),
    [equipamentos, q],
  );

  return (
    <CatalogoLayout telefone={telefone}>
      <section className="border-b border-[#eef0f4] bg-[#213368] py-14 text-white">
        <div className="container-x">
          <Link to="/catalogo" className="inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Todas as categorias
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">{categoria.nome}</h1>
          {categoria.descricao && <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">{categoria.descricao}</p>}
        </div>
      </section>

      <section className="container-x py-10">
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7280]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={`Buscar em ${categoria.nome}…`}
              className="w-full rounded-md border border-[#eef0f4] bg-white pl-9 pr-3 py-3 text-sm text-[#1a1a1a] placeholder:text-[#6e7280] focus:outline-none focus:ring-2 focus:ring-[#f37032]"
            />
          </div>
        </div>

        {filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#6e7280]">
            {equipamentos.length === 0 ? "Nenhum equipamento nesta categoria no momento." : "Nenhum equipamento encontrado."}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map(e => <EquipamentoPublicCard key={e.id} equipamento={e} telefone={telefone} />)}
          </div>
        )}
      </section>
    </CatalogoLayout>
  );
}

function CategoriaNaoEncontrada() {
  return (
    <CatalogoLayout telefone={null}>
      <div className="container-x py-16 text-center">
        <p className="text-sm text-[#6e7280]">Categoria não encontrada.</p>
        <Link to="/catalogo" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#213368] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>
      </div>
    </CatalogoLayout>
  );
}

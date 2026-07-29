import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { money, whatsappLink } from "@/lib/portal/format";
import { CatalogoLayout, WhatsAppIcon } from "@/components/catalogo/CatalogoLayout";
import { ArrowLeft, Package } from "lucide-react";

export const Route = createFileRoute("/catalogo/$id")({
  head: () => ({ meta: [{ title: "Equipamento — Catálogo Agusmaq" }, { name: "robots", content: "noindex, follow" }] }),
  component: CatalogoDetalhe,
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

function CatalogoDetalhe() {
  const { id } = Route.useParams();
  const [eq, setEq] = useState<CatEquip | null>(null);
  const [categoriaNome, setCategoriaNome] = useState("");
  const [telefone, setTelefone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [eqRes, empRes] = await Promise.all([
        supabase
          .from("equipamentos")
          .select("id, nome, descricao, foto_url, valor_diaria, valor_semanal, valor_mensal, categoria_id, status, categorias(nome)")
          .eq("id", id)
          .eq("exibir_catalogo", true)
          .eq("status", "disponivel")
          .maybeSingle(),
        (supabase.from as any)("configuracoes_empresa").select("telefone").eq("id", 1).maybeSingle(),
      ]);
      if (!alive) return;
      setTelefone(((empRes as any)?.data?.telefone as string) || null);
      if (eqRes.error || !eqRes.data) { setNaoEncontrado(true); setLoading(false); return; }
      const row: any = eqRes.data;
      setEq(row);
      setCategoriaNome(row.categorias?.nome ?? "");
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <CatalogoLayout telefone={telefone}>
        <div className="container-x py-16 text-center text-sm font-semibold text-[#213368]">Carregando…</div>
      </CatalogoLayout>
    );
  }

  if (naoEncontrado || !eq) {
    return (
      <CatalogoLayout telefone={telefone}>
        <div className="container-x py-16 text-center">
          <p className="text-sm text-[#6e7280]">Equipamento não encontrado ou indisponível no momento.</p>
          <Link to="/catalogo" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#213368] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
          </Link>
        </div>
      </CatalogoLayout>
    );
  }

  const waHref = telefone ? whatsappLink(telefone, `Olá! Tenho interesse em alugar: ${eq.nome}`) : null;

  return (
    <CatalogoLayout telefone={telefone}>
      <div className="container-x py-8">
        <Link to="/catalogo" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-[#213368] hover:text-[#f37032]">
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#f4f4f4]">
            {eq.foto_url ? (
              <img src={eq.foto_url} alt={eq.nome} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#6e7280]"><Package className="h-16 w-16 opacity-40" /></div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f37032]">{categoriaNome}</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#213368] md:text-3xl">{eq.nome}</h1>
            {eq.descricao && <p className="mt-4 text-sm leading-relaxed text-[#6e7280]">{eq.descricao}</p>}

            <div className="mt-6 grid grid-cols-3 gap-3">
              <PrecoBox label="Diária" v={eq.valor_diaria} />
              <PrecoBox label="Semanal" v={eq.valor_semanal} />
              <PrecoBox label="Mensal" v={eq.valor_mensal} />
            </div>

            <div className="mt-8">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#f37032] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#db5f22]"
                >
                  <WhatsAppIcon />
                  Solicitar orçamento deste equipamento
                </a>
              ) : (
                <p className="text-sm text-[#6e7280]">Entre em contato pelos canais da Agusmaq para orçamento.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </CatalogoLayout>
  );
}

function PrecoBox({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border border-[#eef0f4] bg-[#f4f4f4] p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-[#6e7280]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#213368]">{money(v)}</p>
    </div>
  );
}

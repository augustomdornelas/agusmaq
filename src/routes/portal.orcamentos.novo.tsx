import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { OrcamentoEditor } from "@/components/portal/OrcamentoEditor";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/portal/orcamentos/novo")({
  head: () => ({ meta: [{ title: "Novo orçamento — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: NovoOrcamentoPage,
});

function NovoOrcamentoPage() {
  const nav = useNavigate();
  return (
    <PortalLayout title="Novo orçamento">
      <button onClick={() => nav({ to: "/portal/orcamentos" })} className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <OrcamentoEditor initial={null} onSaved={(o) => nav({ to: "/portal/orcamentos/$id", params: { id: o.id } })} />
    </PortalLayout>
  );
}

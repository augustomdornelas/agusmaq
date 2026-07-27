import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayStatus } from "@/lib/portal/store";
import { dateBR, money, whatsappLink } from "@/lib/portal/format";
import { ArrowLeft, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/portal/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ClienteDetail,
});

function ClienteDetail() {
  const { id } = Route.useParams();
  const { db } = useStore();
  const c = db.clientes.find(x => x.id === id);
  if (!c) return <PortalLayout title="Cliente"><p>Não encontrado. <Link to="/portal/clientes" className="underline">Voltar</Link></p></PortalLayout>;

  const alugueis = db.alugueis.filter(a => a.cliente_id === id);
  const totalGasto = alugueis.filter(a => a.status !== "cancelado").reduce((s, a) => s + a.valor_total, 0);

  return (
    <PortalLayout title={c.nome_razao_social}>
      <Link to="/portal/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#213368]">{c.nome_razao_social}</h2>
          <p className="text-sm text-[#6E7280]">{c.tipo === "pessoa_fisica" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
          <div className="mt-3 space-y-1 text-sm">
            <p><b className="text-[#6E7280]">CPF/CNPJ:</b> {c.cpf_cnpj}</p>
            <p><b className="text-[#6E7280]">Telefone:</b> {c.telefone_whatsapp}</p>
            <p><b className="text-[#6E7280]">E-mail:</b> {c.email || "—"}</p>
            <p><b className="text-[#6E7280]">Endereço:</b> {c.endereco || "—"}</p>
            <p><b className="text-[#6E7280]">Cidade:</b> {c.cidade || "—"}</p>
          </div>
          {c.telefone_whatsapp && <a href={whatsappLink(c.telefone_whatsapp)} target="_blank" className="mt-4 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>}
          {c.observacoes && <p className="mt-3 rounded bg-[#F4F4F4] p-2 text-xs text-[#6E7280]">{c.observacoes}</p>}
          <div className="mt-4 rounded-md bg-[#F4F4F4] p-3">
            <p className="text-xs text-[#6E7280]">Total já contratado</p>
            <p className="text-lg font-bold text-[#213368]">{money(totalGasto)}</p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">Histórico de aluguéis</h3>
          {alugueis.length === 0 ? <p className="text-sm text-[#6E7280]">Nenhum aluguel.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-[#6E7280]"><tr><th className="py-2">Início</th><th>Prevista</th><th>Itens</th><th className="text-right">Total</th><th>Status</th></tr></thead>
              <tbody>
                {alugueis.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2">{dateBR(a.data_inicio)}</td>
                    <td>{dateBR(a.data_prevista_devolucao)}</td>
                    <td className="text-[#6E7280]">{a.itens.length}</td>
                    <td className="text-right">{money(a.valor_total)}</td>
                    <td><Link to="/portal/alugueis/$id" params={{ id: a.id }}><StatusBadge status={displayStatus(a)} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

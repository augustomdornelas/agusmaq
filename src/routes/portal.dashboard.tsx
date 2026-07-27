import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore, isAtrasado, displayStatus } from "@/lib/portal/store";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { dateBR, money, todayISO, addDays } from "@/lib/portal/format";
import { AlertTriangle, ClipboardList, Wrench, Users, Plus } from "lucide-react";

export const Route = createFileRoute("/portal/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Dashboard,
});

function Card({ title, value, tone = "default" }: { title: string; value: string; tone?: "default" | "danger" | "warn" | "success" }) {
  const toneCls = { default: "text-[#213368]", danger: "text-red-600", warn: "text-amber-600", success: "text-emerald-600" }[tone];
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6E7280]">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

function Dashboard() {
  const { db } = useStore();
  const today = todayISO();
  const in7 = addDays(today, 7);
  const mesInicio = today.slice(0, 7) + "-01";

  const ativos = db.alugueis.filter(a => a.status === "ativo").length;
  const atrasados = db.alugueis.filter(a => isAtrasado(a, today));
  const disponiveis = db.equipamentos.filter(e => e.status === "disponivel").length;
  const emManut = db.equipamentos.filter(e => e.status === "manutencao").length;
  const faturamentoMes = db.pagamentos.filter(p => p.data >= mesInicio).reduce((s, p) => s + p.valor, 0);
  const aReceber = db.alugueis.filter(a => a.status_pagamento !== "pago" && a.status !== "cancelado").reduce((s, a) => {
    const pago = db.pagamentos.filter(p => p.aluguel_id === a.id).reduce((x, p) => x + p.valor, 0);
    return s + Math.max(0, a.valor_total - pago);
  }, 0);

  const proximas = db.alugueis
    .filter(a => a.status === "ativo" && !a.data_devolucao_real && a.data_prevista_devolucao >= today && a.data_prevista_devolucao <= in7)
    .sort((a, b) => a.data_prevista_devolucao.localeCompare(b.data_prevista_devolucao));

  const clienteNome = (id: string) => db.clientes.find(c => c.id === id)?.nome_razao_social ?? "—";
  const equipNomes = (ids: string[]) => ids.map(id => db.equipamentos.find(e => e.id === id)?.nome ?? "").filter(Boolean).join(", ");

  return (
    <PortalLayout title="Dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card title="Aluguéis ativos" value={String(ativos)} />
        <Card title="Atrasados" value={String(atrasados.length)} tone="danger" />
        <Card title="Equip. disponíveis" value={String(disponiveis)} tone="success" />
        <Card title="Em manutenção" value={String(emManut)} tone="warn" />
        <Card title="Faturamento do mês" value={money(faturamentoMes)} tone="success" />
        <Card title="A receber" value={money(aReceber)} tone="warn" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/portal/alugueis" className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo aluguel
        </Link>
        <Link to="/portal/clientes" className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-[#213368] hover:bg-[#F4F4F4]">
          <Users className="h-4 w-4" /> Novo cliente
        </Link>
        <Link to="/portal/equipamentos" className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-[#213368] hover:bg-[#F4F4F4]">
          <Wrench className="h-4 w-4" /> Novo equipamento
        </Link>
      </div>

      {atrasados.length > 0 && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Aluguéis atrasados</h3>
          </div>
          <ul className="divide-y divide-red-100 text-sm">
            {atrasados.map(a => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-red-800">
                  <Link to="/portal/alugueis/$id" params={{ id: a.id }} className="font-medium underline">{clienteNome(a.cliente_id)}</Link>
                  {" · "}{equipNomes(a.itens.map(i => i.equipamento_id))}
                </span>
                <span className="text-xs text-red-700">Previsto: {dateBR(a.data_prevista_devolucao)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#213368]" />
          <h3 className="text-sm font-semibold text-[#213368]">Devoluções nos próximos 7 dias</h3>
        </div>
        {proximas.length === 0 ? (
          <p className="text-sm text-[#6E7280]">Nenhuma devolução prevista.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[#6E7280]">
                <tr><th className="py-2">Cliente</th><th>Equipamentos</th><th>Data</th><th></th></tr>
              </thead>
              <tbody>
                {proximas.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2">{clienteNome(a.cliente_id)}</td>
                    <td>{equipNomes(a.itens.map(i => i.equipamento_id))}</td>
                    <td>{dateBR(a.data_prevista_devolucao)}</td>
                    <td className="text-right"><StatusBadge status={displayStatus(a)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

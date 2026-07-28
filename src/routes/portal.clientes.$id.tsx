import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayStatus, computeClienteStats, isAtrasado } from "@/lib/portal/store";
import { dateBR, money, whatsappLink } from "@/lib/portal/format";
import { ArrowLeft, MessageCircle, Plus, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/portal/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ClienteDetail,
});

function ClienteDetail() {
  const { id } = Route.useParams();
  const { db } = useStore();
  const navigate = useNavigate();
  const c = db.clientes.find(x => x.id === id);
  if (!c) return <PortalLayout title="Cliente"><p>Não encontrado. <Link to="/portal/clientes" className="underline">Voltar</Link></p></PortalLayout>;

  const alugueis = db.alugueis.filter(a => a.cliente_id === id).sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
  const stats = computeClienteStats(id, db.alugueis, db.equipamentos);
  const meses = stats.por_mes.map(m => ({ ...m, label: m.mes.slice(5) + "/" + m.mes.slice(2, 4) }));

  return (
    <PortalLayout title={c.nome_razao_social}>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/portal/clientes" className="inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <button onClick={() => navigate({ to: "/portal/alugueis/novo", search: { clienteId: c.id } as any })} className="inline-flex items-center gap-1 rounded-md bg-[#F37032] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo aluguel
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#213368]">{c.nome_razao_social}</h2>
          <p className="text-sm text-[#6E7280]">{c.tipo === "pessoa_fisica" ? "Pessoa Física" : "Pessoa Jurídica"} · Cliente desde {dateBR(c.created_at)}</p>
          <div className="mt-3 space-y-1 text-sm">
            <p><b className="text-[#6E7280]">CPF/CNPJ:</b> {c.cpf_cnpj || "—"}</p>
            <p><b className="text-[#6E7280]">Telefone:</b> {c.telefone_whatsapp || "—"}</p>
            <p><b className="text-[#6E7280]">E-mail:</b> {c.email || "—"}</p>
            <p><b className="text-[#6E7280]">Endereço:</b> {c.endereco || "—"}</p>
            <p><b className="text-[#6E7280]">Cidade:</b> {c.cidade || "—"}</p>
          </div>
          {c.telefone_whatsapp && <a href={whatsappLink(c.telefone_whatsapp)} target="_blank" className="mt-4 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>}
          {c.observacoes && <p className="mt-3 rounded bg-[#F4F4F4] p-2 text-xs text-[#6E7280]">{c.observacoes}</p>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {stats.tem_atraso && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 font-medium">⚠️ Este cliente possui aluguéis em atraso.</div>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Total gasto" v={money(stats.total_gasto)} />
            <Kpi label="Nº de aluguéis" v={String(stats.n_alugueis)} />
            <Kpi label="Aluguéis ativos" v={String(stats.ativos)} />
            <Kpi label="Ticket médio" v={money(stats.ticket_medio)} />
            <Kpi label="Última locação" v={stats.ultima_locacao ? dateBR(stats.ultima_locacao) : "—"} />
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#213368]">Gastos por mês (últimos 12)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meses}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Bar dataKey="valor" fill="#F37032" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {stats.top_equipamentos.length > 0 && (
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-[#213368]">Equipamentos mais alugados</h3>
              <ul className="space-y-1 text-sm">
                {stats.top_equipamentos.map(t => (
                  <li key={t.equipamento_id} className="flex justify-between border-b py-1 last:border-0">
                    <Link to="/portal/equipamentos/$id" params={{ id: t.equipamento_id }} className="hover:underline">{t.nome}</Link>
                    <span className="text-[#6E7280]">{t.n} aluguéis · <b className="text-[#213368]">{money(t.total)}</b></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#213368]">Histórico completo</h3>
            {alugueis.length === 0 ? <p className="text-sm text-[#6E7280]">Nenhum aluguel.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-[#6E7280]"><tr><th className="py-2">Nº</th><th>Data</th><th>Equipamentos</th><th>Período</th><th className="text-right">Valor</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {alugueis.map(a => (
                      <tr key={a.id} className={`border-t ${isAtrasado(a) ? "bg-red-50" : ""}`}>
                        <td className="py-2 font-mono text-xs">#{a.numero}</td>
                        <td>{dateBR(a.data_inicio)}</td>
                        <td className="text-xs text-[#6E7280]">{a.itens.length} item(ns)</td>
                        <td className="text-xs">{dateBR(a.data_inicio)} → {dateBR(a.data_prevista_devolucao)}</td>
                        <td className="text-right">{money(a.valor_total)}</td>
                        <td><Link to="/portal/alugueis/$id" params={{ id: a.id }}><StatusBadge status={displayStatus(a)} /></Link></td>
                        <td className="text-right"><Link to="/portal/alugueis/$id/termo" params={{ id: a.id }} className="inline-flex items-center gap-1 text-xs font-medium text-[#213368] hover:underline"><FileText className="h-3 w-3" /> Termo</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

function Kpi({ label, v }: { label: string; v: string }) {
  return <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs text-[#6E7280]">{label}</p><p className="mt-1 text-xl font-bold text-[#213368]">{v}</p></div>;
}

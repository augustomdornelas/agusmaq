import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayOrcamentoStatus, isOrcamentoExpirado } from "@/lib/portal/store";
import { dateBR, money, normalizeSearch, todayISO } from "@/lib/portal/format";
import { gerarOrcamentoPdf } from "@/lib/portal/orcamentoPdf";
import { Plus, Search, Download, Copy, Trash2, Archive } from "lucide-react";

export const Route = createFileRoute("/portal/orcamentos/")({
  head: () => ({ meta: [{ title: "Orçamentos — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: OrcamentosPage,
});

const STATUS_OPTIONS = ["rascunho", "enviado", "aprovado", "recusado", "expirado"] as const;

function OrcamentosPage() {
  const { db, duplicarOrcamento, deleteOrcamento, arquivarOrcamento } = useStore();
  const nav = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusF, setStatusF] = useState<string>("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const ativos = useMemo(() => db.orcamentos.filter(o => !o.arquivado), [db.orcamentos]);

  const kpis = useMemo(() => {
    const hoje = todayISO();
    const mesInicio = hoje.slice(0, 7) + "-01";
    const noMes = ativos.filter(o => o.data_emissao >= mesInicio);
    const emAberto = ativos.filter(o => o.status === "enviado");
    const aprovadosMes = ativos.filter(o => o.status === "aprovado" && (o.data_decisao ?? o.data_emissao) >= mesInicio);
    const baseConversao = ativos.filter(o => o.status === "enviado" || o.status === "aprovado" || o.status === "recusado");
    const aprovadosTotal = ativos.filter(o => o.status === "aprovado");
    const taxaConversao = baseConversao.length ? (aprovadosTotal.length / baseConversao.length) * 100 : 0;
    return {
      totalMes: noMes.length,
      emAbertoQtd: emAberto.length,
      emAbertoValor: emAberto.reduce((s, o) => s + Number(o.valor_total || 0), 0),
      aprovadosMesQtd: aprovadosMes.length,
      aprovadosMesValor: aprovadosMes.reduce((s, o) => s + Number(o.valor_total || 0), 0),
      taxaConversao,
    };
  }, [ativos]);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    return ativos
      .map(o => ({ ...o, _cli: db.clientes.find(c => c.id === o.cliente_id), _status: displayOrcamentoStatus(o) }))
      .filter(o => {
        if (q && !normalizeSearch(o.numero).includes(q) && !normalizeSearch(o._cli?.nome_razao_social ?? "").includes(q)) return false;
        if (statusF && o._status !== statusF) return false;
        if (de && o.data_emissao < de) return false;
        if (ate && o.data_emissao > ate) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [ativos, db.clientes, busca, statusF, de, ate]);

  async function baixarPdf(id: string) {
    const o = db.orcamentos.find(x => x.id === id);
    if (!o) return;
    setPdfLoadingId(id);
    try { await gerarOrcamentoPdf(o, db.clientes.find(c => c.id === o.cliente_id), db.equipamentos, db.configEmpresa); }
    catch (e: any) { toast.error("Falha ao gerar PDF: " + e.message); }
    finally { setPdfLoadingId(null); }
  }
  async function duplicar(id: string) {
    try {
      const novo = await duplicarOrcamento(id);
      toast.success("Orçamento duplicado.");
      nav({ to: "/portal/orcamentos/$id", params: { id: novo.id } });
    } catch (e: any) { toast.error(e.message); }
  }
  async function excluirOuArquivar(id: string, temAluguel: boolean) {
    if (temAluguel) {
      if (!confirm("Este orçamento já gerou um aluguel e não pode ser excluído. Deseja arquivá-lo?")) return;
      try { await arquivarOrcamento(id); toast.success("Orçamento arquivado."); }
      catch (e: any) { toast.error(e.message); }
      return;
    }
    if (!confirm("Excluir este orçamento? Esta ação não pode ser desfeita.")) return;
    try { await deleteOrcamento(id); toast.success("Orçamento excluído."); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <PortalLayout title="Orçamentos">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#213368]">Orçamentos</h2>
          <p className="text-sm text-[#6E7280]">Propostas de locação para clientes</p>
        </div>
        <Link to="/portal/orcamentos/novo" className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo orçamento
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Orçamentos no mês" value={String(kpis.totalMes)} />
        <Kpi label="Em aberto" value={String(kpis.emAbertoQtd)} sub={money(kpis.emAbertoValor)} color="#c98500" />
        <Kpi label="Aprovados no mês" value={String(kpis.aprovadosMesQtd)} sub={money(kpis.aprovadosMesValor)} color="#0ca30c" />
        <Kpi label="Taxa de conversão" value={`${kpis.taxaConversao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} color="#213368" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por número ou cliente…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#213368]" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={de} onChange={e => setDe(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm" title="Emissão de" />
        <input type="date" value={ate} onChange={e => setAte(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm" title="Emissão até" />
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F4] text-left text-xs uppercase text-[#6E7280]">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Emissão</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3 text-right">Itens</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6E7280]">Nenhum orçamento encontrado.</td></tr>
            )}
            {filtrados.map(o => {
              const expirado = isOrcamentoExpirado(o);
              return (
                <tr key={o.id} className={`cursor-pointer border-t hover:bg-[#F4F4F4] ${expirado ? "bg-amber-50" : ""}`} onClick={() => nav({ to: "/portal/orcamentos/$id", params: { id: o.id } })}>
                  <td className="px-4 py-3 font-mono text-xs">{o.numero}</td>
                  <td className="px-4 py-3">{o._cli?.nome_razao_social ?? "—"}</td>
                  <td className="px-4 py-3">{dateBR(o.data_emissao)}</td>
                  <td className="px-4 py-3">{dateBR(o.data_validade)}</td>
                  <td className="px-4 py-3 text-right">{o.itens.length}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(o.valor_total)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o._status} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => baixarPdf(o.id)} disabled={pdfLoadingId === o.id} title="Baixar PDF" className="rounded p-1.5 text-[#213368] hover:bg-[#213368]/10 disabled:opacity-40">
                        <Download className="h-4 w-4" />
                      </button>
                      <button onClick={() => duplicar(o.id)} title="Duplicar" className="rounded p-1.5 text-[#213368] hover:bg-[#213368]/10">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => excluirOuArquivar(o.id, Boolean(o.aluguel_id))} title={o.aluguel_id ? "Arquivar" : "Excluir"} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                        {o.aluguel_id ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}

function Kpi({ label, value, sub, color = "#213368" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6E7280]">{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#6E7280]">{sub}</p>}
    </div>
  );
}

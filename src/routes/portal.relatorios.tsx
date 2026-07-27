import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { dateBR, money, todayISO } from "@/lib/portal/format";
import { Download } from "lucide-react";

export const Route = createFileRoute("/portal/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: RelPage,
});

function mesRange(offsetMonths: number): [string, string] {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1).toISOString().slice(0, 10);
  const last = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return [first, last];
}

function csv(rows: (string | number)[][]): string {
  return rows.map(r => r.map(v => {
    const s = String(v ?? "");
    return /[,";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
function downloadCsv(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function RelPage() {
  const { db } = useStore();
  const [preset, setPreset] = useState<"atual" | "anterior" | "custom">("atual");
  const [de, setDe] = useState(mesRange(0)[0]);
  const [ate, setAte] = useState(mesRange(0)[1]);

  function aplicar(p: typeof preset) {
    setPreset(p);
    if (p === "atual") { const [a, b] = mesRange(0); setDe(a); setAte(b); }
    if (p === "anterior") { const [a, b] = mesRange(-1); setDe(a); setAte(b); }
  }

  const pgs = useMemo(() => db.pagamentos.filter(p => p.data >= de && p.data <= ate), [db, de, ate]);
  const als = useMemo(() => db.alugueis.filter(a => a.data_inicio >= de && a.data_inicio <= ate && a.status !== "cancelado"), [db, de, ate]);

  const faturamento = pgs.reduce((s, p) => s + p.valor, 0);

  const topEquip = useMemo(() => {
    const map = new Map<string, number>();
    als.forEach(a => a.itens.forEach(i => map.set(i.equipamento_id, (map.get(i.equipamento_id) ?? 0) + i.quantidade)));
    return [...map.entries()].map(([id, q]) => ({ nome: db.equipamentos.find(e => e.id === id)?.nome ?? "—", q })).sort((a, b) => b.q - a.q).slice(0, 10);
  }, [als, db]);

  const topClientes = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    als.forEach(a => {
      const cur = map.get(a.cliente_id) ?? { total: 0, count: 0 };
      map.set(a.cliente_id, { total: cur.total + a.valor_total, count: cur.count + 1 });
    });
    return [...map.entries()].map(([id, v]) => ({ nome: db.clientes.find(c => c.id === id)?.nome_razao_social ?? "—", ...v })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [als, db]);

  return (
    <PortalLayout title="Relatórios">
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-[#6E7280]">Período</label>
          <div className="flex gap-1">
            {(["atual", "anterior", "custom"] as const).map(p => (
              <button key={p} onClick={() => aplicar(p)} className={`rounded-md px-3 py-2 text-xs font-medium ${preset === p ? "bg-[#213368] text-white" : "bg-[#F4F4F4] text-[#213368]"}`}>
                {p === "atual" ? "Mês atual" : p === "anterior" ? "Mês anterior" : "Personalizado"}
              </button>
            ))}
          </div>
        </div>
        <div><label className="mb-1 block text-xs text-[#6E7280]">De</label><input type="date" className="rounded-md border px-2 py-2 text-sm" value={de} onChange={e => { setPreset("custom"); setDe(e.target.value); }} /></div>
        <div><label className="mb-1 block text-xs text-[#6E7280]">Até</label><input type="date" className="rounded-md border px-2 py-2 text-sm" value={ate} onChange={e => { setPreset("custom"); setAte(e.target.value); }} /></div>
        <div className="ml-auto text-sm text-[#6E7280]">{dateBR(de)} — {dateBR(ate)}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Faturamento no período" subtitle={money(faturamento)} onExport={() => downloadCsv("faturamento.csv", csv([["Data", "Valor", "Forma", "Aluguel"], ...pgs.map(p => [p.data, p.valor, p.forma, p.aluguel_id])]))}>
          <p className="text-sm text-[#6E7280]">{pgs.length} pagamentos registrados.</p>
        </Card>

        <Card title="Aluguéis realizados" subtitle={String(als.length)} onExport={() => downloadCsv("alugueis.csv", csv([["Data início", "Cliente", "Total", "Status"], ...als.map(a => [a.data_inicio, db.clientes.find(c => c.id === a.cliente_id)?.nome_razao_social ?? "", a.valor_total, a.status])]))}>
          <p className="text-sm text-[#6E7280]">Total faturado (aluguéis): <b>{money(als.reduce((s, a) => s + a.valor_total, 0))}</b></p>
        </Card>

        <Card title="Top 10 equipamentos mais alugados" onExport={() => downloadCsv("top-equipamentos.csv", csv([["Equipamento", "Quantidade"], ...topEquip.map(t => [t.nome, t.q])]))}>
          {topEquip.length === 0 ? <p className="text-sm text-[#6E7280]">Sem dados.</p> : <ol className="space-y-1 text-sm">{topEquip.map((t, i) => <li key={i} className="flex justify-between border-b py-1"><span>{i + 1}. {t.nome}</span><b>{t.q}</b></li>)}</ol>}
        </Card>

        <Card title="Top 10 clientes" onExport={() => downloadCsv("top-clientes.csv", csv([["Cliente", "Aluguéis", "Total"], ...topClientes.map(t => [t.nome, t.count, t.total])]))}>
          {topClientes.length === 0 ? <p className="text-sm text-[#6E7280]">Sem dados.</p> : <ol className="space-y-1 text-sm">{topClientes.map((t, i) => <li key={i} className="flex justify-between border-b py-1"><span>{i + 1}. {t.nome}</span><b>{money(t.total)}</b></li>)}</ol>}
        </Card>
      </div>
    </PortalLayout>
  );
}

function Card({ title, subtitle, onExport, children }: { title: string; subtitle?: string; onExport: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div><h3 className="text-sm font-semibold text-[#213368]">{title}</h3>{subtitle && <p className="text-xl font-bold text-[#213368]">{subtitle}</p>}</div>
        <button onClick={onExport} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-[#213368] hover:bg-[#F4F4F4]"><Download className="h-3 w-3" /> CSV</button>
      </div>
      {children}
    </div>
  );
}

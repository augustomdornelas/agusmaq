import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore } from "@/lib/portal/store";
import { dateBR, money, todayISO } from "@/lib/portal/format";
import { Plus, Trash2, X } from "lucide-react";
import type { ManutencaoStatus } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ManutPage,
});

function ManutPage() {
  const { db, addManutencao, concluirManutencao, deleteManutencao } = useStore();
  const [st, setSt] = useState<string>("");
  const [eq, setEq] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [concluir, setConcluir] = useState<string | null>(null);
  const [cData, setCData] = useState(todayISO());
  const [cCusto, setCCusto] = useState(0);

  const lista = useMemo(() => db.manutencoes.filter(m => (!st || m.status === st) && (!eq || m.equipamento_id === eq))
    .sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)), [db, st, eq]);

  function excluir(id: string) {
    if (!confirm("Excluir manutenção?")) return;
    deleteManutencao(id); toast.success("Excluída.");
  }

  return (
    <PortalLayout title="Manutenções">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={st} onChange={e => setSt(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todos status</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluídas</option>
        </select>
        <select value={eq} onChange={e => setEq(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todos equipamentos</option>
          {db.equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Nova manutenção
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F4] text-left text-xs uppercase text-[#6E7280]">
            <tr><th className="px-4 py-3">Equipamento</th><th className="px-4 py-3">Início</th><th className="px-4 py-3">Fim</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3 text-right">Custo</th><th className="px-4 py-3">Status</th><th></th></tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6E7280]">Nenhuma manutenção.</td></tr>}
            {lista.map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-3">{db.equipamentos.find(e => e.id === m.equipamento_id)?.nome ?? "—"}</td>
                <td className="px-4 py-3">{dateBR(m.data_inicio)}</td>
                <td className="px-4 py-3">{dateBR(m.data_fim)}</td>
                <td className="px-4 py-3 text-[#6E7280]">{m.descricao}</td>
                <td className="px-4 py-3 text-right">{money(m.custo)}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-right">
                  {m.status === "em_andamento" && <button onClick={() => { setConcluir(m.id); setCData(todayISO()); setCCusto(m.custo); }} className="mr-2 text-xs font-medium text-emerald-700 hover:underline">Concluir</button>}
                  <button onClick={() => excluir(m.id)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <NovaManutDialog onClose={() => setOpen(false)} onSave={(d) => { addManutencao(d); toast.success("Manutenção criada."); setOpen(false); }} />}
      {concluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConcluir(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 font-semibold text-[#213368]">Concluir manutenção</h3>
            <label className="mb-2 block text-xs text-[#6E7280]">Data fim<input type="date" className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={cData} onChange={e => setCData(e.target.value)} /></label>
            <label className="mb-3 block text-xs text-[#6E7280]">Custo<input type="number" min={0} step="0.01" className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={cCusto} onChange={e => setCCusto(Number(e.target.value))} /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConcluir(null)} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>
              <button onClick={() => { concluirManutencao(concluir, cData, cCusto); toast.success("Concluída."); setConcluir(null); }} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function NovaManutDialog({ onClose, onSave }: { onClose: () => void; onSave: (d: { equipamento_id: string; data_inicio: string; data_fim: string | null; descricao: string; custo: number; status: ManutencaoStatus }) => void }) {
  const { db } = useStore();
  const [f, setF] = useState({
    equipamento_id: db.equipamentos[0]?.id ?? "",
    data_inicio: todayISO(),
    descricao: "",
    custo: 0,
    status: "em_andamento" as ManutencaoStatus,
  });
  function submit() {
    if (!f.equipamento_id) return toast.error("Selecione um equipamento.");
    onSave({ ...f, data_fim: null });
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-[#213368]">Nova manutenção</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="space-y-3">
          <label className="block text-xs text-[#6E7280]">Equipamento
            <select className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={f.equipamento_id} onChange={e => setF({ ...f, equipamento_id: e.target.value })}>
              {db.equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </label>
          <label className="block text-xs text-[#6E7280]">Data início<input type="date" className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={f.data_inicio} onChange={e => setF({ ...f, data_inicio: e.target.value })} /></label>
          <label className="block text-xs text-[#6E7280]">Descrição<textarea rows={2} className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} /></label>
          <label className="block text-xs text-[#6E7280]">Custo estimado<input type="number" min={0} step="0.01" className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={f.custo} onChange={e => setF({ ...f, custo: Number(e.target.value) })} /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>
          <button onClick={submit} className="rounded-md bg-[#F37032] px-3 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">Salvar</button>
        </div>
      </div>
    </div>
  );
}

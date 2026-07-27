import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore } from "@/lib/portal/store";
import { money } from "@/lib/portal/format";
import { Plus, Search, X } from "lucide-react";
import type { Equipamento, EquipamentoStatus } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EquipamentosPage,
});

const STATUSES: EquipamentoStatus[] = ["disponivel", "alugado", "manutencao", "inativo"];

function EquipamentosPage() {
  const { db, addEquipamento, updateEquipamento, deleteEquipamento } = useStore();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [open, setOpen] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return db.equipamentos.filter(e => {
      if (q && !(e.nome.toLowerCase().includes(q) || e.codigo_patrimonio.toLowerCase().includes(q))) return false;
      if (cat && e.categoria_id !== cat) return false;
      if (st && e.status !== st) return false;
      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [db, busca, cat, st]);

  function novo() { setEditing(null); setOpen(true); }
  function editar(e: Equipamento) { setEditing(e); setOpen(true); }
  function excluir(e: Equipamento) {
    if (!confirm(`Excluir "${e.nome}"? Esta ação não pode ser desfeita.`)) return;
    try { deleteEquipamento(e.id); toast.success("Equipamento excluído."); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <PortalLayout title="Equipamentos">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou código…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={cat} onChange={e => setCat(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todas categorias</option>
          {db.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={st} onChange={e => setSt(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todos status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={novo} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo equipamento
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F4] text-left text-xs uppercase text-[#6E7280]">
            <tr>
              <th className="px-3 py-3">Foto</th><th className="px-3 py-3">Nome</th><th className="px-3 py-3">Código</th>
              <th className="px-3 py-3">Categoria</th><th className="px-3 py-3 text-right">Diária</th>
              <th className="px-3 py-3 text-right">Qtd</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6E7280]">Nenhum equipamento cadastrado.</td></tr>}
            {filtrados.map(e => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">
                  {e.foto_url ? <img src={e.foto_url} alt="" className="h-10 w-14 rounded object-cover" /> : <div className="h-10 w-14 rounded bg-[#F4F4F4]" />}
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link to="/portal/equipamentos/$id" params={{ id: e.id }} className="hover:underline">{e.nome}</Link>
                </td>
                <td className="px-3 py-2 text-[#6E7280]">{e.codigo_patrimonio}</td>
                <td className="px-3 py-2">{db.categorias.find(c => c.id === e.categoria_id)?.nome ?? "—"}</td>
                <td className="px-3 py-2 text-right">{money(e.valor_diaria)}</td>
                <td className="px-3 py-2 text-right">{e.quantidade_total}</td>
                <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => editar(e)} className="mr-2 text-xs font-medium text-[#213368] hover:underline">Editar</button>
                  <button onClick={() => excluir(e)} className="text-xs font-medium text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <EquipamentoForm initial={editing} onClose={() => setOpen(false)} onSave={(data) => {
        if (editing) { updateEquipamento(editing.id, data); toast.success("Equipamento atualizado."); }
        else { addEquipamento(data); toast.success("Equipamento cadastrado."); }
        setOpen(false);
      }} />}
    </PortalLayout>
  );
}

function EquipamentoForm({ initial, onClose, onSave }: { initial: Equipamento | null; onClose: () => void; onSave: (d: Omit<Equipamento, "id" | "created_at" | "updated_at">) => void }) {
  const { db } = useStore();
  const [f, setF] = useState({
    categoria_id: initial?.categoria_id ?? db.categorias[0]?.id ?? "",
    nome: initial?.nome ?? "",
    codigo_patrimonio: initial?.codigo_patrimonio ?? "",
    descricao: initial?.descricao ?? "",
    foto_url: initial?.foto_url ?? "",
    valor_diaria: initial?.valor_diaria ?? 0,
    valor_semanal: initial?.valor_semanal ?? 0,
    valor_mensal: initial?.valor_mensal ?? 0,
    quantidade_total: initial?.quantidade_total ?? 1,
    status: initial?.status ?? "disponivel" as EquipamentoStatus,
    observacoes: initial?.observacoes ?? "",
  });

  function upload(file: File) {
    const reader = new FileReader();
    reader.onload = () => setF(p => ({ ...p, foto_url: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!f.nome || !f.codigo_patrimonio) return toast.error("Nome e código são obrigatórios.");
    const dup = db.equipamentos.find(e => e.codigo_patrimonio === f.codigo_patrimonio && e.id !== initial?.id);
    if (dup) return toast.error("Código de patrimônio já existe.");
    onSave(f);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-[#213368]">{initial ? "Editar" : "Novo"} equipamento</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <F label="Nome"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></F>
          <F label="Código de patrimônio"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.codigo_patrimonio} onChange={e => setF({ ...f, codigo_patrimonio: e.target.value })} /></F>
          <F label="Categoria"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.categoria_id} onChange={e => setF({ ...f, categoria_id: e.target.value })}>
            {db.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></F>
          <F label="Status"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.status} onChange={e => setF({ ...f, status: e.target.value as EquipamentoStatus })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select></F>
          <F label="Valor diária"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_diaria} onChange={e => setF({ ...f, valor_diaria: Number(e.target.value) })} /></F>
          <F label="Valor semanal"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_semanal} onChange={e => setF({ ...f, valor_semanal: Number(e.target.value) })} /></F>
          <F label="Valor mensal"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_mensal} onChange={e => setF({ ...f, valor_mensal: Number(e.target.value) })} /></F>
          <F label="Quantidade total"><input type="number" min={1} className="w-full rounded-md border px-2 py-2 text-sm" value={f.quantidade_total} onChange={e => setF({ ...f, quantidade_total: Number(e.target.value) })} /></F>
          <F label="Foto" className="md:col-span-2">
            <div className="flex items-center gap-3">
              {f.foto_url && <img src={f.foto_url} alt="" className="h-16 w-24 rounded object-cover" />}
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm" />
            </div>
          </F>
          <F label="Descrição" className="md:col-span-2"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} /></F>
          <F label="Observações" className="md:col-span-2"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} /></F>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={submit} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

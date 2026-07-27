import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { ArrowDown, ArrowUp, Plus, Pencil, Trash2 } from "lucide-react";
import type { Categoria } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const { db, addCategoria, updateCategoria, deleteCategoria, reorderCategoria } = useStore();
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const lista = [...db.categorias].sort((a, b) => a.ordem - b.ordem);

  function submit() {
    if (!form.nome.trim()) return toast.error("Nome obrigatório.");
    if (editing) { updateCategoria(editing.id, { nome: form.nome, descricao: form.descricao }); toast.success("Categoria atualizada."); }
    else { addCategoria({ nome: form.nome, descricao: form.descricao, ordem: (lista.at(-1)?.ordem ?? 0) + 1, ativa: true }); toast.success("Categoria criada."); }
    setForm({ nome: "", descricao: "" }); setEditing(null);
  }
  function editar(c: Categoria) { setEditing(c); setForm({ nome: c.nome, descricao: c.descricao }); }
  function excluir(c: Categoria) {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try { deleteCategoria(c.id); toast.success("Excluída."); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <PortalLayout title="Categorias">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm md:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">{editing ? "Editar" : "Nova"} categoria</h3>
          <label className="mb-2 block text-xs text-[#6E7280]">Nome<input className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
          <label className="mb-3 block text-xs text-[#6E7280]">Descrição<textarea rows={2} className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></label>
          <div className="flex gap-2">
            <button onClick={submit} className="flex-1 rounded-md bg-[#F37032] px-3 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
              <Plus className="mr-1 inline h-4 w-4" />{editing ? "Salvar" : "Adicionar"}
            </button>
            {editing && <button onClick={() => { setEditing(null); setForm({ nome: "", descricao: "" }); }} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-2 shadow-sm md:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[#6E7280]"><tr><th className="px-3 py-3">Ordem</th><th>Nome</th><th>Ativa</th><th></th></tr></thead>
            <tbody>
              {lista.map((c, i) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <button disabled={i === 0} onClick={() => reorderCategoria(c.id, -1)} className="rounded p-1 hover:bg-[#F4F4F4] disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button disabled={i === lista.length - 1} onClick={() => reorderCategoria(c.id, 1)} className="rounded p-1 hover:bg-[#F4F4F4] disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.nome}</p>
                    {c.descricao && <p className="text-xs text-[#6E7280]">{c.descricao}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => updateCategoria(c.id, { ativa: !c.ativa })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${c.ativa ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>
                      {c.ativa ? "Ativa" : "Inativa"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => editar(c)} className="mr-2 rounded p-1 text-[#213368] hover:bg-[#F4F4F4]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => excluir(c)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}

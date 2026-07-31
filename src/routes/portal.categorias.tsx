import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore, uploadFoto } from "@/lib/portal/store";
import { compressImage } from "@/lib/portal/image";
import { ArrowDown, ArrowUp, Plus, Pencil, Trash2, Upload, X, Image as ImageIcon } from "lucide-react";
import type { Categoria } from "@/lib/portal/types";

const DESCRICAO_MAX = 200;

export const Route = createFileRoute("/portal/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CategoriasPage,
});

function CategoriasPage() {
  const { db, addCategoria, updateCategoria, deleteCategoria, reorderCategoria } = useStore();
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", foto_url: "" });
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  const lista = [...db.categorias].sort((a, b) => a.ordem - b.ordem);

  function submit() {
    if (!form.nome.trim()) return toast.error("Nome obrigatório.");
    if (editing) { updateCategoria(editing.id, { nome: form.nome, descricao: form.descricao, foto_url: form.foto_url }); toast.success("Categoria atualizada."); }
    else { addCategoria({ nome: form.nome, descricao: form.descricao, foto_url: form.foto_url, ordem: (lista.at(-1)?.ordem ?? 0) + 1, ativa: true }); toast.success("Categoria criada."); }
    setForm({ nome: "", descricao: "", foto_url: "" }); setEditing(null);
  }
  function editar(c: Categoria) { setEditing(c); setForm({ nome: c.nome, descricao: c.descricao, foto_url: c.foto_url ?? "" }); }
  function cancelar() { setEditing(null); setForm({ nome: "", descricao: "", foto_url: "" }); }
  async function excluir(c: Categoria) {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try { await deleteCategoria(c.id); toast.success("Excluída."); } catch (e: any) { toast.error(e.message); }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem.");
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const url = await uploadFoto(blob, "jpg", "categorias");
      setForm(f => ({ ...f, foto_url: url }));
      toast.success("Foto enviada.");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  return (
    <PortalLayout title="Categorias">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm md:col-span-1">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">{editing ? "Editar" : "Nova"} categoria</h3>
          <label className="mb-2 block text-xs text-[#6E7280]">Nome<input className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>

          <label className="mb-2 block text-xs text-[#6E7280]">
            Foto da categoria
            <div
              onDragOver={ev => { ev.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={ev => { ev.preventDefault(); setDrag(false); const file = ev.dataTransfer.files[0]; if (file) handleFile(file); }}
              className={`mt-1 flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-3 ${drag ? "border-[#F37032] bg-orange-50" : "border-gray-300"}`}
            >
              {form.foto_url ? (
                <div className="relative">
                  <img src={form.foto_url} alt="" className="h-24 w-36 rounded object-cover" />
                  <button type="button" onClick={() => setForm(f => ({ ...f, foto_url: "" }))}
                    className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow hover:bg-red-50" title="Remover foto">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-36 items-center justify-center rounded bg-[#F4F4F4] text-[#6E7280]">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#213368] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a2856]">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando…" : form.foto_url ? "Trocar foto" : "Selecionar ou arraste"}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            </div>
          </label>

          <label className="mb-3 block text-xs text-[#6E7280]">
            Descrição
            <textarea rows={3} maxLength={DESCRICAO_MAX} className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value.slice(0, DESCRICAO_MAX) })} />
            <span className="mt-0.5 block text-right text-[10px] text-[#6E7280]">{form.descricao.length}/{DESCRICAO_MAX}</span>
          </label>

          <div className="flex gap-2">
            <button onClick={submit} disabled={uploading} className="flex-1 rounded-md bg-[#F37032] px-3 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-50">
              <Plus className="mr-1 inline h-4 w-4" />{editing ? "Salvar" : "Adicionar"}
            </button>
            {editing && <button onClick={cancelar} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-2 shadow-sm md:col-span-2">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[#6E7280]"><tr><th className="px-3 py-3">Ordem</th><th>Categoria</th><th>Ativa</th><th></th></tr></thead>
            <tbody>
              {lista.map((c, i) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">
                    <button disabled={i === 0} onClick={() => reorderCategoria(c.id, -1)} className="rounded p-1 hover:bg-[#F4F4F4] disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button disabled={i === lista.length - 1} onClick={() => reorderCategoria(c.id, 1)} className="rounded p-1 hover:bg-[#F4F4F4] disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-[#F4F4F4]">
                        {c.foto_url ? <img src={c.foto_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-4 w-4 text-[#6E7280] opacity-40" /></div>}
                      </div>
                      <div>
                        <p className="font-medium">{c.nome}</p>
                        {c.descricao && <p className="line-clamp-1 text-xs text-[#6E7280]">{c.descricao}</p>}
                      </div>
                    </div>
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

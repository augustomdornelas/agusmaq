import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { maskCpfCnpj, maskPhone, onlyDigits, whatsappLink } from "@/lib/portal/format";
import { MessageCircle, Plus, Search, X } from "lucide-react";
import type { Cliente, ClienteTipo } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const { db, addCliente, updateCliente, deleteCliente } = useStore();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return db.clientes.filter(c => !q
      || c.nome_razao_social.toLowerCase().includes(q)
      || onlyDigits(c.cpf_cnpj).includes(onlyDigits(q))
      || onlyDigits(c.telefone_whatsapp).includes(onlyDigits(q))
    ).sort((a, b) => a.nome_razao_social.localeCompare(b.nome_razao_social));
  }, [db, busca]);

  async function excluir(c: Cliente) {
    if (!confirm(`Excluir "${c.nome_razao_social}"?`)) return;
    try { await deleteCliente(c.id); toast.success("Excluído."); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <PortalLayout title="Clientes">
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome, CPF/CNPJ ou telefone…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm" />
        </div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo cliente
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F4] text-left text-xs uppercase text-[#6E7280]">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">CPF/CNPJ</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Cidade</th><th></th></tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#6E7280]">Nenhum cliente cadastrado.</td></tr>}
            {lista.map(c => (
              <tr
                key={c.id}
                className="cursor-pointer border-t hover:bg-[#F9FAFB]"
                onClick={() => navigate({ to: "/portal/clientes/$id", params: { id: c.id } })}
              >
                <td className="px-4 py-3"><span className="font-medium hover:underline">{c.nome_razao_social}</span></td>
                <td className="px-4 py-3 text-[#6E7280]">{c.tipo === "pessoa_fisica" ? "PF" : "PJ"}</td>
                <td className="px-4 py-3">{c.cpf_cnpj}</td>
                <td className="px-4 py-3">{c.telefone_whatsapp}</td>
                <td className="px-4 py-3">{c.cidade}</td>
                <td className="px-4 py-3 text-right" onClick={ev => ev.stopPropagation()}>
                  {c.telefone_whatsapp && <a href={whatsappLink(c.telefone_whatsapp)} target="_blank" className="mr-2 inline-flex items-center gap-1 rounded bg-emerald-500 px-2 py-1 text-xs text-white hover:bg-emerald-600"><MessageCircle className="h-3 w-3" /></a>}
                  <button onClick={() => { setEditing(c); setOpen(true); }} className="mr-2 text-xs font-medium text-[#213368] hover:underline">Editar</button>
                  <button onClick={() => excluir(c)} className="text-xs font-medium text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <ClienteForm initial={editing} onClose={() => setOpen(false)} onSave={(data) => {
        if (editing) { updateCliente(editing.id, data); toast.success("Cliente atualizado."); }
        else { addCliente(data); toast.success("Cliente cadastrado."); }
        setOpen(false);
      }} />}
    </PortalLayout>
  );
}

function ClienteForm({ initial, onClose, onSave }: { initial: Cliente | null; onClose: () => void; onSave: (d: Omit<Cliente, "id" | "created_at" | "updated_at">) => void }) {
  const [f, setF] = useState({
    tipo: initial?.tipo ?? "pessoa_fisica" as ClienteTipo,
    nome_razao_social: initial?.nome_razao_social ?? "",
    cpf_cnpj: initial?.cpf_cnpj ?? "",
    telefone_whatsapp: initial?.telefone_whatsapp ?? "",
    email: initial?.email ?? "",
    endereco: initial?.endereco ?? "",
    cidade: initial?.cidade ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  function submit() {
    if (!f.nome_razao_social.trim()) return toast.error("Nome/Razão social é obrigatório.");
    onSave(f);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-[#213368]">{initial ? "Editar" : "Novo"} cliente</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <F label="Tipo"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value as ClienteTipo })}>
            <option value="pessoa_fisica">Pessoa Física</option><option value="pessoa_juridica">Pessoa Jurídica</option>
          </select></F>
          <F label="Nome / Razão social"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.nome_razao_social} onChange={e => setF({ ...f, nome_razao_social: e.target.value })} /></F>
          <F label="CPF/CNPJ"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.cpf_cnpj} onChange={e => setF({ ...f, cpf_cnpj: maskCpfCnpj(e.target.value) })} /></F>
          <F label="Telefone / WhatsApp"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.telefone_whatsapp} onChange={e => setF({ ...f, telefone_whatsapp: maskPhone(e.target.value) })} /></F>
          <F label="E-mail"><input type="email" className="w-full rounded-md border px-2 py-2 text-sm" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></F>
          <F label="Cidade"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.cidade} onChange={e => setF({ ...f, cidade: e.target.value })} /></F>
          <F label="Endereço" className="md:col-span-2"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.endereco} onChange={e => setF({ ...f, endereco: e.target.value })} /></F>
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

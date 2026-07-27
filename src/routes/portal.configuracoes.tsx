import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/portal/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const { db, updateEmpresa, addUsuario, toggleUsuario } = useStore();
  const [emp, setEmp] = useState(db.empresa);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoNome, setNovoNome] = useState("");

  function salvar() { updateEmpresa(emp); toast.success("Dados atualizados."); }
  function convidar() {
    if (!novoEmail.trim() || !novoNome.trim()) return toast.error("Nome e e-mail obrigatórios.");
    addUsuario({ email: novoEmail.trim(), nome: novoNome.trim() });
    toast.success("Usuário convidado. (Em produção, será enviado e-mail de acesso pelo Supabase.)");
    setNovoEmail(""); setNovoNome("");
  }

  return (
    <PortalLayout title="Configurações">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">Dados da empresa</h3>
          <div className="space-y-3">
            <F label="Nome"><input className="w-full rounded-md border px-2 py-2 text-sm" value={emp.nome} onChange={e => setEmp({ ...emp, nome: e.target.value })} /></F>
            <F label="Telefone"><input className="w-full rounded-md border px-2 py-2 text-sm" value={emp.telefone} onChange={e => setEmp({ ...emp, telefone: e.target.value })} /></F>
            <F label="E-mail"><input type="email" className="w-full rounded-md border px-2 py-2 text-sm" value={emp.email} onChange={e => setEmp({ ...emp, email: e.target.value })} /></F>
            <F label="Endereço"><input className="w-full rounded-md border px-2 py-2 text-sm" value={emp.endereco} onChange={e => setEmp({ ...emp, endereco: e.target.value })} /></F>
            <button onClick={salvar} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">Salvar</button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">Usuários do portal</h3>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input placeholder="Nome" value={novoNome} onChange={e => setNovoNome(e.target.value)} className="rounded-md border px-2 py-2 text-sm sm:col-span-1" />
            <input placeholder="email@empresa.com" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="rounded-md border px-2 py-2 text-sm sm:col-span-1" />
            <button onClick={convidar} className="inline-flex items-center justify-center gap-1 rounded-md bg-[#213368] px-3 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Convidar
            </button>
          </div>
          <ul className="divide-y">
            {db.usuarios.map(u => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{u.nome}</p>
                  <p className="text-xs text-[#6E7280]">{u.email}</p>
                </div>
                <button onClick={() => toggleUsuario(u.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${u.ativo ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>
                  {u.ativo ? "Ativo" : "Desativado"}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-md bg-[#F4F4F4] p-3 text-xs text-[#6E7280]">
            Depois de conectar o Supabase, o convite disparará um e-mail com link mágico e o cadastro real acontece no Auth.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

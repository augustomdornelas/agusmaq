import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore, uploadFoto } from "@/lib/portal/store";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/portal/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const { db, saveConfigEmpresa, toggleUsuario } = useStore();
  const [c, setC] = useState(db.configEmpresa);
  const [uploading, setUploading] = useState(false);

  async function salvar() {
    try { await saveConfigEmpresa(c); toast.success("Configurações salvas."); }
    catch (e: any) { toast.error(e.message); }
  }
  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const url = await uploadFoto(file, file.name.split(".").pop() || "png");
      setC(p => ({ ...p, logo_url: url }));
      toast.success("Logo enviada — clique em Salvar para persistir.");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  return (
    <PortalLayout title="Configurações">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">Dados da empresa (para termos e comprovantes)</h3>
          <div className="space-y-3">
            <F label="Nome da empresa"><input className="w-full rounded-md border px-2 py-2 text-sm" value={c.nome_empresa} onChange={e => setC({ ...c, nome_empresa: e.target.value })} /></F>
            <F label="CNPJ"><input className="w-full rounded-md border px-2 py-2 text-sm" value={c.cnpj} onChange={e => setC({ ...c, cnpj: e.target.value })} /></F>
            <F label="Endereço"><input className="w-full rounded-md border px-2 py-2 text-sm" value={c.endereco} onChange={e => setC({ ...c, endereco: e.target.value })} /></F>
            <F label="Cidade"><input className="w-full rounded-md border px-2 py-2 text-sm" value={c.cidade} onChange={e => setC({ ...c, cidade: e.target.value })} /></F>
            <F label="Telefone"><input className="w-full rounded-md border px-2 py-2 text-sm" value={c.telefone} onChange={e => setC({ ...c, telefone: e.target.value })} /></F>
            <F label="E-mail"><input type="email" className="w-full rounded-md border px-2 py-2 text-sm" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} /></F>
            <F label="Logo">
              <div className="flex items-center gap-3">
                {c.logo_url && <img src={c.logo_url} alt="Logo" className="h-16 w-16 rounded object-contain bg-[#F4F4F4]" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#213368] px-3 py-2 text-xs font-semibold text-white">
                  <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Enviar logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </label>
              </div>
            </F>
            <F label="Texto do termo (use [numero], [nome_empresa], [cnpj], [endereco_empresa], [nome_cliente], [cpf_cnpj], [endereco_cliente], [cidade_cliente], [data_inicio], [data_fim], [regime], [valor_total])">
              <textarea rows={8} className="w-full rounded-md border px-2 py-2 text-sm font-mono" value={c.texto_condicoes_termo} onChange={e => setC({ ...c, texto_condicoes_termo: e.target.value })} placeholder="Deixe em branco para usar o texto padrão." />
            </F>
            <button onClick={salvar} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">Salvar configurações</button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">Administradores do portal</h3>
          <ul className="divide-y">
            {db.usuarios.map(u => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <div><p className="font-medium">{u.nome || u.email}</p><p className="text-xs text-[#6E7280]">{u.email}</p></div>
                <button onClick={async () => { try { await toggleUsuario(u.id); toast.success("Atualizado."); } catch (e: any) { toast.error(e.message); } }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${u.ativo ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>
                  {u.ativo ? "Admin" : "Sem papel"}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-md bg-[#F4F4F4] p-3 text-xs text-[#6E7280]">
            Para criar um novo usuário, use o painel do Supabase (Authentication → Add user) e depois marque como Admin acima.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

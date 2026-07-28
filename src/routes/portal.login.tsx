import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/portal/store";
import logo from "@/assets/agusmaq-logo-principal.png";

export const Route = createFileRoute("/portal/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Portal Agusmaq" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo!");
      window.location.replace("/portal/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#213368] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex justify-center">
            <img src={logo} alt="Agusmaq" className="h-14" />
          </div>
          <h1 className="mb-1 text-center text-xl font-bold text-[#213368]">Portal Administrativo</h1>
          <p className="mb-6 text-center text-sm text-[#6E7280]">Acesso restrito a administradores</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">E-mail</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-[#e6e7ea] px-3 py-2.5 text-sm outline-none focus:border-[#213368] focus:ring-2 focus:ring-[#213368]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">Senha</label>
              <input
                type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-[#e6e7ea] px-3 py-2.5 text-sm outline-none focus:border-[#213368] focus:ring-2 focus:ring-[#213368]/20"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full rounded-md bg-[#F37032] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#db5f22] disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 rounded-md bg-[#F4F4F4] p-3 text-center text-xs text-[#6E7280]">
            Acesso restrito. Solicite credenciais ao administrador.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-white/70">© Agusmaq Locações e Equipamentos</p>
      </div>
    </div>
  );
}

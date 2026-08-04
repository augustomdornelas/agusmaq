import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, FileText, Wrench, FolderTree, Users, Hammer, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import logoNegativo from "@/assets/agusmaq-logo-negativo.png";
import { signOutUser } from "@/lib/portal/store";
import { cn } from "@/lib/utils";

const items = [
  { to: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/portal/alugueis", label: "Aluguéis", icon: ClipboardList },
  { to: "/portal/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/portal/equipamentos", label: "Equipamentos", icon: Wrench },
  { to: "/portal/categorias", label: "Categorias", icon: FolderTree },
  { to: "/portal/clientes", label: "Clientes", icon: Users },
  { to: "/portal/manutencoes", label: "Manutenções", icon: Hammer },
  { to: "/portal/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/portal/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function PortalLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });

  const logout = async () => {
    await signOutUser();
    navigate({ to: "/portal/login" });
  };

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 space-y-1 px-3">
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            onClick={onClick}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            {active && <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-[#F37032]" />}
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F4F4]">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[#213368] text-white print:hidden">
        <div className="flex h-20 items-center justify-center border-b border-white/10 px-4">
          <img src={logoNegativo} alt="Agusmaq" className="h-9" />
        </div>
        <div className="flex flex-1 flex-col py-4">
          <NavList />
          <div className="border-t border-white/10 px-3 pt-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar mobile (drawer) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-[#213368] text-white">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <img src={logoNegativo} alt="Agusmaq" className="h-8" />
              <button onClick={() => setOpen(false)} className="p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-1 flex-col py-4">
              <NavList onClick={() => setOpen(false)} />
              <div className="border-t border-white/10 px-3 pt-3">
                <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 md:px-6 print:hidden">
          <button className="md:hidden p-2" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <h1 className="text-base font-semibold text-[#213368]">{title ?? "Portal Agusmaq"}</h1>
        </header>
        <main className="flex-1 p-4 md:p-6 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}

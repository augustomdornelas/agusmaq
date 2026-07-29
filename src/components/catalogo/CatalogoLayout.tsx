import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoPrincipal from "@/assets/agusmaq-logo-principal.png";
import logoNegativo from "@/assets/agusmaq-logo-negativo.png";
import { whatsappLink } from "@/lib/portal/format";

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A11 11 0 0 0 3.4 17.2L2 22l4.9-1.4A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20zm4.5-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4 0-.4.2-.6l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2.9 2.9 0 0 0-.9 2.1c0 1.3.9 2.5 1 2.7 1.3 2 3 3 4.3 3.5 1.4.4 2 .3 2.7.2.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}

export function CatalogoLayout({ children, telefone }: { children: ReactNode; telefone?: string | null }) {
  const waHref = telefone ? whatsappLink(telefone, "Olá! Gostaria de solicitar um orçamento de locação de equipamentos.") : null;

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <header className="sticky top-0 z-30 border-b border-[#eef0f4] bg-white/95 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <Link to="/catalogo" className="flex shrink-0 items-center" aria-label="Catálogo Agusmaq">
            <img src={logoPrincipal} alt="Agusmaq — Locações e Equipamentos" className="h-9 w-auto" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-[#213368] hover:text-[#f37032]">← Voltar ao site</Link>
        </div>
      </header>

      <main>{children}</main>

      {waHref && (
        <div className="border-t border-[#eef0f4] bg-[#f4f4f4] py-10">
          <div className="container-x flex justify-center">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-md bg-[#f37032] px-8 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#db5f22]"
            >
              <WhatsAppIcon />
              SOLICITAR ORÇAMENTO DE LOCAÇÃO
            </a>
          </div>
        </div>
      )}

      <footer className="bg-[#1a2957] py-6 text-center text-xs text-white/60">
        <img src={logoNegativo} alt="Agusmaq" className="mx-auto mb-3 h-7 w-auto opacity-90" />
        © {new Date().getFullYear()} Agusmaq Locações e Equipamentos · Agudos, SP
      </footer>
    </div>
  );
}

export { WhatsAppIcon };

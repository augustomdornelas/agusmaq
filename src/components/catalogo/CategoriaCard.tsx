import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { slugify } from "@/lib/portal/slug";

export interface CategoriaCardData {
  id: string;
  nome: string;
  descricao: string;
  foto_url: string;
}

export function CategoriaCard({ categoria, count }: { categoria: CategoriaCardData; count: number }) {
  const slug = slugify(categoria.nome);
  const hasDescricao = Boolean(categoria.descricao?.trim());
  const contagem = `${count} equipamento${count !== 1 ? "s" : ""}`;

  const Frente = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
        {categoria.foto_url ? (
          <img src={categoria.foto_url} alt={categoria.nome} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#213368] p-4 text-center">
            <span className="text-lg font-extrabold leading-tight text-white">{categoria.nome}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold text-[#213368]">{categoria.nome}</h3>
        <p className="mt-1 text-xs text-[#6e7280]">{contagem}</p>
        {hasDescricao && (
          <p className="touch-only-desc mt-2 line-clamp-2 text-sm text-[#6e7280]">{categoria.descricao}</p>
        )}
      </div>
    </>
  );

  if (!hasDescricao) {
    return (
      <Link
        to="/catalogo/categoria/$slug"
        params={{ slug }}
        className="group flex h-[380px] flex-col overflow-hidden rounded-xl border border-[#eef0f4] bg-white transition hover:-translate-y-1 hover:border-[#f37032] hover:shadow-lg"
      >
        {Frente}
      </Link>
    );
  }

  return (
    <div className="flip-card has-flip h-[380px]">
      <div className="flip-card-inner">
        <Link
          to="/catalogo/categoria/$slug"
          params={{ slug }}
          className="flip-card-front group flex flex-col overflow-hidden rounded-xl border border-[#eef0f4] bg-white"
        >
          {Frente}
        </Link>
        <div className="flip-card-back flex flex-col overflow-hidden rounded-xl border border-[#213368] bg-[#213368] p-6 text-white">
          <h3 className="text-base font-bold">{categoria.nome}</h3>
          <p className="mt-3 line-clamp-6 flex-1 text-sm leading-relaxed text-white/80">{categoria.descricao}</p>
          <Link
            to="/catalogo/categoria/$slug"
            params={{ slug }}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-[#f37032] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#db5f22]"
          >
            Ver equipamentos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}


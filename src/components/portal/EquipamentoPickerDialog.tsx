import { useMemo, useState } from "react";
import { Search, X, Image as ImageIcon, Check } from "lucide-react";
import { money, normalizeSearch } from "@/lib/portal/format";
import type { Categoria, Equipamento } from "@/lib/portal/types";

export function EquipamentoPickerDialog({
  equipamentos, categorias, jaAdicionados, onClose, onAdd,
}: {
  equipamentos: Equipamento[];
  categorias: Categoria[];
  jaAdicionados: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("todas");
  const [sel, setSel] = useState<Set<string>>(new Set());

  const nomeCategoria = (id: string) => categorias.find(c => c.id === id)?.nome ?? "";

  const results = useMemo(() => {
    const nq = normalizeSearch(q);
    return equipamentos
      .filter(e => e.status !== "inativo")
      .filter(e => catF === "todas" || e.categoria_id === catF)
      .filter(e => {
        if (!nq) return true;
        const codes = (e.codigos_patrimonio && e.codigos_patrimonio.length) ? e.codigos_patrimonio : (e.codigo_patrimonio ? [e.codigo_patrimonio] : []);
        return normalizeSearch(e.nome).includes(nq)
          || codes.some(c => normalizeSearch(c).includes(nq))
          || normalizeSearch(nomeCategoria(e.categoria_id)).includes(nq);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [equipamentos, q, catF, categorias]);

  function toggle(id: string) {
    setSel(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function confirmar() {
    if (sel.size === 0) return;
    onAdd(Array.from(sel));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold text-[#213368]">Adicionar equipamentos</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, código ou categoria…"
              className="w-full rounded-md border pl-9 pr-3 py-2 text-sm" autoFocus />
          </div>
          <select value={catF} onChange={e => setCatF(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
            <option value="todas">Todas as categorias</option>
            {[...categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6E7280]">Nenhum equipamento encontrado.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(e => {
                const added = jaAdicionados.includes(e.id);
                const checked = sel.has(e.id);
                const codes = (e.codigos_patrimonio && e.codigos_patrimonio.length) ? e.codigos_patrimonio : (e.codigo_patrimonio ? [e.codigo_patrimonio] : []);
                return (
                  <button
                    key={e.id}
                    type="button"
                    disabled={added}
                    onClick={() => toggle(e.id)}
                    className={`relative overflow-hidden rounded-lg border text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-[#F37032] ring-2 ring-[#F37032]/40" : "border-gray-200 hover:border-[#F37032]"}`}
                  >
                    <div className="relative aspect-[4/3] bg-[#F4F4F4]">
                      {e.foto_url ? (
                        <img src={e.foto_url} alt={e.nome} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#6E7280]">
                          <ImageIcon className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      {(checked || added) && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#F37032] text-white">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F37032]">{nomeCategoria(e.categoria_id)}</p>
                      <p className="line-clamp-1 text-sm font-bold text-[#213368]">{e.nome}</p>
                      <p className="mt-0.5 font-mono text-xs text-[#6E7280]">{codes[0] ?? "—"}</p>
                      <p className="mt-1 text-sm font-semibold text-[#F37032]">{money(e.valor_diaria)}<span className="text-[10px] font-normal text-[#6E7280]">/dia</span></p>
                      {added && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Já adicionado</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-sm text-[#6E7280]">{sel.size} selecionado{sel.size !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={confirmar} disabled={sel.size === 0} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-50">
              Adicionar {sel.size > 0 ? `(${sel.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

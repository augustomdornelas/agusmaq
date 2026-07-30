import { useMemo, useState } from "react";
import { Search, X, Image as ImageIcon, Check } from "lucide-react";
import { money, normalizeSearch, codigosEquipamento } from "@/lib/portal/format";
import type { Categoria, Equipamento } from "@/lib/portal/types";

export interface EquipamentoSelecao {
  equipamentoId: string;
  codigos: string[];
}

export function EquipamentoPickerDialog({
  equipamentos, categorias, jaAdicionados, onClose, onAdd,
}: {
  equipamentos: Equipamento[];
  categorias: Categoria[];
  jaAdicionados: string[];
  onClose: () => void;
  onAdd: (selecoes: EquipamentoSelecao[]) => void;
}) {
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("todas");
  const [sel, setSel] = useState<Map<string, Set<string>>>(new Map());

  const nomeCategoria = (id: string) => categorias.find(c => c.id === id)?.nome ?? "";

  const results = useMemo(() => {
    const nq = normalizeSearch(q);
    return equipamentos
      .filter(e => e.status !== "inativo")
      .filter(e => catF === "todas" || e.categoria_id === catF)
      .filter(e => {
        if (!nq) return true;
        const codes = codigosEquipamento(e);
        return normalizeSearch(e.nome).includes(nq)
          || codes.some(c => normalizeSearch(c).includes(nq))
          || normalizeSearch(nomeCategoria(e.categoria_id)).includes(nq);
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [equipamentos, q, catF, categorias]);

  const totalUnidades = useMemo(
    () => Array.from(sel.values()).reduce((s, codes) => s + Math.max(1, codes.size), 0),
    [sel],
  );

  function toggleCard(equipId: string, codes: string[]) {
    setSel(prev => {
      const next = new Map(prev);
      if (next.has(equipId)) {
        next.delete(equipId);
      } else {
        next.set(equipId, new Set(codes.length === 1 ? [codes[0]] : []));
      }
      return next;
    });
  }

  function toggleCodigo(equipId: string, codigo: string) {
    setSel(prev => {
      const next = new Map(prev);
      const cur = new Set(next.get(equipId) ?? []);
      cur.has(codigo) ? cur.delete(codigo) : cur.add(codigo);
      next.set(equipId, cur);
      return next;
    });
  }

  function confirmar() {
    if (sel.size === 0) return;
    onAdd(Array.from(sel.entries()).map(([equipamentoId, codes]) => ({ equipamentoId, codigos: Array.from(codes) })));
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
                const codes = codigosEquipamento(e);
                const multi = codes.length > 1;
                const codigosSel = sel.get(e.id);
                const checked = sel.has(e.id);
                return (
                  <div
                    key={e.id}
                    onClick={() => !added && toggleCard(e.id, codes)}
                    className={`relative overflow-hidden rounded-lg border text-left transition ${added ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${checked ? "border-[#F37032] ring-2 ring-[#F37032]/40" : "border-gray-200 hover:border-[#F37032]"}`}
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
                      {multi ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {codes.map(c => {
                            const on = codigosSel?.has(c) ?? false;
                            return (
                              <button
                                key={c}
                                type="button"
                                disabled={added}
                                onClick={ev => { ev.stopPropagation(); toggleCodigo(e.id, c); }}
                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold transition disabled:cursor-not-allowed ${on ? "bg-[#F37032] text-white" : "bg-[#213368]/10 text-[#213368] hover:bg-[#213368]/20"}`}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-0.5 font-mono text-xs text-[#6E7280]">{codes[0] ?? "—"}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-[#F37032]">{money(e.valor_diaria)}<span className="text-[10px] font-normal text-[#6E7280]">/dia</span></p>
                      {added && <p className="mt-1 text-[10px] font-semibold text-emerald-700">Já adicionado</p>}
                      {!added && multi && checked && (codigosSel?.size ?? 0) === 0 && (
                        <p className="mt-1 text-[10px] text-[#6E7280]">Nenhum código marcado — conta como 1 unidade.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-sm text-[#6E7280]">{totalUnidades} unidade{totalUnidades !== 1 ? "s" : ""} selecionada{totalUnidades !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={confirmar} disabled={sel.size === 0} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-50">
              Adicionar {totalUnidades > 0 ? `(${totalUnidades})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, uploadFoto } from "@/lib/portal/store";
import { money, dateBR } from "@/lib/portal/format";
import { Plus, Search, X, ChevronDown, ChevronRight, Image as ImageIcon, Upload } from "lucide-react";
import type { Equipamento, EquipamentoStatus } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/equipamentos")({
  head: () => ({ meta: [{ title: "Equipamentos — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EquipamentosPage,
});

const STATUSES: EquipamentoStatus[] = ["disponivel", "alugado", "manutencao", "inativo"];

async function compressImage(file: File, maxSize = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("fail")), "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = URL.createObjectURL(file);
  });
}

function EquipamentosPage() {
  const { db, addEquipamento, updateEquipamento, deleteEquipamento } = useStore();
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const q = busca.trim().toLowerCase();
  function codesOf(e: Equipamento): string[] {
    const arr = e.codigos_patrimonio && e.codigos_patrimonio.length ? e.codigos_patrimonio : (e.codigo_patrimonio ? [e.codigo_patrimonio] : []);
    return arr;
  }
  const filtered = useMemo(() => db.equipamentos.filter(e =>
    !q || e.nome.toLowerCase().includes(q) || codesOf(e).some(c => c.toLowerCase().includes(q))
  ), [db.equipamentos, q]);

  const grupos = useMemo(() => {
    const cats = [...db.categorias].sort((a, b) => a.ordem - b.ordem);
    return cats.map(c => ({
      cat: c,
      items: filtered.filter(e => e.categoria_id === c.id).sort((a, b) => a.nome.localeCompare(b.nome)),
    })).filter(g => g.items.length > 0 || !q);
  }, [db.categorias, filtered, q]);

  const openGroups = q ? new Set(grupos.filter(g => g.items.length > 0).map(g => g.cat.id)) : expanded;

  function toggle(id: string) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function highlight(text: string): React.ReactNode {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return text;
    return <>{text.slice(0, i)}<mark className="bg-yellow-200">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
  }

  async function excluir(e: Equipamento) {
    if (!confirm(`Excluir "${e.nome}"? Esta ação não pode ser desfeita.`)) return;
    try { await deleteEquipamento(e.id); toast.success("Equipamento excluído."); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <PortalLayout title="Equipamentos">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou código…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm" />
        </div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo equipamento
        </button>
      </div>

      <div className="space-y-3">
        {grupos.length === 0 && <p className="rounded-lg bg-white p-8 text-center text-sm text-[#6E7280]">Nenhum equipamento encontrado.</p>}
        {grupos.map(({ cat, items }) => {
          const disp = items.filter(e => e.status === "disponivel").length;
          const alug = items.filter(e => e.status === "alugado").length;
          const isOpen = openGroups.has(cat.id);
          return (
            <div key={cat.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
              <button onClick={() => toggle(cat.id)} className="flex w-full items-center justify-between gap-2 border-b px-4 py-3 text-left hover:bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-[#213368]" /> : <ChevronRight className="h-4 w-4 text-[#213368]" />}
                  <h3 className="text-sm font-semibold text-[#213368]">{cat.nome}</h3>
                  <span className="text-xs text-[#6E7280]">({items.length})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">{disp} disponíveis</span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-800">{alug} alugados</span>
                </div>
              </button>
              {isOpen && (
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map(e => {
                    const codes = codesOf(e);
                    const first = codes[0] || "—";
                    const extra = Math.max(0, codes.length - 1);
                    return (
                    <Link
                      key={e.id}
                      to="/portal/equipamentos/$id"
                      params={{ id: e.id }}
                      className="group block overflow-hidden rounded-lg border bg-white transition hover:shadow-md hover:border-[#F37032]"
                    >
                      <div className="relative aspect-[4/3] bg-[#F4F4F4]">
                        {e.foto_url ? (
                          <img src={e.foto_url} alt={e.nome} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#6E7280]">
                            <ImageIcon className="h-10 w-10 opacity-40" />
                          </div>
                        )}
                        <div className="absolute right-2 top-2"><StatusBadge status={e.status} /></div>
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-1 text-sm font-semibold text-[#213368]">{highlight(e.nome)}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6E7280]">
                          <span className="font-mono">{highlight(first)}</span>
                          {extra > 0 && <span className="rounded-full bg-[#213368]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#213368]">+{extra}</span>}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                          <div className="rounded bg-[#F4F4F4] p-1 text-center"><span className="block text-[#6E7280]">Dia</span><span className="font-semibold">{money(e.valor_diaria)}</span></div>
                          <div className="rounded bg-[#F4F4F4] p-1 text-center"><span className="block text-[#6E7280]">Sem</span><span className="font-semibold">{money(e.valor_semanal)}</span></div>
                          <div className="rounded bg-[#F4F4F4] p-1 text-center"><span className="block text-[#6E7280]">Mês</span><span className="font-semibold">{money(e.valor_mensal)}</span></div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-[#6E7280]">{codes.length} código{codes.length !== 1 ? "s" : ""} / qtd {e.quantidade_total}</span>
                          <div>
                            <button onClick={ev => { ev.preventDefault(); ev.stopPropagation(); setEditing(e); setOpen(true); }} className="mr-2 font-medium text-[#213368] hover:underline">Editar</button>
                            <button onClick={ev => { ev.preventDefault(); ev.stopPropagation(); excluir(e); }} className="font-medium text-red-600 hover:underline">Excluir</button>
                          </div>
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && <EquipamentoForm initial={editing} onClose={() => setOpen(false)} onSave={async (data) => {
        try {
          if (editing) { await updateEquipamento(editing.id, data); toast.success("Equipamento atualizado."); }
          else { await addEquipamento(data); toast.success("Equipamento cadastrado."); }
          setOpen(false);
        } catch (err: any) { toast.error(err.message); }
      }} />}
    </PortalLayout>
  );
}

function EquipamentoForm({ initial, onClose, onSave }: { initial: Equipamento | null; onClose: () => void; onSave: (d: Omit<Equipamento, "id" | "created_at" | "updated_at">) => void | Promise<void> }) {
  const { db } = useStore();
  const initialCodes = (initial?.codigos_patrimonio && initial.codigos_patrimonio.length)
    ? [...initial.codigos_patrimonio]
    : (initial?.codigo_patrimonio ? [initial.codigo_patrimonio] : []);
  const [f, setF] = useState({
    categoria_id: initial?.categoria_id ?? db.categorias[0]?.id ?? "",
    nome: initial?.nome ?? "",
    codigos_patrimonio: initialCodes,
    descricao: initial?.descricao ?? "",
    foto_url: initial?.foto_url ?? "",
    valor_diaria: initial?.valor_diaria ?? 0,
    valor_semanal: initial?.valor_semanal ?? 0,
    valor_mensal: initial?.valor_mensal ?? 0,
    valor_compra: initial?.valor_compra ?? 0,
    data_compra: initial?.data_compra ?? "",
    quantidade_total: initial?.quantidade_total ?? Math.max(1, initialCodes.length),
    status: initial?.status ?? "disponivel" as EquipamentoStatus,
    observacoes: initial?.observacoes ?? "",
  });
  const [chipInput, setChipInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  function addChip(v: string) {
    const val = v.trim();
    if (!val) return;
    if (f.codigos_patrimonio.includes(val)) { setChipInput(""); return; }
    const next = [...f.codigos_patrimonio, val];
    setF(p => ({ ...p, codigos_patrimonio: next, quantidade_total: Math.max(p.quantidade_total, next.length) }));
    setChipInput("");
  }
  function removeChip(v: string) {
    setF(p => ({ ...p, codigos_patrimonio: p.codigos_patrimonio.filter(c => c !== v) }));
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem.");
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const url = await uploadFoto(blob, "jpg");
      setF(p => ({ ...p, foto_url: url }));
      toast.success("Foto enviada.");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function submit() {
    let codes = f.codigos_patrimonio;
    if (chipInput.trim()) codes = [...codes, chipInput.trim()];
    if (!f.nome || codes.length === 0) return toast.error("Informe o nome e pelo menos um código.");
    const dup = db.equipamentos.find(e => e.id !== initial?.id && (
      codes.some(c => (e.codigos_patrimonio ?? []).includes(c) || e.codigo_patrimonio === c)
    ));
    if (dup) return toast.error(`Código já existe no equipamento "${dup.nome}".`);
    await onSave({
      ...f,
      codigos_patrimonio: codes,
      codigo_patrimonio: codes[0],
      quantidade_total: Math.max(f.quantidade_total, codes.length),
      data_compra: f.data_compra || null,
    } as any);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-[#213368]">{initial ? "Editar" : "Novo"} equipamento</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <F label="Nome"><input className="w-full rounded-md border px-2 py-2 text-sm" value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></F>
          <F label={`Códigos de patrimônio (${f.codigos_patrimonio.length} código${f.codigos_patrimonio.length !== 1 ? "s" : ""} / quantidade ${f.quantidade_total})`}>
            <div className="flex min-h-[42px] flex-wrap items-center gap-1 rounded-md border bg-white p-1.5">
              {f.codigos_patrimonio.map(c => (
                <span key={c} className="inline-flex items-center gap-1 rounded bg-[#213368]/10 px-2 py-0.5 font-mono text-xs text-[#213368]">
                  {c}
                  <button type="button" onClick={() => removeChip(c)} className="text-[#213368] hover:text-red-600"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input
                className="min-w-[80px] flex-1 border-0 px-1 text-sm outline-none"
                placeholder={f.codigos_patrimonio.length ? "Adicionar…" : "Ex.: GRD 156 e Enter"}
                value={chipInput}
                onChange={e => setChipInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addChip(chipInput); }
                  else if (e.key === "Backspace" && !chipInput && f.codigos_patrimonio.length) {
                    removeChip(f.codigos_patrimonio[f.codigos_patrimonio.length - 1]);
                  }
                }}
                onBlur={() => chipInput && addChip(chipInput)}
              />
            </div>
          </F>
          <F label="Categoria"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.categoria_id} onChange={e => setF({ ...f, categoria_id: e.target.value })}>
            {db.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></F>
          <F label="Status"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.status} onChange={e => setF({ ...f, status: e.target.value as EquipamentoStatus })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select></F>
          <F label="Valor diária"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_diaria} onChange={e => setF({ ...f, valor_diaria: Number(e.target.value) })} /></F>
          <F label="Valor semanal"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_semanal} onChange={e => setF({ ...f, valor_semanal: Number(e.target.value) })} /></F>
          <F label="Valor mensal"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_mensal} onChange={e => setF({ ...f, valor_mensal: Number(e.target.value) })} /></F>
          <F label="Quantidade total"><input type="number" min={1} className="w-full rounded-md border px-2 py-2 text-sm" value={f.quantidade_total} onChange={e => setF({ ...f, quantidade_total: Number(e.target.value) })} /></F>
          <F label="Valor de compra (R$)"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={f.valor_compra} onChange={e => setF({ ...f, valor_compra: Number(e.target.value) })} /></F>
          <F label="Data de compra"><input type="date" className="w-full rounded-md border px-2 py-2 text-sm" value={f.data_compra} onChange={e => setF({ ...f, data_compra: e.target.value })} /></F>
          <F label="Foto" className="md:col-span-2">
            <div
              onDragOver={ev => { ev.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={ev => { ev.preventDefault(); setDrag(false); const file = ev.dataTransfer.files[0]; if (file) handleFile(file); }}
              className={`flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-4 ${drag ? "border-[#F37032] bg-orange-50" : "border-gray-300"}`}>
              {f.foto_url && <img src={f.foto_url} alt="" className="h-32 w-48 rounded object-cover" />}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#213368] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a2856]">
                <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Selecionar ou arraste uma imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              <p className="text-[10px] text-[#6E7280]">Imagem será comprimida para 1200px de largura antes do envio.</p>
            </div>
          </F>
          <F label="Descrição" className="md:col-span-2"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={f.descricao} onChange={e => setF({ ...f, descricao: e.target.value })} /></F>
          <F label="Observações" className="md:col-span-2"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} /></F>
        </div>
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-white px-5 py-3">
          <span className="text-xs text-[#6E7280]">{f.data_compra && `Comprado em ${dateBR(f.data_compra)}`}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={submit} disabled={uploading} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-50">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { money, todayISO, addDays, maskCpfCnpj, maskPhone } from "@/lib/portal/format";
import { computeItemTotal } from "@/lib/portal/orcamentoCalc";
import type { Cliente, TipoCobranca } from "@/lib/portal/types";
import { ArrowLeft, ArrowRight, Check, Plus, Search, Trash2, X, UserPlus } from "lucide-react";

interface Search { clienteId?: string; equipId?: string; orcamentoId?: string }

export const Route = createFileRoute("/portal/alugueis/novo")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    clienteId: typeof s.clienteId === "string" ? s.clienteId : undefined,
    equipId: typeof s.equipId === "string" ? s.equipId : undefined,
    orcamentoId: typeof s.orcamentoId === "string" ? s.orcamentoId : undefined,
  }),
  head: () => ({ meta: [{ title: "Novo aluguel — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: NovoAluguelWizard,
});

type Item = { equipamento_id: string; quantidade: number; tipo_periodo: TipoCobranca; valor_unitario: number; unidades_codigos: string[] };

function NovoAluguelWizard() {
  const { clienteId: initCli, equipId, orcamentoId } = Route.useSearch();
  const { db, addCliente, saveAluguel, vincularAluguelAoOrcamento } = useStore();
  const nav = useNavigate();
  const orcamento = orcamentoId ? db.orcamentos.find(o => o.id === orcamentoId) ?? null : null;

  const [step, setStep] = useState(orcamento && orcamento.cliente_id ? 4 : 1);
  const [clienteId, setClienteId] = useState(orcamento?.cliente_id ?? initCli ?? "");
  const [itens, setItens] = useState<Item[]>(() => {
    if (orcamento) {
      return orcamento.itens.map(it => ({
        equipamento_id: it.equipamento_id,
        quantidade: it.quantidade,
        tipo_periodo: orcamento.tipo_cobranca,
        valor_unitario: it.quantidade > 0 ? computeItemTotal(it) / it.quantidade : it.valor_unitario,
        unidades_codigos: it.unidades_codigos ?? [],
      }));
    }
    if (equipId) {
      const e = db.equipamentos.find(x => x.id === equipId);
      if (e) return [{ equipamento_id: e.id, quantidade: 1, tipo_periodo: "diaria", valor_unitario: Number(e.valor_diaria), unidades_codigos: [] }];
    }
    return [];
  });
  const [dataInicio, setDataInicio] = useState(orcamento?.data_inicio_periodo ?? todayISO());
  const [dataFim, setDataFim] = useState(orcamento?.data_fim_periodo ?? addDays(todayISO(), 1));
  const [desconto, setDesconto] = useState(orcamento?.valor_desconto ?? 0);
  const [observacoes, setObservacoes] = useState(orcamento?.observacoes ?? "");

  const cliente = db.clientes.find(c => c.id === clienteId) ?? null;

  const subtotal = itens.reduce((s, i) => s + i.valor_unitario * i.quantidade, 0);
  const total = Math.max(0, subtotal - desconto);

  function addItem(equipamento_id: string) {
    const eq = db.equipamentos.find(e => e.id === equipamento_id);
    if (!eq) return;
    if (itens.find(i => i.equipamento_id === equipamento_id)) return toast.error("Equipamento já adicionado.");
    setItens(prev => [...prev, { equipamento_id, quantidade: 1, tipo_periodo: "diaria", valor_unitario: Number(eq.valor_diaria), unidades_codigos: [] }]);
  }
  function updItem(i: number, patch: Partial<Item>) {
    setItens(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const merged = { ...it, ...patch };
      if (patch.tipo_periodo) {
        const eq = db.equipamentos.find(e => e.id === it.equipamento_id);
        if (eq) merged.valor_unitario = Number(patch.tipo_periodo === "diaria" ? eq.valor_diaria : patch.tipo_periodo === "semanal" ? eq.valor_semanal : eq.valor_mensal);
      }
      return merged;
    }));
  }
  function rmItem(i: number) { setItens(prev => prev.filter((_, idx) => idx !== i)); }

  async function confirmar() {
    if (!clienteId) return toast.error("Selecione um cliente.");
    if (itens.length === 0) return toast.error("Adicione ao menos um item.");
    try {
      const tipo_predom: TipoCobranca = itens[0].tipo_periodo;
      const a = await saveAluguel({
        cliente_id: clienteId, data_inicio: dataInicio, data_prevista_devolucao: dataFim,
        tipo_cobranca: tipo_predom, status: "ativo", desconto,
        valor_frete: orcamento?.valor_frete ?? 0,
        observacoes,
        itens: itens.map(i => ({ equipamento_id: i.equipamento_id, quantidade: i.quantidade, valor_unitario: i.valor_unitario, unidades_codigos: i.unidades_codigos })),
      });
      if (orcamentoId) await vincularAluguelAoOrcamento(orcamentoId, a.id);
      toast.success("Aluguel criado!");
      nav({ to: "/portal/alugueis/$id/termo", params: { id: a.id } });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <PortalLayout title="Novo aluguel">
      <button onClick={() => nav({ to: "/portal/alugueis" })} className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</button>

      <div className="mb-4 flex items-center gap-2 text-xs">
        {["Cliente", "Equipamentos", "Período", "Confirmar"].map((label, i) => {
          const n = i + 1;
          return (
            <div key={n} className={`flex items-center gap-2 ${step === n ? "text-[#213368] font-semibold" : "text-[#6E7280]"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= n ? "bg-[#F37032] text-white" : "bg-gray-200"}`}>{n}</span>
              {label}
              {n < 4 && <ArrowRight className="h-3 w-3 text-gray-300" />}
            </div>
          );
        })}
      </div>

      {step === 1 && <StepCliente cliente={cliente} setClienteId={setClienteId} onNovo={async (c) => { const n = await addCliente(c); setClienteId(n.id); }} onNext={() => clienteId ? setStep(2) : toast.error("Selecione um cliente")} clientes={db.clientes} />}

      {step === 2 && (
        <div className="space-y-4">
          <StepEquipamentos onAdd={addItem} equipamentos={db.equipamentos} categorias={db.categorias} jaAdicionados={itens.map(i => i.equipamento_id)} />
          {itens.length > 0 && (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-[#213368]">Carrinho ({itens.length})</h3>
              <div className="space-y-2">
                {itens.map((it, i) => {
                  const eq = db.equipamentos.find(e => e.id === it.equipamento_id)!;
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded border p-2">
                      <span className="flex-1 text-sm font-medium">{eq.nome}</span>
                      <input type="number" min={1} max={eq.quantidade_total} value={it.quantidade} onChange={e => updItem(i, { quantidade: Math.max(1, Math.min(eq.quantidade_total, Number(e.target.value))) })} className="w-16 rounded border px-2 py-1 text-sm" />
                      <select value={it.tipo_periodo} onChange={e => updItem(i, { tipo_periodo: e.target.value as TipoCobranca })} className="rounded border px-2 py-1 text-sm">
                        <option value="diaria">Diária</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option>
                      </select>
                      <input type="number" step="0.01" min={0} value={it.valor_unitario} onChange={e => updItem(i, { valor_unitario: Number(e.target.value) })} className="w-24 rounded border px-2 py-1 text-sm" />
                      <span className="w-24 text-right text-sm font-semibold">{money(it.valor_unitario * it.quantidade)}</span>
                      <button onClick={() => rmItem(i)} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-right text-sm">Subtotal: <b>{money(subtotal)}</b></div>
            </div>
          )}
          <NavStep onBack={() => setStep(1)} onNext={() => itens.length ? setStep(3) : toast.error("Adicione ao menos um item")} />
        </div>
      )}

      {step === 3 && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <F label="Data de início"><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full rounded border px-2 py-2 text-sm" /></F>
            <F label="Data fim prevista"><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full rounded border px-2 py-2 text-sm" /></F>
            <F label="Desconto"><input type="number" step="0.01" min={0} value={desconto} onChange={e => setDesconto(Number(e.target.value))} className="w-full rounded border px-2 py-2 text-sm" /></F>
            <F label="Observações" className="md:col-span-2"><textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} className="w-full rounded border px-2 py-2 text-sm" /></F>
          </div>
          <div className="mt-4 rounded bg-[#F4F4F4] p-3 text-right">
            <p className="text-xs text-[#6E7280]">Subtotal: {money(subtotal)} · Desconto: {money(desconto)}</p>
            <p className="text-2xl font-bold text-[#213368]">{money(total)}</p>
          </div>
          <NavStep onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-[#213368]">Confirmar aluguel</h3>
          <p className="text-sm"><b>Cliente:</b> {cliente?.nome_razao_social}</p>
          <p className="text-sm"><b>Período:</b> {dataInicio} → {dataFim}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {itens.map((it, i) => {
              const eq = db.equipamentos.find(e => e.id === it.equipamento_id)!;
              return <li key={i} className="flex justify-between border-b py-1"><span>{eq.nome} × {it.quantidade} ({it.tipo_periodo})</span><span className="font-semibold">{money(it.valor_unitario * it.quantidade)}</span></li>;
            })}
          </ul>
          <div className="mt-4 text-right">
            <p className="text-sm text-[#6E7280]">Total</p>
            <p className="text-3xl font-bold text-[#F37032]">{money(total)}</p>
          </div>
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStep(3)} className="rounded-md border px-4 py-2 text-sm">Voltar</button>
            <button onClick={confirmar} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-6 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]"><Check className="h-4 w-4" /> Confirmar e gerar termo</button>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function StepCliente({ cliente, setClienteId, onNovo, onNext, clientes }: { cliente: Cliente | null; setClienteId: (id: string) => void; onNovo: (c: Omit<Cliente, "id" | "created_at" | "updated_at">) => Promise<void>; onNext: () => void; clientes: Cliente[] }) {
  const [q, setQ] = useState("");
  const [novoOpen, setNovoOpen] = useState(false);
  const results = useMemo(() => {
    if (!q.trim()) return clientes.slice(0, 8);
    const s = q.toLowerCase();
    return clientes.filter(c => c.nome_razao_social.toLowerCase().includes(s) || c.cpf_cnpj.includes(s)).slice(0, 20);
  }, [q, clientes]);

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente por nome ou CPF/CNPJ…" className="w-full rounded-md border pl-9 pr-3 py-2 text-sm" />
        </div>
        <button onClick={() => setNovoOpen(true)} className="inline-flex items-center gap-1 rounded-md bg-[#213368] px-3 py-2 text-sm font-semibold text-white"><UserPlus className="h-4 w-4" /> Novo</button>
      </div>
      <ul className="max-h-64 overflow-auto divide-y">
        {results.map(c => (
          <li key={c.id}>
            <button onClick={() => setClienteId(c.id)} className={`flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-[#F4F4F4] ${cliente?.id === c.id ? "bg-orange-50" : ""}`}>
              <span><b>{c.nome_razao_social}</b> <span className="text-[#6E7280]">{c.cpf_cnpj}</span></span>
              {cliente?.id === c.id && <Check className="h-4 w-4 text-[#F37032]" />}
            </button>
          </li>
        ))}
      </ul>
      {cliente && <div className="mt-3 rounded bg-emerald-50 p-3 text-sm text-emerald-800">Selecionado: <b>{cliente.nome_razao_social}</b></div>}
      <div className="mt-4 text-right"><button onClick={onNext} className="rounded-md bg-[#F37032] px-6 py-2 text-sm font-semibold text-white">Próximo</button></div>

      {novoOpen && <NovoClienteModal onClose={() => setNovoOpen(false)} onSave={async (d) => { await onNovo(d); setNovoOpen(false); }} />}
    </div>
  );
}

export function NovoClienteModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Omit<Cliente, "id" | "created_at" | "updated_at">) => Promise<void> }) {
  const [f, setF] = useState<Omit<Cliente, "id" | "created_at" | "updated_at">>({
    tipo: "pessoa_fisica", nome_razao_social: "", cpf_cnpj: "", telefone_whatsapp: "", email: "", endereco: "", cidade: "", observacoes: "",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold text-[#213368]">Novo cliente</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="space-y-2">
          <select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value as any })} className="w-full rounded border px-2 py-2 text-sm">
            <option value="pessoa_fisica">Pessoa Física</option><option value="pessoa_juridica">Pessoa Jurídica</option>
          </select>
          <input placeholder="Nome / Razão social" value={f.nome_razao_social} onChange={e => setF({ ...f, nome_razao_social: e.target.value })} className="w-full rounded border px-2 py-2 text-sm" />
          <input placeholder="CPF/CNPJ" value={f.cpf_cnpj} onChange={e => setF({ ...f, cpf_cnpj: maskCpfCnpj(e.target.value) })} className="w-full rounded border px-2 py-2 text-sm" />
          <input placeholder="WhatsApp" value={f.telefone_whatsapp} onChange={e => setF({ ...f, telefone_whatsapp: maskPhone(e.target.value) })} className="w-full rounded border px-2 py-2 text-sm" />
          <input placeholder="Endereço" value={f.endereco} onChange={e => setF({ ...f, endereco: e.target.value })} className="w-full rounded border px-2 py-2 text-sm" />
          <input placeholder="Cidade" value={f.cidade} onChange={e => setF({ ...f, cidade: e.target.value })} className="w-full rounded border px-2 py-2 text-sm" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm">Cancelar</button>
          <button onClick={() => f.nome_razao_social ? onSave(f) : toast.error("Nome obrigatório")} className="rounded bg-[#F37032] px-4 py-1.5 text-sm font-semibold text-white">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function StepEquipamentos({ onAdd, equipamentos, categorias, jaAdicionados }: { onAdd: (id: string) => void; equipamentos: any[]; categorias: any[]; jaAdicionados: string[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return equipamentos
      .filter(e => e.status === "disponivel")
      .filter(e => !s || e.nome.toLowerCase().includes(s) || e.codigo_patrimonio.toLowerCase().includes(s))
      .slice(0, 30);
  }, [q, equipamentos]);
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar equipamento…" className="w-full rounded-md border pl-9 pr-3 py-2 text-sm" />
      </div>
      <ul className="max-h-72 divide-y overflow-auto">
        {results.map(e => {
          const cat = categorias.find(c => c.id === e.categoria_id)?.nome ?? "";
          const added = jaAdicionados.includes(e.id);
          return (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <b>{e.nome}</b> <span className="text-[#6E7280]">{e.codigo_patrimonio} · {cat}</span>
                <div className="text-xs text-[#6E7280]">Diária: {money(e.valor_diaria)} · Disp: {e.quantidade_total}</div>
              </div>
              <button disabled={added} onClick={() => onAdd(e.id)} className="inline-flex items-center gap-1 rounded bg-[#F37032] px-3 py-1 text-xs font-semibold text-white disabled:bg-gray-300">
                <Plus className="h-3 w-3" /> {added ? "Adicionado" : "Adicionar"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex justify-between">
      <button onClick={onBack} className="rounded-md border px-4 py-2 text-sm">Voltar</button>
      <button onClick={onNext} className="rounded-md bg-[#F37032] px-6 py-2 text-sm font-semibold text-white">Próximo</button>
    </div>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

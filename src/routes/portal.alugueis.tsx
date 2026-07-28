import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayStatus } from "@/lib/portal/store";
import { dateBR, money, todayISO, addDays } from "@/lib/portal/format";
import { Plus, Search, Trash2, X } from "lucide-react";
import type { AluguelStatus, TipoCobranca, FormaPagamento, StatusPagamento } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/alugueis")({
  head: () => ({ meta: [{ title: "Aluguéis — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AlugueisPage,
});

function AlugueisPage() {
  const { db, saveAluguel, cancelarAluguel } = useStore();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [openForm, setOpenForm] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return db.alugueis
      .map(a => ({ ...a, _status: displayStatus(a), _cli: db.clientes.find(c => c.id === a.cliente_id) }))
      .filter(a => {
        if (q && !(a._cli?.nome_razao_social ?? "").toLowerCase().includes(q)) return false;
        if (status && a._status !== status) return false;
        if (de && a.data_inicio < de) return false;
        if (ate && a.data_inicio > ate) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [db, busca, status, de, ate]);

  return (
    <PortalLayout title="Aluguéis">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#213368]" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {["orcamento", "reservado", "ativo", "devolvido", "atrasado", "cancelado"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={de} onChange={e => setDe(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm" />
        <input type="date" value={ate} onChange={e => setAte(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm" />
        <button onClick={() => setOpenForm(true)} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
          <Plus className="h-4 w-4" /> Novo aluguel
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F4F4] text-left text-xs uppercase text-[#6E7280]">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Equipamentos</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Devolução prevista</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6E7280]">Nenhum aluguel encontrado.</td></tr>
            )}
            {filtrados.map(a => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3">{a._cli?.nome_razao_social ?? "—"}</td>
                <td className="px-4 py-3 text-[#6E7280]">
                  {a.itens.map(i => db.equipamentos.find(e => e.id === i.equipamento_id)?.nome).filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">{dateBR(a.data_inicio)}</td>
                <td className="px-4 py-3">{dateBR(a.data_prevista_devolucao)}</td>
                <td className="px-4 py-3 text-right font-semibold">{money(a.valor_total)}</td>
                <td className="px-4 py-3"><StatusBadge status={a._status} /></td>
                <td className="px-4 py-3"><StatusBadge status={a.status_pagamento} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to="/portal/alugueis/$id" params={{ id: a.id }} className="text-sm font-medium text-[#213368] hover:underline">Abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openForm && <NovoAluguelDialog onClose={() => setOpenForm(false)} />}
    </PortalLayout>
  );
}

function NovoAluguelDialog({ onClose }: { onClose: () => void }) {
  const { db, saveAluguel } = useStore();
  const [cliBusca, setCliBusca] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [tipo_cobranca, setTipoCobranca] = useState<TipoCobranca>("diaria");
  const [data_inicio, setInicio] = useState(todayISO());
  const [data_prevista_devolucao, setPrev] = useState(addDays(todayISO(), 1));
  const [desconto, setDesconto] = useState(0);
  const [valor_frete, setFrete] = useState(0);
  const [forma_pagamento, setForma] = useState<FormaPagamento>("pix");
  const [status_pagamento, setStPag] = useState<StatusPagamento>("pendente");
  const [status, setStatus] = useState<AluguelStatus>("orcamento");
  const [observacoes, setObs] = useState("");
  const [itens, setItens] = useState<{ equipamento_id: string; quantidade: number; valor_unitario: number }[]>([]);

  const clientesFiltrados = db.clientes.filter(c =>
    !cliBusca || c.nome_razao_social.toLowerCase().includes(cliBusca.toLowerCase()) || c.cpf_cnpj.includes(cliBusca)
  );
  const equipDisp = db.equipamentos.filter(e => e.status === "disponivel");

  const valorSugerido = (id: string) => {
    const e = db.equipamentos.find(x => x.id === id);
    if (!e) return 0;
    return tipo_cobranca === "diaria" ? e.valor_diaria : tipo_cobranca === "semanal" ? e.valor_semanal : e.valor_mensal;
  };

  function addItem() {
    if (equipDisp.length === 0) { toast.error("Nenhum equipamento disponível."); return; }
    const first = equipDisp[0];
    setItens(prev => [...prev, { equipamento_id: first.id, quantidade: 1, valor_unitario: valorSugerido(first.id) }]);
  }
  function updItem(idx: number, patch: Partial<typeof itens[number]>) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function rmItem(idx: number) { setItens(prev => prev.filter((_, i) => i !== idx)); }

  const subtotal = itens.reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 0), 0);
  const total = Math.max(0, subtotal - (desconto || 0) + (valor_frete || 0));

  async function submit() {
    if (!clienteId) return toast.error("Selecione um cliente.");
    if (itens.length === 0) return toast.error("Adicione pelo menos um equipamento.");
    try {
      await saveAluguel({
        cliente_id: clienteId, data_inicio, data_prevista_devolucao, data_devolucao_real: null,
        tipo_cobranca, status, desconto, valor_frete,
        forma_pagamento, status_pagamento, observacoes, itens,
      });
      toast.success("Aluguel criado.");
      onClose();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-[#213368]">Novo aluguel</h2>
          <button onClick={onClose} className="p-1"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-medium text-[#6E7280]">Cliente</label>
            <input value={cliBusca} onChange={e => setCliBusca(e.target.value)} placeholder="Buscar cliente por nome ou CPF/CNPJ…"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            <div className="mt-2 max-h-36 overflow-auto rounded-md border">
              {clientesFiltrados.length === 0 ? (
                <p className="p-3 text-xs text-[#6E7280]">Nenhum cliente. <Link to="/portal/clientes" className="text-[#F37032] underline">Cadastrar</Link></p>
              ) : clientesFiltrados.map(c => (
                <button key={c.id} type="button" onClick={() => setClienteId(c.id)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#F4F4F4] ${clienteId === c.id ? "bg-[#213368]/5" : ""}`}>
                  <span className="font-medium">{c.nome_razao_social}</span> <span className="text-xs text-[#6E7280]">— {c.cpf_cnpj}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Tipo de cobrança"><select className="w-full rounded-md border px-2 py-2 text-sm" value={tipo_cobranca} onChange={e => setTipoCobranca(e.target.value as TipoCobranca)}>
              <option value="diaria">Diária</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option>
            </select></Field>
            <Field label="Início"><input type="date" className="w-full rounded-md border px-2 py-2 text-sm" value={data_inicio} onChange={e => setInicio(e.target.value)} /></Field>
            <Field label="Devolução prevista"><input type="date" className="w-full rounded-md border px-2 py-2 text-sm" value={data_prevista_devolucao} onChange={e => setPrev(e.target.value)} /></Field>
            <Field label="Status"><select className="w-full rounded-md border px-2 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value as AluguelStatus)}>
              {["orcamento", "reservado", "ativo"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#213368]">Equipamentos</h3>
              <button type="button" onClick={addItem} className="rounded-md bg-[#213368] px-3 py-1.5 text-xs font-semibold text-white">+ Adicionar</button>
            </div>
            <div className="space-y-2">
              {itens.length === 0 && <p className="text-sm text-[#6E7280]">Nenhum item adicionado.</p>}
              {itens.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <select className="col-span-6 rounded-md border px-2 py-2 text-sm" value={it.equipamento_id}
                    onChange={e => updItem(idx, { equipamento_id: e.target.value, valor_unitario: valorSugerido(e.target.value) })}>
                    {equipDisp.map(e => <option key={e.id} value={e.id}>{e.nome} ({e.codigo_patrimonio})</option>)}
                  </select>
                  <input type="number" min={1} className="col-span-2 rounded-md border px-2 py-2 text-sm" value={it.quantidade}
                    onChange={e => updItem(idx, { quantidade: Number(e.target.value) })} />
                  <input type="number" min={0} step="0.01" className="col-span-3 rounded-md border px-2 py-2 text-sm" value={it.valor_unitario}
                    onChange={e => updItem(idx, { valor_unitario: Number(e.target.value) })} />
                  <button type="button" onClick={() => rmItem(idx)} className="col-span-1 rounded-md border text-red-600 hover:bg-red-50"><Trash2 className="mx-auto h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Desconto (R$)"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={desconto} onChange={e => setDesconto(Number(e.target.value))} /></Field>
            <Field label="Frete (R$)"><input type="number" min={0} step="0.01" className="w-full rounded-md border px-2 py-2 text-sm" value={valor_frete} onChange={e => setFrete(Number(e.target.value))} /></Field>
            <Field label="Forma pagamento"><select className="w-full rounded-md border px-2 py-2 text-sm" value={forma_pagamento} onChange={e => setForma(e.target.value as FormaPagamento)}>
              {["dinheiro", "pix", "cartao", "boleto"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></Field>
            <Field label="Status pagamento"><select className="w-full rounded-md border px-2 py-2 text-sm" value={status_pagamento} onChange={e => setStPag(e.target.value as StatusPagamento)}>
              {["pendente", "parcial", "pago"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></Field>
          </div>

          <Field label="Observações"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={observacoes} onChange={e => setObs(e.target.value)} /></Field>

          <div className="flex items-center justify-between rounded-md bg-[#F4F4F4] p-3">
            <div className="text-sm text-[#6E7280]">Subtotal: {money(subtotal)} · Desconto: −{money(desconto)} · Frete: +{money(valor_frete)}</div>
            <div className="text-lg font-bold text-[#213368]">Total: {money(total)}</div>
          </div>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={submit} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">Salvar aluguel</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

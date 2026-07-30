import { useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search, UserPlus, X, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { useStore } from "@/lib/portal/store";
import { money, todayISO, addDays, normalizeSearch, codigosEquipamento } from "@/lib/portal/format";
import { computeItemTotal, computeOrcamentoTotals, diasEntre, valorPorTipoCobranca } from "@/lib/portal/orcamentoCalc";
import { EquipamentoPickerDialog, type EquipamentoSelecao } from "@/components/portal/EquipamentoPickerDialog";
import { NovoClienteModal } from "@/routes/portal.alugueis.novo";
import type { Cliente, DescontoTipo, Equipamento, Orcamento, TipoCobranca } from "@/lib/portal/types";

interface ItemForm {
  key: string;
  equipamento_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  desconto_tipo: DescontoTipo;
  desconto_valor: number;
  unidades_codigos: string[];
}

function itemFromEquip(sel: EquipamentoSelecao, tipoCobranca: TipoCobranca, equipamentos: Equipamento[]): ItemForm {
  const eq = equipamentos.find(e => e.id === sel.equipamentoId)!;
  const allCodes = codigosEquipamento(eq);
  const multi = allCodes.length > 1;
  const chosen = multi ? sel.codigos : [];
  return {
    key: crypto.randomUUID(),
    equipamento_id: eq.id,
    descricao: multi ? eq.nome : `${eq.nome}${allCodes[0] ? " — " + allCodes[0] : ""}`,
    quantidade: multi ? Math.max(1, chosen.length) : 1,
    valor_unitario: valorPorTipoCobranca(eq, tipoCobranca),
    desconto_tipo: "valor",
    desconto_valor: 0,
    unidades_codigos: chosen,
  };
}

export function OrcamentoEditor({ initial, onSaved }: { initial: Orcamento | null; onSaved: (o: Orcamento) => void }) {
  const { db, addCliente, saveOrcamento } = useStore();

  const [clienteId, setClienteId] = useState(initial?.cliente_id ?? "");
  const [clienteBusca, setClienteBusca] = useState("");
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  const [dataInicio, setDataInicio] = useState(initial?.data_inicio_periodo ?? todayISO());
  const [dataFim, setDataFim] = useState(initial?.data_fim_periodo ?? addDays(todayISO(), 1));
  const [quantidadeDias, setQuantidadeDias] = useState(initial?.quantidade_dias ?? diasEntre(todayISO(), addDays(todayISO(), 1)));
  const [tipoCobranca, setTipoCobranca] = useState<TipoCobranca>(initial?.tipo_cobranca ?? "diaria");

  const [itens, setItens] = useState<ItemForm[]>(
    () => (initial?.itens ?? []).slice().sort((a, b) => a.ordem - b.ordem).map(it => ({
      key: it.id, equipamento_id: it.equipamento_id, descricao: it.descricao,
      quantidade: it.quantidade, valor_unitario: it.valor_unitario,
      desconto_tipo: it.desconto_tipo, desconto_valor: it.desconto_valor,
      unidades_codigos: it.unidades_codigos ?? [],
    })),
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const [descontoTipoGeral, setDescontoTipoGeral] = useState<DescontoTipo>(initial?.desconto_tipo ?? "valor");
  const [descontoValorGeral, setDescontoValorGeral] = useState(initial?.desconto_valor ?? 0);
  const [valorFrete, setValorFrete] = useState(initial?.valor_frete ?? 0);

  const [condicoesPagamento, setCondicoesPagamento] = useState(initial?.condicoes_pagamento ?? "");
  const [dataValidade, setDataValidade] = useState(initial?.data_validade ?? addDays(todayISO(), 7));
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");

  const [currentStatus, setCurrentStatus] = useState<Orcamento["status"]>(initial?.status ?? "rascunho");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useBlocker({
    shouldBlockFn: () => dirty && !confirm("Existem alterações não salvas neste orçamento. Deseja sair mesmo assim?"),
    enableBeforeUnload: true,
    disabled: !dirty,
  });

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  const cliente = db.clientes.find(c => c.id === clienteId) ?? null;
  const clientesFiltrados = useMemo(() => {
    if (!clienteBusca.trim()) return db.clientes.slice(0, 8);
    const q = normalizeSearch(clienteBusca);
    return db.clientes.filter(c =>
      normalizeSearch(c.nome_razao_social).includes(q) || c.cpf_cnpj.includes(clienteBusca) || c.telefone_whatsapp.includes(clienteBusca),
    ).slice(0, 20);
  }, [clienteBusca, db.clientes]);

  const totals = useMemo(() => computeOrcamentoTotals(itens, descontoTipoGeral, descontoValorGeral, valorFrete), [itens, descontoTipoGeral, descontoValorGeral, valorFrete]);

  function onChangeDatas(inicio: string, fim: string) {
    setDataInicio(inicio); setDataFim(fim); setQuantidadeDias(diasEntre(inicio, fim)); setDirty(true);
  }

  function onChangeTipoCobranca(novo: TipoCobranca) {
    setTipoCobranca(novo);
    setItens(prev => prev.map(it => {
      const eq = db.equipamentos.find(e => e.id === it.equipamento_id);
      return eq ? { ...it, valor_unitario: valorPorTipoCobranca(eq, novo) } : it;
    }));
    setDirty(true);
  }

  function addItens(selecoes: EquipamentoSelecao[]) {
    setItens(prev => [
      ...prev,
      ...selecoes.filter(s => !prev.some(p => p.equipamento_id === s.equipamentoId)).map(s => itemFromEquip(s, tipoCobranca, db.equipamentos)),
    ]);
    setPickerOpen(false);
    setDirty(true);
  }
  function updItem(key: string, patch: Partial<ItemForm>) {
    setItens(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it));
    setDirty(true);
  }
  function rmItem(key: string) { setItens(prev => prev.filter(it => it.key !== key)); setDirty(true); }
  function moveItem(key: string, dir: -1 | 1) {
    setItens(prev => {
      const idx = prev.findIndex(it => it.key === key);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    setDirty(true);
  }

  async function persist(status: Orcamento["status"]) {
    setSaving(true);
    try {
      const saved = await saveOrcamento({
        id: initial?.id,
        cliente_id: clienteId,
        status,
        data_validade: dataValidade,
        data_inicio_periodo: dataInicio,
        data_fim_periodo: dataFim,
        quantidade_dias: quantidadeDias,
        tipo_cobranca: tipoCobranca,
        desconto_tipo: descontoTipoGeral,
        desconto_valor: descontoValorGeral,
        valor_frete: valorFrete,
        condicoes_pagamento: condicoesPagamento,
        observacoes,
        itens: itens.map((it, idx) => ({
          equipamento_id: it.equipamento_id, descricao: it.descricao, quantidade: it.quantidade,
          valor_unitario: it.valor_unitario, desconto_tipo: it.desconto_tipo, desconto_valor: it.desconto_valor, ordem: idx,
          unidades_codigos: it.unidades_codigos,
        })),
      });
      setCurrentStatus(status);
      setDirty(false);
      toast.success(status === "enviado" ? "Orçamento enviado." : "Orçamento salvo.");
      onSaved(saved);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function salvarRascunho() {
    persist("rascunho");
  }

  function enviar() {
    if (!clienteId) return toast.error("Selecione um cliente.");
    if (itens.length === 0) return toast.error("Adicione ao menos um equipamento.");
    persist("enviado");
  }

  function salvarAlteracoes() {
    if (!clienteId) return toast.error("Selecione um cliente.");
    if (itens.length === 0) return toast.error("Adicione ao menos um equipamento.");
    if (currentStatus === "aprovado") {
      if (!confirm("Este orçamento está aprovado. Salvar as alterações vai revertê-lo para rascunho. Deseja continuar?")) return;
      persist("rascunho");
      return;
    }
    persist(currentStatus);
  }

  const mostraAcoesRascunho = currentStatus === "rascunho";

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Cliente */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#213368]">Cliente</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
            <input value={clienteBusca} onChange={e => setClienteBusca(e.target.value)} placeholder="Buscar cliente por nome, CPF/CNPJ ou telefone…"
              className="w-full rounded-md border pl-9 pr-3 py-2 text-sm" />
          </div>
          <button onClick={() => setNovoClienteOpen(true)} className="inline-flex items-center gap-1 rounded-md bg-[#213368] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2a4185]">
            <UserPlus className="h-4 w-4" /> Novo cliente
          </button>
        </div>
        {!cliente && clientesFiltrados.length > 0 && (
          <ul className="mt-2 max-h-40 overflow-auto rounded-md border divide-y">
            {clientesFiltrados.map(c => (
              <li key={c.id}>
                <button onClick={() => { setClienteId(c.id); setDirty(true); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#F4F4F4]">
                  <b>{c.nome_razao_social}</b> <span className="text-[#6E7280]">{c.cpf_cnpj}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {cliente && (
          <div className="mt-3 flex items-start justify-between rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            <div>
              <p className="font-semibold">{cliente.nome_razao_social}</p>
              <p className="text-xs">{cliente.cpf_cnpj || "—"} · {cliente.telefone_whatsapp || "—"} · {cliente.cidade || "—"}</p>
            </div>
            <button onClick={() => { setClienteId(""); setDirty(true); }} className="text-emerald-700 hover:text-emerald-900"><X className="h-4 w-4" /></button>
          </div>
        )}
      </section>

      {/* 2. Período e cobrança */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#213368]">Período e cobrança</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <F label="Início"><input type="date" className="w-full rounded-md border px-2 py-2 text-sm" value={dataInicio} onChange={e => onChangeDatas(e.target.value, dataFim)} /></F>
          <F label="Fim"><input type="date" className="w-full rounded-md border px-2 py-2 text-sm" value={dataFim} onChange={e => onChangeDatas(dataInicio, e.target.value)} /></F>
          <F label="Dias"><input type="number" min={1} className="w-full rounded-md border px-2 py-2 text-sm" value={quantidadeDias} onChange={e => { setQuantidadeDias(Math.max(1, Number(e.target.value))); setDirty(true); }} /></F>
          <F label="Tipo de cobrança">
            <select className="w-full rounded-md border px-2 py-2 text-sm" value={tipoCobranca} onChange={e => onChangeTipoCobranca(e.target.value as TipoCobranca)}>
              <option value="diaria">Diária</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option>
            </select>
          </F>
        </div>
      </section>

      {/* 3. Equipamentos */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#213368]">Equipamentos</h3>
          <button onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1 rounded-md bg-[#F37032] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#db5f22]">
            <Plus className="h-3.5 w-3.5" /> Adicionar equipamento
          </button>
        </div>
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#6E7280]">Nenhum equipamento adicionado.</p>
        ) : (
          <div className="space-y-2">
            {itens.map((it, idx) => {
              const eq = db.equipamentos.find(e => e.id === it.equipamento_id);
              const total = computeItemTotal(it);
              const allCodes = eq ? codigosEquipamento(eq) : [];
              const multi = allCodes.length > 1;
              return (
                <div key={it.key} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-[#F4F4F4]">
                    {eq?.foto_url ? <img src={eq.foto_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-5 w-5 text-[#6E7280] opacity-40" /></div>}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-[#213368]">{it.descricao}</p>
                    {multi && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {allCodes.map(c => {
                          const on = it.unidades_codigos.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                const next = on ? it.unidades_codigos.filter(x => x !== c) : [...it.unidades_codigos, c];
                                updItem(it.key, { unidades_codigos: next, quantidade: Math.max(1, next.length) });
                              }}
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold transition ${on ? "bg-[#F37032] text-white" : "bg-[#213368]/10 text-[#213368] hover:bg-[#213368]/20"}`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {multi ? (
                    <span className="w-16 rounded-md border bg-[#F4F4F4] px-2 py-1.5 text-center text-sm text-[#213368]" title="Quantidade derivada dos códigos selecionados">{it.quantidade} un.</span>
                  ) : (
                    <input type="number" min={1} value={it.quantidade} onChange={e => updItem(it.key, { quantidade: Math.max(1, Number(e.target.value)) })}
                      className="w-16 rounded-md border px-2 py-1.5 text-sm" title="Quantidade" />
                  )}
                  <input type="number" min={0} step="0.01" value={it.valor_unitario} onChange={e => updItem(it.key, { valor_unitario: Math.max(0, Number(e.target.value)) })}
                    className="w-24 rounded-md border px-2 py-1.5 text-sm" title="Valor unitário" />
                  <select value={it.desconto_tipo} onChange={e => updItem(it.key, { desconto_tipo: e.target.value as DescontoTipo })} className="rounded-md border px-1 py-1.5 text-xs">
                    <option value="valor">R$</option><option value="percentual">%</option>
                  </select>
                  <input type="number" min={0} max={it.desconto_tipo === "percentual" ? 100 : undefined} step="0.01" value={it.desconto_valor}
                    onChange={e => updItem(it.key, { desconto_valor: Math.max(0, Number(e.target.value)) })}
                    className="w-20 rounded-md border px-2 py-1.5 text-sm" title="Desconto do item" />
                  <span className="w-24 text-right text-sm font-semibold text-[#213368]">{money(total)}</span>
                  <div className="flex items-center gap-0.5">
                    <button disabled={idx === 0} onClick={() => moveItem(it.key, -1)} className="rounded p-1 text-[#6E7280] hover:bg-[#F4F4F4] disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button disabled={idx === itens.length - 1} onClick={() => moveItem(it.key, 1)} className="rounded p-1 text-[#6E7280] hover:bg-[#F4F4F4] disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button onClick={() => rmItem(it.key)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Condições */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#213368]">Condições</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <F label="Condições de pagamento"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={condicoesPagamento} onChange={e => { setCondicoesPagamento(e.target.value); setDirty(true); }} /></F>
          <F label="Validade da proposta"><input type="date" className="w-full rounded-md border px-2 py-2 text-sm" value={dataValidade} onChange={e => { setDataValidade(e.target.value); setDirty(true); }} /></F>
          <F label="Observações" className="md:col-span-2"><textarea rows={2} className="w-full rounded-md border px-2 py-2 text-sm" value={observacoes} onChange={e => { setObservacoes(e.target.value); setDirty(true); }} /></F>
        </div>
      </section>

      {/* 4. Valores — painel fixo */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:pl-[17rem]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[#6E7280]">Subtotal: <b className="text-[#213368]">{money(totals.subtotal)}</b></span>
            <span className="flex items-center gap-1 text-[#6E7280]">
              Desconto geral:
              <select value={descontoTipoGeral} onChange={e => { setDescontoTipoGeral(e.target.value as DescontoTipo); setDirty(true); }} className="rounded border px-1 py-1 text-xs">
                <option value="valor">R$</option><option value="percentual">%</option>
              </select>
              <input type="number" min={0} max={descontoTipoGeral === "percentual" ? 100 : undefined} step="0.01" value={descontoValorGeral}
                onChange={e => { setDescontoValorGeral(Math.max(0, Number(e.target.value))); setDirty(true); }} className="w-20 rounded border px-2 py-1 text-sm" />
            </span>
            <span className="flex items-center gap-1 text-[#6E7280]">
              Frete: <input type="number" min={0} step="0.01" value={valorFrete} onChange={e => { setValorFrete(Math.max(0, Number(e.target.value))); setDirty(true); }} className="w-24 rounded border px-2 py-1 text-sm" />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase text-[#6E7280]">Total</p>
              <p className="text-xl font-bold text-[#F37032]">{money(totals.valor_total)}</p>
            </div>
            {mostraAcoesRascunho ? (
              <>
                <button onClick={salvarRascunho} disabled={saving} className="rounded-md border px-4 py-2 text-sm font-semibold text-[#213368] disabled:opacity-50">Salvar rascunho</button>
                <button onClick={enviar} disabled={saving} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-50">Enviar orçamento</button>
              </>
            ) : (
              <button onClick={salvarAlteracoes} disabled={saving} className="rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-50">Salvar alterações</button>
            )}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <EquipamentoPickerDialog
          equipamentos={db.equipamentos}
          categorias={db.categorias}
          jaAdicionados={itens.map(i => i.equipamento_id)}
          onClose={() => setPickerOpen(false)}
          onAdd={addItens}
        />
      )}
      {novoClienteOpen && (
        <NovoClienteModal
          onClose={() => setNovoClienteOpen(false)}
          onSave={async (c: Omit<Cliente, "id" | "created_at" | "updated_at">) => {
            try {
              const novo = await addCliente(c);
              setClienteId(novo.id);
              setDirty(true);
              setNovoClienteOpen(false);
            } catch (e: any) { toast.error(e.message); }
          }}
        />
      )}
    </div>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>{children}</label>;
}

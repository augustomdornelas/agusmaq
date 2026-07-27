import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayStatus } from "@/lib/portal/store";
import { dateBR, money, todayISO, whatsappLink } from "@/lib/portal/format";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { FormaPagamento } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/alugueis/$id")({
  head: () => ({ meta: [{ title: "Aluguel — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AluguelDetail,
});

function AluguelDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { db, updateAluguelStatus, cancelarAluguel, addPagamento } = useStore();
  const a = db.alugueis.find(x => x.id === id);
  const [pgValor, setPgValor] = useState(0);
  const [pgForma, setPgForma] = useState<FormaPagamento>("pix");
  const [pgData, setPgData] = useState(todayISO());
  const [pgObs, setPgObs] = useState("");

  if (!a) {
    return <PortalLayout title="Aluguel"><p>Aluguel não encontrado. <Link to="/portal/alugueis" className="underline">Voltar</Link></p></PortalLayout>;
  }
  const cli = db.clientes.find(c => c.id === a.cliente_id);
  const pagamentos = db.pagamentos.filter(p => p.aluguel_id === a.id);
  const pago = pagamentos.reduce((s, p) => s + p.valor, 0);
  const saldo = Math.max(0, a.valor_total - pago);

  function registrarDevolucao() {
    if (!confirm("Confirmar devolução? Os equipamentos voltarão para 'disponível'.")) return;
    updateAluguelStatus(a.id, "devolvido");
    toast.success("Devolução registrada.");
  }
  function cancelar() {
    if (!confirm("Cancelar este aluguel?")) return;
    cancelarAluguel(a.id);
    toast.success("Aluguel cancelado.");
  }
  function addPg() {
    if (!pgValor || pgValor <= 0) return toast.error("Informe o valor.");
    addPagamento({ aluguel_id: a.id, data: pgData, valor: pgValor, forma: pgForma, observacao: pgObs });
    setPgValor(0); setPgObs("");
    toast.success("Pagamento registrado.");
  }

  return (
    <PortalLayout title={`Aluguel — ${cli?.nome_razao_social ?? ""}`}>
      <Link to="/portal/alugueis" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={displayStatus(a)} />
            <StatusBadge status={a.status_pagamento} />
            {cli && <a href={whatsappLink(cli.telefone_whatsapp, `Olá ${cli.nome_razao_social}, sobre o aluguel na Agusmaq…`)} target="_blank"
              className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Info label="Início" value={dateBR(a.data_inicio)} />
            <Info label="Devolução prevista" value={dateBR(a.data_prevista_devolucao)} />
            <Info label="Devolução real" value={dateBR(a.data_devolucao_real)} />
            <Info label="Cobrança" value={a.tipo_cobranca} />
          </div>
          <h3 className="mt-5 mb-2 text-sm font-semibold text-[#213368]">Itens</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6E7280]"><tr><th className="py-2">Equipamento</th><th>Qtd</th><th className="text-right">Unitário</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody>
              {a.itens.map(i => {
                const e = db.equipamentos.find(x => x.id === i.equipamento_id);
                return <tr key={i.id} className="border-t"><td className="py-2">{e?.nome ?? "—"}</td><td>{i.quantidade}</td><td className="text-right">{money(i.valor_unitario)}</td><td className="text-right">{money(i.subtotal)}</td></tr>;
              })}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end gap-6 text-sm">
            <div><span className="text-[#6E7280]">Desconto: </span><b>−{money(a.desconto)}</b></div>
            <div><span className="text-[#6E7280]">Frete: </span><b>+{money(a.valor_frete)}</b></div>
            <div className="text-base"><span className="text-[#6E7280]">Total: </span><b className="text-[#213368]">{money(a.valor_total)}</b></div>
          </div>
          {a.observacoes && <p className="mt-3 rounded-md bg-[#F4F4F4] p-3 text-sm text-[#6E7280]">{a.observacoes}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {a.status !== "devolvido" && a.status !== "cancelado" && (
              <button onClick={registrarDevolucao} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Registrar devolução</button>
            )}
            {a.status !== "cancelado" && a.status !== "devolvido" && (
              <button onClick={cancelar} className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Cancelar aluguel</button>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[#213368]">Pagamentos</h3>
          <div className="mb-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[#6E7280]">Total</span><b>{money(a.valor_total)}</b></div>
            <div className="flex justify-between"><span className="text-[#6E7280]">Pago</span><b className="text-emerald-700">{money(pago)}</b></div>
            <div className="flex justify-between"><span className="text-[#6E7280]">Saldo</span><b className="text-red-700">{money(saldo)}</b></div>
          </div>
          <ul className="mb-4 max-h-40 space-y-1 overflow-auto text-xs">
            {pagamentos.length === 0 && <li className="text-[#6E7280]">Nenhum pagamento.</li>}
            {pagamentos.map(p => <li key={p.id} className="flex justify-between rounded bg-[#F4F4F4] px-2 py-1">
              <span>{dateBR(p.data)} · {p.forma}</span><b>{money(p.valor)}</b>
            </li>)}
          </ul>
          <div className="space-y-2">
            <input type="date" value={pgData} onChange={e => setPgData(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" />
            <input type="number" min={0} step="0.01" placeholder="Valor" value={pgValor || ""} onChange={e => setPgValor(Number(e.target.value))} className="w-full rounded-md border px-2 py-2 text-sm" />
            <select value={pgForma} onChange={e => setPgForma(e.target.value as FormaPagamento)} className="w-full rounded-md border px-2 py-2 text-sm">
              {["dinheiro", "pix", "cartao", "boleto"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Observação" value={pgObs} onChange={e => setPgObs(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" />
            <button onClick={addPg} className="w-full rounded-md bg-[#F37032] px-3 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">Adicionar pagamento</button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-[#6E7280]">{label}</p><p className="font-medium">{value}</p></div>;
}

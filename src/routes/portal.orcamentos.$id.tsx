import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { OrcamentoEditor } from "@/components/portal/OrcamentoEditor";
import { useStore, displayOrcamentoStatus, isOrcamentoExpirado } from "@/lib/portal/store";
import { dateBR, money, whatsappLink } from "@/lib/portal/format";
import { gerarOrcamentoPdf } from "@/lib/portal/orcamentoPdf";
import { ArrowLeft, MessageCircle, Download, Check, X as XIcon, Send, PackageOpen } from "lucide-react";

export const Route = createFileRoute("/portal/orcamentos/$id")({
  head: () => ({ meta: [{ title: "Orçamento — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: OrcamentoDetail,
});

const STAGES = [
  { key: "rascunho", label: "Rascunho" },
  { key: "enviado", label: "Enviado" },
  { key: "aprovado", label: "Aprovado" },
] as const;

function OrcamentoDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { db, updateOrcamentoStatus } = useStore();
  const [motivoOpen, setMotivoOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const o = db.orcamentos.find(x => x.id === id);
  if (!o) {
    return <PortalLayout title="Orçamento"><p>Orçamento não encontrado. <Link to="/portal/orcamentos" className="underline">Voltar</Link></p></PortalLayout>;
  }
  const cli = db.clientes.find(c => c.id === o.cliente_id);
  const expirado = isOrcamentoExpirado(o);
  const statusDisplay = displayOrcamentoStatus(o);
  const stageIndex = o.status === "recusado" ? 1 : STAGES.findIndex(s => s.key === o.status);

  async function marcarEnviado() {
    if (!o!.cliente_id) return toast.error("Selecione um cliente antes de enviar.");
    if (o!.itens.length === 0) return toast.error("Adicione ao menos um item antes de enviar.");
    try { await updateOrcamentoStatus(o!.id, "enviado"); toast.success("Orçamento marcado como enviado."); }
    catch (e: any) { toast.error(e.message); }
  }
  async function aprovar() {
    try { await updateOrcamentoStatus(o!.id, "aprovado"); toast.success("Orçamento aprovado."); }
    catch (e: any) { toast.error(e.message); }
  }
  async function confirmarRecusa() {
    try {
      await updateOrcamentoStatus(o!.id, "recusado", motivo);
      toast.success("Orçamento recusado.");
      setMotivoOpen(false); setMotivo("");
    } catch (e: any) { toast.error(e.message); }
  }
  function gerarAluguel() {
    nav({ to: "/portal/alugueis/novo", search: { orcamentoId: o!.id } as any });
  }
  async function baixarPdf() {
    setGerandoPdf(true);
    try { await gerarOrcamentoPdf(o!, cli, db.equipamentos, db.configEmpresa); }
    catch (e: any) { toast.error("Falha ao gerar PDF: " + e.message); }
    finally { setGerandoPdf(false); }
  }

  return (
    <PortalLayout title={`Orçamento ${o.numero}`}>
      <Link to="/portal/orcamentos" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <div className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-[#213368]">{o.numero}</h2>
          <StatusBadge status={statusDisplay} />
          <div className="ml-auto flex flex-wrap gap-2">
            {cli?.telefone_whatsapp && (
              <a href={whatsappLink(cli.telefone_whatsapp, `Olá ${cli.nome_razao_social}, segue o orçamento ${o.numero} da Agusmaq no valor de ${money(o.valor_total)}, válido até ${dateBR(o.data_validade)}.`)}
                target="_blank" className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            <button onClick={baixarPdf} disabled={gerandoPdf} className="inline-flex items-center gap-1 rounded-md border border-[#213368] px-3 py-1.5 text-xs font-semibold text-[#213368] hover:bg-[#213368] hover:text-white disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> {gerandoPdf ? "Gerando…" : "Baixar PDF"}
            </button>
          </div>
        </div>

        {expirado && <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">Este orçamento venceu em {dateBR(o.data_validade)}.</div>}

        {/* Barra de progresso */}
        <div className="mb-4 flex items-center gap-2 text-xs">
          {STAGES.map((s, i) => {
            const recusadoAqui = s.key === "aprovado" && o.status === "recusado";
            const reached = i <= stageIndex;
            return (
              <div key={s.key} className={`flex items-center gap-2 ${reached ? "font-semibold text-[#213368]" : "text-[#6E7280]"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${recusadoAqui ? "bg-red-600 text-white" : reached ? "bg-[#F37032] text-white" : "bg-gray-200"}`}>
                  {recusadoAqui ? <XIcon className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {recusadoAqui ? "Recusado" : s.label}
                {i < STAGES.length - 1 && <span className="mx-1 h-px w-6 bg-gray-300" />}
              </div>
            );
          })}
        </div>

        {o.status === "recusado" && o.motivo_recusa && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800"><b>Motivo da recusa:</b> {o.motivo_recusa}</div>
        )}

        {o.aluguel_id && (
          <div className="mb-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            Aluguel gerado a partir deste orçamento: <Link to="/portal/alugueis/$id" params={{ id: o.aluguel_id }} className="font-semibold underline">abrir aluguel</Link>
          </div>
        )}

        {/* Ações por estágio */}
        <div className="flex flex-wrap gap-2">
          {o.status === "rascunho" && (
            <button onClick={marcarEnviado} className="inline-flex items-center gap-1 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
              <Send className="h-4 w-4" /> Marcar como enviado
            </button>
          )}
          {o.status === "enviado" && !motivoOpen && (
            <>
              <button onClick={aprovar} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <Check className="h-4 w-4" /> Aprovar
              </button>
              <button onClick={() => setMotivoOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                <XIcon className="h-4 w-4" /> Recusar
              </button>
            </>
          )}
          {motivoOpen && (
            <div className="w-full rounded-md border border-red-200 bg-red-50 p-3">
              <label className="mb-1 block text-xs font-medium text-red-800">Motivo da recusa</label>
              <textarea rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" placeholder="Descreva o motivo (opcional)" />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => { setMotivoOpen(false); setMotivo(""); }} className="rounded-md border px-3 py-1.5 text-sm">Cancelar</button>
                <button onClick={confirmarRecusa} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Confirmar recusa</button>
              </div>
            </div>
          )}
          {o.status === "aprovado" && !o.aluguel_id && (
            <button onClick={gerarAluguel} className="inline-flex items-center gap-1 rounded-md bg-[#213368] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4185]">
              <PackageOpen className="h-4 w-4" /> Gerar aluguel a partir deste orçamento
            </button>
          )}
        </div>
      </div>

      <OrcamentoEditor key={`${o.id}-${o.status}-${o.updated_at}`} initial={o} onSaved={() => {}} />

      {o.historico_status.length > 0 && (
        <div className="mt-4 rounded-lg bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-[#213368]">Histórico</h3>
          <ul className="space-y-1 text-sm">
            {o.historico_status.map((h, i) => (
              <li key={i} className="flex items-center justify-between border-b py-1 last:border-0">
                <StatusBadge status={h.status} />
                <span className="text-[#6E7280]">{dateBR(h.data)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PortalLayout>
  );
}

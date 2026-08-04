import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore, isAtrasado } from "@/lib/portal/store";
import { saldoPorItem } from "@/lib/portal/devolucaoCalc";
import { dateBR, todayISO } from "@/lib/portal/format";
import { gerarTermoDevolucaoPdf } from "@/lib/portal/termoPdf";
import { ArrowLeft, Eraser } from "lucide-react";
import type { CondicaoDevolucao } from "@/lib/portal/types";
import type { NovaDevolucaoItemInput } from "@/lib/portal/store";

export const Route = createFileRoute("/portal/alugueis/$id/devolucao")({
  head: () => ({ meta: [{ title: "Registrar devolução — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: DevolucaoPage,
});

const CONDICOES: { value: CondicaoDevolucao; label: string }[] = [
  { value: "bom", label: "Bom estado" },
  { value: "avariado", label: "Avariado" },
  { value: "nao_devolvido", label: "Não devolvido" },
];

interface EscolhaCodigo { incluido: boolean; condicao: CondicaoDevolucao; observacao: string }
interface EscolhaQuantidade { bom: number; avariado: number; nao_devolvido: number; observacao: string }

function DevolucaoPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { db, registrarDevolucao } = useStore();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [sigData, setSigData] = useState("");
  const [data, setData] = useState(todayISO());
  const [recebidoPor, setRecebidoPor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [valorAvarias, setValorAvarias] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const [porCodigo, setPorCodigo] = useState<Record<string, Record<string, EscolhaCodigo>>>({});
  const [porQuantidade, setPorQuantidade] = useState<Record<string, EscolhaQuantidade>>({});

  const encontrado = db.alugueis.find(x => x.id === id);
  if (!encontrado) return <PortalLayout title="Devolução"><p>Aluguel não encontrado.</p></PortalLayout>;
  const a = encontrado;
  const cli = db.clientes.find(c => c.id === a.cliente_id);
  const saldo = saldoPorItem(a, db.equipamentos);
  const pendentes = saldo.filter(s => s.pendente > 0);

  function limparAssinatura() { sigRef.current?.clear(); setSigData(""); }
  function salvarAssinatura() {
    const c = sigRef.current;
    if (!c || c.isEmpty()) return setSigData("");
    setSigData(c.toDataURL("image/png"));
  }

  function setCodigo(itemId: string, codigo: string, patch: Partial<EscolhaCodigo>) {
    setPorCodigo(p => {
      const atual: EscolhaCodigo = p[itemId]?.[codigo] ?? { incluido: false, condicao: "bom", observacao: "" };
      return { ...p, [itemId]: { ...p[itemId], [codigo]: { ...atual, ...patch } } };
    });
  }
  function setQuantidade(itemId: string, patch: Partial<EscolhaQuantidade>) {
    setPorQuantidade(p => {
      const atual: EscolhaQuantidade = p[itemId] ?? { bom: 0, avariado: 0, nao_devolvido: 0, observacao: "" };
      return { ...p, [itemId]: { ...atual, ...patch } };
    });
  }

  function montarItensDevolucao(): NovaDevolucaoItemInput[] {
    const out: NovaDevolucaoItemInput[] = [];
    for (const s of pendentes) {
      if (s.temCodigos) {
        const escolhas = porCodigo[s.item.id] ?? {};
        const porCondicao = new Map<CondicaoDevolucao, { codigos: string[]; obs: string[] }>();
        for (const codigo of s.codigosPendentes) {
          const escolha = escolhas[codigo];
          if (!escolha?.incluido) continue;
          const cur = porCondicao.get(escolha.condicao) ?? { codigos: [], obs: [] };
          cur.codigos.push(codigo);
          if (escolha.observacao) cur.obs.push(escolha.observacao);
          porCondicao.set(escolha.condicao, cur);
        }
        for (const [condicao, v] of porCondicao) {
          out.push({ aluguel_item_id: s.item.id, quantidade: v.codigos.length, unidades_codigos: v.codigos, condicao, observacao: v.obs.join("; ") });
        }
      } else {
        const q = porQuantidade[s.item.id];
        if (!q) continue;
        (["bom", "avariado", "nao_devolvido"] as CondicaoDevolucao[]).forEach(cond => {
          const val = q[cond];
          if (val > 0) out.push({ aluguel_item_id: s.item.id, quantidade: val, condicao: cond, observacao: q.observacao });
        });
      }
    }
    return out;
  }

  const itensParaEnviar = montarItensDevolucao();
  const totalMarcado = itensParaEnviar.reduce((s, i) => s + i.quantidade, 0);
  const temNaoDevolvido = itensParaEnviar.some(i => i.condicao === "nao_devolvido");
  const excedeu = pendentes.some(s => {
    if (s.temCodigos) return false;
    const q = porQuantidade[s.item.id];
    if (!q) return false;
    return (q.bom + q.avariado + q.nao_devolvido) > s.pendente;
  });

  async function confirmarESalvar() {
    if (totalMarcado === 0) return toast.error("Marque ao menos um item devolvido.");
    if (excedeu) return toast.error("A quantidade marcada excede o pendente de algum item.");
    if (temNaoDevolvido) {
      const ok = confirm("Há item marcado como 'não devolvido' — essa unidade será baixada como perdida, sem retorno físico. Confirmar?");
      if (!ok) return;
    }
    setSalvando(true);
    try {
      const dev = await registrarDevolucao({
        aluguel_id: a.id, data, recebido_por: recebidoPor, observacoes, valor_avarias: valorAvarias,
        itens: itensParaEnviar,
      });
      toast.success("Devolução registrada.");
      try {
        const alComDevolucao = { ...a, devolucoes: [...a.devolucoes, dev] };
        await gerarTermoDevolucaoPdf(dev, alComDevolucao, cli, db.equipamentos, db.configEmpresa, sigData || undefined);
      } catch (e: any) { toast.error("Devolução salva, mas falhou ao gerar o PDF: " + e.message); }
      nav({ to: "/portal/alugueis/$id", params: { id: a.id } });
    } catch (e: any) { toast.error(e.message); }
    finally { setSalvando(false); }
  }

  return (
    <PortalLayout title={`Devolução — Aluguel #${a.numero}`}>
      <Link to="/portal/alugueis/$id" params={{ id: a.id }} className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <div className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[#213368]">Aluguel #{a.numero} — {cli?.nome_razao_social ?? "—"}</p>
            <p className="text-xs text-[#6E7280]">Período: {dateBR(a.data_inicio)} a {dateBR(a.data_prevista_devolucao)}</p>
          </div>
          {isAtrasado(a) && <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Atrasado</span>}
        </div>
      </div>

      {pendentes.length === 0 ? (
        <div className="rounded-lg bg-white p-5 text-sm text-[#6E7280] shadow-sm">Não há itens pendentes de devolução neste aluguel.</div>
      ) : (
        <div className="space-y-3">
          {pendentes.map(s => (
            <div key={s.item.id} className="rounded-lg bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-[#213368]">
                {s.equipamento?.nome ?? "—"} <span className="font-normal text-[#6E7280]">— pendente {s.pendente} de {s.total}</span>
              </p>
              {s.temCodigos ? (
                <div className="space-y-1">
                  {s.codigosPendentes.map(codigo => {
                    const escolha = porCodigo[s.item.id]?.[codigo] ?? { incluido: false, condicao: "bom" as CondicaoDevolucao, observacao: "" };
                    return (
                      <div key={codigo} className="flex flex-wrap items-center gap-2 rounded border p-2">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={escolha.incluido} onChange={e => setCodigo(s.item.id, codigo, { incluido: e.target.checked })} />
                          <span className="font-mono text-xs font-semibold">{codigo}</span>
                        </label>
                        <select value={escolha.condicao} disabled={!escolha.incluido}
                          onChange={e => setCodigo(s.item.id, codigo, { condicao: e.target.value as CondicaoDevolucao })}
                          className="rounded-md border px-2 py-1 text-xs disabled:opacity-50">
                          {CONDICOES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <input placeholder="Observação (opcional)" value={escolha.observacao} disabled={!escolha.incluido}
                          onChange={e => setCodigo(s.item.id, codigo, { observacao: e.target.value })}
                          className="min-w-[160px] flex-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50" />
                      </div>
                    );
                  })}
                  {s.codigosDevolvidos.length > 0 && (
                    <p className="text-[11px] text-[#6E7280]">Já devolvidos em devoluções anteriores: {s.codigosDevolvidos.join(", ")}</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <NumField label="Bom estado" value={porQuantidade[s.item.id]?.bom ?? 0} max={s.pendente}
                    onChange={v => setQuantidade(s.item.id, { bom: v })} />
                  <NumField label="Avariado" value={porQuantidade[s.item.id]?.avariado ?? 0} max={s.pendente}
                    onChange={v => setQuantidade(s.item.id, { avariado: v })} />
                  <NumField label="Não devolvido" value={porQuantidade[s.item.id]?.nao_devolvido ?? 0} max={s.pendente}
                    onChange={v => setQuantidade(s.item.id, { nao_devolvido: v })} />
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#6E7280]">Observação</span>
                    <input value={porQuantidade[s.item.id]?.observacao ?? ""} onChange={e => setQuantidade(s.item.id, { observacao: e.target.value })}
                      className="w-full rounded-md border px-2 py-2 text-sm" />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 rounded-lg bg-white p-5 shadow-sm md:grid-cols-2">
        <label className="block"><span className="mb-1 block text-xs font-medium text-[#6E7280]">Data da devolução</span>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-[#6E7280]">Recebido por</span>
          <input value={recebidoPor} onChange={e => setRecebidoPor(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" /></label>
        <label className="block md:col-span-2"><span className="mb-1 block text-xs font-medium text-[#6E7280]">Observações</span>
          <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} className="w-full rounded-md border px-2 py-2 text-sm" /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-[#6E7280]">Valor de avarias (R$)</span>
          <input type="number" min={0} step="0.01" value={valorAvarias} onChange={e => setValorAvarias(Number(e.target.value))} className="w-full rounded-md border px-2 py-2 text-sm" /></label>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#213368]">Assinatura digital do locatário (opcional)</h3>
        <div className="rounded border bg-white">
          <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full", height: 160 }} onEnd={salvarAssinatura} />
        </div>
        <button onClick={limparAssinatura} className="mt-2 inline-flex items-center gap-1 text-xs text-[#6E7280] hover:text-[#213368]"><Eraser className="h-3 w-3" /> Limpar</button>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={confirmarESalvar} disabled={salvando || pendentes.length === 0}
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {salvando ? "Registrando…" : "Registrar devolução e gerar termo"}
        </button>
      </div>
    </PortalLayout>
  );
}

function NumField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#6E7280]">{label}</span>
      <input type="number" min={0} max={max} value={value} onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full rounded-md border px-2 py-2 text-sm" />
    </label>
  );
}

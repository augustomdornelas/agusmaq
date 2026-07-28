import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayStatus, computeEquipStats, uploadFoto } from "@/lib/portal/store";
import { dateBR, money } from "@/lib/portal/format";
import { ArrowLeft, Camera, Package, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/equipamentos/$id")({
  head: () => ({ meta: [{ title: "Equipamento — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EquipDetail,
});

async function compressImage(file: File, maxSize = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("fail")), "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = URL.createObjectURL(file);
  });
}

function EquipDetail() {
  const { id } = Route.useParams();
  const { db, updateEquipamento } = useStore();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState(false);
  const [uploading, setUploading] = useState(false);

  const e = db.equipamentos.find(x => x.id === id);
  if (!e) return <PortalLayout title="Equipamento"><p>Não encontrado. <Link to="/portal/equipamentos" className="underline">Voltar</Link></p></PortalLayout>;

  const alugueis = db.alugueis.filter(a => a.itens.some(i => i.equipamento_id === id));
  const stats = computeEquipStats(e, db.alugueis);

  async function trocarFoto(file: File) {
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const url = await uploadFoto(blob, "jpg");
      await updateEquipamento(e!.id, { foto_url: url });
      toast.success("Foto atualizada.");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  }

  const meses = stats.por_mes.map(m => ({ ...m, label: m.mes.slice(5) + "/" + m.mes.slice(2, 4) }));

  return (
    <PortalLayout title={e.nome}>
      <Link to="/portal/equipamentos" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-1">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#F4F4F4]">
            {e.foto_url ? (
              <img src={e.foto_url} alt={e.nome} className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightbox(true)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#6E7280]"><Package className="h-16 w-16 opacity-40" /></div>
            )}
            <label className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/80">
              <Camera className="h-3 w-3" /> {uploading ? "..." : "Trocar"}
              <input type="file" accept="image/*" className="hidden" onChange={ev => ev.target.files?.[0] && trocarFoto(ev.target.files[0])} />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <StatusBadge status={e.status} />
            <button onClick={() => navigate({ to: "/portal/alugueis/novo", search: { equipId: e.id } as any })} className="inline-flex items-center gap-1 rounded-md bg-[#F37032] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#db5f22]">
              <Plus className="h-3 w-3" /> Alugar
            </button>
          </div>
          <h2 className="mt-3 text-lg font-bold text-[#213368]">{e.nome}</h2>
          <p className="text-sm text-[#6E7280]">{db.categorias.find(c => c.id === e.categoria_id)?.nome}</p>
          {(() => {
            const codes = (e.codigos_patrimonio && e.codigos_patrimonio.length) ? e.codigos_patrimonio : (e.codigo_patrimonio ? [e.codigo_patrimonio] : []);
            if (!codes.length) return <p className="mt-2 text-xs text-[#6E7280]">Sem código cadastrado</p>;
            return (
              <div className="mt-2">
                <p className="text-[10px] uppercase text-[#6E7280]">Códigos ({codes.length})</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {codes.map(c => <span key={c} className="rounded bg-[#213368]/10 px-2 py-0.5 font-mono text-xs text-[#213368]">{c}</span>)}
                </div>
              </div>
            );
          })()}
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <Info label="Diária" v={money(e.valor_diaria)} />
            <Info label="Semanal" v={money(e.valor_semanal)} />
            <Info label="Mensal" v={money(e.valor_mensal)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Info label="Valor de compra" v={e.valor_compra ? money(e.valor_compra) : "—"} />
            <Info label="Data de compra" v={dateBR(e.data_compra)} />
          </div>
          <p className="mt-3 text-sm text-[#6E7280]">Qtd total: <b className="text-[#1a1a1a]">{e.quantidade_total}</b></p>
          {e.descricao && <p className="mt-3 text-sm">{e.descricao}</p>}
        </div>

        <div className="space-y-4 lg:col-span-2">
          {e.valor_compra <= 0 && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              Cadastre o <b>valor de compra</b> para calcular ROI e payback.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Receita total" v={money(stats.receita_total)} />
            <Kpi label="Receita média/mês" v={money(stats.receita_media_mensal)} />
            <Kpi label="Nº de aluguéis" v={String(stats.n_alugueis)} />
            <Kpi label="Dias alugado" v={String(stats.dias_alugado)} />
            <Kpi label="Taxa de ocupação" v={`${(stats.taxa_ocupacao * 100).toFixed(1)}%`} />
            <Kpi label="Ticket médio" v={money(stats.ticket_medio)} />
          </div>

          {e.valor_compra > 0 && (
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#213368]">ROI e Payback</h3>
                <span className="rounded-full bg-[#213368] px-3 py-1 text-xs font-bold text-white">ROI: {stats.roi_pct.toFixed(0)}%</span>
              </div>
              <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-[#F4F4F4]">
                <div className="h-full bg-gradient-to-r from-[#F37032] to-emerald-500" style={{ width: `${Math.min(100, stats.payback_pct * 100).toFixed(1)}%` }} />
              </div>
              <p className="mt-2 text-sm">
                {stats.payback_pct >= 1
                  ? <><span className="font-semibold text-emerald-700">✅ Equipamento pago{stats.data_pago_em ? ` desde ${dateBR(stats.data_pago_em)}` : ""}</span> — lucro de <b>{money(stats.receita_total - e.valor_compra)}</b></>
                  : <>Faltam <b>{money(e.valor_compra - stats.receita_total)}</b>{stats.meses_para_payback ? ` — payback estimado em ${stats.meses_para_payback} meses` : ""}</>
                }
              </p>
            </div>
          )}

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#213368]">Receita por mês (últimos 12)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meses}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Bar dataKey="receita" fill="#F37032" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-[#213368]">Dias alugado por mês</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={meses}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="dias" fill="#213368" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-[#213368]">Histórico de aluguéis</h3>
            {alugueis.length === 0 ? <p className="text-sm text-[#6E7280]">Nenhum aluguel.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-[#6E7280]"><tr><th className="py-2">Nº</th><th>Cliente</th><th>Período</th><th className="text-right">Qtd</th><th className="text-right">Valor</th><th>Status</th></tr></thead>
                  <tbody>
                    {alugueis.map(a => {
                      const it = a.itens.find(i => i.equipamento_id === id);
                      const cli = db.clientes.find(c => c.id === a.cliente_id);
                      return (
                        <tr key={a.id} className="border-t">
                          <td className="py-2 font-mono text-xs">#{a.numero}</td>
                          <td><Link to="/portal/clientes/$id" params={{ id: a.cliente_id }} className="hover:underline">{cli?.nome_razao_social ?? "—"}</Link></td>
                          <td className="text-xs">{dateBR(a.data_inicio)} → {dateBR(a.data_prevista_devolucao)}</td>
                          <td className="text-right">{it?.quantidade ?? 0}</td>
                          <td className="text-right">{money(Number(it?.subtotal ?? 0))}</td>
                          <td><Link to="/portal/alugueis/$id" params={{ id: a.id }}><StatusBadge status={displayStatus(a)} /></Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightbox && e.foto_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(false)}>
          <img src={e.foto_url} alt={e.nome} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </PortalLayout>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return <div className="rounded bg-[#F4F4F4] p-2"><p className="text-[10px] uppercase text-[#6E7280]">{label}</p><p className="font-semibold">{v}</p></div>;
}
function Kpi({ label, v }: { label: string; v: string }) {
  return <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs text-[#6E7280]">{label}</p><p className="mt-1 text-xl font-bold text-[#213368]">{v}</p></div>;
}

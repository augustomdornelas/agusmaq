import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft, Pencil, PackageOpen, PackageCheck, Wrench, MapPin, Activity,
  Trash2, Paperclip, X, Search, Package,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar, PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import {
  useStore, computeEquipStats, displayStatus, uploadManutencaoAnexo, getManutencaoAnexoUrl,
} from "@/lib/portal/store";
import { money, dateBR, pct, todayISO } from "@/lib/portal/format";
import { CHART_BLUE, CHART_ORANGE, CHART_RED, CHART_GRID, CHART_AXIS, STATUS_CHART_COLORS } from "@/lib/portal/chartColors";
import type { Manutencao, ManutencaoAnexo, ManutencaoStatus, ManutencaoTipo } from "@/lib/portal/types";
import { EquipamentoForm } from "./portal.equipamentos.index";

export const Route = createFileRoute("/portal/equipamentos/$id")({
  head: () => ({ meta: [{ title: "Equipamento — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EquipDetail,
});

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function mesLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MESES_ABREV[Number(m) - 1] ?? m}/${(y ?? "").slice(2)}`;
}
function diffDias(a: string, b: string) {
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.max(0, Math.round((d2 - d1) / 86400000) + 1);
}

function EquipDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { db, loading, updateEquipamento, deleteEquipamento, addManutencao, encerrarManutencao } = useStore();

  const [openEdit, setOpenEdit] = useState(false);
  const [openMn, setOpenMn] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openEncerrarMn, setOpenEncerrarMn] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const eq = db.equipamentos.find(e => e.id === id);

  const alugueis = useMemo(() => db.alugueis.filter(a => a.itens.some(i => i.equipamento_id === id)).sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)), [db.alugueis, id]);
  const manutencoes = useMemo(() => db.manutencoes.filter(m => m.equipamento_id === id).sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)), [db.manutencoes, id]);
  const stats = useMemo(() => (eq ? computeEquipStats(eq, db.alugueis, db.manutencoes) : null), [eq, db.alugueis, db.manutencoes]);

  const timeline = useMemo(() => {
    const items: { data: string; titulo: string; sub: string; cor: string }[] = [];
    alugueis.forEach(a => {
      const it = a.itens.find(i => i.equipamento_id === id);
      const cli = db.clientes.find(c => c.id === a.cliente_id)?.nome_razao_social ?? "—";
      items.push({ data: a.data_inicio, titulo: `Aluguel → ${a.destino || cli}`, sub: `${cli} · ${money(Number(it?.subtotal || 0))}`, cor: CHART_BLUE });
      if (a.data_devolucao_real) items.push({ data: a.data_devolucao_real, titulo: "Devolução", sub: a.destino || cli, cor: "#0ca30c" });
    });
    manutencoes.forEach(m => {
      items.push({ data: m.data_inicio, titulo: `Manutenção — ${m.tipo}`, sub: `${m.oficina || "—"} · ${money(m.custo)}`, cor: CHART_RED });
      if (m.data_fim) items.push({ data: m.data_fim, titulo: "Manutenção concluída", sub: m.descricao, cor: "#0ca30c" });
    });
    return items.sort((a, b) => b.data.localeCompare(a.data));
  }, [alugueis, manutencoes, db.clientes, id]);

  if (loading) {
    return (
      <PortalLayout title="Equipamento">
        <div className="space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-white" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-96 animate-pulse rounded-lg bg-white lg:col-span-1" />
            <div className="h-96 animate-pulse rounded-lg bg-white lg:col-span-2" />
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!eq || !stats) {
    return (
      <PortalLayout title="Equipamento">
        <div className="rounded-lg bg-white p-10 text-center shadow-sm">
          <p className="text-[#6E7280]">Equipamento não encontrado.</p>
          <Link to="/portal/equipamentos" className="mt-3 inline-block font-semibold text-[#213368] hover:underline">
            <ChevronLeft className="mr-1 inline h-4 w-4" /> Voltar
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const categoriaNome = db.categorias.find(c => c.id === eq.categoria_id)?.nome ?? "—";
  const localBaseNome = db.locais.find(l => l.id === eq.local_base_id)?.nome ?? "—";
  const localAtualNome = db.locais.find(l => l.id === eq.local_atual_id)?.nome ?? "—";
  const codes = (eq.codigos_patrimonio && eq.codigos_patrimonio.length) ? eq.codigos_patrimonio : (eq.codigo_patrimonio ? [eq.codigo_patrimonio] : []);

  const porMes = stats.por_mes.map(m => ({ ...m, label: mesLabel(m.mes) }));
  const totalDiasDist = stats.dias_disponivel + stats.dias_alugado + stats.dias_manutencao || 1;
  const statusDist = [
    { name: "Disponível", value: stats.dias_disponivel, pct: (stats.dias_disponivel / totalDiasDist) * 100, color: STATUS_CHART_COLORS.disponivel },
    { name: "Alugado", value: stats.dias_alugado, pct: (stats.dias_alugado / totalDiasDist) * 100, color: STATUS_CHART_COLORS.alugado },
    { name: "Manutenção", value: stats.dias_manutencao, pct: (stats.dias_manutencao / totalDiasDist) * 100, color: STATUS_CHART_COLORS.manutencao },
  ].filter(d => d.value > 0);
  const pctRecup = eq.valor_compra > 0 ? Math.min(100, stats.payback_pct * 100) : 0;

  const mnAberta = manutencoes.find(m => m.id === openEncerrarMn) ?? null;

  async function toggleCatalogo(v: boolean) {
    try {
      await updateEquipamento(eq!.id, { exibir_catalogo: v });
      toast.success(v ? "Adicionado ao catálogo público." : "Removido do catálogo público.");
    } catch (err: any) { toast.error(err.message); }
  }

  async function confirmarExclusao() {
    setDeleting(true);
    try {
      await deleteEquipamento(eq!.id);
      toast.success("Equipamento excluído.");
      navigate({ to: "/portal/equipamentos" });
    } catch (err: any) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  return (
    <PortalLayout title={eq.nome}>
      {/* Barra superior */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/portal/equipamentos" className="inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setOpenEdit(true)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
          <Button onClick={() => navigate({ to: "/portal/alugueis/novo", search: { equipId: eq.id } as any })} className="bg-[#213368] text-white hover:bg-[#2a4185]">
            <PackageOpen className="mr-1 h-4 w-4" /> Registrar aluguel
          </Button>
          <Button onClick={() => setOpenMn(true)} className="bg-[#F37032] text-white hover:bg-[#db5f22]">
            <Wrench className="mr-1 h-4 w-4" /> Registrar manutenção
          </Button>
          <Button variant="destructive" onClick={() => setOpenDelete(true)} className="bg-red-600 text-white hover:bg-red-700">
            <Trash2 className="mr-1 h-4 w-4" /> Excluir equipamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="overflow-hidden">
            <div
              className={`relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-[#213368] to-[#2a4185] ${eq.foto_url ? "cursor-pointer" : ""}`}
              onClick={() => eq.foto_url && setLightboxOpen(true)}
            >
              {eq.foto_url ? (
                <>
                  <img src={eq.foto_url} alt={eq.nome} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 hover:bg-black/20" />
                  <div className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#213368] shadow-md">
                    <Search className="h-4 w-4" />
                  </div>
                </>
              ) : (
                <Package className="h-24 w-24 text-white/90" strokeWidth={1.2} />
              )}
            </div>
            <div className="space-y-3 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#F37032]">
                  {codes.join(", ") || "—"} · {categoriaNome}
                </div>
                <h1 className="text-xl font-extrabold text-[#213368]">{eq.nome}</h1>
              </div>
              {eq.descricao && <p className="text-sm text-[#6E7280]">{eq.descricao}</p>}
              <div className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex items-center gap-2 text-[#6E7280]"><MapPin className="h-4 w-4" /> Local base: <span className="text-[#1a1a1a]">{localBaseNome}</span></div>
                <div className="flex items-center gap-2 text-[#6E7280]"><Activity className="h-4 w-4" /> Local atual: <span className="text-[#1a1a1a]">{localAtualNome}</span></div>
              </div>
              <div><StatusBadge status={eq.status} /></div>
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
                <div className="text-xs">
                  <div className="font-semibold text-[#213368]">Exibir no catálogo público</div>
                  <div className="text-[#6E7280]">Aparece em /catalogo quando disponível</div>
                </div>
                <Switch checked={!!eq.exibir_catalogo} onCheckedChange={toggleCatalogo} />
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <div className="text-sm font-bold text-[#213368]">Resumo financeiro</div>
            <KpiRow label="Valor do equipamento" value={money(eq.valor_compra)} />
            <KpiRow label="Total gerado" value={money(stats.receita_total)} color={CHART_ORANGE} />
            <KpiRow label="Custo de manutenções" value={money(stats.custo_manutencao)} color={CHART_RED} />
            <div className="border-t pt-3">
              <KpiRow label="Resultado líquido" value={money(stats.liquido)} color={stats.liquido >= 0 ? "#0ca30c" : CHART_RED} bold />
              <KpiRow label="ROI" value={pct(stats.roi_pct)} color={stats.roi_pct >= 0 ? "#0ca30c" : CHART_RED} bold />
            </div>
            <div className="border-t pt-3">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[#6E7280]">Payback</span>
                <span className="font-semibold text-[#213368]">{pct(pctRecup)}</span>
              </div>
              <Progress value={pctRecup} className="h-2" />
              <div className="mt-1 text-[11px] text-[#6E7280]">Recuperado {money(stats.receita_total)} de {money(eq.valor_compra)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-center">
              <div>
                <div className="text-[11px] text-[#6E7280]">Dias em uso</div>
                <div className="text-lg font-extrabold text-[#213368]">{stats.dias_alugado}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E7280]">Dias disponíveis</div>
                <div className="text-lg font-extrabold text-emerald-600">{stats.dias_disponivel}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* COLUNA DIREITA — gráficos */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold text-[#213368]">Receita acumulada vs. valor do equipamento</div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={porMes}>
                  <defs>
                    <linearGradient id="gAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={CHART_AXIS} />
                  <YAxis tick={{ fontSize: 11 }} stroke={CHART_AXIS} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {eq.valor_compra > 0 && (
                    <ReferenceLine y={eq.valor_compra} stroke={CHART_ORANGE} strokeDasharray="5 5" label={{ value: "Valor do equipamento", position: "right", fill: CHART_ORANGE, fontSize: 11 }} />
                  )}
                  <Area type="monotone" dataKey="acumulado" name="Receita acumulada" stroke={CHART_BLUE} strokeWidth={2} fill="url(#gAcum)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-[#213368]">Receita por mês</div>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={porMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={CHART_AXIS} />
                    <YAxis tick={{ fontSize: 11 }} stroke={CHART_AXIS} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="receita" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-2 text-sm font-semibold text-[#213368]">Custo de manutenção por mês</div>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={porMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={CHART_AXIS} />
                    <YAxis tick={{ fontSize: 11 }} stroke={CHART_AXIS} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Bar dataKey="custo" fill={CHART_RED} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold text-[#213368]">Distribuição de tempo</div>
            <div className="h-56">
              {statusDist.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[#6E7280]">Sem histórico suficiente.</div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {statusDist.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v} dias`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value, entry: any) => `${value} — ${entry?.payload?.pct?.toFixed(0) ?? 0}%`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ABAS */}
      <Tabs defaultValue="emp" className="mt-4">
        <TabsList>
          <TabsTrigger value="emp">Aluguéis</TabsTrigger>
          <TabsTrigger value="manut">Manutenções</TabsTrigger>
          <TabsTrigger value="hist">Histórico completo</TabsTrigger>
        </TabsList>

        <TabsContent value="emp" className="mt-4">
          <Card className="p-4">
            <div className="mb-3 flex justify-end">
              <Button onClick={() => navigate({ to: "/portal/alugueis/novo", search: { equipId: eq.id } as any })} className="bg-[#213368] text-white hover:bg-[#2a4185]">
                <PackageOpen className="mr-1 h-4 w-4" /> Registrar aluguel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Devolução prev.</TableHead>
                  <TableHead>Devolução real</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Custo/período</TableHead>
                  <TableHead>Custo total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {alugueis.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="py-8 text-center text-[#6E7280]">Sem aluguéis registrados</TableCell></TableRow>
                  )}
                  {alugueis.map(a => {
                    const it = a.itens.find(i => i.equipamento_id === id);
                    const cli = db.clientes.find(c => c.id === a.cliente_id)?.nome_razao_social ?? "—";
                    const fim = a.data_devolucao_real || a.data_prevista_devolucao;
                    const periodo = diffDias(a.data_inicio, fim);
                    return (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-[#F4F4F4]/60" onClick={() => navigate({ to: "/portal/alugueis/$id", params: { id: a.id } })}>
                        <TableCell>{a.destino || cli}</TableCell>
                        <TableCell>{cli}</TableCell>
                        <TableCell>{dateBR(a.data_inicio)}</TableCell>
                        <TableCell>{dateBR(a.data_prevista_devolucao)}</TableCell>
                        <TableCell>{dateBR(a.data_devolucao_real)}</TableCell>
                        <TableCell>{periodo} dia(s)</TableCell>
                        <TableCell>{money(Number(it?.valor_unitario || 0))}/{a.tipo_cobranca}</TableCell>
                        <TableCell className="font-semibold text-[#F37032]">{money(Number(it?.subtotal || 0))}</TableCell>
                        <TableCell><StatusBadge status={displayStatus(a)} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="manut" className="mt-4">
          <Card className="p-4">
            <div className="mb-3 flex justify-end">
              <Button onClick={() => setOpenMn(true)} className="bg-[#F37032] text-white hover:bg-[#db5f22]">
                <Wrench className="mr-1 h-4 w-4" /> Registrar manutenção
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Oficina/Resp.</TableHead>
                  <TableHead>Peças</TableHead>
                  <TableHead>Mão de obra</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {manutencoes.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="py-8 text-center text-[#6E7280]">Sem manutenções registradas</TableCell></TableRow>
                  )}
                  {manutencoes.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{dateBR(m.data_inicio)}</TableCell>
                      <TableCell>{dateBR(m.data_fim)}</TableCell>
                      <TableCell><StatusBadge status={m.tipo} /></TableCell>
                      <TableCell className="max-w-[220px] truncate" title={m.descricao}>{m.descricao}</TableCell>
                      <TableCell>{m.oficina || "—"}</TableCell>
                      <TableCell>{money(m.custo_pecas)}</TableCell>
                      <TableCell>{money(m.custo_mao_obra)}</TableCell>
                      <TableCell className="font-semibold text-[#d03b3b]">{money(m.custo)}</TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell><AnexosCell anexos={m.anexos} /></TableCell>
                      <TableCell>
                        {m.status !== "concluida" && (
                          <Button size="sm" variant="outline" onClick={() => setOpenEncerrarMn(m.id)}>Encerrar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="hist" className="mt-4">
          <Card className="p-6">
            {timeline.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#6E7280]">Sem eventos registrados.</div>
            ) : (
              <ol className="relative border-l-2 border-[#F4F4F4] pl-6">
                {timeline.map((ev, i) => (
                  <li key={i} className="mb-6 last:mb-0">
                    <span className="absolute -left-[7px] h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: ev.cor }} />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-bold text-[#213368]">{ev.titulo}</div>
                      <div className="text-xs text-[#6E7280]">· {dateBR(ev.data)}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-[#6E7280]">{ev.sub}</div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {openEdit && (
        <EquipamentoForm
          initial={eq}
          locais={db.locais}
          onClose={() => setOpenEdit(false)}
          onSave={async (data) => {
            try { await updateEquipamento(eq.id, data); toast.success("Equipamento atualizado."); setOpenEdit(false); }
            catch (err: any) { toast.error(err.message); }
          }}
        />
      )}

      <ManutencaoDialog
        open={openMn}
        onOpenChange={setOpenMn}
        onSave={async (m) => {
          try { await addManutencao({ ...m, equipamento_id: eq.id }); toast.success("Manutenção registrada."); }
          catch (err: any) { toast.error(err.message); }
        }}
      />

      {mnAberta && (
        <EncerrarManutencaoDialog
          key={mnAberta.id}
          manutencao={mnAberta}
          onClose={() => setOpenEncerrarMn(null)}
          onConfirm={async (mid, patch) => { await encerrarManutencao(mid, patch); }}
        />
      )}

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-[#213368]">Excluir equipamento</DialogTitle></DialogHeader>
          <p className="text-sm text-[#6E7280]">Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)} disabled={deleting}>Cancelar</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" disabled={deleting} onClick={confirmarExclusao}>
              <Trash2 className="mr-1 h-4 w-4" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lightboxOpen && eq.foto_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxOpen(false)}>
          <button aria-label="Fechar" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
            <X className="h-6 w-6" />
          </button>
          <img src={eq.foto_url} alt={eq.nome} onClick={e => e.stopPropagation()} className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" />
        </div>
      )}
    </PortalLayout>
  );
}

function KpiRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#6E7280]">{label}</span>
      <span className={bold ? "text-base font-extrabold" : "font-semibold"} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function AnexosCell({ anexos }: { anexos: ManutencaoAnexo[] }) {
  if (!anexos || anexos.length === 0) return <span className="text-xs text-[#6E7280]">—</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-[#213368] hover:underline">
          <Paperclip className="h-3.5 w-3.5" /> {anexos.length}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <ul className="space-y-1">
          {anexos.map((a, i) => (
            <li key={i}>
              <button
                onClick={async () => {
                  try { const url = await getManutencaoAnexoUrl(a.path); window.open(url, "_blank"); }
                  catch (err: any) { toast.error(err.message); }
                }}
                className="w-full truncate text-left text-xs text-[#213368] hover:underline"
              >
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ManutencaoDialog({ open, onOpenChange, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSave: (m: { tipo: ManutencaoTipo; data_inicio: string; data_fim: null; descricao: string; oficina: string; custo_pecas: number; custo_mao_obra: number; status: ManutencaoStatus }) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<ManutencaoTipo>("preventiva");
  const [dataInicio, setDataInicio] = useState(todayISO());
  const [descricao, setDescricao] = useState("");
  const [oficina, setOficina] = useState("");
  const [custoPecas, setCustoPecas] = useState(0);
  const [custoMaoObra, setCustoMaoObra] = useState(0);
  const [status, setStatus] = useState<ManutencaoStatus>("aberta");

  async function salvar() {
    if (!descricao.trim()) return toast.error("Descreva a manutenção");
    await onSave({ tipo, data_inicio: dataInicio, data_fim: null, descricao, oficina, custo_pecas: custoPecas, custo_mao_obra: custoMaoObra, status });
    onOpenChange(false);
    setDescricao(""); setOficina(""); setCustoPecas(0); setCustoMaoObra(0); setStatus("aberta"); setTipo("preventiva"); setDataInicio(todayISO());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Registrar manutenção</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={v => setTipo(v as ManutencaoTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="corretiva">Corretiva</SelectItem>
                <SelectItem value="emergencial">Emergencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as ManutencaoStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Data de início *</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
          <div><Label>Oficina / responsável</Label><Input value={oficina} onChange={e => setOficina(e.target.value)} placeholder="Ex.: Oficina Central" /></div>
          <div className="md:col-span-2"><Label>Descrição *</Label><Textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
          <div><Label>Custo peças estimado (R$)</Label><Input type="number" min={0} step="0.01" value={custoPecas} onChange={e => setCustoPecas(Number(e.target.value))} /></div>
          <div><Label>Custo mão de obra estimado (R$)</Label><Input type="number" min={0} step="0.01" value={custoMaoObra} onChange={e => setCustoMaoObra(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} className="bg-[#F37032] text-white hover:bg-[#db5f22]">Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EncerrarManutencaoDialog({ manutencao, onClose, onConfirm }: {
  manutencao: Manutencao;
  onClose: () => void;
  onConfirm: (id: string, patch: { data_fim: string; custo_pecas: number; custo_mao_obra: number; oficina?: string | null; descricao?: string; anexos?: ManutencaoAnexo[] }) => Promise<void>;
}) {
  const [dataFim, setDataFim] = useState(todayISO());
  const [oficina, setOficina] = useState(manutencao.oficina ?? "");
  const [descricao, setDescricao] = useState(manutencao.descricao);
  const [custoPecas, setCustoPecas] = useState(manutencao.custo_pecas);
  const [custoMaoObra, setCustoMaoObra] = useState(manutencao.custo_mao_obra);
  const [novosArquivos, setNovosArquivos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    setSaving(true);
    try {
      const novosAnexos = await Promise.all(novosArquivos.map(f => uploadManutencaoAnexo(manutencao.id, f)));
      await onConfirm(manutencao.id, {
        data_fim: dataFim, custo_pecas: custoPecas, custo_mao_obra: custoMaoObra,
        oficina: oficina || null, descricao,
        anexos: [...(manutencao.anexos ?? []), ...novosAnexos],
      });
      toast.success("Manutenção encerrada.");
      onClose();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Encerrar manutenção</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Data fim *</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          <div><Label>Oficina / responsável</Label><Input value={oficina} onChange={e => setOficina(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
          <div><Label>Custo peças (R$)</Label><Input type="number" min={0} step="0.01" value={custoPecas} onChange={e => setCustoPecas(Number(e.target.value))} /></div>
          <div><Label>Custo mão de obra (R$)</Label><Input type="number" min={0} step="0.01" value={custoMaoObra} onChange={e => setCustoMaoObra(Number(e.target.value))} /></div>
          <div className="md:col-span-2">
            <Label>Anexos (nota fiscal, orçamento, fotos)</Label>
            <Input type="file" multiple onChange={e => setNovosArquivos(Array.from(e.target.files ?? []))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={saving} className="bg-[#213368] text-white hover:bg-[#2a4185]">
            {saving ? "Salvando…" : "Encerrar manutenção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

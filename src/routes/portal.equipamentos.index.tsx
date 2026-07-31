import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, uploadFoto } from "@/lib/portal/store";
import { money, dateBR, pct, normalizeSearch } from "@/lib/portal/format";
import { compressImage } from "@/lib/portal/image";
import { STATUS_CHART_COLORS, STATUS_LABELS, CHART_BLUE, CHART_ORANGE, CHART_GRID, CHART_AXIS } from "@/lib/portal/chartColors";
import {
  Plus, Search, X, ChevronDown, ChevronRight, Image as ImageIcon, Upload,
  FolderPlus, MapPinned, MapPin, Pencil, Trash2, PackageOpen, ArrowRight,
  DollarSign, TrendingUp, TrendingDown, Wallet, Wrench,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import type { Equipamento, EquipamentoStatus, Local, LocalTipo } from "@/lib/portal/types";

export const Route = createFileRoute("/portal/equipamentos/")({
  head: () => ({ meta: [{ title: "Equipamentos — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EquipamentosPage,
});

const STATUSES: EquipamentoStatus[] = ["disponivel", "alugado", "manutencao", "inativo"];
const TIPOS_LOCAL: LocalTipo[] = ["Base", "Almoxarifado", "Obra"];

function EquipamentosPage() {
  const { db, addEquipamento, addCategoria, addLocal, updateLocal, deleteLocal } = useStore();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [statusF, setStatusF] = useState<string>("todos");
  const [catF, setCatF] = useState<string>("todas");
  const [open, setOpen] = useState(false);
  const [novaCategoriaId, setNovaCategoriaId] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openGrupo, setOpenGrupo] = useState(false);
  const [openLocais, setOpenLocais] = useState(false);

  const q = normalizeSearch(busca);
  function codesOf(e: Equipamento): string[] {
    const arr = e.codigos_patrimonio && e.codigos_patrimonio.length ? e.codigos_patrimonio : (e.codigo_patrimonio ? [e.codigo_patrimonio] : []);
    return arr;
  }

  const filtered = useMemo(() => db.equipamentos.filter(e => {
    const okQ = !q || normalizeSearch(e.nome).includes(q) || codesOf(e).some(c => normalizeSearch(c).includes(q));
    const okS = statusF === "todos" || e.status === statusF;
    const okC = catF === "todas" || e.categoria_id === catF;
    return okQ && okS && okC;
  }), [db.equipamentos, q, statusF, catF]);

  const grupos = useMemo(() => {
    const cats = [...db.categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return cats.map(c => ({
      cat: c,
      items: filtered.filter(e => e.categoria_id === c.id).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    })).filter(g => g.items.length > 0 || !q);
  }, [db.categorias, filtered, q]);

  const openGroups = q ? new Set(grupos.filter(g => g.items.length > 0).map(g => g.cat.id)) : expanded;
  function toggle(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // --- Indicadores (frota inteira, não afetados por filtros) ---
  const kpis = useMemo(() => {
    const ativos = db.equipamentos.filter(e => e.status !== "inativo");
    const emUso = db.equipamentos.filter(e => e.status === "alugado").length;
    const disponiveis = db.equipamentos.filter(e => e.status === "disponivel").length;
    const manutencao = db.equipamentos.filter(e => e.status === "manutencao").length;
    const valorFrota = db.equipamentos.reduce((a, e) => a + Number(e.valor_compra || 0), 0);
    const receitaTotal = db.alugueis.filter(a => a.status !== "cancelado")
      .reduce((a, al) => a + al.itens.reduce((s, it) => s + Number(it.subtotal || 0), 0), 0);
    const custoManut = db.manutencoes.reduce((a, m) => a + Number(m.custo || 0), 0);
    const roi = valorFrota > 0 ? ((receitaTotal - custoManut) / valorFrota) * 100 : 0;
    return { total: ativos.length, emUso, disponiveis, manutencao, valorFrota, receitaTotal, custoManut, roi };
  }, [db.equipamentos, db.alugueis, db.manutencoes]);

  // --- Gráficos (frota inteira) ---
  const charts = useMemo(() => {
    const nomeCategoria = (id: string) => db.categorias.find(c => c.id === id)?.nome ?? "Sem categoria";

    const statusCount: Record<string, number> = { disponivel: 0, alugado: 0, manutencao: 0, inativo: 0 };
    db.equipamentos.forEach(e => { statusCount[e.status] = (statusCount[e.status] ?? 0) + 1; });
    const porStatus = Object.entries(statusCount)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v, color: STATUS_CHART_COLORS[k] ?? CHART_AXIS }));

    const valorCatMap = new Map<string, number>();
    db.equipamentos.forEach(e => {
      const nome = nomeCategoria(e.categoria_id);
      valorCatMap.set(nome, (valorCatMap.get(nome) ?? 0) + Number(e.valor_compra || 0));
    });
    const valorPorCategoria = Array.from(valorCatMap.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);

    const receitaCatMap = new Map<string, number>();
    db.equipamentos.filter(e => e.status !== "inativo").forEach(e => {
      const nome = nomeCategoria(e.categoria_id);
      receitaCatMap.set(nome, (receitaCatMap.get(nome) ?? 0) + Number(e.valor_diaria || 0));
    });
    const receitaPorCategoria = Array.from(receitaCatMap.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);

    const potencialDia = db.equipamentos.filter(e => e.status !== "inativo").reduce((a, e) => a + Number(e.valor_diaria || 0), 0);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const alugueisAtivos = db.alugueis.filter(a => a.status !== "cancelado" && a.status !== "orcamento");
    const receitaPotVsGer: { dia: string; potencial: number; gerada: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje); d.setDate(hoje.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      let gerada = 0;
      alugueisAtivos.forEach(a => {
        if (a.data_inicio > iso) return;
        const fim = a.data_devolucao_real || a.data_prevista_devolucao;
        if (fim < iso) return;
        a.itens.forEach(it => {
          const eq = db.equipamentos.find(x => x.id === it.equipamento_id);
          if (eq) gerada += Number(eq.valor_diaria || 0) * it.quantidade;
        });
      });
      receitaPotVsGer.push({ dia: label, potencial: Math.round(potencialDia), gerada: Math.round(gerada) });
    }

    const acMap = new Map<string, { categoria: string; alugados: number; disponiveis: number }>();
    db.equipamentos.forEach(e => {
      const nome = nomeCategoria(e.categoria_id);
      if (!acMap.has(nome)) acMap.set(nome, { categoria: nome, alugados: 0, disponiveis: 0 });
      const row = acMap.get(nome)!;
      if (e.status === "alugado") row.alugados += 1;
      else if (e.status === "disponivel") row.disponiveis += 1;
    });
    const alugadosVsDisp = Array.from(acMap.values()).sort((a, b) => (b.alugados + b.disponiveis) - (a.alugados + a.disponiveis));

    const anoAtual = new Date().getFullYear();
    const mesesLbl = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const evolucao = mesesLbl.map(mes => ({ mes, qtd: 0 }));
    db.alugueis.filter(a => a.status !== "cancelado").forEach(a => {
      const d = new Date(a.data_inicio + "T00:00:00");
      if (!isNaN(d.getTime()) && d.getFullYear() === anoAtual) evolucao[d.getMonth()].qtd += 1;
    });

    return { porStatus, valorPorCategoria, receitaPorCategoria, receitaPotVsGer, alugadosVsDisp, evolucao };
  }, [db.equipamentos, db.categorias, db.alugueis]);

  function highlight(text: string): React.ReactNode {
    if (!q) return text;
    const nt = normalizeSearch(text);
    const i = nt.indexOf(q);
    if (i < 0) return text;
    return <>{text.slice(0, i)}<mark className="bg-yellow-200">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
  }

  function abrirNovo(categoriaId?: string) {
    setNovaCategoriaId(categoriaId);
    setOpen(true);
  }

  return (
    <PortalLayout title="Equipamentos">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#213368]">Equipamentos</h2>
          <p className="text-sm text-[#6E7280]">Frota, aluguéis, manutenções e rentabilidade</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOpenGrupo(true)} className="inline-flex items-center gap-2 rounded-md border border-[#213368] px-3 py-2 text-sm font-semibold text-[#213368] hover:bg-[#213368] hover:text-white">
            <FolderPlus className="h-4 w-4" /> Novo grupo
          </button>
          <button onClick={() => setOpenLocais(true)} className="inline-flex items-center gap-2 rounded-md border border-[#213368] px-3 py-2 text-sm font-semibold text-[#213368] hover:bg-[#213368] hover:text-white">
            <MapPinned className="h-4 w-4" /> Gerenciar locais
          </button>
          <button onClick={() => abrirNovo()} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]">
            <Plus className="h-4 w-4" /> Novo equipamento
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Total" value={String(kpis.total)} color="#213368" />
        <Kpi label="Em uso" value={String(kpis.emUso)} color="#213368" />
        <Kpi label="Disponíveis" value={String(kpis.disponiveis)} color="#0ca30c" />
        <Kpi label="Em manutenção" value={String(kpis.manutencao)} color="#c98500" />
        <Kpi label="Valor total da frota" value={money(kpis.valorFrota)} color="#213368" icon={Wallet} />
        <Kpi label="Receita total" value={money(kpis.receitaTotal)} color="#F37032" />
        <Kpi label="Custo manutenções" value={money(kpis.custoManut)} color="#d03b3b" icon={Wrench} />
        <Kpi label="ROI médio da frota" value={pct(kpis.roi)} color={kpis.roi >= 0 ? "#0ca30c" : "#d03b3b"} icon={kpis.roi >= 0 ? TrendingUp : TrendingDown} />
      </div>

      {/* Gráficos */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Equipamentos por status">
          {charts.porStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.porStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {charts.porStatus.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <Vazio />}
        </ChartCard>

        <ChartCard title="Valor da frota por categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.valorPorCategoria} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" stroke={CHART_AXIS} fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="categoria" stroke={CHART_AXIS} fontSize={11} width={100} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="valor" name="Valor" fill={CHART_BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Receita diária potencial por categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.receitaPorCategoria}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="categoria" stroke={CHART_AXIS} fontSize={11} />
              <YAxis stroke={CHART_AXIS} fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="valor" name="Receita/dia" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Receita potencial vs. gerada (7 dias)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.receitaPotVsGer}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="dia" stroke={CHART_AXIS} fontSize={11} />
              <YAxis stroke={CHART_AXIS} fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="potencial" name="Potencial" fill={CHART_BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="gerada" name="Gerada" fill={CHART_ORANGE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alugados vs. disponíveis por categoria">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.alugadosVsDisp}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="categoria" stroke={CHART_AXIS} fontSize={11} />
              <YAxis stroke={CHART_AXIS} fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="alugados" name="Alugados" fill={CHART_BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="disponiveis" name="Disponíveis" fill="#0ca30c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução de aluguéis por mês">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="mes" stroke={CHART_AXIS} fontSize={11} />
              <YAxis stroke={CHART_AXIS} fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="qtd" name="Aluguéis" stroke={CHART_ORANGE} strokeWidth={2} dot={{ r: 3, fill: CHART_BLUE }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Busca e filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#6E7280]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou código…"
            className="w-full rounded-md border bg-white pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="todos">Todos os status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={catF} onChange={e => setCatF(e.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm">
          <option value="todas">Todas as categorias</option>
          {[...db.categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {grupos.length === 0 && <p className="rounded-lg bg-white p-8 text-center text-sm text-[#6E7280]">Nenhum equipamento encontrado.</p>}
        {grupos.map(({ cat, items }) => {
          const isOpen = openGroups.has(cat.id);
          return (
            <div key={cat.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <button onClick={() => toggle(cat.id)} className="flex items-center gap-2 text-left">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-[#213368]" /> : <ChevronRight className="h-4 w-4 text-[#213368]" />}
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#213368]">{cat.nome}</h3>
                  <span className="rounded-full bg-[#213368]/10 px-2 py-0.5 text-[10px] font-bold text-[#213368]">{items.length}</span>
                </button>
                <button onClick={() => abrirNovo(cat.id)} className="inline-flex items-center gap-1 rounded-md border border-[#F37032] px-3 py-1.5 text-xs font-semibold text-[#F37032] hover:bg-[#F37032] hover:text-white">
                  <Plus className="h-3.5 w-3.5" /> Novo equipamento
                </button>
              </div>
              {isOpen && (
                <div className="p-4">
                  {items.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#6E7280]">Nenhum equipamento neste grupo.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map(e => (
                        <EquipCard
                          key={e.id}
                          eq={e}
                          codes={codesOf(e)}
                          categoriaNome={cat.nome}
                          local={db.locais.find(l => l.id === e.local_base_id) ?? null}
                          highlight={highlight}
                          onAlugar={() => navigate({ to: "/portal/alugueis/novo", search: { equipId: e.id } as any })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <EquipamentoForm
          initial={null}
          initialCategoriaId={novaCategoriaId}
          locais={db.locais}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            try {
              await addEquipamento(data);
              toast.success("Equipamento cadastrado.");
              setOpen(false);
            } catch (err: any) { toast.error(err.message); }
          }}
        />
      )}

      {openGrupo && (
        <NovoGrupoDialog
          onClose={() => setOpenGrupo(false)}
          onSave={async (nome) => {
            try {
              const ordem = (db.categorias.at(-1)?.ordem ?? 0) + 1;
              await addCategoria({ nome, descricao: "", foto_url: "", ordem, ativa: true });
              toast.success("Grupo criado.");
              setOpenGrupo(false);
            } catch (err: any) { toast.error(err.message); }
          }}
        />
      )}

      {openLocais && (
        <GerenciarLocaisDialog
          locais={db.locais}
          onClose={() => setOpenLocais(false)}
          onAdd={async (l) => { try { await addLocal(l); toast.success("Local criado."); } catch (e: any) { toast.error(e.message); } }}
          onUpdate={async (id, patch) => { try { await updateLocal(id, patch); toast.success("Local atualizado."); } catch (e: any) { toast.error(e.message); } }}
          onDelete={async (id) => { try { await deleteLocal(id); toast.success("Local excluído."); } catch (e: any) { toast.error(e.message); } }}
        />
      )}
    </PortalLayout>
  );
}

function EquipCard({ eq, codes, categoriaNome, local, highlight, onAlugar }: {
  eq: Equipamento; codes: string[]; categoriaNome: string; local: Local | null;
  highlight: (t: string) => React.ReactNode; onAlugar: () => void;
}) {
  const first = codes[0] || "—";
  const extra = Math.max(0, codes.length - 1);
  return (
    <Link
      to="/portal/equipamentos/$id"
      params={{ id: eq.id }}
      className="group block overflow-hidden rounded-lg border bg-white transition hover:shadow-md hover:border-[#F37032]"
    >
      <div className="relative aspect-[4/3] bg-[#F4F4F4]">
        {eq.foto_url ? (
          <img src={eq.foto_url} alt={eq.nome} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#6E7280]">
            <ImageIcon className="h-10 w-10 opacity-40" />
          </div>
        )}
        <div className="absolute right-2 top-2"><StatusBadge status={eq.status} /></div>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#F37032]">{categoriaNome}</p>
        <p className="line-clamp-1 text-sm font-bold text-[#213368]">{highlight(eq.nome)}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6E7280]">
          <span className="font-mono">{highlight(first)}</span>
          {extra > 0 && <span className="rounded-full bg-[#213368]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#213368]">+{extra}</span>}
        </p>
        <div className="mt-2 flex items-center gap-1 text-xs text-[#6E7280]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{local?.nome ?? "—"}</span>
        </div>
        <div className="mt-2 flex items-end justify-between border-t pt-2">
          <div>
            <div className="text-[10px] text-[#6E7280]">Custo</div>
            <div className="text-sm font-bold text-[#F37032]">{money(eq.valor_diaria)}<span className="text-[10px] font-normal text-[#6E7280]">/dia</span></div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#6E7280]">Valor</div>
            <div className="text-sm font-semibold text-[#213368]">{money(eq.valor_compra)}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-[#6E7280] transition-transform group-hover:translate-x-1 group-hover:text-[#F37032]" />
        </div>
        <button
          type="button"
          onClick={ev => { ev.preventDefault(); ev.stopPropagation(); onAlugar(); }}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-[#213368] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2a4185]"
        >
          <PackageOpen className="h-3.5 w-3.5" /> Registrar aluguel
        </button>
      </div>
    </Link>
  );
}

function Kpi({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-[10px] text-[#6E7280]">{label}</div>
        {Icon && <Icon className="h-3.5 w-3.5 opacity-60" style={{ color }} />}
      </div>
      <div className="mt-1 text-base font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-[#213368]">{title}</div>
      <div className="mt-3 h-64">{children}</div>
    </div>
  );
}

function Vazio() {
  return <div className="flex h-full items-center justify-center text-xs text-[#6E7280]">Sem dados para exibir</div>;
}

function NovoGrupoDialog({ onClose, onSave }: { onClose: () => void; onSave: (nome: string) => void }) {
  const [nome, setNome] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-[#213368]">Novo grupo</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <label className="block text-xs text-[#6E7280]">Nome do grupo
          <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Parafusadeiras, Andaimes, Veículos"
            onKeyDown={e => { if (e.key === "Enter" && nome.trim()) onSave(nome.trim()); }}
            className="mt-1 w-full rounded-md border px-2 py-2 text-sm" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>
          <button onClick={() => nome.trim() ? onSave(nome.trim()) : toast.error("Informe o nome do grupo")} className="rounded-md bg-[#213368] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2a4185]">Criar grupo</button>
        </div>
      </div>
    </div>
  );
}

function GerenciarLocaisDialog({ locais, onClose, onAdd, onUpdate, onDelete }: {
  locais: Local[]; onClose: () => void;
  onAdd: (l: { nome: string; tipo: LocalTipo }) => Promise<void>;
  onUpdate: (id: string, patch: { nome: string; tipo: LocalTipo }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<LocalTipo>("Base");
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!nome.trim()) return toast.error("Informe o nome do local");
    setSaving(true);
    if (editId) await onUpdate(editId, { nome: nome.trim(), tipo });
    else await onAdd({ nome: nome.trim(), tipo });
    setSaving(false);
    setNome(""); setTipo("Base"); setEditId(null);
  }
  function editar(l: Local) { setEditId(l.id); setNome(l.nome); setTipo(l.tipo); }
  async function excluir(id: string) {
    if (!confirm("Excluir este local?")) return;
    await onDelete(id);
    if (editId === id) { setEditId(null); setNome(""); setTipo("Base"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-[#213368]">Gerenciar locais</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
          <label className="block text-xs text-[#6E7280]">Nome do local
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Depósito Central" className="mt-1 w-full rounded-md border px-2 py-2 text-sm" />
          </label>
          <label className="block text-xs text-[#6E7280]">Tipo
            <select value={tipo} onChange={e => setTipo(e.target.value as LocalTipo)} className="mt-1 w-full rounded-md border px-2 py-2 text-sm">
              {TIPOS_LOCAL.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          {editId && <button onClick={() => { setEditId(null); setNome(""); setTipo("Base"); }} className="rounded-md border px-3 py-1.5 text-sm">Cancelar edição</button>}
          <button onClick={salvar} disabled={saving} className="rounded-md bg-[#213368] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2a4185] disabled:opacity-50">
            {saving ? "Salvando…" : editId ? "Atualizar" : "Adicionar"}
          </button>
        </div>
        <div className="mt-4 max-h-64 overflow-y-auto rounded-md border">
          {locais.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#6E7280]">Nenhum local cadastrado.</p>
          ) : (
            <ul className="divide-y">
              {locais.map(l => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#213368]">{l.nome}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[#F37032]">{l.tipo}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => editar(l)} className="rounded p-1.5 text-[#213368] hover:bg-[#F4F4F4]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => excluir(l.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function EquipamentoForm({ initial, initialCategoriaId, locais, onClose, onSave }: {
  initial: Equipamento | null;
  initialCategoriaId?: string;
  locais: Local[];
  onClose: () => void;
  onSave: (d: Omit<Equipamento, "id" | "created_at" | "updated_at">) => void | Promise<void>;
}) {
  const { db } = useStore();
  const initialCodes = (initial?.codigos_patrimonio && initial.codigos_patrimonio.length)
    ? [...initial.codigos_patrimonio]
    : (initial?.codigo_patrimonio ? [initial.codigo_patrimonio] : []);
  const [f, setF] = useState({
    categoria_id: initial?.categoria_id ?? initialCategoriaId ?? db.categorias[0]?.id ?? "",
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
    local_base_id: initial?.local_base_id ?? null as string | null,
    local_atual_id: initial?.local_atual_id ?? null as string | null,
    exibir_catalogo: initial?.exibir_catalogo ?? false,
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
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select></F>
          <F label="Local base"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.local_base_id ?? ""} onChange={e => setF({ ...f, local_base_id: e.target.value || null })}>
            <option value="">— Sem local —</option>
            {locais.map(l => <option key={l.id} value={l.id}>{l.nome} · {l.tipo}</option>)}
          </select></F>
          <F label="Local atual"><select className="w-full rounded-md border px-2 py-2 text-sm" value={f.local_atual_id ?? ""} onChange={e => setF({ ...f, local_atual_id: e.target.value || null })}>
            <option value="">— Sem local —</option>
            {locais.map(l => <option key={l.id} value={l.id}>{l.nome} · {l.tipo}</option>)}
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

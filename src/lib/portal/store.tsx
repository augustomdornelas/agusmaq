import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Aluguel, AluguelItem, Categoria, Cliente, ConfiguracoesEmpresa, Empresa, Equipamento, Manutencao, Pagamento, Usuario, UUID,
} from "./types";
import { todayISO } from "./format";

export const FOTOS_BUCKET = "equipamentos";
const URL_EXPIRE = 60 * 60 * 24 * 365; // 1 ano

interface DBState {
  categorias: Categoria[];
  equipamentos: Equipamento[];
  clientes: Cliente[];
  alugueis: Aluguel[];
  pagamentos: Pagamento[];
  manutencoes: Manutencao[];
  usuarios: Usuario[];
  empresa: Empresa;
  configEmpresa: ConfiguracoesEmpresa;
}

const EMPTY_CONFIG: ConfiguracoesEmpresa = {
  id: 1, nome_empresa: "AGUSMAQ", cnpj: "", endereco: "", cidade: "Agudos - SP",
  telefone: "", email: "", logo_url: "", texto_condicoes_termo: "", updated_at: "",
};

const EMPTY: DBState = {
  categorias: [], equipamentos: [], clientes: [], alugueis: [], pagamentos: [], manutencoes: [], usuarios: [],
  empresa: { nome: "Agusmaq Locações e Equipamentos", telefone: "", email: "", endereco: "Agudos, SP" },
  configEmpresa: EMPTY_CONFIG,
};

// --- Auth ---
export interface AuthState { userId: string; email: string; nome: string; isAdmin: boolean; }

export async function signIn(email: string, password: string): Promise<AuthState> {
  const e = email.trim();
  if (!e || !password) throw new Error("Informe e-mail e senha.");
  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
  if (error) throw new Error(error.message);
  const uid = data.user!.id;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  const isAdmin = (roles ?? []).some(r => r.role === "admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error("Acesso restrito: sua conta não possui permissão de administrador.");
  }
  const { data: prof } = await supabase.from("profiles").select("nome, email").eq("id", uid).maybeSingle();
  return { userId: uid, email: prof?.email ?? data.user!.email ?? e, nome: prof?.nome || (data.user!.email ?? "").split("@")[0], isAdmin };
}

export async function signOutUser() { await supabase.auth.signOut(); }

export async function getCurrentAuth(): Promise<AuthState | null> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return null;
  const uid = sess.session.user.id;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  const isAdmin = (roles ?? []).some(r => r.role === "admin");
  if (!isAdmin) return null;
  const { data: prof } = await supabase.from("profiles").select("nome, email").eq("id", uid).maybeSingle();
  return { userId: uid, email: prof?.email ?? sess.session.user.email ?? "", nome: prof?.nome || "", isAdmin };
}

// --- Upload ---
export async function uploadFoto(file: Blob, ext = "jpg"): Promise<string> {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg", upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data, error: err2 } = await supabase.storage.from(FOTOS_BUCKET).createSignedUrl(path, URL_EXPIRE);
  if (err2 || !data) throw new Error(err2?.message ?? "Falha ao gerar URL da imagem.");
  return data.signedUrl;
}

// --- Store context ---
type NovoAluguelInput = {
  id?: UUID;
  cliente_id: UUID;
  data_inicio: string;
  data_prevista_devolucao: string;
  data_devolucao_real?: string | null;
  tipo_cobranca: Aluguel["tipo_cobranca"];
  status: Aluguel["status"];
  desconto?: number;
  valor_frete?: number;
  forma_pagamento?: Aluguel["forma_pagamento"];
  status_pagamento?: Aluguel["status_pagamento"];
  observacoes?: string;
  itens: Omit<AluguelItem, "id" | "aluguel_id" | "subtotal">[];
};

type NovoEquipamento = Omit<Equipamento, "id" | "created_at" | "updated_at" | "valor_compra" | "data_compra"> &
  Partial<Pick<Equipamento, "valor_compra" | "data_compra">>;

interface StoreCtx {
  db: DBState;
  loading: boolean;
  reload: () => Promise<void>;
  addCategoria: (c: Omit<Categoria, "id" | "created_at" | "updated_at">) => Promise<Categoria>;
  updateCategoria: (id: UUID, patch: Partial<Categoria>) => Promise<void>;
  deleteCategoria: (id: UUID) => Promise<void>;
  reorderCategoria: (id: UUID, dir: -1 | 1) => Promise<void>;
  addEquipamento: (e: NovoEquipamento) => Promise<Equipamento>;
  updateEquipamento: (id: UUID, patch: Partial<Equipamento>) => Promise<void>;
  deleteEquipamento: (id: UUID) => Promise<void>;
  addCliente: (c: Omit<Cliente, "id" | "created_at" | "updated_at">) => Promise<Cliente>;
  updateCliente: (id: UUID, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: UUID) => Promise<void>;
  saveAluguel: (data: NovoAluguelInput) => Promise<Aluguel>;
  updateAluguelStatus: (id: UUID, status: Aluguel["status"], data_devolucao_real?: string | null) => Promise<void>;
  cancelarAluguel: (id: UUID) => Promise<void>;
  devolverAluguel: (id: UUID, data?: string) => Promise<void>;
  addPagamento: (p: Omit<Pagamento, "id" | "created_at">) => Promise<Pagamento>;
  addManutencao: (m: Omit<Manutencao, "id" | "created_at" | "updated_at">) => Promise<Manutencao>;
  concluirManutencao: (id: UUID, data_fim: string, custo: number) => Promise<void>;
  deleteManutencao: (id: UUID) => Promise<void>;
  updateEmpresa: (e: Empresa) => Promise<void>;
  saveConfigEmpresa: (c: Partial<ConfiguracoesEmpresa>) => Promise<void>;
  addUsuario: (u: Omit<Usuario, "id" | "created_at" | "ativo">) => Promise<Usuario>;
  toggleUsuario: (id: UUID) => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

function must<T>(r: { data: T | null; error: any }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

async function fetchAll(): Promise<DBState> {
  const [cats, eqs, cls, als, its, pgs, mns, emp, cfg, prof, roles] = await Promise.all([
    supabase.from("categorias").select("*").order("ordem"),
    supabase.from("equipamentos").select("*").order("nome"),
    supabase.from("clientes").select("*").order("nome_razao_social"),
    supabase.from("alugueis").select("*").order("created_at", { ascending: false }),
    supabase.from("aluguel_itens").select("*"),
    supabase.from("pagamentos").select("*"),
    supabase.from("manutencoes").select("*").order("data_inicio", { ascending: false }),
    supabase.from("empresa").select("*").eq("id", 1).maybeSingle(),
    (supabase.from as any)("configuracoes_empresa").select("*").eq("id", 1).maybeSingle(),
    supabase.from("profiles").select("*"),
    supabase.from("user_roles").select("*"),
  ]);
  const itensByAluguel = new Map<string, AluguelItem[]>();
  for (const it of (its.data ?? [])) {
    const arr = itensByAluguel.get(it.aluguel_id) ?? [];
    arr.push(it as any);
    itensByAluguel.set(it.aluguel_id, arr);
  }
  const alugueis = (als.data ?? []).map(a => ({ ...(a as any), itens: itensByAluguel.get(a.id) ?? [] })) as Aluguel[];
  const usuarios: Usuario[] = (prof.data ?? []).map((p: any) => ({
    id: p.id, email: p.email, nome: p.nome,
    ativo: (roles.data ?? []).some((r: any) => r.user_id === p.id && r.role === "admin"),
    created_at: p.created_at,
  }));
  return {
    categorias: (cats.data ?? []) as Categoria[],
    equipamentos: (eqs.data ?? []) as Equipamento[],
    clientes: (cls.data ?? []) as Cliente[],
    alugueis,
    pagamentos: (pgs.data ?? []) as Pagamento[],
    manutencoes: (mns.data ?? []) as Manutencao[],
    usuarios,
    empresa: (emp.data as any) ?? EMPTY.empresa,
    configEmpresa: ((cfg as any)?.data as ConfiguracoesEmpresa) ?? EMPTY_CONFIG,
  };
}

export function PortalStoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DBState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const s = await fetchAll();
      setDb(s);
    } catch (e) {
      console.error("[portal] fetchAll", e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const api = useMemo<StoreCtx>(() => ({
    db, loading, reload,

    addCategoria: async (c) => {
      const row = must(await supabase.from("categorias").insert(c).select().single());
      await reload();
      return row as unknown as Categoria;
    },
    updateCategoria: async (id, patch) => {
      const { id: _i, created_at: _c, updated_at: _u, ...rest } = patch as any;
      must(await supabase.from("categorias").update(rest).eq("id", id).select().single());
      await reload();
    },
    deleteCategoria: async (id) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw new Error(error.message.includes("violates foreign key") ? "Não é possível excluir: existem equipamentos vinculados a esta categoria." : error.message);
      await reload();
    },
    reorderCategoria: async (id, dir) => {
      const sorted = [...db.categorias].sort((a, b) => a.ordem - b.ordem);
      const idx = sorted.findIndex(c => c.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= sorted.length) return;
      const a = sorted[idx], b = sorted[swap];
      await Promise.all([
        supabase.from("categorias").update({ ordem: b.ordem }).eq("id", a.id),
        supabase.from("categorias").update({ ordem: a.ordem }).eq("id", b.id),
      ]);
      await reload();
    },

    addEquipamento: async (e) => {
      const row = must(await supabase.from("equipamentos").insert(e as any).select().single());
      await reload();
      return row as unknown as Equipamento;
    },
    updateEquipamento: async (id, patch) => {
      const { id: _i, created_at: _c, updated_at: _u, ...rest } = patch as any;
      must(await supabase.from("equipamentos").update(rest).eq("id", id).select().single());
      await reload();
    },
    deleteEquipamento: async (id) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw new Error(error.message.includes("violates foreign key") ? "Não é possível excluir: existem aluguéis vinculados a este equipamento." : error.message);
      await reload();
    },

    addCliente: async (c) => {
      const row = must(await supabase.from("clientes").insert(c).select().single());
      await reload();
      return row as unknown as Cliente;
    },
    updateCliente: async (id, patch) => {
      const { id: _i, created_at: _c, updated_at: _u, ...rest } = patch as any;
      must(await supabase.from("clientes").update(rest).eq("id", id).select().single());
      await reload();
    },
    deleteCliente: async (id) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw new Error(error.message.includes("violates foreign key") ? "Não é possível excluir: existem aluguéis vinculados a este cliente." : error.message);
      await reload();
    },

    saveAluguel: async (data) => {
      const subtotal = data.itens.reduce((s, i) => s + (i.valor_unitario || 0) * (i.quantidade || 0), 0);
      const valor_total = Math.max(0, subtotal - (data.desconto || 0) + (data.valor_frete || 0));
      const payload: any = {
        cliente_id: data.cliente_id,
        data_inicio: data.data_inicio,
        data_prevista_devolucao: data.data_prevista_devolucao,
        data_devolucao_real: data.data_devolucao_real ?? null,
        tipo_cobranca: data.tipo_cobranca, status: data.status,
        desconto: data.desconto || 0, valor_frete: data.valor_frete || 0, valor_total,
        forma_pagamento: data.forma_pagamento ?? "pix",
        status_pagamento: data.status_pagamento ?? "pendente",
        observacoes: data.observacoes || "",
      };
      let alugId: string;
      let created: any;
      if (data.id) {
        created = must(await supabase.from("alugueis").update(payload).eq("id", data.id).select().single());
        alugId = data.id;
        await supabase.from("aluguel_itens").delete().eq("aluguel_id", alugId);
      } else {
        created = must(await supabase.from("alugueis").insert(payload).select().single()) as any;
        alugId = created.id;
      }
      const itensRows = data.itens.map(i => ({
        aluguel_id: alugId, equipamento_id: i.equipamento_id, quantidade: i.quantidade,
        valor_unitario: i.valor_unitario, subtotal: (i.valor_unitario || 0) * (i.quantidade || 0),
      }));
      if (itensRows.length) must(await supabase.from("aluguel_itens").insert(itensRows).select());
      if (data.status === "ativo") {
        const ids = Array.from(new Set(data.itens.map(i => i.equipamento_id)));
        if (ids.length) await supabase.from("equipamentos").update({ status: "alugado" }).in("id", ids).eq("status", "disponivel");
      }
      await reload();
      return { ...created, itens: [] } as Aluguel;
    },
    updateAluguelStatus: async (id, status, data_devolucao_real) => {
      const al = db.alugueis.find(a => a.id === id);
      const patch: any = { status };
      if (status === "devolvido") patch.data_devolucao_real = data_devolucao_real ?? todayISO();
      must(await supabase.from("alugueis").update(patch).eq("id", id).select().single());
      if (al) {
        const ids = Array.from(new Set(al.itens.map(i => i.equipamento_id)));
        if (status === "devolvido" && ids.length) {
          await supabase.from("equipamentos").update({ status: "disponivel" }).in("id", ids).eq("status", "alugado");
        }
        if (status === "ativo" && ids.length) {
          await supabase.from("equipamentos").update({ status: "alugado" }).in("id", ids).eq("status", "disponivel");
        }
      }
      await reload();
    },
    cancelarAluguel: async (id) => {
      const al = db.alugueis.find(a => a.id === id);
      const era_ativo = al?.status === "ativo";
      must(await supabase.from("alugueis").update({ status: "cancelado" }).eq("id", id).select().single());
      if (era_ativo && al) {
        const ids = Array.from(new Set(al.itens.map(i => i.equipamento_id)));
        if (ids.length) await supabase.from("equipamentos").update({ status: "disponivel" }).in("id", ids).eq("status", "alugado");
      }
      await reload();
    },
    devolverAluguel: async (id, data) => {
      const al = db.alugueis.find(a => a.id === id);
      const patch: any = { status: "devolvido", data_devolucao_real: data ?? todayISO() };
      must(await supabase.from("alugueis").update(patch).eq("id", id).select().single());
      if (al) {
        const ids = Array.from(new Set(al.itens.map(i => i.equipamento_id)));
        if (ids.length) await supabase.from("equipamentos").update({ status: "disponivel" }).in("id", ids).eq("status", "alugado");
      }
      await reload();
    },

    addPagamento: async (p) => {
      const row = must(await supabase.from("pagamentos").insert(p).select().single()) as any;
      const al = db.alugueis.find(a => a.id === p.aluguel_id);
      if (al) {
        const pago = db.pagamentos.filter(x => x.aluguel_id === al.id).reduce((s, x) => s + Number(x.valor), 0) + Number(p.valor);
        const status_pagamento = pago >= al.valor_total ? "pago" : pago > 0 ? "parcial" : "pendente";
        await supabase.from("alugueis").update({ status_pagamento }).eq("id", al.id);
      }
      await reload();
      return row as unknown as Pagamento;
    },

    addManutencao: async (m) => {
      const row = must(await supabase.from("manutencoes").insert(m).select().single()) as any;
      if (m.status === "em_andamento") {
        await supabase.from("equipamentos").update({ status: "manutencao" }).eq("id", m.equipamento_id);
      }
      await reload();
      return row as unknown as Manutencao;
    },
    concluirManutencao: async (id, data_fim, custo) => {
      const m = db.manutencoes.find(x => x.id === id);
      must(await supabase.from("manutencoes").update({ status: "concluida", data_fim, custo }).eq("id", id).select().single());
      if (m) {
        const eq = db.equipamentos.find(e => e.id === m.equipamento_id);
        if (eq && eq.status === "manutencao") {
          await supabase.from("equipamentos").update({ status: "disponivel" }).eq("id", eq.id);
        }
      }
      await reload();
    },
    deleteManutencao: async (id) => {
      const { error } = await supabase.from("manutencoes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await reload();
    },

    updateEmpresa: async (e) => {
      must(await supabase.from("empresa").update({ nome: e.nome, telefone: e.telefone, email: e.email, endereco: e.endereco }).eq("id", 1).select().single());
      await reload();
    },
    saveConfigEmpresa: async (c) => {
      const { id: _i, updated_at: _u, ...rest } = c as any;
      const { error } = await (supabase.from as any)("configuracoes_empresa").update(rest).eq("id", 1);
      if (error) throw new Error(error.message);
      await reload();
    },
    addUsuario: async () => {
      throw new Error("Novos usuários são criados via Supabase Auth. Convide pelo painel do Supabase e adicione o papel 'admin' em user_roles.");
    },
    toggleUsuario: async (id) => {
      const existing = db.usuarios.find(u => u.id === id);
      if (!existing) return;
      if (existing.ativo) {
        await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      } else {
        await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
      }
      await reload();
    },
  }), [db, loading, reload]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore fora do PortalStoreProvider");
  return ctx;
}

// Helper derivations
export function isAtrasado(a: Aluguel, today = todayISO()): boolean {
  return a.status === "ativo" && !a.data_devolucao_real && a.data_prevista_devolucao < today;
}
export function displayStatus(a: Aluguel): Aluguel["status"] {
  return isAtrasado(a) ? "atrasado" : a.status;
}

// Estatísticas por equipamento
export interface EquipStats {
  receita_total: number;
  receita_media_mensal: number;
  n_alugueis: number;
  dias_alugado: number;
  taxa_ocupacao: number; // 0..1
  ticket_medio: number;
  roi_pct: number; // % da receita sobre valor de compra
  payback_pct: number; // 0..1 (>=1 pago)
  meses_para_payback: number | null;
  data_pago_em: string | null;
  por_mes: { mes: string; receita: number; dias: number }[]; // últimos 12
}

function diffDaysISO(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.max(0, Math.round((d2 - d1) / 86400000) + 1);
}

function monthKey(iso: string): string { return iso.slice(0, 7); }

function last12Months(): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function computeEquipStats(eq: Equipamento, alugueis: Aluguel[]): EquipStats {
  const relevantes = alugueis.filter(a => a.status !== "cancelado" && a.itens.some(i => i.equipamento_id === eq.id));
  let receita_total = 0;
  let dias_alugado = 0;
  const porMesMap = new Map<string, { receita: number; dias: number }>();
  for (const a of relevantes) {
    const it = a.itens.find(i => i.equipamento_id === eq.id);
    if (!it) continue;
    receita_total += Number(it.subtotal || 0);
    const fim = a.data_devolucao_real || a.data_prevista_devolucao;
    const d = diffDaysISO(a.data_inicio, fim);
    dias_alugado += d;
    const key = monthKey(a.data_inicio);
    const cur = porMesMap.get(key) ?? { receita: 0, dias: 0 };
    cur.receita += Number(it.subtotal || 0); cur.dias += d;
    porMesMap.set(key, cur);
  }
  const n_alugueis = relevantes.length;
  const ticket_medio = n_alugueis ? receita_total / n_alugueis : 0;

  const inicio = eq.data_compra || relevantes.map(a => a.data_inicio).sort()[0] || eq.created_at.slice(0, 10);
  const meses = Math.max(1, diffDaysISO(inicio, todayISO()) / 30);
  const receita_media_mensal = receita_total / meses;
  const taxa_ocupacao = Math.min(1, dias_alugado / Math.max(1, diffDaysISO(inicio, todayISO())));

  const valorCompra = Number(eq.valor_compra || 0);
  const roi_pct = valorCompra > 0 ? (receita_total / valorCompra) * 100 : 0;
  const payback_pct = valorCompra > 0 ? receita_total / valorCompra : 0;
  const meses_para_payback = valorCompra > 0 && payback_pct < 1 && receita_media_mensal > 0
    ? Math.ceil((valorCompra - receita_total) / receita_media_mensal) : null;

  // data em que se pagou (soma acumulada por aluguel em ordem de inicio)
  let data_pago_em: string | null = null;
  if (valorCompra > 0 && payback_pct >= 1) {
    const ord = [...relevantes].sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
    let acc = 0;
    for (const a of ord) {
      const it = a.itens.find(i => i.equipamento_id === eq.id);
      if (!it) continue;
      acc += Number(it.subtotal || 0);
      if (acc >= valorCompra) { data_pago_em = a.data_inicio; break; }
    }
  }

  const meses12 = last12Months();
  const por_mes = meses12.map(m => ({ mes: m, receita: porMesMap.get(m)?.receita ?? 0, dias: porMesMap.get(m)?.dias ?? 0 }));

  return { receita_total, receita_media_mensal, n_alugueis, dias_alugado, taxa_ocupacao, ticket_medio, roi_pct, payback_pct, meses_para_payback, data_pago_em, por_mes };
}

export interface ClienteStats {
  total_gasto: number;
  n_alugueis: number;
  ativos: number;
  ticket_medio: number;
  ultima_locacao: string | null;
  tem_atraso: boolean;
  por_mes: { mes: string; valor: number }[];
  top_equipamentos: { equipamento_id: string; nome: string; n: number; total: number }[];
}

export function computeClienteStats(clienteId: string, alugueis: Aluguel[], equipamentos: Equipamento[]): ClienteStats {
  const alus = alugueis.filter(a => a.cliente_id === clienteId && a.status !== "cancelado");
  const total_gasto = alus.reduce((s, a) => s + Number(a.valor_total || 0), 0);
  const n_alugueis = alus.length;
  const ativos = alus.filter(a => a.status === "ativo" && !a.data_devolucao_real).length;
  const tem_atraso = alus.some(a => isAtrasado(a));
  const ticket_medio = n_alugueis ? total_gasto / n_alugueis : 0;
  const ultima_locacao = alus.map(a => a.data_inicio).sort().pop() ?? null;
  const meses12 = last12Months();
  const porMesMap = new Map<string, number>();
  for (const a of alus) {
    const k = monthKey(a.data_inicio);
    porMesMap.set(k, (porMesMap.get(k) ?? 0) + Number(a.valor_total || 0));
  }
  const por_mes = meses12.map(m => ({ mes: m, valor: porMesMap.get(m) ?? 0 }));
  const eqMap = new Map<string, { n: number; total: number }>();
  for (const a of alus) {
    for (const it of a.itens) {
      const cur = eqMap.get(it.equipamento_id) ?? { n: 0, total: 0 };
      cur.n += 1; cur.total += Number(it.subtotal || 0);
      eqMap.set(it.equipamento_id, cur);
    }
  }
  const top_equipamentos = Array.from(eqMap.entries())
    .map(([id, v]) => ({ equipamento_id: id, nome: equipamentos.find(e => e.id === id)?.nome ?? "—", n: v.n, total: v.total }))
    .sort((a, b) => b.n - a.n).slice(0, 5);
  return { total_gasto, n_alugueis, ativos, ticket_medio, ultima_locacao, tem_atraso, por_mes, top_equipamentos };
}

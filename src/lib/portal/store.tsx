import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Aluguel, AluguelItem, Categoria, Cliente, Empresa, Equipamento, Manutencao, Pagamento, Usuario, UUID,
} from "./types";
import { todayISO } from "./format";

interface DBState {
  categorias: Categoria[];
  equipamentos: Equipamento[];
  clientes: Cliente[];
  alugueis: Aluguel[];
  pagamentos: Pagamento[];
  manutencoes: Manutencao[];
  usuarios: Usuario[];
  empresa: Empresa;
}

const EMPTY: DBState = {
  categorias: [], equipamentos: [], clientes: [], alugueis: [], pagamentos: [], manutencoes: [], usuarios: [],
  empresa: { nome: "Agusmaq Locações e Equipamentos", telefone: "", email: "", endereco: "Agudos, SP" },
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

export async function signOutUser() {
  await supabase.auth.signOut();
}

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

// --- Store context ---
interface StoreCtx {
  db: DBState;
  loading: boolean;
  reload: () => Promise<void>;
  addCategoria: (c: Omit<Categoria, "id" | "created_at" | "updated_at">) => Promise<Categoria>;
  updateCategoria: (id: UUID, patch: Partial<Categoria>) => Promise<void>;
  deleteCategoria: (id: UUID) => Promise<void>;
  reorderCategoria: (id: UUID, dir: -1 | 1) => Promise<void>;
  addEquipamento: (e: Omit<Equipamento, "id" | "created_at" | "updated_at">) => Promise<Equipamento>;
  updateEquipamento: (id: UUID, patch: Partial<Equipamento>) => Promise<void>;
  deleteEquipamento: (id: UUID) => Promise<void>;
  addCliente: (c: Omit<Cliente, "id" | "created_at" | "updated_at">) => Promise<Cliente>;
  updateCliente: (id: UUID, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: UUID) => Promise<void>;
  saveAluguel: (data: Omit<Aluguel, "id" | "created_at" | "updated_at" | "itens"> & { id?: UUID; itens: Omit<AluguelItem, "id" | "aluguel_id" | "subtotal">[] }) => Promise<Aluguel>;
  updateAluguelStatus: (id: UUID, status: Aluguel["status"], data_devolucao_real?: string | null) => Promise<void>;
  cancelarAluguel: (id: UUID) => Promise<void>;
  addPagamento: (p: Omit<Pagamento, "id" | "created_at">) => Promise<Pagamento>;
  addManutencao: (m: Omit<Manutencao, "id" | "created_at" | "updated_at">) => Promise<Manutencao>;
  concluirManutencao: (id: UUID, data_fim: string, custo: number) => Promise<void>;
  deleteManutencao: (id: UUID) => Promise<void>;
  updateEmpresa: (e: Empresa) => Promise<void>;
  addUsuario: (u: Omit<Usuario, "id" | "created_at" | "ativo">) => Promise<Usuario>;
  toggleUsuario: (id: UUID) => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

function must<T>(r: { data: T | null; error: any }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

async function fetchAll(): Promise<DBState> {
  const [cats, eqs, cls, als, its, pgs, mns, emp, prof, roles] = await Promise.all([
    supabase.from("categorias").select("*").order("ordem"),
    supabase.from("equipamentos").select("*").order("nome"),
    supabase.from("clientes").select("*").order("nome_razao_social"),
    supabase.from("alugueis").select("*").order("created_at", { ascending: false }),
    supabase.from("aluguel_itens").select("*"),
    supabase.from("pagamentos").select("*"),
    supabase.from("manutencoes").select("*").order("data_inicio", { ascending: false }),
    supabase.from("empresa").select("*").eq("id", 1).maybeSingle(),
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
      const row = must(await supabase.from("equipamentos").insert(e).select().single());
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
      const payload = {
        cliente_id: data.cliente_id,
        data_inicio: data.data_inicio,
        data_prevista_devolucao: data.data_prevista_devolucao,
        data_devolucao_real: data.data_devolucao_real ?? null,
        tipo_cobranca: data.tipo_cobranca, status: data.status,
        desconto: data.desconto || 0, valor_frete: data.valor_frete || 0, valor_total,
        forma_pagamento: data.forma_pagamento, status_pagamento: data.status_pagamento,
        observacoes: data.observacoes || "",
      };
      let alugId: string;
      if (data.id) {
        must(await supabase.from("alugueis").update(payload).eq("id", data.id).select().single());
        alugId = data.id;
        await supabase.from("aluguel_itens").delete().eq("aluguel_id", alugId);
      } else {
        const row = must(await supabase.from("alugueis").insert(payload).select().single()) as any;
        alugId = row.id;
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
      return { ...(payload as any), id: alugId, itens: [] } as Aluguel;
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
    addUsuario: async () => {
      throw new Error("Novos usuários são criados via Supabase Auth. Convide pelo painel do Supabase e adicione o papel 'admin' em user_roles.");
    },
    toggleUsuario: async (id) => {
      // Alterna papel admin
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

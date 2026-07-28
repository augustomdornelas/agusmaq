import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Aluguel, AluguelItem, Categoria, Cliente, Empresa, Equipamento, Manutencao, Pagamento, Usuario, UUID,
} from "./types";
import { todayISO } from "./format";

const STORAGE_KEY = "agusmaq_portal_v1";
const AUTH_KEY = "agusmaq_portal_auth_v1";

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

function uid(): UUID {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
}

function nowISO() { return new Date().toISOString(); }

const CATEGORIAS_SEED = [
  "Betoneiras e vibradores",
  "Andaimes e escoras",
  "Compactação de solo",
  "Geradores e compressores",
  "Rompedores e perfuração",
  "Ferramentas elétricas",
];

function seed(): DBState {
  const now = nowISO();
  return {
    categorias: CATEGORIAS_SEED.map((nome, i) => ({
      id: uid(), nome, descricao: "", ordem: i + 1, ativa: true, created_at: now, updated_at: now,
    })),
    equipamentos: [],
    clientes: [],
    alugueis: [],
    pagamentos: [],
    manutencoes: [],
    usuarios: [
      { id: uid(), email: "admin@agusmaq.com.br", nome: "Administrador", ativo: true, created_at: now },
    ],
    empresa: {
      nome: "Agusmaq Locações e Equipamentos",
      telefone: "",
      email: "",
      endereco: "Agudos, SP",
    },
  };
}

function load(): DBState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return JSON.parse(raw) as DBState;
  } catch {
    return seed();
  }
}

function save(db: DBState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// --- Auth ---
// IMPORTANTE: enquanto a integração Supabase não estiver conectada a este
// projeto Lovable, o portal opera em modo local (sem banco real). Não há
// credenciais de demonstração no código. Assim que o Supabase estiver
// vinculado, substituir `signIn` por `supabase.auth.signInWithPassword` e
// validar a role `admin` na tabela `user_roles`.

interface AuthState { email: string; nome: string; }

export function loadAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function saveAuth(a: AuthState | null) {
  if (typeof window === "undefined") return;
  if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a));
  else localStorage.removeItem(AUTH_KEY);
}
export async function signIn(email: string, password: string): Promise<AuthState> {
  await new Promise(r => setTimeout(r, 300));
  const e = email.trim().toLowerCase();
  if (!e || !password) throw new Error("Informe e-mail e senha.");
  // Sem Supabase conectado ainda: aceita qualquer credencial válida em formato
  // e cria uma sessão local. NÃO usar em produção — trocar por Supabase Auth.
  const a: AuthState = { email: e, nome: e.split("@")[0] || "Usuário" };
  saveAuth(a);
  return a;
}

// --- Store context ---
interface StoreCtx {
  db: DBState;
  // categorias
  addCategoria: (c: Omit<Categoria, "id" | "created_at" | "updated_at">) => Categoria;
  updateCategoria: (id: UUID, patch: Partial<Categoria>) => void;
  deleteCategoria: (id: UUID) => void;
  reorderCategoria: (id: UUID, dir: -1 | 1) => void;
  // equipamentos
  addEquipamento: (e: Omit<Equipamento, "id" | "created_at" | "updated_at">) => Equipamento;
  updateEquipamento: (id: UUID, patch: Partial<Equipamento>) => void;
  deleteEquipamento: (id: UUID) => void;
  // clientes
  addCliente: (c: Omit<Cliente, "id" | "created_at" | "updated_at">) => Cliente;
  updateCliente: (id: UUID, patch: Partial<Cliente>) => void;
  deleteCliente: (id: UUID) => void;
  // alugueis
  saveAluguel: (data: Omit<Aluguel, "id" | "created_at" | "updated_at" | "itens"> & { id?: UUID; itens: Omit<AluguelItem, "id" | "aluguel_id" | "subtotal">[] }) => Aluguel;
  updateAluguelStatus: (id: UUID, status: Aluguel["status"], data_devolucao_real?: string | null) => void;
  cancelarAluguel: (id: UUID) => void;
  // pagamentos
  addPagamento: (p: Omit<Pagamento, "id" | "created_at">) => Pagamento;
  // manutencoes
  addManutencao: (m: Omit<Manutencao, "id" | "created_at" | "updated_at">) => Manutencao;
  concluirManutencao: (id: UUID, data_fim: string, custo: number) => void;
  deleteManutencao: (id: UUID) => void;
  // empresa & usuarios
  updateEmpresa: (e: Empresa) => void;
  addUsuario: (u: Omit<Usuario, "id" | "created_at" | "ativo">) => Usuario;
  toggleUsuario: (id: UUID) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function PortalStoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DBState>(() => load());

  useEffect(() => { save(db); }, [db]);

  const mutate = useCallback((fn: (d: DBState) => DBState) => setDb(prev => fn(structuredClone(prev))), []);

  const api = useMemo<StoreCtx>(() => ({
    db,

    addCategoria: (c) => {
      const now = nowISO();
      const item: Categoria = { ...c, id: uid(), created_at: now, updated_at: now };
      mutate(d => { d.categorias.push(item); return d; });
      return item;
    },
    updateCategoria: (id, patch) => mutate(d => {
      d.categorias = d.categorias.map(c => c.id === id ? { ...c, ...patch, updated_at: nowISO() } : c);
      return d;
    }),
    deleteCategoria: (id) => mutate(d => {
      if (d.equipamentos.some(e => e.categoria_id === id)) {
        throw new Error("Não é possível excluir: existem equipamentos vinculados a esta categoria.");
      }
      d.categorias = d.categorias.filter(c => c.id !== id);
      return d;
    }),
    reorderCategoria: (id, dir) => mutate(d => {
      const sorted = [...d.categorias].sort((a, b) => a.ordem - b.ordem);
      const idx = sorted.findIndex(c => c.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= sorted.length) return d;
      const a = sorted[idx].ordem, b = sorted[swap].ordem;
      d.categorias = d.categorias.map(c => c.id === sorted[idx].id ? { ...c, ordem: b } : c.id === sorted[swap].id ? { ...c, ordem: a } : c);
      return d;
    }),

    addEquipamento: (e) => {
      const now = nowISO();
      const item: Equipamento = { ...e, id: uid(), created_at: now, updated_at: now };
      mutate(d => { d.equipamentos.push(item); return d; });
      return item;
    },
    updateEquipamento: (id, patch) => mutate(d => {
      d.equipamentos = d.equipamentos.map(e => e.id === id ? { ...e, ...patch, updated_at: nowISO() } : e);
      return d;
    }),
    deleteEquipamento: (id) => mutate(d => {
      const vinculado = d.alugueis.some(a => a.itens.some(i => i.equipamento_id === id));
      if (vinculado) throw new Error("Não é possível excluir: existem aluguéis vinculados a este equipamento.");
      d.equipamentos = d.equipamentos.filter(e => e.id !== id);
      d.manutencoes = d.manutencoes.filter(m => m.equipamento_id !== id);
      return d;
    }),

    addCliente: (c) => {
      const now = nowISO();
      const item: Cliente = { ...c, id: uid(), created_at: now, updated_at: now };
      mutate(d => { d.clientes.push(item); return d; });
      return item;
    },
    updateCliente: (id, patch) => mutate(d => {
      d.clientes = d.clientes.map(c => c.id === id ? { ...c, ...patch, updated_at: nowISO() } : c);
      return d;
    }),
    deleteCliente: (id) => mutate(d => {
      if (d.alugueis.some(a => a.cliente_id === id)) {
        throw new Error("Não é possível excluir: existem aluguéis vinculados a este cliente.");
      }
      d.clientes = d.clientes.filter(c => c.id !== id);
      return d;
    }),

    saveAluguel: (data) => {
      const now = nowISO();
      const id = data.id ?? uid();
      const itens: AluguelItem[] = data.itens.map(i => ({
        ...i, id: uid(), aluguel_id: id, subtotal: (i.valor_unitario || 0) * (i.quantidade || 0),
      }));
      const subtotal = itens.reduce((s, i) => s + i.subtotal, 0);
      const valor_total = Math.max(0, subtotal - (data.desconto || 0) + (data.valor_frete || 0));
      const aluguel: Aluguel = {
        id, cliente_id: data.cliente_id,
        data_inicio: data.data_inicio, data_prevista_devolucao: data.data_prevista_devolucao,
        data_devolucao_real: data.data_devolucao_real ?? null,
        tipo_cobranca: data.tipo_cobranca, status: data.status,
        desconto: data.desconto || 0, valor_frete: data.valor_frete || 0, valor_total,
        forma_pagamento: data.forma_pagamento, status_pagamento: data.status_pagamento,
        observacoes: data.observacoes || "", itens,
        created_at: data.id ? "" : now, updated_at: now,
      };
      mutate(d => {
        const existing = d.alugueis.find(a => a.id === id);
        if (existing) {
          aluguel.created_at = existing.created_at;
          d.alugueis = d.alugueis.map(a => a.id === id ? aluguel : a);
        } else {
          d.alugueis.push(aluguel);
        }
        // regra: status "ativo" -> equipamentos "alugado"
        if (aluguel.status === "ativo") {
          const ids = new Set(aluguel.itens.map(i => i.equipamento_id));
          d.equipamentos = d.equipamentos.map(e => ids.has(e.id) && e.status === "disponivel" ? { ...e, status: "alugado", updated_at: nowISO() } : e);
        }
        return d;
      });
      return aluguel;
    },
    updateAluguelStatus: (id, status, data_devolucao_real) => mutate(d => {
      const al = d.alugueis.find(a => a.id === id);
      if (!al) return d;
      al.status = status;
      al.updated_at = nowISO();
      if (status === "devolvido") {
        al.data_devolucao_real = data_devolucao_real ?? todayISO();
        const ids = new Set(al.itens.map(i => i.equipamento_id));
        d.equipamentos = d.equipamentos.map(e => ids.has(e.id) && e.status === "alugado" ? { ...e, status: "disponivel", updated_at: nowISO() } : e);
      }
      if (status === "ativo") {
        const ids = new Set(al.itens.map(i => i.equipamento_id));
        d.equipamentos = d.equipamentos.map(e => ids.has(e.id) && e.status === "disponivel" ? { ...e, status: "alugado", updated_at: nowISO() } : e);
      }
      return d;
    }),
    cancelarAluguel: (id) => mutate(d => {
      const al = d.alugueis.find(a => a.id === id);
      if (!al) return d;
      const era_ativo = al.status === "ativo";
      al.status = "cancelado";
      al.updated_at = nowISO();
      if (era_ativo) {
        const ids = new Set(al.itens.map(i => i.equipamento_id));
        d.equipamentos = d.equipamentos.map(e => ids.has(e.id) && e.status === "alugado" ? { ...e, status: "disponivel", updated_at: nowISO() } : e);
      }
      return d;
    }),

    addPagamento: (p) => {
      const item: Pagamento = { ...p, id: uid(), created_at: nowISO() };
      mutate(d => {
        d.pagamentos.push(item);
        const al = d.alugueis.find(a => a.id === p.aluguel_id);
        if (al) {
          const pago = d.pagamentos.filter(x => x.aluguel_id === al.id).reduce((s, x) => s + x.valor, 0);
          al.status_pagamento = pago >= al.valor_total ? "pago" : pago > 0 ? "parcial" : "pendente";
          al.updated_at = nowISO();
        }
        return d;
      });
      return item;
    },

    addManutencao: (m) => {
      const now = nowISO();
      const item: Manutencao = { ...m, id: uid(), created_at: now, updated_at: now };
      mutate(d => {
        d.manutencoes.push(item);
        if (item.status === "em_andamento") {
          d.equipamentos = d.equipamentos.map(e => e.id === item.equipamento_id ? { ...e, status: "manutencao", updated_at: now } : e);
        }
        return d;
      });
      return item;
    },
    concluirManutencao: (id, data_fim, custo) => mutate(d => {
      const m = d.manutencoes.find(x => x.id === id);
      if (!m) return d;
      m.status = "concluida";
      m.data_fim = data_fim;
      m.custo = custo;
      m.updated_at = nowISO();
      // volta pra disponivel se não estiver alugado
      const eq = d.equipamentos.find(e => e.id === m.equipamento_id);
      if (eq && eq.status === "manutencao") {
        eq.status = "disponivel";
        eq.updated_at = nowISO();
      }
      return d;
    }),
    deleteManutencao: (id) => mutate(d => {
      d.manutencoes = d.manutencoes.filter(m => m.id !== id);
      return d;
    }),

    updateEmpresa: (e) => mutate(d => { d.empresa = e; return d; }),
    addUsuario: (u) => {
      const item: Usuario = { ...u, id: uid(), ativo: true, created_at: nowISO() };
      mutate(d => { d.usuarios.push(item); return d; });
      return item;
    },
    toggleUsuario: (id) => mutate(d => {
      d.usuarios = d.usuarios.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u);
      return d;
    }),
  }), [db, mutate]);

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

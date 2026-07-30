import type { DescontoTipo, Equipamento, TipoCobranca } from "./types";

export function valorPorTipoCobranca(eq: Equipamento, tipo: TipoCobranca): number {
  return Number(tipo === "diaria" ? eq.valor_diaria : tipo === "semanal" ? eq.valor_semanal : eq.valor_mensal) || 0;
}

export function aplicarDesconto(base: number, tipo: DescontoTipo, valor: number): number {
  const v = Math.max(0, Number(valor) || 0);
  if (base <= 0) return 0;
  if (tipo === "percentual") return base * (Math.min(v, 100) / 100);
  return Math.min(v, base);
}

export interface ItemCalcInput {
  quantidade: number;
  valor_unitario: number;
  desconto_tipo: DescontoTipo;
  desconto_valor: number;
}

export function computeItemTotal(it: ItemCalcInput): number {
  const base = Math.max(0, Number(it.quantidade) || 0) * Math.max(0, Number(it.valor_unitario) || 0);
  const desconto = aplicarDesconto(base, it.desconto_tipo, it.desconto_valor);
  return Math.max(0, base - desconto);
}

export interface OrcamentoTotals {
  subtotal: number;
  valor_desconto: number;
  valor_total: number;
}

export function computeOrcamentoTotals(
  itens: ItemCalcInput[],
  desconto_tipo: DescontoTipo,
  desconto_valor: number,
  valor_frete: number,
): OrcamentoTotals {
  const subtotal = itens.reduce((s, it) => s + computeItemTotal(it), 0);
  const valor_desconto = aplicarDesconto(subtotal, desconto_tipo, desconto_valor);
  const valor_total = Math.max(0, subtotal - valor_desconto) + Math.max(0, Number(valor_frete) || 0);
  return { subtotal, valor_desconto, valor_total };
}

export function descricaoComCodigos(it: { descricao: string; unidades_codigos?: string[] }): string {
  return it.unidades_codigos && it.unidades_codigos.length ? `${it.descricao} — ${it.unidades_codigos.join(", ")}` : it.descricao;
}

export function diasEntre(inicio: string, fim: string): number {
  const d1 = new Date(inicio + "T00:00:00").getTime();
  const d2 = new Date(fim + "T00:00:00").getTime();
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

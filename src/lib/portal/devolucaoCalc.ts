import { codigosEquipamento, todayISO } from "./format";
import type { Aluguel, AluguelItem, AluguelStatusDisplay, Equipamento } from "./types";

export interface SaldoItem {
  item: AluguelItem;
  equipamento: Equipamento | undefined;
  total: number;
  devolvido: number;
  pendente: number;
  temCodigos: boolean;
  codigosTotais: string[];
  codigosDevolvidos: string[];
  codigosPendentes: string[];
}

function devolucaoItensDoItem(aluguel: Aluguel, alugelItemId: string) {
  return aluguel.devolucoes.flatMap(d => d.itens.filter(di => di.aluguel_item_id === alugelItemId));
}

/**
 * Para cada item do aluguel, soma o que já voltou em todas as devoluções
 * (bom + avariado + nao_devolvido — "nao_devolvido" encerra a pendência
 * mesmo sem o bem voltar fisicamente) e calcula o que ainda falta.
 */
export function saldoPorItem(aluguel: Aluguel, equipamentos: Equipamento[]): SaldoItem[] {
  return aluguel.itens.map(item => {
    const eq = equipamentos.find(e => e.id === item.equipamento_id);
    const codigosTotais = eq ? codigosEquipamento(eq) : [];
    const temCodigos = codigosTotais.length > 1;
    const diItens = devolucaoItensDoItem(aluguel, item.id);
    const devolvido = diItens.reduce((s, di) => s + Number(di.quantidade || 0), 0);
    const codigosDevolvidos = diItens.flatMap(di => di.unidades_codigos ?? []);
    const pendente = Math.max(0, Number(item.quantidade || 0) - devolvido);
    const codigosBase = item.unidades_codigos && item.unidades_codigos.length ? item.unidades_codigos : codigosTotais;
    const codigosPendentes = temCodigos ? codigosBase.filter(c => !codigosDevolvidos.includes(c)) : [];
    return {
      item, equipamento: eq, total: Number(item.quantidade || 0), devolvido, pendente,
      temCodigos, codigosTotais: codigosBase, codigosDevolvidos, codigosPendentes,
    };
  });
}

export function totalPendente(aluguel: Aluguel): number {
  return aluguel.itens.reduce((s, item) => {
    const devolvido = devolucaoItensDoItem(aluguel, item.id).reduce((ss, di) => ss + Number(di.quantidade || 0), 0);
    return s + Math.max(0, Number(item.quantidade || 0) - devolvido);
  }, 0);
}

export function proximaSequenciaDevolucao(aluguel: Aluguel): number {
  return (aluguel.devolucoes?.length ?? 0) + 1;
}

/**
 * "devolvido_parcial" nunca é gravado no banco — é calculado na tela,
 * igual ao "atrasado" dos aluguéis e ao "expirado" dos orçamentos.
 */
export function statusDisplay(aluguel: Aluguel, today = todayISO()): AluguelStatusDisplay {
  if (aluguel.status === "cancelado" || aluguel.status === "devolvido") return aluguel.status;
  if (aluguel.status === "ativo" && !aluguel.data_devolucao_real && aluguel.data_prevista_devolucao < today) return "atrasado";
  if ((aluguel.devolucoes?.length ?? 0) > 0 && totalPendente(aluguel) > 0) return "devolvido_parcial";
  return aluguel.status;
}

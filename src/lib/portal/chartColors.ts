// Paleta de gráficos validada (contraste + CVD) — ver skill de dataviz.
// Cores de marca (#213368/#F37032) seguem só na UI (botões, sidebar); os
// gráficos usam esta paleta calibrada para leitura e daltonismo.
export const CHART_BLUE = "#2a78d6";
export const CHART_ORANGE = "#eb6834";
export const CHART_RED = "#d03b3b";
export const CHART_MUTED = "#898781";
export const CHART_GRID = "#e1e0d9";
export const CHART_AXIS = "#898781";

export const STATUS_CHART_COLORS: Record<string, string> = {
  disponivel: "#0ca30c",
  alugado: CHART_BLUE,
  manutencao: "#fab219",
  inativo: CHART_MUTED,
};

export const STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

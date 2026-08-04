export function money(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function dateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function maskCpfCnpj(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function whatsappLink(phone: string, msg = ""): string {
  const d = onlyDigits(phone);
  const num = d.startsWith("55") ? d : "55" + d;
  return `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

export function pct(v: number, digits = 1): string {
  const safe = Number.isFinite(v) ? v : 0;
  return `${safe.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function dateExtenso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MESES_EXTENSO[m - 1]} de ${y}`;
}

export function normalizeSearch(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Alguns equipamentos foram cadastrados fora do formulário com todos os
 * códigos amontoados em codigo_patrimonio, separados por vírgula (ex.:
 * "GRD 156, GRD 093, GRD 348"). Por isso o fallback faz split por vírgula
 * em vez de tratar a string inteira como um único código.
 */
export function codigosEquipamento(e: { codigos_patrimonio?: string[]; codigo_patrimonio: string }): string[] {
  if (e.codigos_patrimonio && e.codigos_patrimonio.length) return e.codigos_patrimonio;
  if (!e.codigo_patrimonio) return [];
  return e.codigo_patrimonio.split(",").map(c => c.trim()).filter(Boolean);
}

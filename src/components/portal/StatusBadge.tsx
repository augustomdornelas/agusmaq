import { cn } from "@/lib/utils";

const map: Record<string, { label: string; cls: string }> = {
  // equipamentos / pagamento
  disponivel: { label: "Disponível", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  alugado: { label: "Alugado", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  manutencao: { label: "Manutenção", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  inativo: { label: "Inativo", cls: "bg-gray-200 text-gray-700 border-gray-300" },
  // alugueis
  orcamento: { label: "Orçamento", cls: "bg-gray-200 text-gray-700 border-gray-300" },
  reservado: { label: "Reservado", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  ativo: { label: "Ativo", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  devolvido: { label: "Devolvido", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  atrasado: { label: "Atrasado", cls: "bg-red-100 text-red-800 border-red-200" },
  cancelado: { label: "Cancelado", cls: "bg-gray-200 text-gray-700 border-gray-300" },
  // pagamento
  pendente: { label: "Pendente", cls: "bg-red-100 text-red-800 border-red-200" },
  parcial: { label: "Parcial", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  pago: { label: "Pago", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  // manutencao
  aberta: { label: "Aberta", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  concluida: { label: "Concluída", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  preventiva: { label: "Preventiva", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  corretiva: { label: "Corretiva", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  emergencial: { label: "Emergencial", cls: "bg-red-100 text-red-800 border-red-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = map[status] ?? { label: status, cls: "bg-gray-200 text-gray-700 border-gray-300" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
      {m.label}
    </span>
  );
}

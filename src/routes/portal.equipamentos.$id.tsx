import { createFileRoute, Link } from "@tanstack/react-router";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useStore, displayStatus } from "@/lib/portal/store";
import { dateBR, money } from "@/lib/portal/format";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/portal/equipamentos/$id")({
  head: () => ({ meta: [{ title: "Equipamento — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EquipDetail,
});

function EquipDetail() {
  const { id } = Route.useParams();
  const { db } = useStore();
  const e = db.equipamentos.find(x => x.id === id);
  if (!e) return <PortalLayout title="Equipamento"><p>Não encontrado. <Link to="/portal/equipamentos" className="underline">Voltar</Link></p></PortalLayout>;

  const alugueis = db.alugueis.filter(a => a.itens.some(i => i.equipamento_id === id));
  const manut = db.manutencoes.filter(m => m.equipamento_id === id);

  return (
    <PortalLayout title={e.nome}>
      <Link to="/portal/equipamentos" className="mb-3 inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-1">
          {e.foto_url ? <img src={e.foto_url} alt={e.nome} className="mb-3 h-40 w-full rounded object-cover" /> : <div className="mb-3 h-40 rounded bg-[#F4F4F4]" />}
          <StatusBadge status={e.status} />
          <h2 className="mt-3 text-lg font-bold text-[#213368]">{e.nome}</h2>
          <p className="text-sm text-[#6E7280]">{e.codigo_patrimonio} · {db.categorias.find(c => c.id === e.categoria_id)?.nome}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <Info label="Diária" v={money(e.valor_diaria)} />
            <Info label="Semanal" v={money(e.valor_semanal)} />
            <Info label="Mensal" v={money(e.valor_mensal)} />
          </div>
          <p className="mt-3 text-sm text-[#6E7280]">Qtd total: <b className="text-[#1a1a1a]">{e.quantidade_total}</b></p>
          {e.descricao && <p className="mt-3 text-sm">{e.descricao}</p>}
          {e.observacoes && <p className="mt-2 rounded bg-[#F4F4F4] p-2 text-xs text-[#6E7280]">{e.observacoes}</p>}
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-[#213368]">Histórico de aluguéis</h3>
            {alugueis.length === 0 ? <p className="text-sm text-[#6E7280]">Nenhum aluguel.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[#6E7280]"><tr><th className="py-2">Cliente</th><th>Início</th><th>Prevista</th><th>Status</th></tr></thead>
                <tbody>
                  {alugueis.map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="py-2"><Link to="/portal/alugueis/$id" params={{ id: a.id }} className="hover:underline">{db.clientes.find(c => c.id === a.cliente_id)?.nome_razao_social ?? "—"}</Link></td>
                      <td>{dateBR(a.data_inicio)}</td>
                      <td>{dateBR(a.data_prevista_devolucao)}</td>
                      <td><StatusBadge status={displayStatus(a)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-[#213368]">Histórico de manutenções</h3>
            {manut.length === 0 ? <p className="text-sm text-[#6E7280]">Nenhuma manutenção.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[#6E7280]"><tr><th className="py-2">Início</th><th>Fim</th><th>Descrição</th><th className="text-right">Custo</th><th>Status</th></tr></thead>
                <tbody>
                  {manut.map(m => (
                    <tr key={m.id} className="border-t">
                      <td className="py-2">{dateBR(m.data_inicio)}</td>
                      <td>{dateBR(m.data_fim)}</td>
                      <td className="text-[#6E7280]">{m.descricao}</td>
                      <td className="text-right">{money(m.custo)}</td>
                      <td><StatusBadge status={m.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return <div className="rounded bg-[#F4F4F4] p-2"><p className="text-[10px] uppercase text-[#6E7280]">{label}</p><p className="font-semibold">{v}</p></div>;
}

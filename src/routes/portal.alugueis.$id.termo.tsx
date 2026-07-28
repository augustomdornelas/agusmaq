import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { dateBR, money } from "@/lib/portal/format";
import { ArrowLeft, Printer, Eraser } from "lucide-react";

export const Route = createFileRoute("/portal/alugueis/$id/termo")({
  head: () => ({ meta: [{ title: "Termo de locação — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: TermoPage,
});

const TEMPLATE_DEFAULT = `Por este instrumento, de um lado [nome_empresa], inscrita no CNPJ [cnpj], com sede em [endereco_empresa], doravante denominada LOCADORA, e de outro lado [nome_cliente], inscrito(a) no CPF/CNPJ [cpf_cnpj], residente/estabelecido(a) em [endereco_cliente], [cidade_cliente], doravante denominado(a) LOCATÁRIO(A), firmam o presente termo de locação dos equipamentos listados abaixo.

Período: de [data_inicio] a [data_fim] — regime [regime]. Valor total: [valor_total].

O(A) LOCATÁRIO(A) se compromete a devolver os bens em perfeito estado de conservação, como atualmente se encontram, ao fim do prazo estabelecido. É vedado ao(à) LOCATÁRIO(A) transferir, sublocar, ceder ou emprestar os bens ora locados a terceiros. Em caso de dano, perda ou extravio, o(a) LOCATÁRIO(A) arcará com o custo de reparo ou reposição do equipamento.`;

function TermoPage() {
  const { id } = Route.useParams();
  const { db } = useStore();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [sigData, setSigData] = useState<string>("");
  const [unidadesSel, setUnidadesSel] = useState<Record<string, string[]>>({});

  const a = db.alugueis.find(x => x.id === id);
  if (!a) return <PortalLayout title="Termo"><p>Aluguel não encontrado.</p></PortalLayout>;
  const cli = db.clientes.find(c => c.id === a.cliente_id);
  const cfg = db.configEmpresa;
  const emp = db.empresa;

  const empresaNome = cfg.nome_empresa || emp.nome;
  const empresaCnpj = cfg.cnpj || "";
  const empresaEnd = cfg.endereco || emp.endereco;
  const empresaCidade = cfg.cidade || "Agudos - SP";
  const empresaTel = cfg.telefone || emp.telefone;
  const logo = cfg.logo_url;

  const template = cfg.texto_condicoes_termo?.trim() || TEMPLATE_DEFAULT;
  const filled = template
    .replace(/\[numero\]/g, String(a.numero))
    .replace(/\[nome_empresa\]/g, empresaNome)
    .replace(/\[cnpj\]/g, empresaCnpj)
    .replace(/\[endereco_empresa\]/g, empresaEnd)
    .replace(/\[nome_cliente\]/g, cli?.nome_razao_social ?? "—")
    .replace(/\[cpf_cnpj\]/g, cli?.cpf_cnpj ?? "—")
    .replace(/\[endereco_cliente\]/g, cli?.endereco ?? "—")
    .replace(/\[cidade_cliente\]/g, cli?.cidade ?? "—")
    .replace(/\[data_inicio\]/g, dateBR(a.data_inicio))
    .replace(/\[data_fim\]/g, dateBR(a.data_prevista_devolucao))
    .replace(/\[regime\]/g, a.tipo_cobranca)
    .replace(/\[valor_total\]/g, money(a.valor_total));

  function limpar() { sigRef.current?.clear(); setSigData(""); }
  function salvarAssinatura() {
    const c = sigRef.current;
    if (!c || c.isEmpty()) return setSigData("");
    setSigData(c.toDataURL("image/png"));
  }

  return (
    <PortalLayout title={`Termo #${a.numero}`}>
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link to="/portal/alugueis/$id" params={{ id: a.id }} className="inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22]"><Printer className="h-4 w-4" /> Imprimir / PDF</button>
      </div>

      <div className="print:hidden mb-4 rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#213368]">Assinatura digital do locatário (opcional)</h3>
        <div className="rounded border bg-white">
          <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full", height: 160 }} onEnd={salvarAssinatura} />
        </div>
        <button onClick={limpar} className="mt-2 inline-flex items-center gap-1 text-xs text-[#6E7280] hover:text-[#213368]"><Eraser className="h-3 w-3" /> Limpar</button>
      </div>

      <div id="termo-doc" className="mx-auto max-w-[210mm] rounded-lg bg-white p-8 shadow-sm print:shadow-none print:rounded-none print:p-6">
        <header className="mb-6 flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />}
            <div>
              <h1 className="text-xl font-bold text-[#213368]">{empresaNome}</h1>
              {empresaCnpj && <p className="text-xs text-[#6E7280]">CNPJ {empresaCnpj}</p>}
              <p className="text-xs text-[#6E7280]">{empresaEnd} · {empresaCidade}</p>
              {empresaTel && <p className="text-xs text-[#6E7280]">Tel: {empresaTel}</p>}
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-[#213368]">COMPROVANTE Nº {a.numero}</p>
            <p className="text-[#6E7280]">Emissão: {dateBR(a.created_at.slice(0, 10))}</p>
          </div>
        </header>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-[#213368]">Locatário</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><b>Nome:</b> {cli?.nome_razao_social}</p>
            <p><b>CPF/CNPJ:</b> {cli?.cpf_cnpj}</p>
            <p><b>Telefone:</b> {cli?.telefone_whatsapp}</p>
            <p><b>Cidade:</b> {cli?.cidade}</p>
            <p className="col-span-2"><b>Endereço:</b> {cli?.endereco}</p>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase text-[#213368]">Equipamentos locados</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#F4F4F4] text-left text-xs uppercase text-[#6E7280]">
                <th className="border p-2">Código</th><th className="border p-2">Descrição</th>
                <th className="border p-2 text-right">Qtd</th><th className="border p-2 text-right">Unit.</th><th className="border p-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {a.itens.map(it => {
                const eq = db.equipamentos.find(e => e.id === it.equipamento_id);
                return (
                  <tr key={it.id}>
                    <td className="border p-2 font-mono text-xs">{eq?.codigo_patrimonio}</td>
                    <td className="border p-2">{eq?.nome}</td>
                    <td className="border p-2 text-right">{it.quantidade}</td>
                    <td className="border p-2 text-right">{money(Number(it.valor_unitario))}</td>
                    <td className="border p-2 text-right">{money(Number(it.subtotal))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {a.desconto > 0 && <tr><td colSpan={4} className="border p-2 text-right">Desconto</td><td className="border p-2 text-right">- {money(a.desconto)}</td></tr>}
              {a.valor_frete > 0 && <tr><td colSpan={4} className="border p-2 text-right">Frete</td><td className="border p-2 text-right">{money(a.valor_frete)}</td></tr>}
              <tr className="bg-[#F4F4F4] font-bold"><td colSpan={4} className="border p-2 text-right">TOTAL</td><td className="border p-2 text-right text-[#213368]">{money(a.valor_total)}</td></tr>
            </tfoot>
          </table>
          <p className="mt-2 text-sm"><b>Período:</b> {dateBR(a.data_inicio)} a {dateBR(a.data_prevista_devolucao)} · <b>Regime:</b> {a.tipo_cobranca}</p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase text-[#213368]">Termo de locação nº {a.numero}</h2>
          <p className="whitespace-pre-line text-justify text-sm leading-relaxed">{filled}</p>
        </section>

        <section className="mt-8">
          <p className="text-sm">{empresaCidade}, {dateBR(new Date().toISOString().slice(0, 10))}</p>
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-16 border-b border-black" />
              <p className="mt-1 font-semibold">LOCADORA</p>
              <p>{empresaNome}</p>
              {empresaCnpj && <p>CNPJ {empresaCnpj}</p>}
            </div>
            <div>
              <div className="relative h-16 border-b border-black">
                {sigData && <img src={sigData} alt="Assinatura" className="absolute inset-0 mx-auto h-full object-contain" />}
              </div>
              <p className="mt-1 font-semibold">LOCATÁRIO(A)</p>
              <p>{cli?.nome_razao_social}</p>
              {cli?.cpf_cnpj && <p>{cli.cpf_cnpj}</p>}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          #termo-doc { box-shadow: none; margin: 0; padding: 15mm; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </PortalLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useStore } from "@/lib/portal/store";
import { dateBR, money, codigosEquipamento } from "@/lib/portal/format";
import { preencherTermoLocacao } from "@/lib/portal/termoTemplate";
import { gerarTermoLocacaoPdf } from "@/lib/portal/termoPdf";
import { toast } from "sonner";
import { ArrowLeft, Download, Eraser } from "lucide-react";

export const Route = createFileRoute("/portal/alugueis/$id/termo")({
  head: () => ({ meta: [{ title: "Termo de locação — Portal Agusmaq" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: TermoPage,
});

function TermoPage() {
  const { id } = Route.useParams();
  const { db } = useStore();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [sigData, setSigData] = useState<string>("");
  const [unidadesSel, setUnidadesSel] = useState<Record<string, string[]>>({});
  const [gerandoPdf, setGerandoPdf] = useState(false);

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

  const filled = preencherTermoLocacao({
    numero: a.numero,
    empresaNome, empresaCnpj, empresaEndereco: empresaEnd,
    cliente: cli,
    dataInicio: a.data_inicio,
    dataFim: a.data_prevista_devolucao,
    regime: a.tipo_cobranca,
    valorTotal: a.valor_total,
    templateCustom: cfg.texto_condicoes_termo,
  });

  function limpar() { sigRef.current?.clear(); setSigData(""); }
  function salvarAssinatura() {
    const c = sigRef.current;
    if (!c || c.isEmpty()) return setSigData("");
    setSigData(c.toDataURL("image/png"));
  }
  async function baixarPdf() {
    setGerandoPdf(true);
    try { await gerarTermoLocacaoPdf(a!, cli, db.equipamentos, cfg, sigData || undefined); }
    catch (e: any) { toast.error("Falha ao gerar PDF: " + e.message); }
    finally { setGerandoPdf(false); }
  }

  return (
    <PortalLayout title={`Termo #${a.numero}`}>
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link to="/portal/alugueis/$id" params={{ id: a.id }} className="inline-flex items-center gap-1 text-sm text-[#6E7280] hover:text-[#213368]"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <button onClick={baixarPdf} disabled={gerandoPdf} className="inline-flex items-center gap-2 rounded-md bg-[#F37032] px-4 py-2 text-sm font-semibold text-white hover:bg-[#db5f22] disabled:opacity-60">
          <Download className="h-4 w-4" /> {gerandoPdf ? "Gerando…" : "Baixar PDF"}
        </button>
      </div>

      <div className="print:hidden mb-4 rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[#213368]">Unidades que saem (opcional)</h3>
        <p className="mb-2 text-xs text-[#6E7280]">Marque os códigos que sairão fisicamente quando alugar menos que o total.</p>
        <div className="space-y-2">
          {a.itens.map(it => {
            const eq = db.equipamentos.find(e => e.id === it.equipamento_id);
            if (!eq) return null;
            const codes = codigosEquipamento(eq);
            const sel = unidadesSel[it.id] ?? (it.unidades_codigos ?? []);
            if (codes.length <= 1) return null;
            return (
              <div key={it.id} className="rounded border p-2">
                <p className="text-xs font-semibold text-[#213368]">{eq.nome} <span className="text-[#6E7280]">— {it.quantidade} un.</span></p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {codes.map(c => {
                    const on = sel.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => setUnidadesSel(p => {
                        const cur = new Set(p[it.id] ?? (it.unidades_codigos ?? []));
                        on ? cur.delete(c) : cur.add(c);
                        return { ...p, [it.id]: Array.from(cur) };
                      })} className={`rounded px-2 py-0.5 font-mono text-xs ${on ? "bg-[#213368] text-white" : "bg-[#213368]/10 text-[#213368]"}`}>{c}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {a.itens.every(it => {
            const eq = db.equipamentos.find(e => e.id === it.equipamento_id);
            const codes = eq ? codigosEquipamento(eq) : [];
            return codes.length <= 1;
          }) && <p className="text-xs text-[#6E7280]">Nenhum item tem múltiplos códigos.</p>}
        </div>
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
                const codes = eq ? codigosEquipamento(eq) : [];
                const sel = unidadesSel[it.id] ?? (it.unidades_codigos ?? []);
                const shown = sel.length ? sel : codes;
                return (
                  <tr key={it.id}>
                    <td className="border p-2 font-mono text-xs">{shown.join(", ") || "—"}</td>
                    <td className="border p-2">{eq?.nome}{sel.length > 0 && sel.length < codes.length && <span className="ml-1 text-[10px] text-[#6E7280]">(unidades selecionadas)</span>}</td>
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

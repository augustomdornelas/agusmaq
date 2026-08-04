import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { money, dateBR, dateExtenso, todayISO, codigosEquipamento } from "./format";
import { loadImageAsDataUrl } from "./orcamentoPdf";
import { preencherTermoLocacao, preencherTermoDevolucao } from "./termoTemplate";
import { saldoPorItem } from "./devolucaoCalc";
import type { Aluguel, Cliente, ConfiguracoesEmpresa, Devolucao, Equipamento } from "./types";

const NAVY: [number, number, number] = [33, 51, 104];
const ORANGE: [number, number, number] = [243, 112, 50];
const GRAY: [number, number, number] = [110, 114, 128];
const INK: [number, number, number] = [30, 30, 30];

function tipoCobrancaLabel(tipo: Aluguel["tipo_cobranca"]): string {
  return tipo === "diaria" ? "Diária" : tipo === "semanal" ? "Semanal" : "Mensal";
}

function desenharCabecalho(doc: jsPDF, config: ConfiguracoesEmpresa, logoDataUrl: string | null, titulo: string, subtitulos: string[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 16;

  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", marginX, y - 4, 18, 18); } catch { /* logo inválido, segue sem imagem */ }
  }
  const textX = logoDataUrl ? marginX + 22 : marginX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(config.nome_empresa || "AGUSMAQ", textX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let infoY = y + 5;
  const linhasEmpresa = [
    config.cnpj ? `CNPJ ${config.cnpj}` : "",
    [config.endereco, config.cidade].filter(Boolean).join(" · "),
    [config.telefone, config.email].filter(Boolean).join(" · "),
  ].filter(Boolean);
  for (const linha of linhasEmpresa) { doc.text(linha, textX, infoY); infoY += 4; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...ORANGE);
  doc.text(titulo, pageWidth - marginX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  let subY = y + 6;
  for (const linha of subtitulos) { doc.text(linha, pageWidth - marginX, subY, { align: "right" }); subY += 5; }

  let curY = Math.max(infoY, subY) + 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, curY, pageWidth - marginX, curY);
  return curY + 7;
}

function desenharCliente(doc: jsPDF, cliente: Cliente | null | undefined, y: number): number {
  const marginX = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("LOCATÁRIO", marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(cliente?.nome_razao_social ?? "—", marginX, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  const linha = [cliente?.cpf_cnpj, cliente?.telefone_whatsapp, cliente?.endereco, cliente?.cidade].filter(Boolean).join(" · ");
  doc.text(linha || "—", marginX, y);
  return y + 7;
}

function desenharAssinaturas(doc: jsPDF, empresaNome: string, empresaCnpj: string, cliente: Cliente | null | undefined, y: number, assinaturaDataUrl?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  if (y > pageHeight - 55) { doc.addPage(); y = 20; }

  const colWidth = (pageWidth - marginX * 2 - 20) / 2;
  const col1X = marginX;
  const col2X = marginX + colWidth + 20;
  const sigLineY = y + 16;

  if (assinaturaDataUrl) {
    try { doc.addImage(assinaturaDataUrl, "PNG", col2X + colWidth / 2 - 20, sigLineY - 14, 40, 12); } catch { /* assinatura inválida, ignora */ }
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(col1X, sigLineY, col1X + colWidth, sigLineY);
  doc.line(col2X, sigLineY, col2X + colWidth, sigLineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text("LOCADORA", col1X + colWidth / 2, sigLineY + 5, { align: "center" });
  doc.text("LOCATÁRIO(A)", col2X + colWidth / 2, sigLineY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(empresaNome, col1X + colWidth / 2, sigLineY + 9, { align: "center" });
  if (empresaCnpj) doc.text(`CNPJ ${empresaCnpj}`, col1X + colWidth / 2, sigLineY + 13, { align: "center" });
  doc.text(cliente?.nome_razao_social ?? "—", col2X + colWidth / 2, sigLineY + 9, { align: "center" });
  if (cliente?.cpf_cnpj) doc.text(cliente.cpf_cnpj, col2X + colWidth / 2, sigLineY + 13, { align: "center" });

  return sigLineY + 18;
}

function desenharRodapePaginas(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: "right" });
  }
}

export async function gerarTermoLocacaoPdf(
  aluguel: Aluguel,
  cliente: Cliente | null | undefined,
  equipamentos: Equipamento[],
  config: ConfiguracoesEmpresa,
  assinaturaDataUrl?: string,
): Promise<void> {
  const equipById = new Map(equipamentos.map(e => [e.id, e]));
  const logoDataUrl = config.logo_url ? await loadImageAsDataUrl(config.logo_url) : null;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  let y = desenharCabecalho(doc, config, logoDataUrl, `TERMO DE LOCAÇÃO Nº ${aluguel.numero}`, [
    `Emissão: ${dateBR(aluguel.created_at.slice(0, 10))}`,
  ]);

  y = desenharCliente(doc, cliente, y);

  // Período
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("PERÍODO", marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`${dateBR(aluguel.data_inicio)} a ${dateBR(aluguel.data_prevista_devolucao)} · Regime ${tipoCobrancaLabel(aluguel.tipo_cobranca)}`, marginX, y);
  y += 5;
  if (aluguel.destino) {
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Destino: ${aluguel.destino}`, marginX, y);
    y += 5;
  }
  y += 3;

  // Tabela de equipamentos
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Código(s)", "Equipamento", "Qtd", "Valor unit.", "Subtotal"]],
    body: aluguel.itens.map(it => {
      const eq = equipById.get(it.equipamento_id);
      const codes = eq ? codigosEquipamento(eq) : [];
      const shown = it.unidades_codigos && it.unidades_codigos.length ? it.unidades_codigos : codes;
      return [shown.join(", ") || "—", eq?.nome ?? "—", String(it.quantidade), money(Number(it.valor_unitario)), money(Number(it.subtotal))];
    }),
    styles: { fontSize: 8.5, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [244, 244, 244], textColor: NAVY, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Totais
  const totalsX = pageWidth - marginX;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  if (aluguel.desconto > 0) { doc.text(`Desconto: −${money(aluguel.desconto)}`, totalsX, y, { align: "right" }); y += 5; }
  if (aluguel.valor_frete > 0) { doc.text(`Frete: ${money(aluguel.valor_frete)}`, totalsX, y, { align: "right" }); y += 5; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...ORANGE);
  doc.text(`TOTAL: ${money(aluguel.valor_total)}`, totalsX, y + 2, { align: "right" });
  y += 14;

  // Texto do termo
  const empresaNome = config.nome_empresa || "AGUSMAQ";
  const texto = preencherTermoLocacao({
    numero: aluguel.numero,
    empresaNome,
    empresaCnpj: config.cnpj || "",
    empresaEndereco: config.endereco || "",
    cliente,
    dataInicio: aluguel.data_inicio,
    dataFim: aluguel.data_prevista_devolucao,
    regime: aluguel.tipo_cobranca,
    valorTotal: aluguel.valor_total,
    templateCustom: config.texto_condicoes_termo,
  });

  if (y > pageHeight - 40) { doc.addPage(); y = 16; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(`TERMO DE LOCAÇÃO Nº ${aluguel.numero}`, marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  const larguraUtil = pageWidth - marginX * 2;
  const linhasTexto: string[] = doc.splitTextToSize(texto, larguraUtil);
  for (const linha of linhasTexto) {
    if (y > pageHeight - 25) { doc.addPage(); y = 16; }
    doc.text(linha, marginX, y);
    y += 4.2;
  }
  y += 8;

  // Data e assinaturas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  if (y > pageHeight - 55) { doc.addPage(); y = 20; }
  doc.text(`${config.cidade || "—"}, ${dateExtenso(todayISO())}`, marginX, y);
  y += 4;

  desenharAssinaturas(doc, empresaNome, config.cnpj || "", cliente, y, assinaturaDataUrl);
  desenharRodapePaginas(doc);

  doc.save(`termo-locacao-${aluguel.numero}.pdf`);
}

function condicaoLabel(condicao: string): string {
  return condicao === "bom" ? "Bom estado" : condicao === "avariado" ? "Avariado" : "Não devolvido";
}

export async function gerarTermoDevolucaoPdf(
  devolucao: Devolucao,
  aluguel: Aluguel,
  cliente: Cliente | null | undefined,
  equipamentos: Equipamento[],
  config: ConfiguracoesEmpresa,
  assinaturaDataUrl?: string,
): Promise<void> {
  const equipById = new Map(equipamentos.map(e => [e.id, e]));
  const itemById = new Map(aluguel.itens.map(it => [it.id, it]));
  const logoDataUrl = config.logo_url ? await loadImageAsDataUrl(config.logo_url) : null;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  let y = desenharCabecalho(doc, config, logoDataUrl, `TERMO DE DEVOLUÇÃO Nº ${aluguel.numero}/${devolucao.sequencia}`, [
    `Data: ${dateBR(devolucao.data)}`,
  ]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`Referente ao termo de locação Nº ${aluguel.numero}, de ${dateBR(aluguel.data_inicio)}.`, marginX, y);
  y += 7;

  y = desenharCliente(doc, cliente, y);

  // Itens devolvidos nesta devolução
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Código(s)", "Equipamento", "Qtd", "Condição", "Observação"]],
    body: devolucao.itens.map(di => {
      const item = itemById.get(di.aluguel_item_id);
      const eq = item ? equipById.get(item.equipamento_id) : undefined;
      const codigos = di.unidades_codigos && di.unidades_codigos.length ? di.unidades_codigos.join(", ") : "—";
      return [codigos, eq?.nome ?? "—", String(di.quantidade), condicaoLabel(di.condicao), di.observacao || "—"];
    }),
    styles: { fontSize: 8.5, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [244, 244, 244], textColor: NAVY, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Pendências restantes
  const saldo = saldoPorItem(aluguel, equipamentos).filter(s => s.pendente > 0);
  if (saldo.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ORANGE);
    doc.text("Devolução total — aluguel encerrado nesta data.", marginX, y);
    y += 8;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text("PENDÊNCIAS — itens que continuam com o(a) locatário(a)", marginX, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Equipamento", "Pendente", "Código(s) pendentes"]],
      body: saldo.map(s => [s.equipamento?.nome ?? "—", String(s.pendente), s.codigosPendentes.join(", ") || "—"]),
      styles: { fontSize: 8.5, cellPadding: 2, valign: "middle" },
      headStyles: { fillColor: [244, 244, 244], textColor: NAVY, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Avarias
  if (devolucao.valor_avarias > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ORANGE);
    doc.text(`Valor de avarias: ${money(devolucao.valor_avarias)}`, marginX, y);
    y += 8;
  }

  // Texto de quitação
  const texto = preencherTermoDevolucao({
    numero: aluguel.numero,
    sequencia: devolucao.sequencia,
    cliente,
    data: devolucao.data,
    templateCustom: config.texto_condicoes_devolucao,
  });
  if (y > pageHeight - 40) { doc.addPage(); y = 16; }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  const larguraUtil = pageWidth - marginX * 2;
  const linhasTexto: string[] = doc.splitTextToSize(texto, larguraUtil);
  for (const linha of linhasTexto) {
    if (y > pageHeight - 25) { doc.addPage(); y = 16; }
    doc.text(linha, marginX, y);
    y += 4.2;
  }
  y += 8;

  if (devolucao.observacoes) {
    if (y > pageHeight - 30) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("OBSERVAÇÕES", marginX, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    const linhasObs: string[] = doc.splitTextToSize(devolucao.observacoes, larguraUtil);
    doc.text(linhasObs, marginX, y);
    y += linhasObs.length * 4.2 + 6;
  }

  if (devolucao.recebido_por) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Recebido por: ${devolucao.recebido_por}`, marginX, y);
    y += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  if (y > pageHeight - 55) { doc.addPage(); y = 20; }
  doc.text(`${config.cidade || "—"}, ${dateExtenso(devolucao.data || todayISO())}`, marginX, y);
  y += 4;

  desenharAssinaturas(doc, config.nome_empresa || "AGUSMAQ", config.cnpj || "", cliente, y, assinaturaDataUrl);
  desenharRodapePaginas(doc);

  doc.save(`termo-devolucao-${aluguel.numero}-${devolucao.sequencia}.pdf`);
}

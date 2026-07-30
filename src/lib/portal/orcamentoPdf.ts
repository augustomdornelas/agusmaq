import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { money, dateBR } from "./format";
import { computeItemTotal, descricaoComCodigos } from "./orcamentoCalc";
import type { Cliente, ConfiguracoesEmpresa, Equipamento, Orcamento } from "./types";

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarOrcamentoPdf(
  o: Orcamento,
  cliente: Cliente | null | undefined,
  equipamentos: Equipamento[],
  config: ConfiguracoesEmpresa,
) {
  const equipById = new Map(equipamentos.map(e => [e.id, e]));

  const [logoDataUrl, itemImages] = await Promise.all([
    config.logo_url ? loadImageAsDataUrl(config.logo_url) : Promise.resolve(null),
    Promise.all(o.itens.map(it => loadImageAsDataUrl(equipById.get(it.equipamento_id)?.foto_url || ""))),
  ]);
  const imageByItemIndex = new Map(o.itens.map((it, idx) => [idx, itemImages[idx]]));

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 16;

  // Cabeçalho
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", marginX, y - 4, 18, 18); } catch { /* logo inválido, segue sem imagem */ }
  }
  const textX = logoDataUrl ? marginX + 22 : marginX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(33, 51, 104);
  doc.text(config.nome_empresa || "AGUSMAQ", textX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 114, 128);
  let infoY = y + 5;
  const linhasEmpresa = [
    config.cnpj ? `CNPJ ${config.cnpj}` : "",
    [config.endereco, config.cidade].filter(Boolean).join(" · "),
    [config.telefone, config.email].filter(Boolean).join(" · "),
  ].filter(Boolean);
  for (const linha of linhasEmpresa) { doc.text(linha, textX, infoY); infoY += 4; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(243, 112, 50);
  doc.text(`ORÇAMENTO Nº ${o.numero}`, pageWidth - marginX, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 114, 128);
  doc.text(`Emissão: ${dateBR(o.data_emissao)}`, pageWidth - marginX, y + 6, { align: "right" });
  doc.text(`Válido até: ${dateBR(o.data_validade)}`, pageWidth - marginX, y + 11, { align: "right" });

  y = Math.max(infoY, y + 14) + 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 7;

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(33, 51, 104);
  doc.text("CLIENTE", marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`${cliente?.nome_razao_social ?? "—"}`, marginX, y);
  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  const linhaCliente = [cliente?.cpf_cnpj, cliente?.telefone_whatsapp, cliente?.endereco, cliente?.cidade].filter(Boolean).join(" · ");
  doc.text(linhaCliente || "—", marginX, y);
  y += 7;

  // Período
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(33, 51, 104);
  doc.text("PERÍODO", marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  const tipoLabel = o.tipo_cobranca === "diaria" ? "Diária" : o.tipo_cobranca === "semanal" ? "Semanal" : "Mensal";
  doc.text(`${dateBR(o.data_inicio_periodo)} a ${dateBR(o.data_fim_periodo)} · Cobrança ${tipoLabel} · ${o.quantidade_dias} dia(s)`, marginX, y);
  y += 8;

  // Tabela de itens
  const FOTO_COL = 0;
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Foto", "Descrição", "Qtd", "Valor unit.", "Desconto", "Total"]],
    body: o.itens.map((it, idx) => {
      const total = computeItemTotal(it);
      const desconto = it.desconto_valor > 0 ? (it.desconto_tipo === "percentual" ? `${it.desconto_valor}%` : money(it.desconto_valor)) : "—";
      return ["", descricaoComCodigos(it), String(it.quantidade), money(it.valor_unitario), desconto, money(total)];
    }),
    styles: { fontSize: 8.5, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [244, 244, 244], textColor: [33, 51, 104], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 16, minCellHeight: 14 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === FOTO_COL) {
        const img = imageByItemIndex.get(data.row.index);
        if (img) {
          const size = 10;
          const x = data.cell.x + (data.cell.width - size) / 2;
          const yImg = data.cell.y + (data.cell.height - size) / 2;
          try { doc.addImage(img, "JPEG", x, yImg, size, size); } catch { /* imagem inválida, ignora */ }
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totais
  const totalsX = pageWidth - marginX;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Subtotal: ${money(o.subtotal)}`, totalsX, y, { align: "right" }); y += 5;
  if (o.valor_desconto > 0) { doc.text(`Desconto: −${money(o.valor_desconto)}`, totalsX, y, { align: "right" }); y += 5; }
  if (o.valor_frete > 0) { doc.text(`Entrega/frete: ${money(o.valor_frete)}`, totalsX, y, { align: "right" }); y += 5; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(243, 112, 50);
  doc.text(`TOTAL: ${money(o.valor_total)}`, totalsX, y + 2, { align: "right" });
  y += 12;

  // Condições e observações
  if (o.condicoes_pagamento) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(33, 51, 104);
    doc.text("CONDIÇÕES DE PAGAMENTO", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(o.condicoes_pagamento, pageWidth - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4.5 + 4;
  }
  if (o.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(33, 51, 104);
    doc.text("OBSERVAÇÕES", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(o.observacoes, pageWidth - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 4.5 + 4;
  }

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = Math.max(y + 14, pageHeight - 30);
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 114, 128);
  doc.text(`Proposta válida até ${dateBR(o.data_validade)}.`, marginX, footerY - 2);
  doc.line(marginX, footerY + 14, marginX + 70, footerY + 14);
  doc.text("Assinatura do cliente", marginX, footerY + 18);

  doc.save(`${o.numero}.pdf`);
}

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  AlignmentType,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import { sortLabels, type ParsedLabel } from "./skuParser";
import { getLabelColors } from "@/data/colorRules";

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

function hexToDocx(hex: string): string {
  return hex.replace("#", "");
}

function makeCell(text: string, width: number, bgColor: string, bold = false, textColor = "000000"): TableCell {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: hexToDocx(bgColor), type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold, size: 18, font: "Arial", color: hexToDocx(textColor) })],
      }),
    ],
  });
}

function makeHeaderCell(text: string, width: number): TableCell {
  return makeCell(text, width, "#E5E7EB", true);
}

const COL = {
  remessa: 800,
  lote: 700,
  subdivisao: 700,
  quant: 500,
  corte: 400,
  saida: 800,
  tamanho: 900,
  medidasCorte: 1500,
  modelo: 1300,
  parteSup: 900,
  cortador: 600,
  overloque: 600,
  costura: 600,
  cliente: 800,
  retirada: 700,
  obs: 1100,
};

function buildLabelTable(labels: ParsedLabel[]): Table {
  const showSaidaInicio = labels.some((l) => l.categoria === "wilson");
  const showObs = labels.some((l) => (l.obs || "").trim().length > 0);

  const headerCells: TableCell[] = [
    makeHeaderCell("Remessa", COL.remessa),
    makeHeaderCell("Lote", COL.lote),
    makeHeaderCell("Quant.", COL.quant),
    makeHeaderCell("Subdiv.", COL.subdivisao),
    makeHeaderCell("Corte", COL.corte),
    ...(showSaidaInicio ? [makeHeaderCell("Saída", COL.saida)] : []),
    makeHeaderCell("Tamanho", COL.tamanho),
    makeHeaderCell("Tamanho do Corte", COL.medidasCorte),
    makeHeaderCell("Modelo", COL.modelo),
    makeHeaderCell("Parte Superior", COL.parteSup),
    makeHeaderCell("Cortador", COL.cortador),
    makeHeaderCell("Overloque", COL.overloque),
    makeHeaderCell("Costura", COL.costura),
    makeHeaderCell("Cliente", COL.cliente),
    makeHeaderCell("Retirada", COL.retirada),
    ...(showObs ? [makeHeaderCell("OBS", COL.obs)] : []),
  ];
  const headerRow = new TableRow({ children: headerCells, tableHeader: true });

  const dataRows = labels.map((label) => {
    const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
    const bg = colors.row.backgroundColor;
    // Urgente: célula de saída com fundo vermelho ao invés de emoji
    const saidaBg = label.urgente ? "#DC2626" : colors.saida.backgroundColor;
    const saidaTxt = label.urgente ? "#FFFFFF" : colors.saida.textColor;

    return new TableRow({
      children: [
        makeCell(label.remessa, COL.remessa, bg),
        makeCell(label.lote, COL.lote, bg, true),
        makeCell(String(label.quantidade), COL.quant, bg, true),
        makeCell(label.subdivisao || "1 de 1", COL.subdivisao, bg, true),
        makeCell(label.corte || "", COL.corte, bg),
        ...(showSaidaInicio
          ? [makeCell(label.saidaInicio || "", COL.saida, saidaBg, true, saidaTxt)]
          : []),
        makeCell(label.tamanho, COL.tamanho, bg),
        makeCell(label.medidasCorte, COL.medidasCorte, bg),
        makeCell(label.modelo, COL.modelo, colors.modelo.backgroundColor, true, colors.modelo.textColor),
        makeCell(label.parteSuperior, COL.parteSup, colors.parteSup.backgroundColor, true, colors.parteSup.textColor),
        makeCell(label.cortador || "", COL.cortador, bg),
        makeCell(label.overloque || "", COL.overloque, bg),
        makeCell(label.costura || "", COL.costura, bg),
        makeCell(label.cliente, COL.cliente, bg),
        makeCell(label.dataSaida, COL.retirada, saidaBg, true, saidaTxt),
        ...(showObs ? [makeCell(label.obs || "", COL.obs, bg)] : []),
      ],
    });
  });

  const totalQty = labels.reduce((sum, l) => sum + l.quantidade, 0);
  const TOTAL_BG = "#D1D5DB";
  const totalCells: TableCell[] = [
    makeCell("TOTAL", COL.remessa, TOTAL_BG, true),
    makeCell("", COL.lote, TOTAL_BG),
    makeCell(String(totalQty), COL.quant, TOTAL_BG, true),
    makeCell("", COL.subdivisao, TOTAL_BG),
    makeCell("", COL.corte, TOTAL_BG),
    ...(showSaidaInicio ? [makeCell("", COL.saida, TOTAL_BG)] : []),
    makeCell("", COL.tamanho, TOTAL_BG),
    makeCell("", COL.medidasCorte, TOTAL_BG),
    makeCell("", COL.modelo, TOTAL_BG),
    makeCell("", COL.parteSup, TOTAL_BG),
    makeCell("", COL.cortador, TOTAL_BG),
    makeCell("", COL.overloque, TOTAL_BG),
    makeCell("", COL.costura, TOTAL_BG),
    makeCell("", COL.cliente, TOTAL_BG),
    makeCell("", COL.retirada, TOTAL_BG),
    ...(showObs ? [makeCell("", COL.obs, TOTAL_BG)] : []),
  ];
  const totalRow = new TableRow({ children: totalCells });

  const widths = [
    COL.remessa, COL.lote, COL.quant, COL.subdivisao, COL.corte,
    ...(showSaidaInicio ? [COL.saida] : []),
    COL.tamanho, COL.medidasCorte, COL.modelo,
    COL.parteSup, COL.cortador, COL.overloque, COL.costura, COL.cliente, COL.retirada,
    ...(showObs ? [COL.obs] : []),
  ];
  const totalW = widths.reduce((a, b) => a + b, 0);

  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows, totalRow],
  });
}

export async function exportToDocx(rawLabels: ParsedLabel[], filename = "etiquetas.docx") {
  const labels = sortLabels(rawLabels);
  const remessas = Array.from(new Set(labels.map((l) => l.remessa).filter(Boolean)));
  const clientes = Array.from(new Set(labels.map((l) => l.cliente).filter(Boolean)));
  const totalQty = labels.reduce((s, l) => s + l.quantidade, 0);
  const headerLine = [
    `Kaizen Enxovais — Etiquetas de Produção`,
    remessas.length ? `Remessa: ${remessas.join(", ")}` : null,
    clientes.length ? `Cliente: ${clientes.join(", ")}` : null,
    `${labels.length} etiqueta(s) — ${totalQty} unidades`,
  ].filter(Boolean).join("  •  ");

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 15840, height: 12240, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Etiquetas de Produção", bold: true, size: 28, font: "Arial" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: headerLine, size: 18, font: "Arial", color: "555555" })],
          }),
          buildLabelTable(labels),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, filename);
}

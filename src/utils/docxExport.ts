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
} from "docx";
import { saveAs } from "file-saver";
import type { ParsedLabel } from "./skuParser";
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
  return makeCell(text, width, "#FFFFFF", true);
}

const COL = {
  remessa: 800,
  lote: 700,
  quant: 500,
  corte: 400,
  saida: 800,
  tamanho: 900,
  medidasCorte: 1600,
  modelo: 1400,
  parteSup: 900,
  cortador: 600,
  overloque: 600,
  costura: 600,
  cliente: 800,
  retirada: 700,
};
const TOTAL_W = Object.values(COL).reduce((a, b) => a + b, 0);

function buildLabelTable(labels: ParsedLabel[]): Table {
  const headerRow = new TableRow({
    children: [
      makeHeaderCell("Remessa", COL.remessa),
      makeHeaderCell("Lote", COL.lote),
      makeHeaderCell("Quant.", COL.quant),
      makeHeaderCell("Corte", COL.corte),
      makeHeaderCell("Saída", COL.saida),
      makeHeaderCell("Tamanho", COL.tamanho),
      makeHeaderCell("Tamanho do Corte", COL.medidasCorte),
      makeHeaderCell("Modelo", COL.modelo),
      makeHeaderCell("Parte Superior", COL.parteSup),
      makeHeaderCell("Cortador", COL.cortador),
      makeHeaderCell("Overloque", COL.overloque),
      makeHeaderCell("Costura", COL.costura),
      makeHeaderCell("Cliente", COL.cliente),
      makeHeaderCell("Retirada", COL.retirada),
    ],
  });

  const dataRows = labels.map((label) => {
    const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
    const bg = colors.row.backgroundColor;

    return new TableRow({
      children: [
        makeCell(label.remessa, COL.remessa, bg),
        makeCell(label.lote, COL.lote, bg, true),
        makeCell(String(label.quantidade), COL.quant, bg, true),
        makeCell(label.corte || "", COL.corte, bg),
        makeCell(
          label.dataSaida + (label.urgente ? " ⚠" : ""),
          COL.saida,
          colors.saida.backgroundColor,
          label.urgente,
          colors.saida.textColor
        ),
        makeCell(label.tamanho, COL.tamanho, bg),
        makeCell(label.medidasCorte, COL.medidasCorte, bg),
        makeCell(label.modelo, COL.modelo, colors.modelo.backgroundColor, true, colors.modelo.textColor),
        makeCell(label.parteSuperior, COL.parteSup, colors.parteSup.backgroundColor, true, colors.parteSup.textColor),
        makeCell("", COL.cortador, "#FFFFFF"),
        makeCell("", COL.overloque, "#FFFFFF"),
        makeCell("", COL.costura, "#FFFFFF"),
        makeCell(label.cliente, COL.cliente, bg),
        makeCell(label.dataSaida, COL.retirada, colors.saida.backgroundColor, true, colors.saida.textColor),
      ],
    });
  });

  // Total row
  const totalQty = labels.reduce((sum, l) => sum + l.quantidade, 0);
  const totalRow = new TableRow({
    children: [
      makeCell("TOTAL", COL.remessa, "#FFFFFF", true),
      makeCell("", COL.lote, "#FFFFFF"),
      makeCell(String(totalQty), COL.quant, "#FFFFFF", true),
      makeCell("0", COL.corte, "#FFFFFF"),
      makeCell("", COL.saida, "#FFFFFF"),
      makeCell("", COL.tamanho, "#FFFFFF"),
      makeCell("", COL.medidasCorte, "#FFFFFF"),
      makeCell("", COL.modelo, "#FFFFFF"),
      makeCell("", COL.parteSup, "#FFFFFF"),
      makeCell("", COL.cortador, "#FFFFFF"),
      makeCell("", COL.overloque, "#FFFFFF"),
      makeCell("", COL.costura, "#FFFFFF"),
      makeCell("", COL.cliente, "#FFFFFF"),
      makeCell("", COL.retirada, "#FFFFFF"),
    ],
  });

  return new Table({
    width: { size: TOTAL_W, type: WidthType.DXA },
    columnWidths: Object.values(COL),
    rows: [headerRow, ...dataRows, totalRow],
  });
}

export async function exportToDocx(labels: ParsedLabel[], filename = "etiquetas.docx") {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 15840, height: 12240, orientation: undefined },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "Etiquetas de Produção", bold: true, size: 28, font: "Arial" })],
          }),
          buildLabelTable(labels),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, filename);
}

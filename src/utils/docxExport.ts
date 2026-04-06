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
import { getRowColor, getModeloColor } from "@/data/colorRules";

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

// Column widths (total ~9360 DXA for letter)
const COL = {
  remessa: 1100,
  quant: 700,
  tamanho: 1300,
  medidasCorte: 2000,
  modelo: 1600,
  parteInf: 800,
  parteSup: 1200,
  obs: 660,
};
const TOTAL_W = Object.values(COL).reduce((a, b) => a + b, 0);

function buildLabelTable(labels: ParsedLabel[]): Table {
  const headerRow = new TableRow({
    children: [
      makeHeaderCell("Remessa", COL.remessa),
      makeHeaderCell("Quant.", COL.quant),
      makeHeaderCell("Tamanho", COL.tamanho),
      makeHeaderCell("Medidas do Corte", COL.medidasCorte),
      makeHeaderCell("Modelo", COL.modelo),
      makeHeaderCell("P. Inferior", COL.parteInf),
      makeHeaderCell("P. Superior", COL.parteSup),
      makeHeaderCell("OBS", COL.obs),
    ],
  });

  const dataRows = labels.map((label) => {
    const rowColor = getRowColor(label.parteSuperior);
    const modeloColor = getModeloColor(label.isDupla, label.parteSuperior);
    const bg = rowColor.backgroundColor;

    return new TableRow({
      children: [
        makeCell(label.remessa, COL.remessa, bg),
        makeCell(String(label.quantidade), COL.quant, bg),
        makeCell(label.tamanho, COL.tamanho, bg),
        makeCell(label.medidasCorte, COL.medidasCorte, bg),
        makeCell(label.modelo, COL.modelo, modeloColor.backgroundColor, false, modeloColor.textColor),
        makeCell(label.parteInferior, COL.parteInf, bg),
        makeCell(label.parteSuperior, COL.parteSup, bg),
        makeCell(label.obs, COL.obs, bg),
      ],
    });
  });

  return new Table({
    width: { size: TOTAL_W, type: WidthType.DXA },
    columnWidths: Object.values(COL),
    rows: [headerRow, ...dataRows],
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

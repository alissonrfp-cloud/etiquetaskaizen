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
import { getLabelColors, CATEGORIA_LABELS } from "@/data/colorRules";

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
  categ: 900,
  remessa: 900,
  saida: 900,
  quant: 550,
  tamanho: 1000,
  medidasCorte: 1600,
  modelo: 1400,
  parteInf: 700,
  parteSup: 1000,
  obs: 500,
  cortador: 600,
  refilador: 600,
  costureiro: 700,
};
const TOTAL_W = Object.values(COL).reduce((a, b) => a + b, 0);

function buildLabelTable(labels: ParsedLabel[]): Table {
  const headerRow = new TableRow({
    children: [
      makeHeaderCell("Categ.", COL.categ),
      makeHeaderCell("Remessa", COL.remessa),
      makeHeaderCell("Saída", COL.saida),
      makeHeaderCell("Quant.", COL.quant),
      makeHeaderCell("Tamanho", COL.tamanho),
      makeHeaderCell("Medidas do Corte", COL.medidasCorte),
      makeHeaderCell("Modelo", COL.modelo),
      makeHeaderCell("P. Inferior", COL.parteInf),
      makeHeaderCell("P. Superior", COL.parteSup),
      makeHeaderCell("OBS", COL.obs),
      makeHeaderCell("Cortador", COL.cortador),
      makeHeaderCell("Refilador", COL.refilador),
      makeHeaderCell("Costureiro", COL.costureiro),
    ],
  });

  const dataRows = labels.map((label) => {
    const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
    const bg = colors.row.backgroundColor;

    return new TableRow({
      children: [
        makeCell(CATEGORIA_LABELS[label.categoria], COL.categ, bg, true),
        makeCell(label.remessa, COL.remessa, bg),
        makeCell(
          label.dataSaida + (label.urgente ? " ⚠" : ""),
          COL.saida,
          colors.saida.backgroundColor,
          label.urgente,
          colors.saida.textColor
        ),
        makeCell(String(label.quantidade), COL.quant, bg),
        makeCell(label.tamanho, COL.tamanho, bg),
        makeCell(label.medidasCorte, COL.medidasCorte, bg),
        makeCell(label.modelo, COL.modelo, colors.modelo.backgroundColor, true, colors.modelo.textColor),
        makeCell(label.parteInferior, COL.parteInf, bg),
        makeCell(label.parteSuperior, COL.parteSup, colors.parteSup.backgroundColor, false, colors.parteSup.textColor),
        makeCell(label.obs, COL.obs, bg),
        makeCell("", COL.cortador, "#FFFFFF"),
        makeCell("", COL.refilador, "#FFFFFF"),
        makeCell("", COL.costureiro, "#FFFFFF"),
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

import * as pdfjsLib from "pdfjs-dist";
import { SKU_PREFIXES, CORES_TECIDO } from "@/data/skuDatabase";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PickingItem {
  sku: string;
  quantidade: number;
  /** Linha original (descrição/NOME) — útil para a tela de revisão. */
  source?: string;
  /** Aviso opcional. */
  warning?: string;
}

export interface PickingParseResult {
  items: PickingItem[];
  /** "Total N" lido do rodapé da picking list, quando disponível. */
  expectedTotal?: number;
  /** "heuristic-table" = picking list Kaizen, "heuristic-loose" = fallback antigo. */
  mode: "heuristic-table" | "heuristic-loose";
}

const KNOWN_PREFIXES = [...SKU_PREFIXES.map((p) => p.prefix)].sort((a, b) => b.length - a.length);
const KNOWN_COLORS = CORES_TECIDO.map((c) => c.toUpperCase());

/** Lê o PDF e devolve linhas de texto agrupadas por baseline Y. */
async function extractRows(file: File): Promise<{ y: number; text: string; page: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const all: { y: number; text: string; page: number }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const Y_TOLERANCE = 3;

    const raw: { x: number; y: number; text: string }[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      raw.push({ x: item.transform[4], y: item.transform[5], text: item.str });
    }
    raw.sort((a, b) => b.y - a.y);

    const groups: { y: number; items: { x: number; text: string }[] }[] = [];
    for (const it of raw) {
      const last = groups[groups.length - 1];
      if (last && Math.abs(last.y - it.y) <= Y_TOLERANCE) {
        last.items.push({ x: it.x, text: it.text });
      } else {
        groups.push({ y: it.y, items: [{ x: it.x, text: it.text }] });
      }
    }
    for (const g of groups) {
      const text = g.items.sort((a, b) => a.x - b.x).map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) all.push({ y: g.y, text, page: pageNum });
    }
  }
  return all;
}

/**
 * Modo TABELA — formato Picking List da Kaizen.
 * Layout fixo: ID(7 dígitos) | SKU | NOME | QTD(último inteiro).
 * Captura TODOS os SKUs (inclusive não reconhecidos) para a tela de revisão decidir.
 */
function parseTableMode(rows: { text: string }[]): { items: PickingItem[]; expectedTotal?: number } {
  const items: PickingItem[] = [];
  let expectedTotal: number | undefined;

  // Agrupa linhas que continuam descrição (não começam com ID de 7 dígitos)
  const ID_RE = /^(\d{7})\s+(.+)$/;
  const merged: string[] = [];
  for (const r of rows) {
    const t = r.text.trim();
    if (!t) continue;
    if (ID_RE.test(t)) {
      merged.push(t);
    } else if (merged.length > 0) {
      // continuação da última linha (descrição quebrada)
      merged[merged.length - 1] += " " + t;
    }
  }

  for (const line of merged) {
    const m = line.match(ID_RE);
    if (!m) continue;
    const rest = m[2].trim();

    // QTD = último inteiro isolado da linha
    const qtyMatch = rest.match(/(\d+)\s*$/);
    if (!qtyMatch) continue;
    const quantidade = parseInt(qtyMatch[1], 10);
    if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 9999) continue;

    // Conteúdo entre o início e o último número = "SKU NOME..."
    const beforeQty = rest.slice(0, qtyMatch.index!).trim();
    if (!beforeQty) continue;

    // SKU = primeiro token (até primeiro espaço). Como o NOME costuma começar
    // com "Cortina ..." ou outra palavra, o primeiro token concentra o SKU completo.
    const firstSpace = beforeQty.search(/\s/);
    const sku = (firstSpace === -1 ? beforeQty : beforeQty.slice(0, firstSpace)).toUpperCase();
    const nome = firstSpace === -1 ? "" : beforeQty.slice(firstSpace + 1).trim();

    if (!sku) continue;

    items.push({ sku, quantidade, source: nome || undefined });
  }

  // Procura "Total N" no final
  const totalLine = rows.map((r) => r.text).reverse().find((t) => /^total\s+\d+/i.test(t.trim()));
  if (totalLine) {
    const tm = totalLine.match(/^total\s+(\d+)/i);
    if (tm) expectedTotal = parseInt(tm[1], 10);
  }

  return { items, expectedTotal };
}

/**
 * Modo LOOSE — heurística antiga, para PDFs sem o cabeçalho ID/SKU/NOME/QTD.
 * Procura prefixos conhecidos e tenta inferir cor + qtd. Mais frágil.
 */
function parseLooseMode(rows: { text: string }[]): PickingItem[] {
  const items: PickingItem[] = [];
  for (const r of rows) {
    const line = r.text;
    let foundPrefix = "";
    let prefixIdx = -1;
    for (const prefix of KNOWN_PREFIXES) {
      const idx = line.toUpperCase().indexOf(prefix);
      if (idx >= 0) {
        foundPrefix = prefix;
        prefixIdx = idx;
        break;
      }
    }
    if (!foundPrefix) continue;

    const afterPrefix = line.substring(prefixIdx + foundPrefix.length);
    const dimMatch = afterPrefix.match(/^(\d+)X(\d+)/i);
    if (!dimMatch) continue;
    const dimEnd = prefixIdx + foundPrefix.length + dimMatch[0].length;
    const baseSku = line.substring(prefixIdx, dimEnd).toUpperCase();

    const restOfLine = line.substring(dimEnd).toUpperCase();
    const colorMatch = restOfLine.match(/^([A-ZÇ]+)/);
    let color: string | null = null;
    if (colorMatch && KNOWN_COLORS.includes(colorMatch[1])) {
      color = colorMatch[1];
    } else {
      for (const c of KNOWN_COLORS) if (restOfLine.includes(c)) { color = c; break; }
    }
    const sku = color ? baseSku + color : baseSku;

    // QTD = último inteiro isolado (mais robusto que "primeiro após o SKU")
    const qtyMatch = line.match(/(\d+)\s*$/);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 0;
    if (qty > 0 && qty < 1000) {
      items.push({ sku, quantidade: qty });
    }
  }
  return items;
}

/** Detecta cabeçalho da Picking List (ID, SKU, NOME, QTD em qualquer ordem nas mesmas linhas iniciais). */
function isPickingListFormat(rows: { text: string }[]): boolean {
  const head = rows.slice(0, 30).map((r) => r.text.toUpperCase()).join(" \n ");
  if (/PICKING LIST/.test(head)) return true;
  if (/\bID\b.*\bSKU\b.*\bNOME\b.*\bQTD\b/.test(head)) return true;
  return false;
}

export async function parsePickingListPdf(file: File): Promise<PickingParseResult> {
  const rows = await extractRows(file);
  if (isPickingListFormat(rows)) {
    const { items, expectedTotal } = parseTableMode(rows);
    return { items, expectedTotal, mode: "heuristic-table" };
  }
  return { items: parseLooseMode(rows), mode: "heuristic-loose" };
}

/** Texto bruto para fallback de IA. */
export async function extractPdfRawText(file: File): Promise<string> {
  const rows = await extractRows(file);
  return rows.map((r) => r.text).join("\n");
}

/** Renderiza cada página como PNG data URL para OCR multi-página. */
export async function renderPdfPagesAsPng(file: File, scale = 2): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/png"));
    canvas.width = 0;
    canvas.height = 0;
  }
  return pages;
}

/**
 * Pipeline robusto:
 * 1. Heurística local (tabela ou loose). Se algo for extraído, usa.
 * 2. Senão, IA via texto extraído.
 * 3. Sem texto, IA + OCR de imagens.
 */
export async function parsePickingListSmart(
  file: File,
  opts?: { forceAi?: boolean },
): Promise<{ items: PickingItem[]; expectedTotal?: number; method: "heuristic" | "ai" | "ai-ocr" }> {
  const { supabase } = await import("@/integrations/supabase/client");

  if (!opts?.forceAi) {
    const heuristic = await parsePickingListPdf(file);
    if (heuristic.items.length > 0) {
      return { items: heuristic.items, expectedTotal: heuristic.expectedTotal, method: "heuristic" };
    }
  }

  const textContent = await extractPdfRawText(file).catch(() => "");
  const hasText = textContent.replace(/\s+/g, "").length > 50;

  const payload: { textContent?: string; pageImages?: string[]; knownPrefixes: string[]; knownColors: string[] } = {
    knownPrefixes: KNOWN_PREFIXES,
    knownColors: KNOWN_COLORS,
  };
  if (hasText) {
    payload.textContent = textContent;
  } else {
    payload.pageImages = await renderPdfPagesAsPng(file).catch(() => []);
    if (payload.pageImages.length === 0) {
      throw new Error("Não foi possível renderizar as páginas do PDF para OCR");
    }
  }

  const { data, error } = await supabase.functions.invoke("parse-picking-pdf", {
    body: payload,
  });

  if (error) throw new Error(error.message || "Falha na extração via IA");
  if (data?.error) throw new Error(data.error);

  const items: PickingItem[] = data?.items ?? [];
  return { items, method: hasText ? "ai" : "ai-ocr" };
}

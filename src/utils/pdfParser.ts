import * as pdfjsLib from "pdfjs-dist";
import { SKU_PREFIXES, CORES_TECIDO } from "@/data/skuDatabase";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PickingItem {
  sku: string;
  quantidade: number;
  /** true se o prefixo do SKU existe em SKU_PREFIXES. */
  recognized: boolean;
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

interface Token { x: number; text: string }
interface Row { y: number; tokens: Token[]; text: string; page: number }

/** Lê o PDF e devolve linhas com tokens posicionados (preserva X de cada palavra). */
async function extractRows(file: File): Promise<Row[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const all: Row[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const Y_TOLERANCE = 5;

    const raw: { x: number; y: number; text: string }[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      raw.push({ x: item.transform[4], y: item.transform[5], text: item.str });
    }
    raw.sort((a, b) => b.y - a.y);

    const groups: { y: number; items: Token[] }[] = [];
    for (const it of raw) {
      const last = groups[groups.length - 1];
      if (last && Math.abs(last.y - it.y) <= Y_TOLERANCE) {
        last.items.push({ x: it.x, text: it.text });
      } else {
        groups.push({ y: it.y, items: [{ x: it.x, text: it.text }] });
      }
    }
    for (const g of groups) {
      const tokens = g.items.sort((a, b) => a.x - b.x);
      const text = tokens.map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
      if (text) all.push({ y: g.y, tokens, text, page: pageNum });
    }
  }
  return all;
}

function isRecognized(sku: string): boolean {
  const u = sku.toUpperCase();
  return KNOWN_PREFIXES.some((p) => u.startsWith(p));
}

/** Último token "número inteiro puro" da linha vira QTD. */
function extractQtyFromTokens(tokens: Token[]): { qty: number; qtyToken: Token | null } {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const txt = tokens[i].text.trim();
    if (/^\d+$/.test(txt)) {
      const v = parseInt(txt, 10);
      if (v > 0 && v <= 9999) return { qty: v, qtyToken: tokens[i] };
    }
  }
  return { qty: 0, qtyToken: null };
}

/**
 * Modo TABELA — Picking List Kaizen.
 * QTD = SEMPRE o último token inteiro puro da linha. Nunca por proximidade
 * de coluna X (evita confundir o "2" de "2,20m" com o QTD real).
 */
function parseTableMode(rows: Row[]): { items: PickingItem[]; expectedTotal?: number } {
  const items: PickingItem[] = [];
  let expectedTotal: number | undefined;

  const ID_RE = /^\d{5,10}$/;
  const TOTAL_RE = /^total\s+(\d+)\b/i;
  const FOOTER_RE = /^(página|page|filtros|expedição|separado em|total\b)/i;

  const dataRows: Row[] = [];
  for (const r of rows) {
    const t = r.text.trim();
    if (!t) continue;
    const tm = t.match(TOTAL_RE);
    if (tm) { expectedTotal = parseInt(tm[1], 10); continue; }
    if (FOOTER_RE.test(t)) continue;

    const startsWithId = r.tokens.length > 0 && ID_RE.test(r.tokens[0].text.trim());
    if (startsWithId) {
      dataRows.push({ ...r, tokens: [...r.tokens] });
    } else if (dataRows.length > 0) {
      dataRows[dataRows.length - 1].tokens.push(...r.tokens);
    }
  }

  for (const r of dataRows) {
    const tokens = r.tokens;
    if (tokens.length < 2) continue;
    const sku = tokens[1].text.trim().toUpperCase();
    if (!sku) continue;

    const { qty, qtyToken } = extractQtyFromTokens(tokens);
    if (!qty) continue;

    const descTokens = tokens.slice(2).filter((t) => t !== qtyToken);
    const nome = descTokens.map((t) => t.text).join(" ").replace(/\s+/g, " ").trim();

    items.push({ sku, quantidade: qty, recognized: isRecognized(sku), source: nome || undefined });
  }

  return { items, expectedTotal };
}

/**
 * Modo LOOSE — heurística antiga, para PDFs sem o cabeçalho ID/SKU/NOME/QTD.
 * QTD usa a mesma regra do modo tabela: último inteiro puro tokenizado.
 */
function parseLooseMode(rows: Row[]): PickingItem[] {
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

    const { qty } = extractQtyFromTokens(r.tokens);
    if (qty > 0 && qty < 1000) {
      items.push({ sku, quantidade: qty, recognized: isRecognized(sku) });
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

  const rawItems: Array<Partial<PickingItem> & { sku: string; quantidade: number }> = data?.items ?? [];
  const items: PickingItem[] = rawItems.map((it) => ({
    sku: it.sku,
    quantidade: it.quantidade,
    source: it.source,
    recognized: it.recognized ?? isRecognized(it.sku),
  }));
  return { items, method: hasText ? "ai" : "ai-ocr" };
}

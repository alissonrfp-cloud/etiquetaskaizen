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
    const Y_TOLERANCE = 3;

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

/**
 * Modo TABELA — Picking List Kaizen.
 *
 * Estratégia: localiza a coluna **QTD / Quantidade** pelo cabeçalho e lê,
 * em cada linha de dados, o token cujo X mais se aproxima dessa coluna.
 * Robusto a qualquer ruído na descrição (dimensões "2,20m", códigos etc).
 *
 * Captura TODOS os SKUs — a tela de revisão decide o que entra.
 */
function parseTableMode(rows: Row[]): { items: PickingItem[]; expectedTotal?: number } {
  const items: PickingItem[] = [];
  let expectedTotal: number | undefined;

  // 1) Localiza o X do cabeçalho QTD / Quantidade
  let qtyX: number | null = null;
  for (const r of rows) {
    const tk = r.tokens.find((t) => /^(qtd|quantidade)\.?$/i.test(t.text.trim()));
    if (tk) { qtyX = tk.x; break; }
  }

  const ID_RE = /^\d{7}$/;
  const TOTAL_RE = /^total\s+(\d+)\b/i;
  const FOOTER_RE = /^(página|page|filtros|expedição|separado em|total\b)/i;

  // 2) Junta linhas-continuação à última linha de dado
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

  // 3) Em cada linha: SKU = 2º token; QTD = token inteiro mais próximo de qtyX
  for (const r of dataRows) {
    const tokens = r.tokens;
    if (tokens.length < 2) continue;
    const sku = tokens[1].text.trim().toUpperCase();
    if (!sku) continue;

    let quantidade = 0;
    let qtyToken: Token | null = null;

    if (qtyX !== null) {
      let best: { dist: number; val: number; tk: Token } | null = null;
      for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];
        const txt = t.text.trim();
        if (!/^\d+$/.test(txt)) continue;
        const v = parseInt(txt, 10);
        if (v <= 0 || v > 9999) continue;
        const dist = Math.abs(t.x - qtyX);
        if (!best || dist < best.dist) best = { dist, val: v, tk: t };
      }
      if (best) { quantidade = best.val; qtyToken = best.tk; }
    }

    if (!quantidade) {
      for (let i = tokens.length - 1; i >= 1; i--) {
        const txt = tokens[i].text.trim();
        if (/^\d+$/.test(txt)) {
          const v = parseInt(txt, 10);
          if (v > 0 && v <= 9999) { quantidade = v; qtyToken = tokens[i]; break; }
        }
      }
    }

    if (!quantidade) continue;

    const descTokens = tokens.slice(2).filter((t) => t !== qtyToken);
    const nome = descTokens.map((t) => t.text).join(" ").replace(/\s+/g, " ").trim();

    items.push({ sku, quantidade, source: nome || undefined });
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

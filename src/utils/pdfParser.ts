import * as pdfjsLib from "pdfjs-dist";
import { SKU_PREFIXES, CORES_TECIDO } from "@/data/skuDatabase";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface PickingItem {
  sku: string;
  quantidade: number;
  /** Motivo se a extração for parcial/incerta (apenas informativo) */
  warning?: string;
}

/** Prefixos conhecidos derivados do catálogo (fonte única). Ordenados do maior pro menor. */
const KNOWN_PREFIXES = [...SKU_PREFIXES.map((p) => p.prefix)].sort((a, b) => b.length - a.length);

const KNOWN_COLORS = CORES_TECIDO.map((c) => c.toUpperCase());

/**
 * Extract the color from the NOME field.
 */
function extractColorFromNome(nome: string): string | null {
  const upper = nome.toUpperCase();
  for (const color of KNOWN_COLORS) {
    if (upper.includes(color)) return color;
  }
  return null;
}


/**
 * Parse a picking list PDF and extract SKU + quantity pairs.
 * Uses a regex-based approach since columns often merge in text extraction.
 */
export async function parsePickingListPdf(file: File): Promise<PickingItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const items: PickingItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by Y position with tolerance (PDFs sometimes shift baselines slightly)
    const Y_TOLERANCE = 3;
    const rawItems: { x: number; y: number; text: string }[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      rawItems.push({ x: item.transform[4], y: item.transform[5], text: item.str });
    }
    // Sort by Y descending then group with tolerance
    rawItems.sort((a, b) => b.y - a.y);
    const groups: { y: number; items: { x: number; text: string }[] }[] = [];
    for (const it of rawItems) {
      const last = groups[groups.length - 1];
      if (last && Math.abs(last.y - it.y) <= Y_TOLERANCE) {
        last.items.push({ x: it.x, text: it.text });
      } else {
        groups.push({ y: it.y, items: [{ x: it.x, text: it.text }] });
      }
    }
    let sortedRows = groups.map((g) => ({
      y: g.y,
      text: g.items.sort((a, b) => a.x - b.x).map((c) => c.text).join(" "),
    }));

    // Fallback: if a row has a SKU but no trailing number, merge with next row
    // (sometimes the quantity is rendered on a slightly different baseline)
    const merged: { y: number; text: string }[] = [];
    for (let i = 0; i < sortedRows.length; i++) {
      const cur = sortedRows[i];
      const next = sortedRows[i + 1];
      const hasPrefix = KNOWN_PREFIXES.some((p) => cur.text.toUpperCase().includes(p));
      const endsWithNumber = /\d+\s*$/.test(cur.text.trim());
      const nextIsLoneNumber = next && /^\s*\d+\s*$/.test(next.text.trim());
      if (hasPrefix && !endsWithNumber && nextIsLoneNumber) {
        merged.push({ y: cur.y, text: cur.text + " " + next.text });
        i++; // skip next
      } else {
        merged.push(cur);
      }
    }
    sortedRows = merged;

    // For each row, try to extract a SKU pattern using regex
    for (const row of sortedRows) {
      const line = row.text.trim();
      if (!line) continue;

      // Find a known prefix in the line
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

      // Extract dimensions after the prefix: e.g. 300X270
      const afterPrefix = line.substring(prefixIdx + foundPrefix.length);
      const dimMatch = afterPrefix.match(/^(\d+)X(\d+)/i);
      if (!dimMatch) continue;

      const dimEnd = prefixIdx + foundPrefix.length + dimMatch[0].length;
      const baseSku = line.substring(prefixIdx, dimEnd).toUpperCase();

      // Try to get color from immediately after dimensions (concatenated SKU like CBTS300X270BRANCO)
      const restOfLine = line.substring(dimEnd).toUpperCase();
      const colorMatch = restOfLine.match(/^([A-ZÇ]+)/);
      let color: string | null = null;
      if (colorMatch && KNOWN_COLORS.includes(colorMatch[1])) {
        color = colorMatch[1];
      } else {
        color = extractColorFromNome(restOfLine);
      }

      const sku = color ? baseSku + color : baseSku;

      // Extract quantity: pega TODOS os números após o SKU+cor e escolhe o
      // primeiro razoável (1-999). Evita capturar códigos de barras, preços
      // ou pesos no fim da linha.
      const qtyZoneStart = dimEnd + (color?.length ?? 0);
      const qtyZone = line.substring(qtyZoneStart);
      const numbers = Array.from(qtyZone.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)).map((m) => ({
        raw: m[1],
        val: parseFloat(m[1].replace(",", ".")),
        idx: m.index ?? 0,
      }));
      // Filtra: inteiros entre 1 e 999, sem ponto/vírgula (descarta R$ 12,50 ou 1.234)
      const candidates = numbers.filter(
        (n) => Number.isInteger(n.val) && n.val >= 1 && n.val <= 999 && !/[.,]/.test(n.raw),
      );
      if (candidates.length === 0) continue;
      // Pega o PRIMEIRO inteiro razoável após o SKU (geralmente é a quantidade)
      const qty = candidates[0].val;

      items.push({ sku, quantidade: qty });
    }
  }

  return items;
}

/**
 * Extract all raw text from a PDF, preserving line order. Used as input for the AI fallback.
 */
export async function extractPdfRawText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines: string[] = [];

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
      lines.push(g.items.sort((a, b) => a.x - b.x).map((c) => c.text).join(" "));
    }
    lines.push(""); // blank line between pages
  }
  return lines.join("\n");
}

/**
 * Encode a file as base64 (for sending the raw PDF to the AI fallback).
 */
export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Robust pipeline:
 * 1. Try the local heuristic parser (fast, free).
 * 2. If it returns 0 items (likely an unsupported layout), fall back to the AI edge function.
 *    - Send extracted text if available; otherwise send the PDF for OCR.
 *
 * `forceAi` skips the heuristic and goes straight to the AI.
 */
export async function parsePickingListSmart(
  file: File,
  opts?: { forceAi?: boolean },
): Promise<{ items: PickingItem[]; method: "heuristic" | "ai" | "ai-ocr" }> {
  const { supabase } = await import("@/integrations/supabase/client");

  if (!opts?.forceAi) {
    const heuristic = await parsePickingListPdf(file);
    if (heuristic.length > 0) {
      return { items: heuristic, method: "heuristic" };
    }
  }

  // AI fallback
  const textContent = await extractPdfRawText(file).catch(() => "");
  const hasText = textContent.replace(/\s+/g, "").length > 50;

  const payload: { textContent?: string; pdfBase64?: string } = {};
  if (hasText) {
    payload.textContent = textContent;
  } else {
    payload.pdfBase64 = await fileToBase64(file);
  }

  const { data, error } = await supabase.functions.invoke("parse-picking-pdf", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "Falha na extração via IA");
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  const items: PickingItem[] = data?.items ?? [];
  return { items, method: hasText ? "ai" : "ai-ocr" };
}


import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PickingItem {
  sku: string;
  quantidade: number;
}

/** Known SKU prefixes sorted longest first */
const KNOWN_PREFIXES = [
  "CDGLBI", "CDGLMI", "CDGLBW", "CDGLMW", "CDGLBS", "CDGLMS", "CDGLBD", "CDGLMD",
  "CBTI", "CBTS", "CBTW", "CBTD",
  "CGLI", "CGLS", "CGLW", "CGLD",
  "COXF",
].sort((a, b) => b.length - a.length);

const KNOWN_COLORS = ["BRANCO", "BEGE", "CHUMBO", "CINZA", "PALHA", "PRETO", "TABACO"];

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
    const seen = new Set<string>();
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

      // Extract quantity: last number on the line
      const qtyMatch = line.match(/(\d+)\s*$/);
      if (!qtyMatch) continue;
      const qty = parseInt(qtyMatch[1]);
      if (qty <= 0 || qty > 9999) continue;

      // Avoid using a number that's part of the SKU itself as quantity
      // If the last number is the dimension number, skip
      const qtyStart = line.length - qtyMatch[1].length;
      if (qtyStart < dimEnd + (color?.length ?? 0)) continue;

      items.push({ sku, quantidade: qty });
    }
  }

  return items;
}

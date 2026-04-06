import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PickingItem {
  sku: string;
  quantidade: number;
}

/** Known SKU prefixes sorted longest first */
const KNOWN_PREFIXES = [
  "CDGLBI", "CDGLMI", "CDGLBW", "CDGLMW",
  "CBTI", "CBTS", "CBTW",
  "CGLI", "CGLS", "CGLW",
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

    // Group text items by Y position (same row)
    const rows = new Map<number, { x: number; text: string }[]>();
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], text: item.str });
    }

    // Sort rows top to bottom, columns left to right
    const sortedRows = [...rows.entries()]
      .sort(([a], [b]) => b - a)
      .map(([y, cols]) => ({
        y,
        text: cols.sort((a, b) => a.x - b.x).map((c) => c.text).join(" "),
      }));

    // For each row, try to extract a SKU pattern using regex
    for (const row of sortedRows) {
      const line = row.text.trim();

      // Must start with a numeric ID
      if (!/^\d{4,}/.test(line)) continue;

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

      // Try to get color from the rest of the line (NOME field)
      const restOfLine = line.substring(dimEnd).toUpperCase();
      const color = extractColorFromNome(restOfLine);

      const sku = color ? baseSku + color : baseSku;

      // Extract quantity: last number on the line
      const qtyMatch = line.match(/(\d+)\s*$/);
      if (!qtyMatch) continue;
      const qty = parseInt(qtyMatch[1]);
      if (qty <= 0 || qty > 9999) continue;

      items.push({ sku, quantidade: qty });
    }
  }

  return items;
}

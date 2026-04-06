import * as pdfjsLib from "pdfjs-dist";

// Use the worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PickingItem {
  sku: string;
  quantidade: number;
}

/**
 * Reconstruct truncated SKU using the NOME column.
 * e.g. SKU="CBTI260X180CHUM-" NOME="...CHUMBO" → "CBTI260X180CHUMBO"
 */
function reconstructSku(sku: string, nome: string): string {
  if (!sku.endsWith("-")) return sku.trim();

  // Extract the color from NOME - it's the last word
  const words = nome.trim().split(/\s+/);
  const color = words[words.length - 1].toUpperCase();

  // Get the SKU prefix up to the truncation, find dimensions end
  const base = sku.replace(/-$/, "").toUpperCase();
  const dimMatch = base.match(/^([A-Z]+\d+X\d+)/);
  if (dimMatch) {
    return dimMatch[1] + color;
  }

  // Fallback: just replace the dash with the color
  return base + color;
}

/**
 * Parse a picking list PDF and extract SKU + quantity pairs.
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
      if (!("str" in item)) continue;
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], text: item.str });
    }

    // Sort rows by Y descending (top to bottom in PDF), columns by X
    const sortedRows = [...rows.entries()]
      .sort(([a], [b]) => b - a)
      .map(([, cols]) => cols.sort((a, b) => a.x - b.x).map((c) => c.text.trim()));

    // Find column indices from header row
    let skuCol = -1;
    let nomeCol = -1;
    let qtdCol = -1;

    for (const row of sortedRows) {
      const joined = row.join(" ").toUpperCase();
      if (joined.includes("SKU") && joined.includes("QUANTIDADE")) {
        // Identify column positions
        for (let i = 0; i < row.length; i++) {
          const cell = row[i].toUpperCase();
          if (cell === "SKU") skuCol = i;
          if (cell === "NOME") nomeCol = i;
          if (cell === "QUANTIDADE") qtdCol = i;
        }
        continue;
      }

      // Parse data rows - look for rows that start with a numeric ID
      if (skuCol === -1 || qtdCol === -1) continue;
      if (row.length < Math.max(skuCol, qtdCol) + 1) continue;

      // First column should be numeric ID
      const firstVal = row[0];
      if (!/^\d+$/.test(firstVal)) continue;

      const rawSku = row[skuCol];
      const nome = nomeCol >= 0 && row.length > nomeCol ? row[nomeCol] : "";
      const qtdStr = row[qtdCol];
      const qtd = parseInt(qtdStr);

      if (!rawSku || isNaN(qtd) || qtd <= 0) continue;

      const sku = reconstructSku(rawSku, nome);
      items.push({ sku, quantidade: qtd });
    }
  }

  return items;
}

import { describe, it, expect, vi, beforeEach } from "vitest";

interface MockToken { str: string; transform: [number, number, number, number, number, number] }

const pages: MockToken[][] = [];

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: (n: number) =>
        Promise.resolve({
          getTextContent: () => Promise.resolve({ items: pages[n - 1] }),
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
    }),
  }),
}));

function setPage(tokens: MockToken[]) {
  pages.length = 0;
  pages.push(tokens);
}

/** Helper: cria token na coord (x, y). */
function tk(x: number, y: number, str: string): MockToken {
  return { str, transform: [1, 0, 0, 1, x, y] };
}

/** Cria linha tabular Picking List (ID SKU NOME... QTD). */
function line(y: number, id: string, sku: string, desc: string[], qty: string): MockToken[] {
  const out: MockToken[] = [tk(10, y, id), tk(80, y, sku)];
  let x = 160;
  for (const d of desc) { out.push(tk(x, y, d)); x += 40; }
  out.push(tk(550, y, qty));
  return out;
}

const HEADER = (y: number) => [
  tk(10, y, "PICKING"), tk(50, y, "LIST"),
  tk(10, y - 20, "ID"), tk(80, y - 20, "SKU"), tk(160, y - 20, "NOME"), tk(550, y - 20, "QTD"),
];

const fakeFile = () =>
  ({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as unknown as File);

beforeEach(() => { pages.length = 0; });

describe("parsePickingListPdf", () => {
  it("QTD=1 ignora dimensão '2,20m' na descrição", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "4141313", "CBTI220X130BEGE",
        ["Cortina", "Blackout", "Ilhós", "2,20m", "x", "1,30m", "BEGE"], "1"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toHaveLength(1);
    expect(r.items[0].sku).toBe("CBTI220X130BEGE");
    expect(r.items[0].quantidade).toBe(1);
    expect(r.items[0].recognized).toBe(true);
  });

  it("QTD=3 ao final", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "4141314", "CBTI300X250CINZA",
        ["Cortina", "Blackout", "3,00m", "x", "2,50m", "CINZA"], "3"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items[0].quantidade).toBe(3);
  });

  it("SKU desconhecido entra com recognized=false", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "4141315", "63049100-PRETO-90CM",
        ["Acessório", "Preto", "90CM"], "2"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toHaveLength(1);
    expect(r.items[0].recognized).toBe(false);
    expect(r.items[0].quantidade).toBe(2);
  });

  it("PDF sem tabela retorna lista vazia", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([tk(10, 800, "Documento"), tk(10, 780, "qualquer"), tk(10, 760, "coisa")]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toEqual([]);
  });

  it("descrição quebrada em 2 linhas é unida e extrai QTD correto", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "4141316", "CBTS400X270BRANCO",
        ["Cortina", "Blackout", "Trilho"], "5"),
      // Linha-continuação (sem ID inicial)
      tk(160, 685, "Suiço"), tk(200, 685, "BRANCO"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toHaveLength(1);
    expect(r.items[0].quantidade).toBe(5);
    expect(r.items[0].source).toContain("Suiço");
  });

  it("ID com 6 dígitos é reconhecido", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "414131", "CBTI220X130BEGE", ["Cortina"], "4"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toHaveLength(1);
    expect(r.items[0].quantidade).toBe(4);
  });

  it("ID com 8 dígitos é reconhecido", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "41413111", "CBTI220X130BEGE", ["Cortina"], "7"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toHaveLength(1);
    expect(r.items[0].quantidade).toBe(7);
  });

  it("Rodapé 'Total 95' não vira item e popula expectedTotal", async () => {
    const { parsePickingListPdf } = await import("@/utils/pdfParser");
    setPage([
      ...HEADER(800),
      ...line(700, "4141313", "CBTI220X130BEGE", ["Cortina"], "1"),
      tk(10, 600, "Total"), tk(60, 600, "95"),
    ]);
    const r = await parsePickingListPdf(fakeFile());
    expect(r.items).toHaveLength(1);
    expect(r.expectedTotal).toBe(95);
  });
});

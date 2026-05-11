import { describe, it, expect } from "vitest";
import { parseSku, sortLabels, splitIntoLots, type ParsedLabel } from "@/utils/skuParser";

describe("calcMedidasCorte - Regular Blackout", () => {
  const cases = [
    ["CBTS600X270BRANCO", "2 partes de 3,10m x 2,80m"],
    ["CBTI300X250CINZA", "2 partes de 1,60m x 2,60m"],
    ["CBTS400X270BRANCO", "2 partes de 2,10m x 2,80m"],
    ["CBTI500X260BRANCO", "2 partes de 2,60m x 2,70m"],
    ["CBTS300X230PALHA", "2 partes de 1,60m x 2,40m"],
    ["CBTS600X250PALHA", "2 partes de 3,10m x 2,60m"],
    ["CBTS200X270BRANCO", "2 partes de 1,10m x 2,80m"],
  ];

  it.each(cases)("SKU %s → %s", (sku, expected) => {
    const result = parseSku(sku as string);
    expect(result).not.toBeNull();
    expect(result!.medidasCorte).toBe(expected);
  });
});

describe("calcMedidasCorte - Dupla Microfibra (Wilson)", () => {
  const cases = [
    ["CDGLMS300X280BRANCO", "Microfibra: 2 partes de 1,60m x 2,88m\nFlamê: 2 partes de 1,64m x 2,90m"],
    ["CDGLMS400X280PALHA", "Microfibra: 2 partes de 2,10m x 2,88m\nFlamê: 2 partes de 2,14m x 2,90m"],
    ["CDGLMS500X250PALHA", "Microfibra: 2 partes de 2,60m x 2,58m\nFlamê: 2 partes de 2,64m x 2,60m"],
    ["CDGLMS500X280PALHA", "Microfibra: 2 partes de 2,60m x 2,88m\nFlamê: 2 partes de 2,64m x 2,90m"],
    ["CDGLMS600X280CINZA", "Microfibra: 2 partes de 3,10m x 2,88m\nFlamê: 2 partes de 3,14m x 2,90m"],
    ["CDGLMS800X280BRANCO", "Microfibra: 2 partes de 4,10m x 2,88m\nFlamê: 2 partes de 4,14m x 2,90m"],
  ];

  it.each(cases)("SKU %s", (sku, expected) => {
    const result = parseSku(sku as string);
    expect(result).not.toBeNull();
    expect(result!.medidasCorte).toBe(expected);
  });
});

describe("calcMedidasCorte - Dupla Blackout", () => {
  it("should add +4cm to Flamê width", () => {
    const result = parseSku("CDGLBS400X270BRANCO");
    expect(result).not.toBeNull();
    expect(result!.medidasCorte).toBe(
      "Blackout: 2 partes de 2,10m x 2,78m\nFlamê: 2 partes de 2,14m x 2,80m"
    );
  });
});

describe("calcMedidasCorte - Janela", () => {
  it("220x130 cortina janela", () => {
    const result = parseSku("CBTI220X130CINZA");
    expect(result).not.toBeNull();
    expect(result!.medidasCorte).toBe("1 parte de 1,20m cortada ao meio");
  });
});

describe("parseSku - casos de borda", () => {
  it("prefixo desconhecido → null", () => {
    expect(parseSku("XYZW300X250BRANCO")).toBeNull();
  });

  it("SKU vazio → null", () => {
    expect(parseSku("")).toBeNull();
  });

  it("SKU com hífens não lança e retorna null", () => {
    expect(() => parseSku("63049100-PRETO-90CM")).not.toThrow();
    expect(parseSku("63049100-PRETO-90CM")).toBeNull();
    expect(parseSku("CE--Cinza")).toBeNull();
  });

  it("cor não reconhecida é usada como string", () => {
    const r = parseSku("CBTI300X250ROXOESCURO");
    expect(r).not.toBeNull();
    expect(r!.corTecido.toLowerCase()).toContain("roxo");
  });

  it("tamanhos fracionados calculam corretamente", () => {
    const r = parseSku("CBTS275X250BRANCO");
    expect(r).not.toBeNull();
    // metade(275)+10 = 147,5cm => 1,48m; altura 250+10 = 2,60m
    expect(r!.medidasCorte).toBe("2 partes de 1,48m x 2,60m");
  });
});

function mockLabel(partial: Partial<ParsedLabel>): ParsedLabel {
  return {
    id: crypto.randomUUID(),
    sku: "CBTS300X250BRANCO",
    quantidade: 1,
    remessa: "", lote: "", subdivisao: "", corte: "",
    dataSaida: "", categoria: "estoque", urgente: false,
    tamanho: "3,00m x 2,50m",
    larguraCm: 300, alturaCm: 250,
    medidasCorte: "",
    modelo: "Blackout Branco",
    corTecido: "Branco",
    parteInferior: "Bainha",
    parteSuperior: "Trilho Suiço",
    cliente: "Kaizen",
    obs: "",
    isDupla: false,
    ...partial,
  };
}

describe("sortLabels", () => {
  it("ordena por modelo, tamanho, lote", () => {
    const labels = [
      mockLabel({ modelo: "Blackout Branco", tamanho: "3,00m x 2,50m", lote: "B" }),
      mockLabel({ modelo: "Blackout Branco", tamanho: "3,00m x 2,50m", lote: "A" }),
      mockLabel({ modelo: "Flamê Bege", tamanho: "2,00m x 2,30m", lote: "A" }),
    ];
    const sorted = sortLabels(labels);
    expect(sorted[0].modelo).toBe("Blackout Branco");
    expect(sorted[0].lote).toBe("A");
    expect(sorted[2].modelo).toBe("Flamê Bege");
  });
});

describe("splitIntoLots", () => {
  it("não divide se quantidade <= maxLot", () => {
    const l = mockLabel({ larguraCm: 300, alturaCm: 250, quantidade: 8 });
    const lots = splitIntoLots(l);
    expect(lots).toHaveLength(1);
    expect(lots[0].subdivisao).toBe("1 de 1");
  });

  it("divide em sublistas do tamanho correto (largura<400 → 10/lote)", () => {
    const l = mockLabel({ larguraCm: 300, alturaCm: 250, quantidade: 25, modelo: "Blackout Branco" });
    const lots = splitIntoLots(l);
    expect(lots).toHaveLength(3);
    expect(lots[0].quantidade).toBe(10);
    expect(lots[1].quantidade).toBe(10);
    expect(lots[2].quantidade).toBe(5);
    expect(lots[2].subdivisao).toBe("3 de 3");
  });

  it("largura >= 400 → 5/lote para Blackout", () => {
    const l = mockLabel({ larguraCm: 500, alturaCm: 270, quantidade: 12, modelo: "Blackout Branco" });
    const lots = splitIntoLots(l);
    expect(lots).toHaveLength(3);
    expect(lots[0].quantidade).toBe(5);
    expect(lots[2].quantidade).toBe(2);
  });
});

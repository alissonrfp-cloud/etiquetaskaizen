import { describe, it, expect } from "vitest";
import { parseSku } from "@/utils/skuParser";

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

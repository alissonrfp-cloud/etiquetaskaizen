import type { Categoria } from "@/utils/skuParser";

export interface CellColors {
  backgroundColor: string;
  textColor: string;
}

const WHITE: CellColors = { backgroundColor: "#FFFFFF", textColor: "#000000" };
const AZUL_TRILHO: CellColors = { backgroundColor: "#00B0F0", textColor: "#000000" };
const ROSA_ILHOS: CellColors = { backgroundColor: "#FF99FF", textColor: "#000000" };
const ROXO_SHOPEE: CellColors = { backgroundColor: "#BF80FF", textColor: "#000000" };
const AZUL_CLARO_ML: CellColors = { backgroundColor: "#87CEEB", textColor: "#000000" };
const AMARELO_REVENDA: CellColors = { backgroundColor: "#FFFF00", textColor: "#000000" };
const CINZA_ESTOQUE: CellColors = { backgroundColor: "#D9D9D9", textColor: "#000000" };
const VERMELHO_DUPLA: CellColors = { backgroundColor: "#FF0000", textColor: "#FFFFFF" };
const VERMELHO_URGENTE: CellColors = { backgroundColor: "#FF0000", textColor: "#FFFFFF" };

function getAcabamentoColor(parteSuperior: string): CellColors {
  if (parteSuperior === "Trilho Suiço") return AZUL_TRILHO;
  if (parteSuperior === "Ilhós Redondo Cromado") return ROSA_ILHOS;
  return WHITE;
}

// Returns colors for each cell based on category + label properties
export function getLabelColors(
  categoria: Categoria,
  parteSuperior: string,
  isDupla: boolean,
  urgente: boolean
): {
  row: CellColors;
  modelo: CellColors;
  parteSup: CellColors;
  saida: CellColors;
} {
  const defaultSaida = urgente ? VERMELHO_URGENTE : WHITE;

  switch (categoria) {
    case "marketplace": {
      // Row color based on acabamento: trilho=azul, ilhós=rosa
      const base = getAcabamentoColor(parteSuperior);
      return {
        row: base,
        modelo: isDupla ? VERMELHO_DUPLA : base,
        parteSup: base,
        saida: defaultSaida,
      };
    }
    case "full_shopee":
      return {
        row: ROXO_SHOPEE,
        modelo: isDupla ? VERMELHO_DUPLA : ROXO_SHOPEE,
        parteSup: ROXO_SHOPEE,
        saida: defaultSaida,
      };
    case "full_ml":
      return {
        row: AZUL_CLARO_ML,
        modelo: isDupla ? VERMELHO_DUPLA : AZUL_CLARO_ML,
        parteSup: AZUL_CLARO_ML,
        saida: defaultSaida,
      };
    case "revenda": {
      const acabamento = getAcabamentoColor(parteSuperior);
      return {
        row: AMARELO_REVENDA,
        modelo: AMARELO_REVENDA,
        parteSup: acabamento.backgroundColor !== "#FFFFFF" ? acabamento : AMARELO_REVENDA,
        saida: defaultSaida,
      };
    }
    case "drop": {
      const base = getAcabamentoColor(parteSuperior);
      return {
        row: base,
        modelo: isDupla ? VERMELHO_DUPLA : base,
        parteSup: base,
        saida: defaultSaida,
      };
    }
    case "estoque": {
      const acabamento = getAcabamentoColor(parteSuperior);
      return {
        row: CINZA_ESTOQUE,
        modelo: CINZA_ESTOQUE,
        parteSup: acabamento.backgroundColor !== "#FFFFFF" ? acabamento : CINZA_ESTOQUE,
        saida: defaultSaida,
      };
    }
  }
}

// Category display labels
export const CATEGORIA_LABELS: Record<Categoria, string> = {
  marketplace: "Marketplace",
  full_shopee: "Full Shopee",
  full_ml: "Full ML",
  revenda: "Revenda",
  drop: "Drop",
  estoque: "Estoque",
};

export const CATEGORIA_COLORS: Record<Categoria, string> = {
  marketplace: "#00B0F0",
  full_shopee: "#BF80FF",
  full_ml: "#87CEEB",
  revenda: "#FFFF00",
  drop: "#00B0F0",
  estoque: "#D9D9D9",
};

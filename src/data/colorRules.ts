// Color rules based on actual ETIQUETAS spreadsheet patterns
// Colors are applied to the ENTIRE ROW based on Parte Superior type

export interface RowColorRule {
  backgroundColor: string; // hex
  textColor: string;
  label: string;
}

// Row background color by Parte Superior
export const PARTE_SUPERIOR_COLORS: Record<string, RowColorRule> = {
  "Trilho Suiço": {
    backgroundColor: "#00B0F0",
    textColor: "#000000",
    label: "Azul",
  },
  "Ilhós Redondo Cromado": {
    backgroundColor: "#FF99FF",
    textColor: "#000000",
    label: "Rosa",
  },
  "Wave": {
    backgroundColor: "#FFC000",
    textColor: "#000000",
    label: "Laranja",
  },
};

// Modelo (Dupla) gets special red highlight
export const MODELO_DUPLA_COLOR = {
  backgroundColor: "#FF0000",
  textColor: "#FFFFFF",
};

// Default row color if no match
export const DEFAULT_ROW_COLOR: RowColorRule = {
  backgroundColor: "#D9D9D9",
  textColor: "#000000",
  label: "Cinza",
};

export function getRowColor(parteSuperior: string): RowColorRule {
  return PARTE_SUPERIOR_COLORS[parteSuperior] || DEFAULT_ROW_COLOR;
}

export function getModeloColor(isDupla: boolean, parteSuperior: string) {
  if (isDupla) {
    return MODELO_DUPLA_COLOR;
  }
  return getRowColor(parteSuperior);
}

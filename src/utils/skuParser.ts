import { SKU_PREFIXES, type SkuPrefix } from "@/data/skuDatabase";

export type Categoria = "marketplace" | "full_shopee" | "full_ml" | "revenda" | "drop" | "estoque" | "wilson";

export interface ParsedLabel {
  id: string;
  sku: string;
  quantidade: number;
  remessa: string;
  lote: string;
  subdivisao: string;
  corte: string;
  dataSaida: string;
  categoria: Categoria;
  urgente: boolean;
  tamanho: string;
  larguraCm: number;
  alturaCm: number;
  medidasCorte: string;
  modelo: string;
  corTecido: string;
  parteInferior: string;
  parteSuperior: string;
  cliente: string;
  obs: string;
  isDupla: boolean;
  duplaType?: string;
}

function findPrefix(sku: string): SkuPrefix | null {
  const upper = sku.toUpperCase();
  for (const p of SKU_PREFIXES) {
    if (upper.startsWith(p.prefix)) return p;
  }
  return null;
}

function parseDimensions(sku: string, prefixLen: number): { largura: number; altura: number } | null {
  const rest = sku.substring(prefixLen);
  const match = rest.match(/^(\d+)X(\d+)/i);
  if (!match) return null;
  return { largura: parseInt(match[1]), altura: parseInt(match[2]) };
}

function parseColor(sku: string, prefixLen: number): string {
  const rest = sku.substring(prefixLen);
  const match = rest.match(/^\d+X\d+(.*)/i);
  if (!match || !match[1]) return "Branco";
  const cor = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  return cor || "Branco";
}

function formatSize(larguraCm: number, alturaCm: number): string {
  const l = (larguraCm / 100).toFixed(2).replace(".", ",");
  const a = (alturaCm / 100).toFixed(2).replace(".", ",");
  return `${l}m x ${a}m`;
}

// Window curtain sizes that use "1 parte cortada ao meio" pattern
const JANELA_SIZES: Record<string, string> = {
  "220X130": "1,20",
  "260X130": "1,40",
  "260X180": "1,90",
};

function calcMedidasCorte(larguraCm: number, alturaCm: number, isDupla: boolean, duplaType?: string): string {
  const sizeKey = `${larguraCm}X${alturaCm}`;
  const janelaAltura = JANELA_SIZES[sizeKey];

  if (janelaAltura) {
    if (isDupla) {
      return `${duplaType || "Blackout"}: 1 parte de ${janelaAltura}m cortada ao meio\nFlamê: 1 parte de ${janelaAltura}m cortada ao meio`;
    }
    return `1 parte de ${janelaAltura}m cortada ao meio`;
  }

  const metadeLargura = larguraCm / 2 + 10;
  const alturaCorte = alturaCm + 10;
  const lStr = (metadeLargura / 100).toFixed(2).replace(".", ",");
  const aStr = (alturaCorte / 100).toFixed(2).replace(".", ",");

  if (isDupla) {
    const alturaForro = alturaCm + 8;
    const larguraFlame = metadeLargura + 4;
    const aForroStr = (alturaForro / 100).toFixed(2).replace(".", ",");
    const lFlameStr = (larguraFlame / 100).toFixed(2).replace(".", ",");
    return `${duplaType || "Blackout"}: 2 partes de ${lStr}m x ${aForroStr}m\nFlamê: 2 partes de ${lFlameStr}m x ${aStr}m`;
  }

  return `2 partes de ${lStr}m x ${aStr}m`;
}

export function parseSku(sku: string, cliente?: string): Omit<ParsedLabel, "id" | "quantidade" | "remessa" | "lote" | "subdivisao" | "corte" | "dataSaida" | "categoria" | "urgente" | "cliente" | "obs"> | null {
  const upper = sku.toUpperCase().trim();
  const prefix = findPrefix(upper);
  if (!prefix) return null;

  const dims = parseDimensions(upper, prefix.prefix.length);
  if (!dims) return null;

  const corTecido = parseColor(upper, prefix.prefix.length);
  const modeloLabel = prefix.isDupla
    ? `Dupla ${prefix.duplaType} Flamê ${corTecido}`
    : `${prefix.modelo} ${corTecido}`;

  // Wilson uses simplified "Ilhós" instead of "Ilhós Redondo Cromado"
  const isWilson = cliente?.toLowerCase().includes("wilson");
  let parteSuperior = prefix.parteSuperior;
  if (isWilson && parteSuperior === "Ilhós Redondo Cromado") {
    parteSuperior = "Ilhós";
  }

  return {
    sku: upper,
    tamanho: formatSize(dims.largura, dims.altura),
    larguraCm: dims.largura,
    alturaCm: dims.altura,
    medidasCorte: calcMedidasCorte(dims.largura, dims.altura, prefix.isDupla, prefix.duplaType),
    modelo: modeloLabel,
    corTecido,
    parteInferior: "Bainha",
    parteSuperior,
    isDupla: prefix.isDupla,
    duplaType: prefix.duplaType,
  };
}

export function createLabel(
  sku: string,
  quantidade: number,
  remessa: string,
  lote: string,
  dataSaida: string,
  categoria: Categoria,
  urgente: boolean,
  cliente: string = "Kaizen Enxovais",
  obs: string = ""
): ParsedLabel | null {
  const parsed = parseSku(sku, cliente);
  if (!parsed) return null;

  return {
    id: crypto.randomUUID(),
    quantidade,
    remessa,
    lote,
    subdivisao: "",
    corte: "",
    dataSaida,
    categoria,
    urgente,
    cliente,
    obs,
    ...parsed,
  };
}

// Lot subdivision rules
function isJanelaSize(larguraCm: number, alturaCm: number): boolean {
  const key = `${larguraCm}X${alturaCm}`;
  return key in JANELA_SIZES;
}

function getMaxLotSize(isDupla: boolean, modelo: string, larguraCm: number, alturaCm: number): number {
  // Cortinas de janela: até 20 unidades
  if (isJanelaSize(larguraCm, alturaCm)) {
    return 20;
  }

  const upper = modelo.toUpperCase();
  
  // Dupla (Blackout + Gás de Linho) - same as blackout rules
  if (isDupla) {
    return larguraCm >= 400 ? 5 : 10;
  }
  
  // Gás de Linho + Forro de Microfibra patterns
  if (upper.includes("MICROFIBRA") || upper.includes("FLAMÊ")) {
    return larguraCm >= 500 ? 5 : 10;
  }
  
  // Blackout
  if (upper.includes("BLACKOUT")) {
    return larguraCm >= 400 ? 5 : 10;
  }
  
  // Default: 10
  return larguraCm >= 400 ? 5 : 10;
}

export function splitIntoLots(label: ParsedLabel): ParsedLabel[] {
  const maxLot = getMaxLotSize(label.isDupla, label.modelo, label.larguraCm, label.alturaCm);
  const total = label.quantidade;
  
  if (total <= maxLot) {
    return [{ ...label, subdivisao: "1 de 1", corte: "" }];
  }
  
  const numLots = Math.ceil(total / maxLot);
  const lots: ParsedLabel[] = [];
  let remaining = total;
  
  for (let i = 0; i < numLots; i++) {
    const qty = Math.min(maxLot, remaining);
    remaining -= qty;
    lots.push({
      ...label,
      id: i === 0 ? label.id : crypto.randomUUID(),
      quantidade: qty,
      subdivisao: `${i + 1} de ${numLots}`,
      corte: "",
    });
  }
  
  return lots;
}

export function createManualLabel(data: {
  quantidade: number;
  remessa: string;
  lote: string;
  dataSaida: string;
  categoria: Categoria;
  urgente: boolean;
  modelo: string;
  tamanho: string;
  medidasCorte: string;
  parteSuperior: string;
  parteInferior: string;
  isDupla: boolean;
  obs: string;
  cliente?: string;
}): ParsedLabel {
  return {
    id: crypto.randomUUID(),
    sku: "MANUAL",
    quantidade: data.quantidade,
    remessa: data.remessa,
    lote: data.lote,
    subdivisao: "",
    corte: "",
    dataSaida: data.dataSaida,
    categoria: data.categoria,
    urgente: data.urgente,
    tamanho: data.tamanho,
    larguraCm: 0,
    alturaCm: 0,
    medidasCorte: data.medidasCorte,
    modelo: data.modelo,
    corTecido: "",
    parteInferior: data.parteInferior,
    parteSuperior: data.parteSuperior,
    cliente: data.cliente || "Kaizen Enxovais",
    obs: data.obs,
    isDupla: data.isDupla,
  };
}

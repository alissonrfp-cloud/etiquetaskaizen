import { SKU_PREFIXES, type SkuPrefix } from "@/data/skuDatabase";

export type Categoria = "marketplace" | "full_shopee" | "full_ml" | "revenda" | "drop" | "estoque";

export interface ParsedLabel {
  id: string;
  sku: string;
  quantidade: number;
  remessa: string;
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

function calcMedidasCorte(larguraCm: number, alturaCm: number, isDupla: boolean, duplaType?: string): string {
  const metadeLargura = larguraCm / 2 + 10;
  const alturaCorte = alturaCm + 10;
  const lStr = (metadeLargura / 100).toFixed(2).replace(".", ",");
  const aStr = (alturaCorte / 100).toFixed(2).replace(".", ",");

  if (isDupla) {
    const alturaForro = alturaCm + 8;
    const aForroStr = (alturaForro / 100).toFixed(2).replace(".", ",");
    return `2 partes de Flamê de ${lStr}m x ${aStr}m\n2 partes de ${duplaType || "Blackout"} de ${lStr}m x ${aForroStr}m`;
  }

  return `2 partes de ${lStr}m x ${aStr}m`;
}

export function parseSku(sku: string): Omit<ParsedLabel, "id" | "quantidade" | "remessa" | "dataSaida" | "categoria" | "urgente" | "cliente" | "obs"> | null {
  const upper = sku.toUpperCase().trim();
  const prefix = findPrefix(upper);
  if (!prefix) return null;

  const dims = parseDimensions(upper, prefix.prefix.length);
  if (!dims) return null;

  const corTecido = parseColor(upper, prefix.prefix.length);
  const modeloLabel = prefix.isDupla
    ? `Dupla ${prefix.duplaType} Flamê ${corTecido}`
    : `${prefix.modelo} ${corTecido}`;

  return {
    sku: upper,
    tamanho: formatSize(dims.largura, dims.altura),
    larguraCm: dims.largura,
    alturaCm: dims.altura,
    medidasCorte: calcMedidasCorte(dims.largura, dims.altura, prefix.isDupla, prefix.duplaType),
    modelo: modeloLabel,
    corTecido,
    parteInferior: "Bainha",
    parteSuperior: prefix.parteSuperior,
    isDupla: prefix.isDupla,
    duplaType: prefix.duplaType,
  };
}

export function createLabel(
  sku: string,
  quantidade: number,
  remessa: string,
  dataSaida: string,
  categoria: Categoria,
  urgente: boolean,
  cliente: string = "Kaizen Enxovais",
  obs: string = ""
): ParsedLabel | null {
  const parsed = parseSku(sku);
  if (!parsed) return null;

  return {
    id: crypto.randomUUID(),
    quantidade,
    remessa,
    dataSaida,
    categoria,
    urgente,
    cliente,
    obs,
    ...parsed,
  };
}

export function createManualLabel(data: {
  quantidade: number;
  remessa: string;
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
}): ParsedLabel {
  return {
    id: crypto.randomUUID(),
    sku: "MANUAL",
    quantidade: data.quantidade,
    remessa: data.remessa,
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
    cliente: "Kaizen Enxovais",
    obs: data.obs,
    isDupla: data.isDupla,
  };
}

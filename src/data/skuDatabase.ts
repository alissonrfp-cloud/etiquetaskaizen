export interface SkuPrefix {
  prefix: string;
  modelo: string;
  parteSuperior: string;
  isDupla: boolean;
  duplaType?: string; // "Blackout" or "Microfibra"
}

export const SKU_PREFIXES: SkuPrefix[] = [
  { prefix: "CDGLBI", modelo: "Dupla Flamê c/ Blackout", parteSuperior: "Ilhós Redondo Cromado", isDupla: true, duplaType: "Blackout" },
  { prefix: "CDGLMI", modelo: "Dupla Flamê c/ Microfibra", parteSuperior: "Ilhós Redondo Cromado", isDupla: true, duplaType: "Microfibra" },
  { prefix: "CDGLBW", modelo: "Dupla Flamê c/ Blackout", parteSuperior: "Wave", isDupla: true, duplaType: "Blackout" },
  { prefix: "CDGLMW", modelo: "Dupla Flamê c/ Microfibra", parteSuperior: "Wave", isDupla: true, duplaType: "Microfibra" },
  { prefix: "CBTI", modelo: "Blackout", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
  { prefix: "CBTS", modelo: "Blackout", parteSuperior: "Trilho Suiço", isDupla: false },
  { prefix: "CBTW", modelo: "Blackout", parteSuperior: "Wave", isDupla: false },
  { prefix: "CGLI", modelo: "Flamê", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
  { prefix: "CGLS", modelo: "Flamê", parteSuperior: "Trilho Suiço", isDupla: false },
  { prefix: "CGLW", modelo: "Flamê", parteSuperior: "Wave", isDupla: false },
  { prefix: "COXF", modelo: "Oxford", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
];

// Sort by prefix length descending so longer prefixes match first
SKU_PREFIXES.sort((a, b) => b.prefix.length - a.prefix.length);

export const CORES_TECIDO = ["Branco", "Bege", "Chumbo", "Cinza", "Palha", "Preto", "Tabaco"] as const;

export type CorTecido = typeof CORES_TECIDO[number];

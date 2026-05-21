export interface SkuPrefix {
  prefix: string;
  modelo: string;
  parteSuperior: string;
  isDupla: boolean;
  duplaType?: string; // "Blackout" or "Microfibra"
}

export const SKU_PREFIXES: SkuPrefix[] = [
  // Dupla - Ilhós
  { prefix: "CDGLBI", modelo: "Dupla Flamê c/ Blackout", parteSuperior: "Ilhós Redondo Cromado", isDupla: true, duplaType: "Blackout" },
  { prefix: "CDGLMI", modelo: "Dupla Flamê c/ Microfibra", parteSuperior: "Ilhós Redondo Cromado", isDupla: true, duplaType: "Microfibra" },
  // Dupla - Wave
  { prefix: "CDGLBW", modelo: "Dupla Flamê c/ Blackout", parteSuperior: "Wave", isDupla: true, duplaType: "Blackout" },
  { prefix: "CDGLMW", modelo: "Dupla Flamê c/ Microfibra", parteSuperior: "Wave", isDupla: true, duplaType: "Microfibra" },
  // Dupla - Trilho Suiço
  { prefix: "CDGLBS", modelo: "Dupla Flamê c/ Blackout", parteSuperior: "Trilho Suiço", isDupla: true, duplaType: "Blackout" },
  { prefix: "CDGLMS", modelo: "Dupla Flamê c/ Microfibra", parteSuperior: "Trilho Suiço", isDupla: true, duplaType: "Microfibra" },
  // Dupla - Trilho Duplo
  { prefix: "CDGLBD", modelo: "Dupla Flamê c/ Blackout", parteSuperior: "Trilho Duplo", isDupla: true, duplaType: "Blackout" },
  { prefix: "CDGLMD", modelo: "Dupla Flamê c/ Microfibra", parteSuperior: "Trilho Duplo", isDupla: true, duplaType: "Microfibra" },
  // Blackout
  { prefix: "CBTI", modelo: "Blackout", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
  { prefix: "CBTS", modelo: "Blackout", parteSuperior: "Trilho Suiço", isDupla: false },
  { prefix: "CBTW", modelo: "Blackout", parteSuperior: "Wave", isDupla: false },
  { prefix: "CBTD", modelo: "Blackout", parteSuperior: "Trilho Duplo", isDupla: false },
  // Flamê
  { prefix: "CGLI", modelo: "Flamê", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
  { prefix: "CGLS", modelo: "Flamê", parteSuperior: "Trilho Suiço", isDupla: false },
  { prefix: "CGLW", modelo: "Flamê", parteSuperior: "Wave", isDupla: false },
  { prefix: "CGLD", modelo: "Flamê", parteSuperior: "Trilho Duplo", isDupla: false },
  // Oxford
  { prefix: "COXF", modelo: "Oxford", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
  // Porta - Blackout / Microfibra
  { prefix: "CBTP", modelo: "Blackout para Porta", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
  { prefix: "CMTP", modelo: "Microfibra para Porta", parteSuperior: "Ilhós Redondo Cromado", isDupla: false },
];

// Sort by prefix length descending so longer prefixes match first
SKU_PREFIXES.sort((a, b) => b.prefix.length - a.prefix.length);

export const CORES_TECIDO = ["Branco", "Bege", "Chumbo", "Cinza", "Palha", "Preto", "Tabaco"] as const;

export type CorTecido = typeof CORES_TECIDO[number];

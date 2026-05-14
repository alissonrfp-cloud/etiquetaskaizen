import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { parsePickingListSmart } from "@/utils/pdfParser";
import { createLabel, type ParsedLabel, type Categoria } from "@/utils/skuParser";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PdfReviewDialog, type ReviewRow } from "./PdfReviewDialog";

interface PdfUploadProps {
  remessa: string;
  lote: string;
  categoria: Categoria;
  cliente: string;
  onLabelsAdded: (labels: ParsedLabel[]) => void;
}

export function PdfUpload({ remessa, lote, categoria, cliente, onLabelsAdded }: PdfUploadProps) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [forceAi, setForceAi] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [expectedTotal, setExpectedTotal] = useState<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setLoading(true);
    const allRows: ReviewRow[] = [];
    const methodsUsed = new Set<string>();
    const errors: string[] = [];
    let totalSum: number | undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStage(`Lendo ${i + 1}/${files.length}: ${file.name}…`);
      try {
        const { items, method, expectedTotal: et } = await parsePickingListSmart(file, { forceAi });
        methodsUsed.add(method);
        if (et !== undefined) totalSum = (totalSum ?? 0) + et;
        for (const it of items) {
          allRows.push({
            id: crypto.randomUUID(),
            sku: it.sku,
            quantidade: it.quantidade,
            recognized: it.recognized,
            source: it.source ?? (files.length > 1 ? file.name : undefined),
          });
        }
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : "erro desconhecido"}`);
      }
    }
    setExpectedTotal(totalSum);

    setLoading(false);
    setStage("");

    if (allRows.length === 0) {
      toast({
        title: "Nenhum SKU encontrado",
        description: errors.length > 0 ? errors.join(" · ") : (forceAi
          ? "A IA não identificou itens. Verifique se o PDF contém produtos válidos."
          : "Tente ativar o modo IA para layouts diferentes."),
        variant: "destructive",
      });
      return;
    }

    if (errors.length > 0) {
      toast({
        title: `${errors.length} arquivo(s) com erro`,
        description: errors.join(" · "),
        variant: "destructive",
      });
    }

    const methodLabel = Array.from(methodsUsed)
      .map((m) => m === "heuristic" ? "leitura rápida" : m === "ai" ? "IA" : "IA + OCR")
      .join(" + ");
    toast({
      title: `${allRows.length} item(ns) extraído(s) (${methodLabel})`,
      description: "Revise os itens antes de confirmar.",
    });

    setReviewRows(allRows);
    setReviewOpen(true);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    await processFiles(files);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (loading) return;
    const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (files.length === 0) {
      toast({ title: "Solte arquivos PDF", variant: "destructive" });
      return;
    }
    await processFiles(files);
  };

  const handleConfirm = (rows: ReviewRow[]) => {
    const dataSaida = format(new Date(), "dd/MM");
    const labels: ParsedLabel[] = [];
    const failed: string[] = [];
    for (const r of rows) {
      const label = createLabel(r.sku, r.quantidade, remessa, lote, dataSaida, categoria, false, cliente);
      if (label) labels.push(label);
      else failed.push(r.sku);
    }
    setReviewOpen(false);
    setReviewRows([]);
    if (labels.length > 0) {
      onLabelsAdded(labels);
      toast({
        title: `${labels.length} etiqueta(s) adicionada(s)`,
        description: failed.length > 0 ? `Não reconhecidos: ${failed.join(", ")}` : undefined,
      });
    } else {
      toast({ title: "Nenhuma etiqueta válida", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={dragActive ? "ring-2 ring-primary rounded-md" : undefined}
      >
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="gap-1.5 w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="truncate max-w-[180px]">{stage || "Importando..."}</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Importar PDF{dragActive ? " — solte aqui" : ""}
            </>
          )}
        </Button>
      </div>
      <div className="flex items-center gap-2 px-1">
        <Switch id="force-ai" checked={forceAi} onCheckedChange={setForceAi} disabled={loading} />
        <Label htmlFor="force-ai" className="text-xs flex items-center gap-1 cursor-pointer">
          <Sparkles className="h-3 w-3" />
          Modo IA (layouts diferentes / escaneados)
        </Label>
      </div>

      <PdfReviewDialog
        open={reviewOpen}
        rows={reviewRows}
        expectedTotal={expectedTotal}
        onCancel={() => { setReviewOpen(false); setReviewRows([]); setExpectedTotal(undefined); }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

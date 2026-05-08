import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { parsePickingListSmart } from "@/utils/pdfParser";
import { createLabel, type ParsedLabel, type Categoria } from "@/utils/skuParser";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStage(forceAi ? "Analisando com IA..." : "Lendo PDF...");
    try {
      const { items, method } = await parsePickingListSmart(file, { forceAi });

      if (method !== "heuristic") {
        setStage("IA processando...");
      }

      if (items.length === 0) {
        toast({
          title: "Nenhum SKU encontrado no PDF",
          description: forceAi
            ? "A IA não identificou itens. Verifique se o PDF contém produtos válidos."
            : "Tente ativar o modo IA para layouts diferentes.",
          variant: "destructive",
        });
        return;
      }

      const dataSaida = format(new Date(), "dd/MM/yyyy");
      const labels: ParsedLabel[] = [];
      const errors: string[] = [];

      for (const item of items) {
        const label = createLabel(item.sku, item.quantidade, remessa, lote, dataSaida, categoria, false, cliente);
        if (label) {
          labels.push(label);
        } else {
          errors.push(item.sku);
        }
      }

      const methodLabel =
        method === "heuristic" ? "leitura rápida" : method === "ai" ? "IA" : "IA + OCR";

      if (labels.length > 0) {
        onLabelsAdded(labels);
        toast({
          title: `${labels.length} etiquetas importadas (${methodLabel})`,
          description: errors.length > 0 ? `SKUs não reconhecidos: ${errors.join(", ")}` : undefined,
        });
      } else {
        toast({
          title: "Nenhum SKU reconhecido",
          description: errors.join(", "),
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao ler o PDF",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setStage("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {stage || "Importando..."}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Importar PDF
          </>
        )}
      </Button>
      <div className="flex items-center gap-2 px-1">
        <Switch
          id="force-ai"
          checked={forceAi}
          onCheckedChange={setForceAi}
          disabled={loading}
        />
        <Label htmlFor="force-ai" className="text-xs flex items-center gap-1 cursor-pointer">
          <Sparkles className="h-3 w-3" />
          Modo IA (layouts diferentes / PDF escaneado)
        </Label>
      </div>
    </div>
  );
}

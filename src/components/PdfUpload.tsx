import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { parsePickingListPdf } from "@/utils/pdfParser";
import { createLabel, type ParsedLabel, type Categoria } from "@/utils/skuParser";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PdfUploadProps {
  remessa: string;
  categoria: Categoria;
  onLabelsAdded: (labels: ParsedLabel[]) => void;
}

export function PdfUpload({ remessa, categoria, onLabelsAdded }: PdfUploadProps) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const items = await parsePickingListPdf(file);
      if (items.length === 0) {
        toast({ title: "Nenhum SKU encontrado no PDF", variant: "destructive" });
        return;
      }

      const dataSaida = format(new Date(), "dd/MM/yyyy");
      const labels: ParsedLabel[] = [];
      const errors: string[] = [];

      for (const item of items) {
        const label = createLabel(item.sku, item.quantidade, remessa, dataSaida, categoria, false);
        if (label) {
          labels.push(label);
        } else {
          errors.push(item.sku);
        }
      }

      if (labels.length > 0) {
        onLabelsAdded(labels);
        toast({
          title: `${labels.length} etiquetas importadas!`,
          description: errors.length > 0 ? `SKUs não reconhecidos: ${errors.join(", ")}` : undefined,
        });
      } else {
        toast({ title: "Nenhum SKU reconhecido", description: errors.join(", "), variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao ler o PDF", variant: "destructive" });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
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
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Importar PDF
      </Button>
    </>
  );
}

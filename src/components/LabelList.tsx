import type { ParsedLabel } from "@/utils/skuParser";
import { getRowColor, getModeloColor } from "@/data/colorRules";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface LabelListProps {
  labels: ParsedLabel[];
  onRemove: (id: string) => void;
}

export function LabelList({ labels, onRemove }: LabelListProps) {
  if (labels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma etiqueta adicionada ainda. Digite um SKU acima para começar.
      </div>
    );
  }

  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            <th className={cellClass}>#</th>
            <th className={cellClass}>Remessa</th>
            <th className={cellClass}>Quant.</th>
            <th className={cellClass}>Tamanho</th>
            <th className={cellClass}>Medidas do Corte</th>
            <th className={cellClass}>Modelo</th>
            <th className={cellClass}>P. Inferior</th>
            <th className={cellClass}>P. Superior</th>
            <th className={cellClass}>OBS</th>
            <th className={cellClass}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => {
            const rowColor = getRowColor(label.parteSuperior);
            const modeloColor = getModeloColor(label.isDupla, label.parteSuperior);
            return (
              <tr key={label.id}>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{i + 1}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.remessa}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.quantidade}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.tamanho}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
                <td className={cellClass} style={{ backgroundColor: modeloColor.backgroundColor, color: modeloColor.textColor, fontWeight: 600 }}>{label.modelo}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.parteInferior}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.parteSuperior}</td>
                <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.obs || "—"}</td>
                <td className={cellClass}>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(label.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

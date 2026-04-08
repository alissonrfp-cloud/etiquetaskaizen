import type { ParsedLabel } from "@/utils/skuParser";
import { getLabelColors } from "@/data/colorRules";
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
            <th className={cellClass}>Lote</th>
            <th className={cellClass}>Quant.</th>
            <th className={cellClass}>Corte</th>
            <th className={cellClass}>Saída</th>
            <th className={cellClass}>Tamanho</th>
            <th className={cellClass}>Tamanho do Corte</th>
            <th className={cellClass}>Modelo</th>
            <th className={cellClass}>Parte Superior</th>
            <th className={cellClass}>Cortador</th>
            <th className={cellClass}>Overloque</th>
            <th className={cellClass}>Costura</th>
            <th className={cellClass}>Cliente</th>
            <th className={cellClass}>Retirada</th>
            <th className={cellClass}>OBS</th>
            <th className={cellClass}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => {
            const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
            return (
              <tr key={label.id}>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{i + 1}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.remessa}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.lote}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.quantidade}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.corte || ""}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: label.urgente ? 700 : 400 }}>
                  {label.dataSaida}{label.urgente ? " ⚠" : ""}
                </td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.tamanho}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
                <td className={cellClass} style={{ backgroundColor: colors.modelo.backgroundColor, color: colors.modelo.textColor, fontWeight: 600 }}>{label.modelo}</td>
                <td className={cellClass} style={{ backgroundColor: colors.parteSup.backgroundColor, color: colors.parteSup.textColor }}>{label.parteSuperior}</td>
                <td className={cellClass} style={{ minWidth: 60 }}></td>
                <td className={cellClass} style={{ minWidth: 60 }}></td>
                <td className={cellClass} style={{ minWidth: 60 }}></td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.cliente}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: 700 }}>
                  {label.dataSaida}
                </td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.obs || "—"}</td>
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

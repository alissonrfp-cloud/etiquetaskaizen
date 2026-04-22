import { useState } from "react";
import type { ParsedLabel } from "@/utils/skuParser";
import { getLabelColors } from "@/data/colorRules";
import { Button } from "@/components/ui/button";
import { Trash2, Split, Merge } from "lucide-react";

interface LabelListProps {
  labels: ParsedLabel[];
  onRemove: (id: string) => void;
  onUpdate?: (id: string, field: string, value: string) => void;
  onToggleSubdivisao?: (id: string) => void;
}

export function LabelList({ labels, onRemove, onUpdate, onToggleSubdivisao }: LabelListProps) {
  const sortedLabels = [...labels].sort((a, b) => a.modelo.localeCompare(b.modelo, "pt-BR"));
  const showSaidaInicio = labels.some((l) => l.categoria === "wilson");

  if (labels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma etiqueta adicionada ainda. Digite um SKU acima para começar.
      </div>
    );
  }

  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";

  // Detecta se etiqueta faz parte de uma subdivisão real (formato "X de Y" com Y>1)
  const isSubdivided = (sub: string) => {
    const m = sub?.match(/^(\d+)\s*de\s*(\d+)$/i);
    return m ? parseInt(m[2]) > 1 : false;
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            <th className={cellClass}>#</th>
            <th className={cellClass}>Remessa</th>
            <th className={cellClass}>Lote</th>
            <th className={cellClass}>Quant.</th>
            <th className={cellClass}>Saída</th>
            <th className={cellClass}>Subdiv.</th>
            <th className={cellClass}>Corte</th>
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
          {sortedLabels.map((label, i) => {
            const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
            const subdivided = isSubdivided(label.subdivisao);
            return (
              <tr key={label.id}>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{i + 1}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.remessa}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.lote}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.quantidade}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: 700 }}>
                  {label.dataSaida}{label.urgente ? " ⚠" : ""}
                </td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.subdivisao || "1 de 1"}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.corte || ""}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.tamanho}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
                <td className={cellClass} style={{ backgroundColor: colors.modelo.backgroundColor, color: colors.modelo.textColor, fontWeight: 600 }}>{label.modelo}</td>
                <td className={cellClass} style={{ backgroundColor: colors.parteSup.backgroundColor, color: colors.parteSup.textColor }}>{label.parteSuperior}</td>
                <EditableCell labelId={label.id} field="cortador" value={(label as any).cortador || ""} bgColor={colors.row.backgroundColor} onUpdate={onUpdate} />
                <EditableCell labelId={label.id} field="overloque" value={(label as any).overloque || ""} bgColor={colors.row.backgroundColor} onUpdate={onUpdate} />
                <EditableCell labelId={label.id} field="costura" value={(label as any).costura || ""} bgColor={colors.row.backgroundColor} onUpdate={onUpdate} />
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.cliente}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: 700 }}>
                  {label.dataSaida}
                </td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.obs || "—"}</td>
                <td className={cellClass}>
                  <div className="flex gap-1 justify-center">
                    {onToggleSubdivisao && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title={subdivided ? "Aglutinar (remover subdivisão)" : "Subdividir em lotes"}
                        onClick={() => onToggleSubdivisao(label.id)}
                      >
                        {subdivided ? <Merge className="h-3 w-3" /> : <Split className="h-3 w-3" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(label.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditableCell({
  labelId,
  field,
  value,
  bgColor,
  onUpdate,
}: {
  labelId: string;
  field: string;
  value: string;
  bgColor: string;
  onUpdate?: (id: string, field: string, value: string) => void;
}) {
  const [localVal, setLocalVal] = useState(value);
  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";

  return (
    <td className={cellClass} style={{ backgroundColor: bgColor, minWidth: 70 }}>
      <input
        type="text"
        value={localVal}
        onChange={(e) => {
          setLocalVal(e.target.value);
          onUpdate?.(labelId, field, e.target.value);
        }}
        className="w-full bg-transparent text-xs text-center outline-none border-none focus:ring-1 focus:ring-primary rounded px-1"
        placeholder="—"
      />
    </td>
  );
}

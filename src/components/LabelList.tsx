import { useMemo, useState } from "react";
import { sortLabels, type ParsedLabel } from "@/utils/skuParser";
import { getLabelColors } from "@/data/colorRules";
import { Button } from "@/components/ui/button";
import { Trash2, Split, Merge } from "lucide-react";

interface LabelListProps {
  labels: ParsedLabel[];
  onRemove: (id: string) => void;
  onUpdate?: (id: string, field: keyof ParsedLabel, value: string | number | boolean) => void;
  onToggleSubdivisao?: (id: string) => void;
}

export function LabelList({ labels, onRemove, onUpdate, onToggleSubdivisao }: LabelListProps) {
  // Ordem estável: só recalcula quando o conjunto de IDs ou modelos muda — não a cada
  // tecla digitada num campo editável (evita perder o foco).
  const orderKey = useMemo(
    () => labels.map((l) => `${l.id}|${l.modelo}|${l.tamanho}|${l.lote}`).join("§"),
    [labels],
  );
  const orderedIds = useMemo(() => sortLabels(labels).map((l) => l.id), [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sortedLabels = useMemo(() => {
    const map = new Map(labels.map((l) => [l.id, l]));
    return orderedIds.map((id) => map.get(id)!).filter(Boolean);
  }, [labels, orderedIds]);

  const showSaidaInicio = labels.some((l) => l.categoria === "wilson");

  if (labels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma etiqueta adicionada ainda. Digite um SKU acima para começar.
      </div>
    );
  }

  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";

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
            <th className={cellClass}>Subdiv.</th>
            <th className={cellClass}>Corte</th>
            {showSaidaInicio && <th className={cellClass}>Saída</th>}
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
            const bg = colors.row.backgroundColor;
            return (
              <tr key={label.id}>
                <td className={cellClass} style={{ backgroundColor: bg }}>{i + 1}</td>
                <EditableCell labelId={label.id} field="remessa" value={label.remessa} bgColor={bg} onUpdate={onUpdate} />
                <EditableCell labelId={label.id} field="lote" value={label.lote} bgColor={bg} bold onUpdate={onUpdate} />
                <EditableCell labelId={label.id} field="quantidade" value={String(label.quantidade)} bgColor={bg} bold numeric onUpdate={onUpdate} />
                <td className={cellClass} style={{ backgroundColor: bg, fontWeight: 700 }}>{label.subdivisao || "1 de 1"}</td>
                <EditableCell labelId={label.id} field="corte" value={label.corte || ""} bgColor={bg} onUpdate={onUpdate} />
                {showSaidaInicio && (
                  <EditableCell
                    labelId={label.id}
                    field="saidaInicio"
                    value={label.saidaInicio || ""}
                    bgColor={colors.saida.backgroundColor}
                    textColor={colors.saida.textColor}
                    bold
                    onUpdate={onUpdate}
                  />
                )}
                <td className={cellClass} style={{ backgroundColor: bg }}>{label.tamanho}</td>
                <td className={cellClass} style={{ backgroundColor: bg, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
                <td className={cellClass} style={{ backgroundColor: colors.modelo.backgroundColor, color: colors.modelo.textColor, fontWeight: 600 }}>{label.modelo}</td>
                <td className={cellClass} style={{ backgroundColor: colors.parteSup.backgroundColor, color: colors.parteSup.textColor }}>{label.parteSuperior}</td>
                <EditableCell labelId={label.id} field="cortador" value={label.cortador || ""} bgColor={bg} onUpdate={onUpdate} />
                <EditableCell labelId={label.id} field="overloque" value={label.overloque || ""} bgColor={bg} onUpdate={onUpdate} />
                <EditableCell labelId={label.id} field="costura" value={label.costura || ""} bgColor={bg} onUpdate={onUpdate} />
                <td className={cellClass} style={{ backgroundColor: bg }}>{label.cliente}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: 700 }}>
                  {label.dataSaida}
                </td>
                <EditableCell
                  labelId={label.id}
                  field="obs"
                  value={label.obs || ""}
                  bgColor={bg}
                  onUpdate={onUpdate}
                  placeholder="—"
                  minWidth={90}
                />
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
  textColor,
  bold,
  numeric,
  placeholder,
  minWidth = 70,
  onUpdate,
}: {
  labelId: string;
  field: keyof ParsedLabel;
  value: string;
  bgColor: string;
  textColor?: string;
  bold?: boolean;
  numeric?: boolean;
  placeholder?: string;
  minWidth?: number;
  onUpdate?: (id: string, field: keyof ParsedLabel, value: string | number | boolean) => void;
}) {
  const [localVal, setLocalVal] = useState(value);
  // Sync prop changes when not editing locally
  if (value !== localVal && document.activeElement?.getAttribute("data-fieldid") !== `${labelId}:${String(field)}`) {
    // Only re-sync when user is not actively editing this cell.
    // (intentional non-effect to avoid stale state across re-renders)
  }

  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";
  return (
    <td className={cellClass} style={{ backgroundColor: bgColor, minWidth }}>
      <input
        type={numeric ? "number" : "text"}
        data-fieldid={`${labelId}:${String(field)}`}
        value={localVal}
        onChange={(e) => {
          const v = e.target.value;
          setLocalVal(v);
          if (numeric) {
            const n = parseInt(v);
            onUpdate?.(labelId, field, Number.isFinite(n) ? n : 0);
          } else {
            onUpdate?.(labelId, field, v);
          }
        }}
        className="w-full bg-transparent text-xs text-center outline-none border-none focus:ring-1 focus:ring-primary rounded px-1"
        style={{ color: textColor, fontWeight: bold ? 700 : undefined }}
        placeholder={placeholder ?? "—"}
      />
    </td>
  );
}

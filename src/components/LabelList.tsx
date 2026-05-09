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
  // Ordem estável: só recalcula quando entra/sai linha (não a cada digitação em campo livre).
  const orderKey = useMemo(() => labels.map((l) => l.id).join("§"), [labels]);
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

  // Wrapper para marcar medidasCorte como manual quando editado.
  const handleUpdate = (id: string, field: keyof ParsedLabel, value: string | number | boolean) => {
    onUpdate?.(id, field, value);
    if (field === "medidasCorte") {
      onUpdate?.(id, "medidasCorteManual", true);
    }
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
                <EditableCell labelId={label.id} field="remessa" value={label.remessa} bgColor={bg} onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="lote" value={label.lote} bgColor={bg} bold onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="quantidade" value={String(label.quantidade)} bgColor={bg} bold numeric onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="subdivisao" value={label.subdivisao || "1 de 1"} bgColor={bg} bold onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="corte" value={label.corte || ""} bgColor={bg} onUpdate={handleUpdate} />
                {showSaidaInicio && (
                  <EditableCell
                    labelId={label.id}
                    field="saidaInicio"
                    value={label.saidaInicio || ""}
                    bgColor={colors.saida.backgroundColor}
                    textColor={colors.saida.textColor}
                    bold
                    onUpdate={handleUpdate}
                  />
                )}
                <EditableCell labelId={label.id} field="tamanho" value={label.tamanho} bgColor={bg} onUpdate={handleUpdate} minWidth={80} />
                <EditableCell
                  labelId={label.id}
                  field="medidasCorte"
                  value={label.medidasCorte}
                  bgColor={bg}
                  multiline
                  minWidth={110}
                  title="Tamanho do corte calculado. Ao editar, vira override e não recalcula mais."
                  onUpdate={handleUpdate}
                />
                <EditableCell
                  labelId={label.id}
                  field="modelo"
                  value={label.modelo}
                  bgColor={colors.modelo.backgroundColor}
                  textColor={colors.modelo.textColor}
                  bold
                  minWidth={90}
                  onUpdate={handleUpdate}
                />
                <EditableCell
                  labelId={label.id}
                  field="parteSuperior"
                  value={label.parteSuperior}
                  bgColor={colors.parteSup.backgroundColor}
                  textColor={colors.parteSup.textColor}
                  minWidth={90}
                  onUpdate={handleUpdate}
                />
                <EditableCell labelId={label.id} field="cortador" value={label.cortador || ""} bgColor={bg} onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="overloque" value={label.overloque || ""} bgColor={bg} onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="costura" value={label.costura || ""} bgColor={bg} onUpdate={handleUpdate} />
                <EditableCell labelId={label.id} field="cliente" value={label.cliente} bgColor={bg} minWidth={90} onUpdate={handleUpdate} />
                <EditableCell
                  labelId={label.id}
                  field="dataSaida"
                  value={label.dataSaida}
                  bgColor={colors.saida.backgroundColor}
                  textColor={colors.saida.textColor}
                  bold
                  onUpdate={handleUpdate}
                />
                <EditableCell
                  labelId={label.id}
                  field="obs"
                  value={label.obs || ""}
                  bgColor={bg}
                  onUpdate={handleUpdate}
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
  multiline,
  placeholder,
  minWidth = 70,
  title,
  onUpdate,
}: {
  labelId: string;
  field: keyof ParsedLabel;
  value: string;
  bgColor: string;
  textColor?: string;
  bold?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
  minWidth?: number;
  title?: string;
  onUpdate?: (id: string, field: keyof ParsedLabel, value: string | number | boolean) => void;
}) {
  const [localVal, setLocalVal] = useState(value);
  const fieldId = `${labelId}:${String(field)}`;
  const isEditing = typeof document !== "undefined" && document.activeElement?.getAttribute("data-fieldid") === fieldId;
  if (!isEditing && value !== localVal) {
    // Sincroniza valor externo quando célula não está em foco.
    setLocalVal(value);
  }

  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";
  const baseStyle: React.CSSProperties = {
    color: textColor,
    fontWeight: bold ? 700 : undefined,
  };
  const sharedProps = {
    "data-fieldid": fieldId,
    value: localVal,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setLocalVal(v);
      if (numeric) {
        const n = parseInt(v);
        onUpdate?.(labelId, field, Number.isFinite(n) ? n : 0);
      } else {
        onUpdate?.(labelId, field, v);
      }
    },
    placeholder: placeholder ?? "—",
    title,
    className: "w-full bg-transparent text-xs text-center outline-none border-none focus:ring-1 focus:ring-primary rounded px-1",
    style: baseStyle,
  };

  return (
    <td className={cellClass} style={{ backgroundColor: bgColor, minWidth }}>
      {multiline ? (
        <textarea
          {...sharedProps}
          rows={2}
          style={{ ...baseStyle, resize: "none", whiteSpace: "pre-line" }}
        />
      ) : (
        <input type={numeric ? "number" : "text"} {...sharedProps} />
      )}
    </td>
  );
}

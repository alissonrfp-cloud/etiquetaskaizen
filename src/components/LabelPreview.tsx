import type { ParsedLabel } from "@/utils/skuParser";
import { getLabelColors, CATEGORIA_LABELS } from "@/data/colorRules";

interface LabelPreviewProps {
  label: ParsedLabel;
}

export function LabelPreview({ label }: LabelPreviewProps) {
  const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
  const cellClass = "px-2 py-1.5 border border-border text-xs text-center";

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            <th className={cellClass}>Categ.</th>
            <th className={cellClass}>Remessa</th>
            <th className={cellClass}>Saída</th>
            <th className={cellClass}>Quant.</th>
            <th className={cellClass}>Tamanho</th>
            <th className={cellClass}>Medidas do Corte</th>
            <th className={cellClass}>Modelo</th>
            <th className={cellClass}>P. Inferior</th>
            <th className={cellClass}>P. Superior</th>
            <th className={cellClass}>OBS</th>
            <th className={cellClass}>Cortador</th>
            <th className={cellClass}>Refilador</th>
            <th className={cellClass}>Costureiro</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, color: colors.row.textColor, fontWeight: 600 }}>
              {CATEGORIA_LABELS[label.categoria]}
            </td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.remessa}</td>
            <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: label.urgente ? 700 : 400 }}>
              {label.dataSaida}{label.urgente ? " ⚠" : ""}
            </td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.quantidade}</td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.tamanho}</td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
            <td className={cellClass} style={{ backgroundColor: colors.modelo.backgroundColor, color: colors.modelo.textColor, fontWeight: 600 }}>{label.modelo}</td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.parteInferior}</td>
            <td className={cellClass} style={{ backgroundColor: colors.parteSup.backgroundColor, color: colors.parteSup.textColor }}>{label.parteSuperior}</td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.obs || "—"}</td>
            <td className={cellClass} style={{ minWidth: 60 }}></td>
            <td className={cellClass} style={{ minWidth: 60 }}></td>
            <td className={cellClass} style={{ minWidth: 60 }}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

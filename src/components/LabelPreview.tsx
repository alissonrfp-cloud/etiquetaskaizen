import type { ParsedLabel } from "@/utils/skuParser";
import { getRowColor, getModeloColor } from "@/data/colorRules";

interface LabelPreviewProps {
  label: ParsedLabel;
}

export function LabelPreview({ label }: LabelPreviewProps) {
  const rowColor = getRowColor(label.parteSuperior);
  const modeloColor = getModeloColor(label.isDupla, label.parteSuperior);

  const cellClass = "px-2 py-1.5 border border-border text-xs";

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            <th className={cellClass}>Remessa</th>
            <th className={cellClass}>Quant.</th>
            <th className={cellClass}>Tamanho</th>
            <th className={cellClass}>Medidas do Corte</th>
            <th className={cellClass}>Modelo</th>
            <th className={cellClass}>P. Inferior</th>
            <th className={cellClass}>P. Superior</th>
            <th className={cellClass}>OBS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.remessa}</td>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.quantidade}</td>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.tamanho}</td>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
            <td className={cellClass} style={{ backgroundColor: modeloColor.backgroundColor, color: modeloColor.textColor, fontWeight: 600 }}>{label.modelo}</td>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.parteInferior}</td>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.parteSuperior}</td>
            <td className={cellClass} style={{ backgroundColor: rowColor.backgroundColor }}>{label.obs || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

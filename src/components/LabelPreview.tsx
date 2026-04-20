import type { ParsedLabel } from "@/utils/skuParser";
import { getLabelColors } from "@/data/colorRules";

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
          </tr>
        </thead>
        <tbody>
          <tr>
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
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, minWidth: 60 }}></td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, minWidth: 60 }}></td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, minWidth: 60 }}></td>
            <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.cliente}</td>
            <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: 700 }}>
              {label.dataSaida}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

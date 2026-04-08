import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type ParsedLabel } from "@/utils/skuParser";
import { getLabelColors } from "@/data/colorRules";
import { ArrowLeft, FileText, Tag } from "lucide-react";

type PrintMode = "list" | "labels";

const PrintPage = () => {
  const [labels, setLabels] = useState<ParsedLabel[]>([]);
  const [mode, setMode] = useState<PrintMode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem("printLabels");
    if (stored) {
      setLabels(JSON.parse(stored));
    }
  }, []);

  const handlePrint = (printMode: PrintMode) => {
    setMode(printMode);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (labels.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Nenhuma etiqueta para imprimir.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalQty = labels.reduce((sum, l) => sum + l.quantidade, 0);

  return (
    <>
      {/* Screen UI (hidden when printing) */}
      <div className="print:hidden min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button onClick={() => navigate("/")} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-xl font-bold">Página de Impressão</h1>
            <div className="w-20" />
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {labels.length} etiqueta(s) — {totalQty} unidades no total
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handlePrint("list")}
              variant="outline"
              className="h-32 flex flex-col gap-2 text-lg"
            >
              <FileText className="h-8 w-8" />
              <span className="font-bold">Imprimir Lista de Pedido</span>
              <span className="text-xs text-muted-foreground">A4 Retrato — Compacto, fonte 10</span>
            </Button>

            <Button
              onClick={() => handlePrint("labels")}
              variant="outline"
              className="h-32 flex flex-col gap-2 text-lg"
            >
              <Tag className="h-8 w-8" />
              <span className="font-bold">Imprimir Etiquetas</span>
              <span className="text-xs text-muted-foreground">A4 Paisagem — Etiquetas 3cm, fonte grande</span>
            </Button>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold mb-3">Pré-visualização:</h2>
            <PrintListView labels={labels} />
          </div>
        </div>
      </div>

      {/* Print content */}
      <div className="hidden print:block">
        {mode === "list" ? (
          <PrintListView labels={labels} />
        ) : (
          <PrintLabelsView labels={labels} />
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
        @media print and (orientation: portrait) {
          @page { size: A4 portrait; margin: 10mm; }
        }
        ${mode === "labels" ? `
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
        }
        ` : ""}
      `}</style>
    </>
  );
};

function PrintListView({ labels }: { labels: ParsedLabel[] }) {
  const cellClass = "px-1.5 py-1 border border-black text-[10px] text-center";
  const totalQty = labels.reduce((sum, l) => sum + l.quantidade, 0);

  return (
    <div>
      <table className="w-full border-collapse" style={{ fontSize: "10px" }}>
        <thead>
          <tr>
             <th className={cellClass}>Remessa</th>
            <th className={cellClass}>Lote</th>
            <th className={cellClass}>Subdivisão</th>
            <th className={cellClass}>Quant.</th>
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
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => {
            const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
            return (
              <tr key={label.id}>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.remessa}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.lote}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.subdivisao || "—"}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.quantidade}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.corte}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: label.urgente ? 700 : 400 }}>
                  {label.dataSaida}
                </td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.tamanho}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, whiteSpace: "pre-line" }}>{label.medidasCorte}</td>
                <td className={cellClass} style={{ backgroundColor: colors.modelo.backgroundColor, color: colors.modelo.textColor, fontWeight: 600 }}>{label.modelo}</td>
                <td className={cellClass} style={{ backgroundColor: colors.parteSup.backgroundColor, color: colors.parteSup.textColor, fontWeight: 700 }}>{label.parteSuperior}</td>
                <td className={cellClass} style={{ minWidth: 40 }}></td>
                <td className={cellClass} style={{ minWidth: 40 }}></td>
                <td className={cellClass} style={{ minWidth: 40 }}></td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.cliente}</td>
                <td className={cellClass} style={{ backgroundColor: colors.saida.backgroundColor, color: colors.saida.textColor, fontWeight: 700 }}>{label.dataSaida}</td>
              </tr>
            );
          })}
          <tr>
            <td className={cellClass} style={{ fontWeight: 700 }}>TOTAL</td>
            <td className={cellClass}></td>
            <td className={cellClass}></td>
            <td className={cellClass} style={{ fontWeight: 700 }}>{totalQty}</td>
            <td className={cellClass}>0</td>
            <td className={cellClass} colSpan={10}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintLabelsView({ labels }: { labels: ParsedLabel[] }) {
  return (
    <div>
      {labels.map((label) => {
        const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
        return (
          <div
            key={label.id}
            className="flex items-center border-b-2 border-black"
            style={{
              height: "3cm",
              backgroundColor: colors.row.backgroundColor,
              pageBreakInside: "avoid",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            <div className="flex-1 flex items-center justify-between px-2 gap-2" style={{ height: "100%" }}>
              <div className="text-center" style={{ minWidth: 60 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Remessa</div>
                <div>{label.remessa}</div>
              </div>
              <div className="text-center" style={{ minWidth: 50 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Lote</div>
                <div>{label.lote}</div>
              </div>
              <div className="text-center" style={{ minWidth: 50 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Subdiv.</div>
                <div>{label.subdivisao || "—"}</div>
              </div>
              <div className="text-center" style={{ minWidth: 40 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Qtd</div>
                <div style={{ fontSize: "18px" }}>{label.quantidade}</div>
              </div>
              <div className="text-center" style={{ minWidth: 50 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Saída</div>
                <div style={{ color: label.urgente ? "#FF0000" : undefined }}>
                  {label.dataSaida}
                </div>
              </div>
              <div className="text-center" style={{ minWidth: 80 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Tamanho</div>
                <div>{label.tamanho}</div>
              </div>
              <div className="text-center flex-1" style={{ whiteSpace: "pre-line", fontSize: "11px" }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Tamanho do Corte</div>
                <div>{label.medidasCorte}</div>
              </div>
              <div
                className="text-center"
                style={{
                  minWidth: 120,
                  backgroundColor: colors.modelo.backgroundColor,
                  color: colors.modelo.textColor,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Modelo</div>
                <div>{label.modelo}</div>
              </div>
              <div
                className="text-center"
                style={{
                  minWidth: 70,
                  backgroundColor: colors.parteSup.backgroundColor,
                  color: colors.parteSup.textColor,
                  padding: "2px 4px",
                  borderRadius: 4,
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 400 }}>P. Sup</div>
                <div style={{ fontSize: "12px" }}>{label.parteSuperior}</div>
              </div>
              <div className="text-center" style={{ minWidth: 50 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Cortador</div>
                <div>&nbsp;</div>
              </div>
              <div className="text-center" style={{ minWidth: 60 }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Cliente</div>
                <div style={{ fontSize: "11px" }}>{label.cliente}</div>
              </div>
              <div className="text-center" style={{ minWidth: 50, color: colors.saida.textColor }}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Retirada</div>
                <div style={{ color: "#FF0000", fontWeight: 900 }}>{label.dataSaida}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PrintPage;

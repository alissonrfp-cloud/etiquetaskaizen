import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { sortLabels, type ParsedLabel } from "@/utils/skuParser";
import { getLabelColors } from "@/data/colorRules";
import { ArrowLeft, FileText, Tag, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PrintMode = "list" | "labels";

const PrintPage = () => {
  const [labels, setLabels] = useState<ParsedLabel[]>([]);
  const [mode, setMode] = useState<PrintMode | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let raw = sessionStorage.getItem("printLabels");
    if (!raw) {
      raw = localStorage.getItem("kaizen-labels");
    }
    if (raw) {
      try {
        const parsed: ParsedLabel[] = JSON.parse(raw);
        setLabels(sortLabels(parsed));
      } catch {
        // ignore
      }
    }
  }, []);

  const showSaidaInicio = labels.some((l) => l.categoria === "wilson");
  const showObs = labels.some((l) => (l.obs || "").trim().length > 0);

  const headerInfo = useMemo(() => {
    const remessas = Array.from(new Set(labels.map((l) => l.remessa).filter(Boolean)));
    const clientes = Array.from(new Set(labels.map((l) => l.cliente).filter(Boolean)));
    const totalQty = labels.reduce((s, l) => s + l.quantidade, 0);
    return {
      remessa: remessas.join(", "),
      cliente: clientes.join(", "),
      total: totalQty,
      count: labels.length,
      data: format(new Date(), "dd/MM"),
    };
  }, [labels]);

  const handleCopyTable = () => {
    const headers = [
      "Remessa", "Lote", "Quant.", "Subdiv.", "Corte",
      ...(showSaidaInicio ? ["Saída"] : []),
      "Tamanho", "Tamanho do Corte", "Modelo", "Parte Superior",
      "Cortador", "Overloque", "Costura", "Cliente", "Retirada",
      ...(showObs ? ["OBS"] : []),
    ];
    const thStyle = 'style="border:1px solid #000;padding:2px 4px;font-size:10px;font-weight:bold;text-align:center;background-color:#E5E7EB"';

    let html = '<table style="border-collapse:collapse"><thead><tr>';
    headers.forEach(h => { html += `<th ${thStyle}>${h}</th>`; });
    html += '</tr></thead><tbody>';

    labels.forEach((l) => {
      const colors = getLabelColors(l.categoria, l.parteSuperior, l.isDupla, l.urgente);
      const saidaBg = l.urgente ? "#DC2626" : colors.saida.backgroundColor;
      const saidaTxt = l.urgente ? "#FFFFFF" : colors.saida.textColor;
      const cell = (val: string, bg: string, color: string, bold = false) =>
        `<td style="border:1px solid #000;padding:2px 4px;font-size:10px;text-align:center;background-color:${bg};color:${color};${bold ? 'font-weight:700;' : ''}">${val}</td>`;

      html += '<tr>';
      html += cell(l.remessa, colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.lote, colors.row.backgroundColor, colors.row.textColor, true);
      html += cell(String(l.quantidade), colors.row.backgroundColor, colors.row.textColor, true);
      html += cell(l.subdivisao || "1 de 1", colors.row.backgroundColor, colors.row.textColor, true);
      html += cell(l.corte || "", colors.row.backgroundColor, colors.row.textColor);
      if (showSaidaInicio) {
        html += cell(l.saidaInicio || "", saidaBg, saidaTxt, true);
      }
      html += cell(l.tamanho, colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.medidasCorte, colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.modelo, colors.modelo.backgroundColor, colors.modelo.textColor, true);
      html += cell(l.parteSuperior, colors.parteSup.backgroundColor, colors.parteSup.textColor, true);
      html += cell(l.cortador || "", colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.overloque || "", colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.costura || "", colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.cliente, colors.row.backgroundColor, colors.row.textColor);
      html += cell(l.dataSaida, saidaBg, saidaTxt, true);
      if (showObs) {
        html += cell(l.obs || "", colors.row.backgroundColor, colors.row.textColor);
      }
      html += '</tr>';
    });

    const totalQty = labels.reduce((s, l) => s + l.quantidade, 0);
    const emptyCols = headers.length - 3;
    const totalStyle = 'style="border:1px solid #000;padding:2px 4px;font-size:10px;font-weight:bold;text-align:center;background-color:#D1D5DB"';
    html += `<tr><td ${totalStyle}>TOTAL</td><td ${totalStyle}></td><td ${totalStyle}>${totalQty}</td>`;
    for (let i = 0; i < emptyCols; i++) html += `<td ${totalStyle}></td>`;
    html += '</tr></tbody></table>';

    const rows = labels.map((l) => [
      l.remessa, l.lote, String(l.quantidade),
      l.subdivisao || "1 de 1", l.corte || "",
      ...(showSaidaInicio ? [l.saidaInicio || ""] : []),
      l.tamanho, l.medidasCorte, l.modelo, l.parteSuperior,
      l.cortador || "", l.overloque || "", l.costura || "",
      l.cliente, l.dataSaida,
      ...(showObs ? [l.obs || ""] : []),
    ]);
    const totalRow = ["TOTAL", "", String(totalQty), ...Array(emptyCols).fill("")];
    const tsv = [headers, ...rows, totalRow].map(r => r.join("\t")).join("\n");

    const blob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([tsv], { type: "text/plain" });
    navigator.clipboard.write([
      new ClipboardItem({ "text/html": blob, "text/plain": textBlob }),
    ]).then(() => {
      toast({ title: "Tabela copiada com cores!", description: "Cole em qualquer planilha ou documento." });
    });
  };

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

  return (
    <>
      {/* Screen UI */}
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
            {headerInfo.count} etiqueta(s) — {headerInfo.total} unidades no total
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => handlePrint("list")} variant="outline" className="h-32 flex flex-col gap-2 text-lg">
              <FileText className="h-8 w-8" />
              <span className="font-bold">Imprimir Lista de Pedido</span>
              <span className="text-xs text-muted-foreground">A4 Retrato — Compacto, fonte 10</span>
            </Button>
            <Button onClick={() => handlePrint("labels")} variant="outline" className="h-32 flex flex-col gap-2 text-lg">
              <Tag className="h-8 w-8" />
              <span className="font-bold">Imprimir Etiquetas</span>
              <span className="text-xs text-muted-foreground">A4 Paisagem — Etiquetas 3cm</span>
            </Button>
            <Button onClick={handleCopyTable} variant="outline" className="h-32 flex flex-col gap-2 text-lg">
              <Copy className="h-8 w-8" />
              <span className="font-bold">Copiar Tabela</span>
              <span className="text-xs text-muted-foreground">Cores preservadas</span>
            </Button>
          </div>

          <div className="border rounded-lg p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold mb-3">Pré-visualização:</h2>
            <PrintHeader info={headerInfo} />
            <PrintListView labels={labels} showSaidaInicio={showSaidaInicio} showObs={showObs} />
          </div>
        </div>
      </div>

      {/* Print content */}
      <div className="hidden print:block">
        <PrintHeader info={headerInfo} />
        {mode === "list" ? (
          <PrintListView labels={labels} showSaidaInicio={showSaidaInicio} showObs={showObs} />
        ) : (
          <PrintLabelsView labels={labels} showSaidaInicio={showSaidaInicio} />
        )}
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
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

function PrintHeader({ info }: { info: { remessa: string; cliente: string; count: number; total: number; data: string } }) {
  return (
    <div style={{ marginBottom: 6, fontSize: "11px", fontWeight: 600, borderBottom: "1px solid #000", paddingBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: "13px", fontWeight: 700 }}>Kaizen Enxovais — Etiquetas de Produção</span>
        <span>{info.data}</span>
      </div>
      <div style={{ fontSize: "10px", fontWeight: 400, color: "#444" }}>
        {info.remessa && <>Remessa: <b>{info.remessa}</b> · </>}
        {info.cliente && <>Cliente: <b>{info.cliente}</b> · </>}
        <b>{info.count}</b> etiqueta(s) · <b>{info.total}</b> unidades
      </div>
    </div>
  );
}

function PrintListView({ labels, showSaidaInicio, showObs }: { labels: ParsedLabel[]; showSaidaInicio: boolean; showObs: boolean }) {
  const thClass = "px-1 py-1 border border-black text-[10px] text-center font-bold";
  const cellClass = "px-1 py-1 border border-black text-[10px] text-center";
  const totalQty = labels.reduce((sum, l) => sum + l.quantidade, 0);
  const colCount = (showSaidaInicio ? 15 : 14) + (showObs ? 1 : 0);

  return (
    <div>
      <table className="w-full border-collapse" style={{ fontSize: "10px", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ backgroundColor: "#E5E7EB" }}>
            <th className={thClass}>Remessa</th>
            <th className={thClass}>Lote</th>
            <th className={thClass}>Quant.</th>
            <th className={thClass}>Subdiv.</th>
            <th className={thClass}>Corte</th>
            {showSaidaInicio && <th className={thClass}>Saída</th>}
            <th className={thClass}>Tamanho</th>
            <th className={thClass}>Tamanho do Corte</th>
            <th className={thClass}>Modelo</th>
            <th className={thClass}>Parte Superior</th>
            <th className={thClass}>Cortador</th>
            <th className={thClass}>Overloque</th>
            <th className={thClass}>Costura</th>
            <th className={thClass}>Cliente</th>
            <th className={thClass}>Retirada</th>
            {showObs && <th className={thClass}>OBS</th>}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => {
            const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
            const saidaBg = label.urgente ? "#DC2626" : colors.saida.backgroundColor;
            const saidaTxt = label.urgente ? "#FFFFFF" : colors.saida.textColor;
            return (
              <tr key={label.id}>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.remessa}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.lote}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.quantidade}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, fontWeight: 700 }}>{label.subdivisao || "1 de 1"}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.corte}</td>
                {showSaidaInicio && (
                  <td className={cellClass} style={{ backgroundColor: saidaBg, color: saidaTxt, fontWeight: 700 }}>{label.saidaInicio || ""}</td>
                )}
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.tamanho}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, whiteSpace: "pre-line", textAlign: "left", paddingLeft: 4 }}>{label.medidasCorte}</td>
                <td className={cellClass} style={{ backgroundColor: colors.modelo.backgroundColor, color: colors.modelo.textColor, fontWeight: 600 }}>{label.modelo}</td>
                <td className={cellClass} style={{ backgroundColor: colors.parteSup.backgroundColor, color: colors.parteSup.textColor, fontWeight: 700 }}>{label.parteSuperior}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.cortador || ""}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.overloque || ""}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.costura || ""}</td>
                <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor }}>{label.cliente}</td>
                <td className={cellClass} style={{ backgroundColor: saidaBg, color: saidaTxt, fontWeight: 700 }}>{label.dataSaida}</td>
                {showObs && (
                  <td className={cellClass} style={{ backgroundColor: colors.row.backgroundColor, whiteSpace: "pre-line", textAlign: "left", paddingLeft: 4 }}>{label.obs || ""}</td>
                )}
              </tr>
            );
          })}
          <tr style={{ backgroundColor: "#D1D5DB" }}>
            <td className={cellClass} style={{ fontWeight: 700 }}>TOTAL</td>
            <td className={cellClass}></td>
            <td className={cellClass} style={{ fontWeight: 700 }}>{totalQty}</td>
            <td className={cellClass} colSpan={colCount - 3}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintLabelsView({ labels, showSaidaInicio }: { labels: ParsedLabel[]; showSaidaInicio: boolean }) {
  return (
    <div>
      {labels.map((label) => {
        const colors = getLabelColors(label.categoria, label.parteSuperior, label.isDupla, label.urgente);
        const saidaBg = label.urgente ? "#DC2626" : colors.saida.backgroundColor;
        const saidaTxt = label.urgente ? "#FFFFFF" : colors.saida.textColor;
        const cellStyle = (bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
          backgroundColor: bg,
          color,
          borderRight: "1px solid #000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 4px",
          ...extra,
        });

        return (
          <div
            key={label.id}
            className="flex items-stretch border-b-2 border-black"
            style={{ height: "3cm", pageBreakInside: "avoid", fontSize: "14px", fontWeight: 700 }}
          >
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 50 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Remessa</div>
              <div>{label.remessa}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 40 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Lote</div>
              <div>{label.lote}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 35 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Qtd</div>
              <div style={{ fontSize: "18px" }}>{label.quantidade}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 50 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Subdiv.</div>
              <div style={{ fontSize: "11px" }}>{label.subdivisao || "1 de 1"}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 35 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Corte</div>
              <div>{label.corte || ""}</div>
            </div>
            {showSaidaInicio && (
              <div style={cellStyle(saidaBg, saidaTxt, { minWidth: 60 })}>
                <div style={{ fontSize: "9px", fontWeight: 400 }}>Saída</div>
                <div style={{ fontWeight: 900 }}>{label.saidaInicio || label.dataSaida}</div>
              </div>
            )}
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 65 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Tamanho</div>
              <div style={{ fontSize: "12px" }}>{label.tamanho}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { flex: 1, minWidth: 110, whiteSpace: "pre-line", fontSize: "10px", textAlign: "left", paddingLeft: 6 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Tam. Corte</div>
              <div>{label.medidasCorte}</div>
            </div>
            <div style={cellStyle(colors.modelo.backgroundColor, colors.modelo.textColor, { minWidth: 95 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Modelo</div>
              <div style={{ fontSize: "12px" }}>{label.modelo}</div>
            </div>
            <div style={cellStyle(colors.parteSup.backgroundColor, colors.parteSup.textColor, { minWidth: 60 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>P. Sup</div>
              <div style={{ fontSize: "10px" }}>{label.parteSuperior}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 55 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Cortador</div>
              <div>{label.cortador || "\u00A0"}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 55 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Overloque</div>
              <div>{label.overloque || "\u00A0"}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 55 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Costura</div>
              <div>{label.costura || "\u00A0"}</div>
            </div>
            <div style={cellStyle(colors.row.backgroundColor, colors.row.textColor, { minWidth: 65 })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Cliente</div>
              <div style={{ fontSize: "11px" }}>{label.cliente}</div>
            </div>
            <div style={cellStyle(saidaBg, saidaTxt, { minWidth: 65, borderRight: "none" })}>
              <div style={{ fontSize: "9px", fontWeight: 400 }}>Retirada</div>
              <div style={{ fontWeight: 900 }}>{label.dataSaida}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PrintPage;

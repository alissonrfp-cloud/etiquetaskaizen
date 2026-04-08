import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkuInput } from "@/components/SkuInput";
import { LabelPreview } from "@/components/LabelPreview";
import { LabelList } from "@/components/LabelList";
import { createLabel, createManualLabel, splitIntoLots, type ParsedLabel, type Categoria, parseSku } from "@/utils/skuParser";
import { CATEGORIA_LABELS, CATEGORIA_COLORS } from "@/data/colorRules";
import { exportToDocx } from "@/utils/docxExport";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileDown, Tag, CalendarIcon, AlertTriangle, PenLine, Barcode, Printer } from "lucide-react";
import { PdfUpload } from "@/components/PdfUpload";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const CATEGORIAS: Categoria[] = ["marketplace", "full_shopee", "full_ml", "revenda", "drop", "estoque", "wilson"];

const PARTES_SUPERIORES = ["Trilho Suiço", "Ilhós Redondo Cromado", "Wave"];

const Index = () => {
  const [modoManual, setModoManual] = useState(false);
  const [sku, setSku] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [remessa, setRemessa] = useState(new Date().toLocaleDateString("pt-BR"));
  const [lote, setLote] = useState("");
  const [dataSaida, setDataSaida] = useState<Date>(new Date());
  const [categoria, setCategoria] = useState<Categoria>("marketplace");
  const [urgente, setUrgente] = useState(false);
  const [obs, setObs] = useState("");
  const [cliente, setCliente] = useState("Kaizen Enxovais");
  const [labels, setLabels] = useState<ParsedLabel[]>([]);
  const [autoLotes, setAutoLotes] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Manual mode fields
  const [manModelo, setManModelo] = useState("");
  const [manTamanho, setManTamanho] = useState("");
  const [manMedidas, setManMedidas] = useState("");
  const [manParteSup, setManParteSup] = useState("Trilho Suiço");
  const [manDupla, setManDupla] = useState(false);

  const preview = !modoManual && sku.length >= 8 ? parseSku(sku) : null;

  const handleAdd = () => {
    const qty = parseInt(quantidade);
    if (!qty || qty <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }
    const dataSaidaStr = format(dataSaida, "dd/MM/yyyy");

    if (modoManual) {
      if (!manModelo.trim() || !manTamanho.trim()) {
        toast({ title: "Preencha Modelo e Tamanho", variant: "destructive" });
        return;
      }
      const label = createManualLabel({
        quantidade: qty,
        remessa,
        lote,
        dataSaida: dataSaidaStr,
        categoria,
        urgente,
        modelo: manModelo,
        tamanho: manTamanho,
        medidasCorte: manMedidas,
        parteSuperior: manParteSup,
        parteInferior: "Bainha",
        isDupla: manDupla,
        obs,
        cliente,
      });

      if (autoLotes) {
        const lots = splitIntoLots(label);
        setLabels((prev) => [...prev, ...lots]);
        toast({ title: `${lots.length} etiqueta(s) adicionada(s)!` });
      } else {
        setLabels((prev) => [...prev, label]);
        toast({ title: "Etiqueta manual adicionada!" });
      }
      setManModelo("");
      setManTamanho("");
      setManMedidas("");
      setQuantidade("");
      setObs("");
    } else {
      const label = createLabel(sku, qty, remessa, lote, dataSaidaStr, categoria, urgente, cliente, obs);
      if (!label) {
        toast({ title: "SKU inválido", description: "Verifique o código digitado.", variant: "destructive" });
        return;
      }

      if (autoLotes) {
        const lots = splitIntoLots(label);
        setLabels((prev) => [...prev, ...lots]);
        toast({ title: `${lots.length} etiqueta(s) adicionada(s)!` });
      } else {
        setLabels((prev) => [...prev, label]);
        toast({ title: "Etiqueta adicionada!" });
      }
      setSku("");
      setQuantidade("");
      setObs("");
    }
  };

  const handleRemove = (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const handleExport = async () => {
    if (labels.length === 0) {
      toast({ title: "Nenhuma etiqueta para exportar", variant: "destructive" });
      return;
    }
    try {
      await exportToDocx(labels);
      toast({ title: "DOCX exportado com sucesso!" });
    } catch {
      toast({ title: "Erro ao exportar", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    if (labels.length === 0) {
      toast({ title: "Nenhuma etiqueta para imprimir", variant: "destructive" });
      return;
    }
    // Store labels in sessionStorage for the print page
    sessionStorage.setItem("printLabels", JSON.stringify(labels));
    navigate("/imprimir");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Tag className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gerador de Etiquetas</h1>
            <p className="text-sm text-muted-foreground">Kaizen Enxovais — Produção de Cortinas</p>
          </div>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Nova Etiqueta</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={autoLotes ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoLotes(!autoLotes)}
                className="text-xs"
              >
                {autoLotes ? "Subdivisão: ON" : "Subdivisão: OFF"}
              </Button>
              <Button
                variant={modoManual ? "default" : "outline"}
                size="sm"
                onClick={() => setModoManual(!modoManual)}
                className="text-xs"
              >
                {modoManual ? (
                  <><Barcode className="h-3.5 w-3.5 mr-1" /> Modo SKU</>
                ) : (
                  <><PenLine className="h-3.5 w-3.5 mr-1" /> Modo Manual</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Buttons */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoria(cat);
                      if (cat === "wilson") setCliente("Wilson Crepaldi");
                      else setCliente("Kaizen Enxovais");
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold border-2 transition-all",
                      categoria === cat
                        ? "ring-2 ring-offset-2 ring-primary scale-105"
                        : "opacity-70 hover:opacity-100"
                    )}
                    style={{
                      backgroundColor: CATEGORIA_COLORS[cat],
                      borderColor: categoria === cat ? "#000" : "transparent",
                    }}
                  >
                    {CATEGORIA_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Main fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3" onKeyDown={handleKeyDown}>
              {modoManual ? (
                <>
                  <div className="md:col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Modelo</label>
                    <Input value={manModelo} onChange={(e) => setManModelo(e.target.value)} placeholder="Ex: Blackout Premium Branco" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tamanho</label>
                    <Input value={manTamanho} onChange={(e) => setManTamanho(e.target.value)} placeholder="3,00x2,70" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Medidas Corte</label>
                    <Input value={manMedidas} onChange={(e) => setManMedidas(e.target.value)} placeholder="Livre" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">P. Superior</label>
                    <Select value={manParteSup} onValueChange={setManParteSup}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTES_SUPERIORES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Dupla?</label>
                    <button
                      onClick={() => setManDupla(!manDupla)}
                      className={cn(
                        "w-full h-9 rounded-md text-xs font-bold flex items-center justify-center border transition-all",
                        manDupla
                          ? "bg-red-600 text-white border-red-700"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {manDupla ? "SIM" : "NÃO"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</label>
                  <SkuInput value={sku} onChange={setSku} />
                </div>
              )}
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd</label>
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  min={1}
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lote</label>
                <Input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="L 47" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Remessa</label>
                <Input value={remessa} onChange={(e) => setRemessa(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Saída</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {format(dataSaida, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataSaida}
                      onSelect={(d) => d && setDataSaida(d)}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente</label>
                <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Urgente</label>
                <button
                  onClick={() => setUrgente(!urgente)}
                  className={cn(
                    "w-full h-9 rounded-md text-xs font-bold flex items-center justify-center gap-1 border transition-all",
                    urgente
                      ? "bg-red-600 text-white border-red-700"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {urgente ? "SIM" : "NÃO"}
                </button>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">OBS</label>
                <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="—" />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={handleAdd} className="w-full">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Live Preview (SKU mode only) */}
            {!modoManual && preview && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                <LabelPreview
                  label={{
                    id: "preview",
                    sku,
                    quantidade: parseInt(quantidade) || 0,
                    remessa,
                    lote,
                    subdivisao: "",
                    corte: "",
                    dataSaida: format(dataSaida, "dd/MM/yyyy"),
                    categoria,
                    urgente,
                    cliente,
                    obs,
                    ...preview,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labels List */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Etiquetas ({labels.length})
            </CardTitle>
            <div className="flex gap-2">
              <PdfUpload
                remessa={remessa}
                lote={lote}
                categoria={categoria}
                cliente={cliente}
                onLabelsAdded={(newLabels) => {
                  if (autoLotes) {
                    const allLots = newLabels.flatMap(splitIntoLots);
                    setLabels((prev) => [...prev, ...allLots]);
                  } else {
                    setLabels((prev) => [...prev, ...newLabels]);
                  }
                }}
              />
              {labels.length > 0 && (
                <>
                  <Button onClick={handleExport} variant="outline">
                    <FileDown className="h-4 w-4 mr-1" />
                    Exportar DOCX
                  </Button>
                  <Button onClick={handlePrint} variant="outline">
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir
                  </Button>
                  <Button onClick={() => setLabels([])} variant="ghost" className="text-destructive">
                    Limpar Tudo
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <LabelList labels={labels} onRemove={handleRemove} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;

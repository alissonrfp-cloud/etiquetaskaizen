import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SkuInput } from "@/components/SkuInput";
import { LabelPreview } from "@/components/LabelPreview";
import { LabelList } from "@/components/LabelList";
import { createLabel, type ParsedLabel, type Categoria, parseSku } from "@/utils/skuParser";
import { CATEGORIA_LABELS, CATEGORIA_COLORS } from "@/data/colorRules";
import { exportToDocx } from "@/utils/docxExport";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileDown, Tag, CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIAS: Categoria[] = ["marketplace", "full_shopee", "full_ml", "revenda", "drop", "estoque"];

const Index = () => {
  const [sku, setSku] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [remessa, setRemessa] = useState(new Date().toLocaleDateString("pt-BR"));
  const [dataSaida, setDataSaida] = useState<Date>(new Date());
  const [categoria, setCategoria] = useState<Categoria>("marketplace");
  const [urgente, setUrgente] = useState(false);
  const [obs, setObs] = useState("");
  const [labels, setLabels] = useState<ParsedLabel[]>([]);
  const { toast } = useToast();

  const preview = sku.length >= 8 ? parseSku(sku) : null;

  const handleAdd = () => {
    const qty = parseInt(quantidade);
    if (!qty || qty <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }
    const dataSaidaStr = format(dataSaida, "dd/MM/yyyy");
    const label = createLabel(sku, qty, remessa, dataSaidaStr, categoria, urgente, "Kaizen Enxovais", obs);
    if (!label) {
      toast({ title: "SKU inválido", description: "Verifique o código digitado.", variant: "destructive" });
      return;
    }
    setLabels((prev) => [...prev, label]);
    setSku("");
    setQuantidade("");
    setObs("");
    toast({ title: "Etiqueta adicionada!" });
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
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Nova Etiqueta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Buttons */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoria(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold border-2 transition-all",
                      categoria === cat
                        ? "ring-2 ring-offset-2 ring-primary scale-105"
                        : "opacity-70 hover:opacity-100"
                    )}
                    style={{
                      backgroundColor: CATEGORIA_COLORS[cat],
                      borderColor: categoria === cat ? "#000" : "transparent",
                      color: cat === "full_shopee" || cat === "full_ml" ? "#000" : "#000",
                    }}
                  >
                    {CATEGORIA_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Main fields */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3" onKeyDown={handleKeyDown}>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</label>
                <SkuInput value={sku} onChange={setSku} />
              </div>
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

            {/* Live Preview */}
            {preview && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                <LabelPreview
                  label={{
                    id: "preview",
                    sku,
                    quantidade: parseInt(quantidade) || 0,
                    remessa,
                    dataSaida: format(dataSaida, "dd/MM/yyyy"),
                    categoria,
                    urgente,
                    cliente: "Kaizen Enxovais",
                    obs,
                    larguraCm: preview.larguraCm,
                    alturaCm: preview.alturaCm,
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
            {labels.length > 0 && (
              <Button onClick={handleExport} variant="outline">
                <FileDown className="h-4 w-4 mr-1" />
                Exportar DOCX
              </Button>
            )}
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

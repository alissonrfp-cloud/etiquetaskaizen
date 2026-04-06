import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkuInput } from "@/components/SkuInput";
import { LabelPreview } from "@/components/LabelPreview";
import { LabelList } from "@/components/LabelList";
import { createLabel, type ParsedLabel, parseSku } from "@/utils/skuParser";
import { exportToDocx } from "@/utils/docxExport";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileDown, Tag } from "lucide-react";

const Index = () => {
  const [sku, setSku] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [remessa, setRemessa] = useState(new Date().toLocaleDateString("pt-BR"));
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
    const label = createLabel(sku, qty, remessa, "Kaizen Enxovais", obs);
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
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3" onKeyDown={handleKeyDown}>
              <div className="md:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</label>
                <SkuInput value={sku} onChange={setSku} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantidade</label>
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">OBS</label>
                <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
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
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                <LabelPreview
                  label={{
                    id: "preview",
                    sku,
                    quantidade: parseInt(quantidade) || 0,
                    remessa,
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

        {/* Color Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legenda de Cores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#00B0F0" }} />
                <span>Trilho Suiço</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FF99FF" }} />
                <span>Ilhós Redondo Cromado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FFC000" }} />
                <span>Wave</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FF0000" }} />
                <span className="text-foreground">Dupla (Modelo)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;

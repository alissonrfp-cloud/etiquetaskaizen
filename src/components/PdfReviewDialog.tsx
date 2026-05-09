import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseSku } from "@/utils/skuParser";

export interface ReviewRow {
  id: string;
  sku: string;
  quantidade: number;
  source?: string;
}

interface PdfReviewDialogProps {
  open: boolean;
  rows: ReviewRow[];
  onCancel: () => void;
  onConfirm: (rows: ReviewRow[]) => void;
}

function diagnose(sku: string): { ok: boolean; reason?: string } {
  const u = sku.trim().toUpperCase();
  if (!u) return { ok: false, reason: "SKU vazio" };
  const parsed = parseSku(u);
  if (parsed) return { ok: true };
  // Tentar diagnosticar a falha
  if (!/^[A-Z]+/.test(u)) return { ok: false, reason: "Sem prefixo" };
  const dimMatch = u.match(/(\d+)X(\d+)/);
  if (!dimMatch) return { ok: false, reason: "Dimensão não encontrada" };
  return { ok: false, reason: "Prefixo desconhecido ou cor inválida" };
}

export function PdfReviewDialog({ open, rows, onCancel, onConfirm }: PdfReviewDialogProps) {
  const [editing, setEditing] = useState<ReviewRow[]>(rows);
  const [dedup, setDedup] = useState(true);

  // Re-sincroniza quando as linhas externas mudam (nova importação)
  useMemo(() => setEditing(rows), [rows]);

  const finalRows = useMemo(() => {
    if (!dedup) return editing;
    const map = new Map<string, ReviewRow>();
    for (const r of editing) {
      const key = r.sku.trim().toUpperCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.quantidade += r.quantidade;
      } else {
        map.set(key, { ...r, sku: key });
      }
    }
    return Array.from(map.values());
  }, [editing, dedup]);

  const stats = useMemo(() => {
    let ok = 0;
    let bad = 0;
    let totalQty = 0;
    for (const r of finalRows) {
      if (diagnose(r.sku).ok) ok++;
      else bad++;
      totalQty += r.quantidade;
    }
    return { ok, bad, totalQty };
  }, [finalRows]);

  const updateRow = (id: string, patch: Partial<ReviewRow>) => {
    setEditing((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => {
    setEditing((prev) => prev.filter((r) => r.id !== id));
  };

  const handleConfirm = () => {
    // Só envia os reconhecidos
    const valid = finalRows.filter((r) => diagnose(r.sku).ok && r.quantidade > 0);
    onConfirm(valid);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisar itens importados</DialogTitle>
          <DialogDescription>
            Confira SKU e quantidade de cada item antes de adicionar à lista. Itens com ⚠ não foram reconhecidos e serão descartados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm border-y py-2">
          <div className="flex items-center gap-2">
            <Switch id="dedup" checked={dedup} onCheckedChange={setDedup} />
            <Label htmlFor="dedup" className="text-xs cursor-pointer">Somar SKUs duplicados</Label>
          </div>
          <div className="ml-auto flex gap-3 text-xs">
            <span className="text-emerald-600 font-semibold">✓ {stats.ok} reconhecido(s)</span>
            {stats.bad > 0 && <span className="text-amber-600 font-semibold">⚠ {stats.bad} com problema</span>}
            <span className="text-muted-foreground">{stats.totalQty} unidades</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="text-left p-2 w-8"></th>
                <th className="text-left p-2">SKU</th>
                <th className="text-right p-2 w-20">Qtd</th>
                <th className="text-left p-2">Status</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {finalRows.length === 0 && (
                <tr><td colSpan={5} className="text-center p-6 text-muted-foreground">Nenhum item para revisar.</td></tr>
              )}
              {finalRows.map((row) => {
                const d = diagnose(row.sku);
                return (
                  <tr key={row.id} className="border-t">
                    <td className="p-2">
                      {d.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.sku}
                        onChange={(e) => updateRow(row.id, { sku: e.target.value.toUpperCase() })}
                        className="h-7 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.quantidade}
                        onChange={(e) => updateRow(row.id, { quantidade: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="h-7 text-xs text-right"
                        min={0}
                      />
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {d.ok ? <span className="text-emerald-600">OK</span> : <span className="text-amber-600">{d.reason}</span>}
                      {row.source && <span className="block text-[10px] truncate max-w-[160px]">{row.source}</span>}
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(row.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={stats.ok === 0}>
            Adicionar {stats.ok} etiqueta(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

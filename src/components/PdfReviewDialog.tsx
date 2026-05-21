import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseSku } from "@/utils/skuParser";

export interface ReviewRow {
  id: string;
  sku: string;
  quantidade: number;
  source?: string;
  /** Vindo do parser: true se o prefixo é conhecido. Default usa diagnose() como fallback. */
  recognized?: boolean;
  /** Se o usuário marcou para incluir (default: reconhecidos sim, não reconhecidos não). */
  included?: boolean;
}

interface PdfReviewDialogProps {
  open: boolean;
  rows: ReviewRow[];
  expectedTotal?: number;
  onCancel: () => void;
  onConfirm: (rows: ReviewRow[]) => void;
}

function diagnose(sku: string): { ok: boolean; reason?: string } {
  const u = sku.trim().toUpperCase();
  if (!u) return { ok: false, reason: "SKU vazio" };
  const parsed = parseSku(u);
  if (parsed) return { ok: true };
  if (!/^[A-Z]+/.test(u)) return { ok: false, reason: "Sem prefixo" };
  const dimMatch = u.match(/(\d+)X(\d+)/);
  if (!dimMatch) return { ok: false, reason: "Não é cortina padrão" };
  return { ok: false, reason: "Prefixo/cor não reconhecidos" };
}

export function PdfReviewDialog({ open, rows, expectedTotal, onCancel, onConfirm }: PdfReviewDialogProps) {
  const [editing, setEditing] = useState<ReviewRow[]>([]);
  const [dedup, setDedup] = useState(true);

  // Re-sincroniza quando entra nova importação. Aplica default de "incluído"
  // baseado em SKU reconhecido.
  useEffect(() => {
    setEditing(
      rows.map((r) => ({
        ...r,
        included: r.included !== undefined ? r.included : diagnose(r.sku).ok,
      })),
    );
  }, [rows]);

  const finalRows = useMemo(() => {
    if (!dedup) return editing;
    const map = new Map<string, ReviewRow>();
    for (const r of editing) {
      const key = r.sku.trim().toUpperCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.quantidade += r.quantidade;
        // Se qualquer duplicado estiver incluído, mantém incluído
        existing.included = existing.included || r.included;
      } else {
        map.set(key, { ...r, sku: key });
      }
    }
    return Array.from(map.values());
  }, [editing, dedup]);

  const stats = useMemo(() => {
    let included = 0;
    let unknownTotal = 0;
    let totalQtyIncluded = 0;
    let totalQtyAll = 0;
    for (const r of finalRows) {
      const ok = diagnose(r.sku).ok;
      if (!ok) unknownTotal++;
      if (r.included) {
        included++;
        totalQtyIncluded += r.quantidade;
      }
      totalQtyAll += r.quantidade;
    }
    return { included, unknownTotal, totalQtyIncluded, totalQtyAll };
  }, [finalRows]);

  const updateRow = (id: string, patch: Partial<ReviewRow>) => {
    setEditing((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => {
    setEditing((prev) => prev.filter((r) => r.id !== id));
  };
  const setAllRecognized = (val: boolean) => {
    setEditing((prev) => prev.map((r) => (diagnose(r.sku).ok ? { ...r, included: val } : r)));
  };
  const setAllAny = (val: boolean) => {
    setEditing((prev) => prev.map((r) => ({ ...r, included: val })));
  };

  const handleConfirm = () => {
    const valid = finalRows.filter((r) => r.included && r.sku.trim() && r.quantidade > 0);
    onConfirm(valid);
  };

  const totalMismatch =
    expectedTotal !== undefined && stats.totalQtyAll !== expectedTotal;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisar itens importados</DialogTitle>
          <DialogDescription>
            Marque o que deve virar etiqueta. SKUs não reconhecidos vêm desmarcados — você ainda pode incluir/editar manualmente se quiser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 text-xs border-y py-2">
          <div className="flex items-center gap-2">
            <Switch id="dedup" checked={dedup} onCheckedChange={setDedup} />
            <Label htmlFor="dedup" className="text-xs cursor-pointer">Somar SKUs duplicados</Label>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAllRecognized(true)}>
            Marcar reconhecidos
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAllAny(false)}>
            Desmarcar todos
          </Button>
          <div className="ml-auto flex flex-wrap gap-3">
            {stats.unknownTotal > 0 && (
              <span className="text-amber-600 font-semibold">⚠ {stats.unknownTotal} não reconhecido(s)</span>
            )}
            <span className="text-muted-foreground">
              {stats.included} de {finalRows.length} itens selecionados · {stats.totalQtyIncluded} unidades
              {expectedTotal !== undefined && (
                <> · Total validado: <span className={totalMismatch ? "text-destructive font-semibold" : "text-emerald-600 font-semibold"}>{expectedTotal}{totalMismatch ? " ⚠" : " ✓"}</span></>
              )}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="text-left p-2 w-8"></th>
                <th className="text-left p-2">SKU</th>
                <th className="text-right p-2 w-20">Qtd</th>
                <th className="text-left p-2">Status / Descrição</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {finalRows.length === 0 && (
                <tr><td colSpan={6} className="text-center p-6 text-muted-foreground">Nenhum item para revisar.</td></tr>
              )}
              {finalRows.map((row) => {
                const d = diagnose(row.sku);
                return (
                  <tr key={row.id} className={`border-t ${d.ok ? "" : "bg-amber-50 dark:bg-amber-950/20"}`}>
                    <td className="p-2">
                      <Checkbox
                        checked={!!row.included}
                        onCheckedChange={(v) => updateRow(row.id, { included: !!v })}
                      />
                    </td>
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
                    <td className="p-2 text-xs">
                      {d.ok ? (
                        <span className="text-emerald-600">OK</span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] font-semibold">
                          SKU não reconhecido
                        </span>
                      )}
                      {row.source && (
                        <span className="block text-[10px] text-muted-foreground truncate max-w-[260px]">
                          {row.source}
                        </span>
                      )}
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
          <Button onClick={handleConfirm} disabled={stats.included === 0}>
            Adicionar {stats.included} etiqueta(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

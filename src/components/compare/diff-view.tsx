"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DesignatorBadge } from "@/components/bom/designator-badge";
import { compareBoms } from "@/lib/actions/compare";
import type { BomComparison, DiffEntry } from "@/lib/actions/compare";
import {
  GitCompareArrows,
  Loader2,
  Plus,
  Minus,
  DollarSign,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface DiffViewProps {
  boms: { id: string; name: string; version: number }[];
}

export function DiffView({ boms }: DiffViewProps) {
  const [bomIdA, setBomIdA] = useState("");
  const [bomIdB, setBomIdB] = useState("");
  const [comparison, setComparison] = useState<BomComparison | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCompare = () => {
    if (!bomIdA || !bomIdB) return;
    startTransition(async () => {
      const result = await compareBoms(bomIdA, bomIdB);
      setComparison(result);
    });
  };

  const statusIcon = (status: DiffEntry["status"]) => {
    switch (status) {
      case "added":
        return <Plus className="h-3.5 w-3.5 text-success" />;
      case "removed":
        return <Minus className="h-3.5 w-3.5 text-destructive" />;
      case "price_changed":
        return <DollarSign className="h-3.5 w-3.5 text-warning" />;
      case "changed":
        return <ArrowUpDown className="h-3.5 w-3.5 text-primary" />;
      default:
        return null;
    }
  };

  const statusRowClass = (status: DiffEntry["status"]) => {
    switch (status) {
      case "added":
        return "diff-added";
      case "removed":
        return "diff-removed";
      case "price_changed":
        return "diff-price-changed";
      case "changed":
        return "diff-changed";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Version A (Base)
              </label>
              <Select value={bomIdA} onValueChange={(v: string | null) => setBomIdA(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select base BOM..." />
                </SelectTrigger>
                <SelectContent>
                  {boms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <GitCompareArrows className="h-5 w-5 text-muted-foreground mb-2" />

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Version B (Compare)
              </label>
              <Select value={bomIdB} onValueChange={(v: string | null) => setBomIdB(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select compare BOM..." />
                </SelectTrigger>
                <SelectContent>
                  {boms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCompare}
              disabled={!bomIdA || !bomIdB || bomIdA === bomIdB || isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <GitCompareArrows className="h-4 w-4 mr-2" />
              )}
              Compare
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {comparison && (
        <>
          {/* Cost Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {comparison.bomA.name} (v{comparison.bomA.version})
                </p>
                <p className="text-2xl font-bold font-mono-display">
                  ${comparison.totalCostA.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {comparison.bomB.name} (v{comparison.bomB.version})
                </p>
                <p className="text-2xl font-bold font-mono-display">
                  ${comparison.totalCostB.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card
              className={
                comparison.costDifference > 0
                  ? "border-destructive/30"
                  : comparison.costDifference < 0
                  ? "border-success/30"
                  : ""
              }
            >
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Difference
                </p>
                <div className="flex items-center gap-2">
                  {comparison.costDifference > 0 ? (
                    <TrendingUp className="h-5 w-5 text-destructive" />
                  ) : comparison.costDifference < 0 ? (
                    <TrendingDown className="h-5 w-5 text-success" />
                  ) : null}
                  <p
                    className={`text-2xl font-bold font-mono-display ${
                      comparison.costDifference > 0
                        ? "text-destructive"
                        : comparison.costDifference < 0
                        ? "text-success"
                        : ""
                    }`}
                  >
                    {comparison.costDifference >= 0 ? "+" : ""}$
                    {comparison.costDifference.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-success/20 border border-success/50" />
              <span className="text-muted-foreground">Added</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-destructive/20 border border-destructive/50" />
              <span className="text-muted-foreground">Removed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-warning/20 border border-warning/50" />
              <span className="text-muted-foreground">Price Changed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-primary/20 border border-primary/50" />
              <span className="text-muted-foreground">Designators Changed</span>
            </div>
          </div>

          {/* Diff Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-8"></TableHead>
                      <TableHead>MPN</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Cost A</TableHead>
                      <TableHead className="text-right">Cost B</TableHead>
                      <TableHead className="text-center">Qty A</TableHead>
                      <TableHead className="text-center">Qty B</TableHead>
                      <TableHead>Designators A</TableHead>
                      <TableHead>Designators B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.entries.map((entry) => (
                      <TableRow
                        key={entry.mpn}
                        className={statusRowClass(entry.status)}
                      >
                        <TableCell>{statusIcon(entry.status)}</TableCell>
                        <TableCell className="font-mono-display font-medium">
                          {entry.mpn}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-right font-mono-display">
                          {entry.unitCostA != null
                            ? `$${entry.unitCostA.toFixed(2)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono-display">
                          {entry.unitCostB != null ? (
                            <span
                              className={
                                entry.status === "price_changed"
                                  ? "font-bold text-warning"
                                  : ""
                              }
                            >
                              ${entry.unitCostB.toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.quantityA || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.quantityB || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {entry.designatorsA.map((d) => (
                              <DesignatorBadge
                                key={d}
                                label={d}
                                variant={
                                  !entry.designatorsB.includes(d)
                                    ? "removed"
                                    : "default"
                                }
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {entry.designatorsB.map((d) => (
                              <DesignatorBadge
                                key={d}
                                label={d}
                                variant={
                                  !entry.designatorsA.includes(d)
                                    ? "added"
                                    : "default"
                                }
                              />
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

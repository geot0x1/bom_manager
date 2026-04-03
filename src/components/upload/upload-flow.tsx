"use client";

import { useState, useTransition } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { parseUploadFile, importBomData } from "@/lib/actions/upload";
import type { UploadConflict, ParsedBomRow } from "@/lib/actions/upload";
import { useRouter } from "next/navigation";

interface UploadFlowProps {
  bomId: string;
}

type Step = "upload" | "preview" | "conflicts" | "importing" | "done";

export function UploadFlow({ bomId }: UploadFlowProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedBomRow[]>([]);
  const [conflicts, setConflicts] = useState<UploadConflict[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [updateMasterParts, setUpdateMasterParts] = useState<string[]>([]);
  const [isParsing, startParsing] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.set("file", file);

    startParsing(async () => {
      const result = await parseUploadFile(formData);
      setRows(result.rows);
      setConflicts(result.conflicts);
      setErrors(result.errors);

      if (result.conflicts.length > 0) {
        setStep("conflicts");
      } else {
        setStep("preview");
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    startImporting(async () => {
      setStep("importing");
      await importBomData(bomId, rows, updateMasterParts);
      setStep("done");
      router.refresh();
    });
  };

  const toggleConflictUpdate = (mpn: string) => {
    setUpdateMasterParts((prev) =>
      prev.includes(mpn)
        ? prev.filter((m) => m !== mpn)
        : [...prev, mpn]
    );
  };

  // Upload Step
  if (step === "upload") {
    return (
      <Card className="border-dashed">
        <CardContent className="p-0">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center min-h-[240px] cursor-pointer rounded-lg transition-all ${
              dragOver
                ? "bg-primary/5 border-primary"
                : "hover:bg-muted/30"
            }`}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {isParsing ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Parsing file...</p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">
                  Drop your BOM file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports CSV, XLSX, and XLS formats
                </p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> .csv
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <FileSpreadsheet className="h-3 w-3 mr-1" /> .xlsx
                  </Badge>
                </div>
              </>
            )}
          </label>
        </CardContent>
      </Card>
    );
  }

  // Conflicts Step
  if (step === "conflicts") {
    return (
      <div className="space-y-4">
        <Card className="border-warning/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Conflicts Detected ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Some uploaded parts have different metadata than the master library.
              Choose how to resolve each conflict.
            </p>
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.mpn}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-display font-medium text-primary">
                      {conflict.mpn}
                    </span>
                    <Button
                      variant={
                        updateMasterParts.includes(conflict.mpn)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleConflictUpdate(conflict.mpn)}
                    >
                      {updateMasterParts.includes(conflict.mpn)
                        ? "→ Update Master Library"
                        : "→ Keep Existing"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground uppercase tracking-wider">
                        Existing
                      </span>
                      <p>{conflict.existing.manufacturer}</p>
                      <p>{conflict.existing.description}</p>
                      <p>{conflict.existing.footprint}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-warning uppercase tracking-wider">
                        Uploaded
                      </span>
                      <p>{conflict.uploaded.manufacturer}</p>
                      <p>{conflict.uploaded.description}</p>
                      <p>{conflict.uploaded.footprint}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStep("upload")}>
            Cancel
          </Button>
          <Button onClick={() => setStep("preview")}>
            Continue to Preview
          </Button>
        </div>
      </div>
    );
  }

  // Preview Step
  if (step === "preview") {
    return (
      <div className="space-y-4">
        {errors.length > 0 && (
          <Card className="border-destructive/30">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-destructive mb-2">
                {errors.length} row(s) had errors and were skipped:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {errors.slice(0, 5).map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && (
                  <li>...and {errors.length - 5} more</li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Preview — {rows.length} entries to import
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MPN</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Footprint</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Designators</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono-display font-medium text-primary">
                        {row.mpn}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.manufacturer}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono-display">
                          {row.footprint}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono-display">
                        ${row.unitCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.designators.map((d: string) => (
                            <DesignatorBadge key={d} label={d} />
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStep("upload")}>
            Cancel
          </Button>
          <Button onClick={handleImport}>
            Import {rows.length} Entries
          </Button>
        </div>
      </div>
    );
  }

  // Importing Step
  if (step === "importing") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">
            Importing {rows.length} entries...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Done Step
  return (
    <Card className="border-success/30">
      <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
        <div className="rounded-full bg-success/10 p-4 mb-4">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <p className="text-lg font-semibold mb-1">Import Complete</p>
        <p className="text-sm text-muted-foreground">
          Successfully imported {rows.length} entries.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            setStep("upload");
            setRows([]);
            setConflicts([]);
            setErrors([]);
          }}
        >
          Upload Another File
        </Button>
      </CardContent>
    </Card>
  );
}

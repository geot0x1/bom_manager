"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BomEntryTable } from "@/components/bom/bom-entry-table";
import { ForkDialog } from "@/components/bom/fork-dialog";
import { UploadFlow } from "@/components/upload/upload-flow";
import { updateBom, createDraftBom, discardDraftBom, checkBomChanges } from "@/lib/actions/boms";
import type { BomWithRelations } from "@/lib/types";
import { SaveDialog } from "@/components/bom/save-dialog";
import * as XLSX from "xlsx";
import {
  GitFork,
  Lock,
  Unlock,
  Edit3,
  Eye,
  Upload,
  ChevronRight,
  CalendarDays,
  DollarSign,
  Hash,
  X,
  Check,
  Loader2,
  Table as TableIcon,
  History,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BomHistory } from "@/components/bom/bom-history";

interface HistoryItem {
  id: string;
  name: string;
  version: number;
  comment: string | null;
  createdAt: Date;
  userName: string | null;
}

interface BomDetailClientProps {
  bom: BomWithRelations;
  lineage: HistoryItem[];
}

export function BomDetailClient({ bom, lineage }: BomDetailClientProps) {
  const [editMode, setEditMode] = useState(false);
  const [showFork, setShowFork] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEditingDraft = bom.isDraft;

  const totalCost = bom.entries.reduce(
    (sum: number, e: { unitCost: number; designators: unknown[] }) => sum + e.unitCost * e.designators.length,
    0
  );
  const totalDesignators = bom.entries.reduce(
    (sum: number, e: { designators: unknown[] }) => sum + e.designators.length,
    0
  );

  const handleEditToggle = () => {
    if (isEditingDraft) {
      setEditMode(!editMode);
      return;
    }

    startTransition(async () => {
      try {
        const draft = await createDraftBom(bom.id);
        toast.info("Entering Edit Mode (Working Draft Created)");
        router.push(`/boms/${draft.id}`);
      } catch (error: any) {
        toast.error(error.message || "Failed to create draft");
      }
    });
  };

  const handleDiscardDraft = () => {
    startTransition(async () => {
      try {
        const { parentId } = await discardDraftBom(bom.id);
        toast.info("Draft discarded");
        if (parentId) {
          router.push(`/boms/${parentId}`);
        } else {
          router.push("/boms");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to discard draft");
      }
    });
  };

  const handleToggleLock = () => {
    startTransition(async () => {
      await updateBom(bom.id, { isLocked: !bom.isLocked });
      router.refresh();
      toast.success(bom.isLocked ? "BOM unlocked" : "BOM locked");
    });
  };

  const handleSaveClick = async () => {
    startTransition(async () => {
      try {
        const hasChanges = await checkBomChanges(bom.id);
        if (!hasChanges) {
          toast("No changes detected. Nothing to save.");
          // Accept the draft (exit edit mode by discarding the identical draft)
          const { parentId } = await discardDraftBom(bom.id);
          if (parentId) {
            router.push(`/boms/${parentId}`);
          } else {
            router.push("/boms");
          }
          return;
        }
        setShowSave(true);
      } catch (error: any) {
        toast.error("Failed to check for changes");
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      const data = bom.entries.map((entry) => ({
        MPN: entry.part.mpn,
        Manufacturer: entry.part.manufacturer,
        Description: entry.part.description,
        Footprint: entry.part.footprint,
        "Unit Cost ($)": entry.unitCost,
        Quantity: entry.designators.length,
        "Line Total ($)": (entry.unitCost * entry.designators.length).toFixed(2),
        Designators: entry.designators.map((d) => d.label).sort().join(", "),
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BOM");

      // Auto-size columns (Simplified approximation)
      const maxMPNWidth = Math.max(...data.map(d => d.MPN.length), 10);
      worksheet["!cols"] = [
        { wch: maxMPNWidth + 2 },
        { wch: 15 },
        { wch: 30 },
        { wch: 10 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 50 },
      ];

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const filename = `${bom.name.replace(/[^a-z0-9]/gi, '_')}_v${bom.version}.xlsx`;

      // Try using the File System Access API for "Save As" dialog
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Excel File',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(excelBuffer);
          await writable.close();
          toast.success("File saved successfully");
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return; // User cancelled
          // Fallback to default download if user denied permission or error occurred
        }
      }

      // Default fallback download
      XLSX.writeFile(workbook, filename);
      toast.success("Excel exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel");
    }
  };

  return (
    <div className="space-y-6">
      {/* Lineage Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/boms" className="hover:text-primary transition-colors">
          BOMs
        </Link>
        {lineage.map((item, i) => (
          <span key={item.id} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {i === lineage.length - 1 ? (
              <span className="text-foreground font-medium">{item.name}</span>
            ) : (
              <Link
                href={`/boms/${item.id}`}
                className="hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            )}
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{bom.name}</h1>
            <Badge variant="outline" className="font-mono-display">
              v{bom.version}
            </Badge>
            {isEditingDraft && (
              <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">
                Unsaved Changes (Draft)
              </Badge>
            )}
            {bom.isLocked ? (
              <Badge className="bg-warning/10 text-warning border-warning/30">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            ) : (
              <Badge variant="outline" className="text-success border-success/30">
                <Unlock className="h-3 w-3 mr-1" />
                Open
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created by {bom.user.name || bom.user.email} ·{" "}
            {new Date(bom.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditingDraft ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveClick}
                disabled={isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Check className="h-4 w-4 mr-1.5" />
                )}
                Save...
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscardDraft}
                disabled={isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-1.5" />
                Discard
              </Button>
            </>
          ) : (
            !bom.isLocked && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 mr-1.5" />
                      Edit Mode
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpload(!showUpload)}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload
                </Button>
              </>
            )
          )}
          {!isEditingDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
              >
                <FileDown className="h-4 w-4 mr-1.5" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFork(true)}
              >
                <GitFork className="h-4 w-4 mr-1.5" />
                Fork
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleLock}
                disabled={isPending}
              >
                {bom.isLocked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-1.5" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-1.5" />
                    Lock
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Hash className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unique Parts</p>
              <p className="text-xl font-bold font-mono-display">
                {bom.entries.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-chart-2/10 p-2">
              <Hash className="h-4 w-4 text-chart-2" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Designators</p>
              <p className="text-xl font-bold font-mono-display">
                {totalDesignators}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-chart-3/10 p-2">
              <DollarSign className="h-4 w-4 text-chart-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-xl font-bold font-mono-display text-primary">
                ${totalCost.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="rounded-lg bg-chart-5/10 p-2">
              <CalendarDays className="h-4 w-4 text-chart-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="text-sm font-medium">
                {new Date(bom.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      {showUpload && !bom.isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" />
              Import Parts from File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UploadFlow bomId={bom.id} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="contents" className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <TabsList className="bg-transparent h-auto p-0 gap-6 border-none">
            <TabsTrigger
              value="contents"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 flex items-center gap-2 text-sm font-medium transition-all"
            >
              <TableIcon className="h-4 w-4" />
              Bill of Materials
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 flex items-center gap-2 text-sm font-medium transition-all relative"
            >
              <History className="h-4 w-4" />
              Revision History
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4 flex items-center bg-primary/10 text-primary border-primary/20">
                {lineage.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="contents" className="mt-0 border-none p-0 outline-none">
          {/* Entry Table */}
          {bom.entries.length > 0 ? (
            <BomEntryTable entries={bom.entries} editMode={isEditingDraft || editMode} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Hash className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No entries yet. Upload a BOM file to get started.
                </p>
                {!bom.isLocked && (
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => setShowUpload(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload BOM File
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0 border-none p-0 outline-none">
          <div className="py-6">
            <BomHistory lineage={lineage} currentId={bom.id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Fork Dialog */}
      <ForkDialog
        bomId={bom.id}
        bomName={bom.name}
        open={showFork}
        onOpenChange={setShowFork}
      />

      <SaveDialog
        open={showSave}
        onOpenChange={setShowSave}
        draftId={bom.id}
      />
    </div>
  );
}

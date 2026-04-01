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
import { updateBom } from "@/lib/actions/boms";
import type { BomWithRelations } from "@/lib/types";
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
} from "lucide-react";
import { toast } from "sonner";

interface BomDetailClientProps {
  bom: BomWithRelations;
  lineage: { id: string; name: string; version: number }[];
}

export function BomDetailClient({ bom, lineage }: BomDetailClientProps) {
  const [editMode, setEditMode] = useState(false);
  const [showFork, setShowFork] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const totalCost = bom.entries.reduce(
    (sum: number, e: { unitCost: number; designators: unknown[] }) => sum + e.unitCost * e.designators.length,
    0
  );
  const totalDesignators = bom.entries.reduce(
    (sum: number, e: { designators: unknown[] }) => sum + e.designators.length,
    0
  );

  const handleToggleLock = () => {
    startTransition(async () => {
      await updateBom(bom.id, { isLocked: !bom.isLocked });
      router.refresh();
      toast.success(bom.isLocked ? "BOM unlocked" : "BOM locked");
    });
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
          {!bom.isLocked && (
            <>
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? (
                  <>
                    <Eye className="h-4 w-4 mr-1.5" />
                    View Mode
                  </>
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
          )}
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

      {/* Children/Forks */}
      {bom.children && bom.children.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitFork className="h-4 w-4 text-muted-foreground" />
              Forked Versions ({bom.children.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bom.children.map((child: { id: string; name: string; version: number }) => (
                <Link key={child.id} href={`/boms/${child.id}`}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  >
                    {child.name}{" "}
                    <span className="text-muted-foreground ml-1">
                      v{child.version}
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry Table */}
      {bom.entries.length > 0 ? (
        <BomEntryTable entries={bom.entries} editMode={editMode} />
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

      {/* Fork Dialog */}
      <ForkDialog
        bomId={bom.id}
        bomName={bom.name}
        open={showFork}
        onOpenChange={setShowFork}
      />
    </div>
  );
}

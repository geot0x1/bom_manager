"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ForkDialog } from "@/components/bom/fork-dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  GitFork,
  Trash2,
  Lock,
  Unlock,
  Package,
  Loader2,
} from "lucide-react";
import { deleteBom, updateBom } from "@/lib/actions/boms";
import type { BomWithRelations } from "@/lib/types";
import { toast } from "sonner";

interface BomsClientPageProps {
  initialBoms: BomWithRelations[];
}

export function BomsClientPage({ initialBoms }: BomsClientPageProps) {
  const [search, setSearch] = useState("");
  const [forkTarget, setForkTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = initialBoms.filter(
    (bom) =>
      bom.name.toLowerCase().includes(search.toLowerCase()) ||
      bom.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteBom(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
      toast.success("BOM deleted");
    });
  };

  const handleToggleLock = (id: string, isLocked: boolean) => {
    startTransition(async () => {
      await updateBom(id, { isLocked: !isLocked });
      router.refresh();
      toast.success(isLocked ? "BOM unlocked" : "BOM locked");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bills of Materials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track your BOM versions
          </p>
        </div>
        <Link href="/boms/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New BOM
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search BOMs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{filtered.length} BOMs</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No BOMs match your search" : "No BOMs yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead className="w-20 text-center">Version</TableHead>
                  <TableHead className="w-24 text-center">Parts</TableHead>
                  <TableHead className="w-24 text-center">Builds</TableHead>
                  <TableHead className="w-32 text-right">Total Cost</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="w-32">Updated</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((bom) => {
                  const totalCost = bom.entries.reduce(
                    (sum: number, e: { unitCost: number; designators: unknown[] }) => sum + e.unitCost * e.designators.length,
                    0
                  );
                  return (
                    <TableRow key={bom.id} className="group">
                      <TableCell>
                        <Link
                          href={`/boms/${bom.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {bom.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono-display text-xs">
                          v{bom.version}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono-display">
                        {bom.entries.length}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-accent/5 text-accent border-accent/20 font-mono-display">
                          {bom._count?.builds || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono-display font-medium">
                        ${totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {bom.isLocked ? (
                          <Badge
                            variant="secondary"
                            className="bg-warning/10 text-warning border-warning/30 text-xs"
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-success border-success/30 text-xs"
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Open
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {bom.parent ? (
                          <Link
                            href={`/boms/${bom.parent.id}`}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            ← {bom.parent.name} v{bom.parent.version}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Origin
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(bom.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.location.href = `/boms/${bom.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setForkTarget({ id: bom.id, name: bom.name })
                              }
                            >
                              <GitFork className="h-4 w-4 mr-2" />
                              Fork
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleLock(bom.id, bom.isLocked)
                              }
                            >
                              {bom.isLocked ? (
                                <>
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Lock
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteTarget({ id: bom.id, name: bom.name })
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fork Dialog */}
      {forkTarget && (
        <ForkDialog
          bomId={forkTarget.id}
          bomName={forkTarget.name}
          open={!!forkTarget}
          onOpenChange={(open) => !open && setForkTarget(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete BOM</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              This action cannot be undone. All entries and designators will be
              permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPart, updatePart, deletePart } from "@/lib/actions/parts";
import { Plus, Search, Pencil, Trash2, Cpu, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Part = {
  id: string;
  mpn: string;
  manufacturer: string;
  description: string;
  footprint: string;
  defaultUnitCost: number;
  createdAt: Date;
  updatedAt: Date;
};

interface PartsClientPageProps {
  initialParts: Part[];
}

export function PartsClientPage({ initialParts }: PartsClientPageProps) {
  const [search, setSearch] = useState("");
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null);
  const [form, setForm] = useState({
    mpn: "",
    manufacturer: "",
    description: "",
    footprint: "",
    defaultUnitCost: 0,
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = initialParts.filter(
    (p) =>
      p.mpn.toLowerCase().includes(search.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setForm({ mpn: "", manufacturer: "", description: "", footprint: "", defaultUnitCost: 0 });
    setShowCreate(true);
  };

  const openEdit = (part: Part) => {
    setForm({
      mpn: part.mpn,
      manufacturer: part.manufacturer,
      description: part.description,
      footprint: part.footprint,
      defaultUnitCost: part.defaultUnitCost,
    });
    setEditingPart(part);
  };

  const handleSave = () => {
    startTransition(async () => {
      if (editingPart) {
        const result = await updatePart(editingPart.id, form);
        if ("error" in result) {
          toast.error(String(result.error));
          return;
        }
        toast.success("Part updated");
        setEditingPart(null);
      } else {
        const result = await createPart(form);
        if ("error" in result) {
          toast.error(String(result.error));
          return;
        }
        toast.success("Part created");
        setShowCreate(false);
      }
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePart(deleteTarget.id);
      if ("error" in result) {
        toast.error(String(result.error));
      } else {
        toast.success("Part deleted");
      }
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const formDialog = (
    <Dialog
      open={showCreate || !!editingPart}
      onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setEditingPart(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingPart ? "Edit Part" : "Add New Part"}
          </DialogTitle>
          <DialogDescription>
            {editingPart
              ? "Update the master library entry."
              : "Add a new part to the master library."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">MPN</label>
            <Input
              value={form.mpn}
              onChange={(e) => setForm({ ...form, mpn: e.target.value })}
              placeholder="e.g., RC0402FR-0710KL"
              disabled={!!editingPart}
              className="font-mono-display"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Manufacturer</label>
            <Input
              value={form.manufacturer}
              onChange={(e) =>
                setForm({ ...form, manufacturer: e.target.value })
              }
              placeholder="e.g., Yageo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="e.g., RES SMD 10K OHM 1% 1/16W 0402"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Footprint</label>
              <Input
                value={form.footprint}
                onChange={(e) =>
                  setForm({ ...form, footprint: e.target.value })
                }
                placeholder="e.g., 0402"
                className="font-mono-display"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Unit Cost</label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={form.defaultUnitCost}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultUnitCost: parseFloat(e.target.value) || 0,
                  })
                }
                className="font-mono-display"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowCreate(false);
              setEditingPart(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editingPart ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Part Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master library of components used across all BOMs
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts by MPN, manufacturer, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{filtered.length} parts</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Cpu className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No parts match your search" : "No parts in the library"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>MPN</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Footprint</TableHead>
                  <TableHead className="text-right">Default Cost</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono-display font-medium text-primary">
                      {part.mpn}
                    </TableCell>
                    <TableCell>{part.manufacturer}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {part.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono-display text-xs">
                        {part.footprint}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono-display">
                      ${part.defaultUnitCost.toFixed(3)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(part)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(part)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {formDialog}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Part</DialogTitle>
            <DialogDescription>
              Delete{" "}
              <span className="font-mono-display font-medium">
                {deleteTarget?.mpn}
              </span>
              ? Parts used in BOMs cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

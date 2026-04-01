"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reassignDesignator } from "@/lib/actions/bom-entries";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BomEntryWithRelations } from "@/lib/types";

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designator: { id: string; label: string } | null;
  currentEntryMpn: string;
  entries: BomEntryWithRelations[];
}

export function ReassignDialog({
  open,
  onOpenChange,
  designator,
  currentEntryMpn,
  entries,
}: ReassignDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = entries.filter(
    (e) =>
      e.part.mpn !== currentEntryMpn &&
      (e.part.mpn.toLowerCase().includes(search.toLowerCase()) ||
        e.part.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleReassign = () => {
    if (!designator || !selectedEntryId) return;

    startTransition(async () => {
      await reassignDesignator(designator.id, selectedEntryId);
      onOpenChange(false);
      setSelectedEntryId(null);
      setSearch("");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Reassign Designator
          </DialogTitle>
          <DialogDescription>
            Move{" "}
            <span className="font-mono-display font-semibold text-primary">
              {designator?.label}
            </span>{" "}
            from{" "}
            <span className="font-mono-display text-muted-foreground">
              {currentEntryMpn}
            </span>{" "}
            to a different part.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by MPN or description..."
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No matching entries found
              </p>
            ) : (
              filtered.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedEntryId === entry.id
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  <div>
                    <span className="font-mono-display font-medium">
                      {entry.part.mpn}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.part.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {entry.designators.length} designators
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={isPending || !selectedEntryId}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

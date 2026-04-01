"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DesignatorGroup } from "./designator-badge";
import { ReassignDialog } from "./reassign-dialog";
import type { BomEntryWithRelations } from "@/lib/types";

interface BomEntryTableProps {
  entries: BomEntryWithRelations[];
  editMode?: boolean;
}

export function BomEntryTable({ entries, editMode = false }: BomEntryTableProps) {
  const [selectedDesignator, setSelectedDesignator] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [reassignEntryMpn, setReassignEntryMpn] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);

  const totalCost = entries.reduce(
    (sum, entry) => sum + entry.unitCost * entry.designators.length,
    0
  );

  const totalDesignators = entries.reduce(
    (sum, entry) => sum + entry.designators.length,
    0
  );

  const handleDesignatorSelect = (
    designatorId: string,
    designatorLabel: string,
    entryMpn: string
  ) => {
    setSelectedDesignator({ id: designatorId, label: designatorLabel });
    setReassignEntryMpn(entryMpn);
    setReassignOpen(true);
  };

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[200px]">MPN</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Footprint</TableHead>
              <TableHead className="w-[100px] text-right">Unit Cost</TableHead>
              <TableHead className="w-[60px] text-center">Qty</TableHead>
              <TableHead className="w-[100px] text-right">Line Total</TableHead>
              <TableHead className="min-w-[200px]">Designators</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="group">
                <TableCell>
                  <span className="font-mono-display font-medium text-primary">
                    {entry.part.mpn}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.part.description}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono-display text-xs">
                    {entry.part.footprint}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono-display">
                  ${entry.unitCost.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {entry.designators.length}
                </TableCell>
                <TableCell className="text-right font-mono-display font-medium">
                  ${(entry.unitCost * entry.designators.length).toFixed(2)}
                </TableCell>
                <TableCell>
                  <DesignatorGroup
                    designators={entry.designators}
                    interactive={editMode}
                    onSelect={(id) => {
                      const d = entry.designators.find((d) => d.id === id);
                      if (d) {
                        handleDesignatorSelect(id, d.label, entry.part.mpn);
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{entries.length}</span>{" "}
              unique parts
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{totalDesignators}</span>{" "}
              total designators
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Total BOM Cost</span>
            <p className="text-lg font-bold font-mono-display text-primary">
              ${totalCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        designator={selectedDesignator}
        currentEntryMpn={reassignEntryMpn}
        entries={entries}
      />
    </>
  );
}

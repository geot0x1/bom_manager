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
import { EditEntryMpnDialog } from "./edit-entry-dialog";
import type { BomEntryWithRelations, Designator } from "@/lib/types";
import { Edit2, History, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { RowHistoryDialog } from "./row-history-dialog";

interface BomEntryTableProps {
  entries: BomEntryWithRelations[];
  editMode?: boolean;
  historyMap: Record<string, boolean>;
}

export function BomEntryTable({ 
  entries, 
  editMode = false,
  historyMap
}: BomEntryTableProps) {
  const [selectedDesignator, setSelectedDesignator] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [reassignEntryMpn, setReassignEntryMpn] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BomEntryWithRelations | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [historyMpn, setHistoryMpn] = useState<string | null>(null);

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
              {editMode && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <ContextMenu key={entry.id}>
                <ContextMenuTrigger render={(props) => (
                  <TableRow {...props} className="group cursor-context-menu">
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
                          const d = entry.designators.find((d: Designator) => d.id === id);
                          if (d) {
                            handleDesignatorSelect(id, d.label, entry.part.mpn);
                          }
                        }}
                      />
                    </TableCell>
                    {editMode && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setEditingEntry(entry);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )} />
                <ContextMenuContent className="min-w-48">
                  <ContextMenuItem 
                    disabled={!historyMap?.[entry.id]}
                    onSelect={() => {
                      setHistoryEntryId(entry.id);
                      setHistoryMpn(entry.part.mpn);
                      setHistoryOpen(true);
                    }}
                  >
                    <History className="mr-2 h-4 w-4" />
                    View History
                    {!historyMap?.[entry.id] && (
                      <span className="ml-auto text-[10px] text-muted-foreground">None</span>
                    )}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    onSelect={() => {
                      window.open(`https://www.google.com/search?q=${entry.part.mpn}`, "_blank");
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Search Online
                  </ContextMenuItem>
                  <ContextMenuItem 
                    onSelect={() => {
                      setEditingEntry(entry);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Info className="mr-2 h-4 w-4" />
                    Part Details
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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

      <EditEntryMpnDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        entry={editingEntry}
      />

      <RowHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entryId={historyEntryId}
        mpn={historyMpn}
      />
    </>
  );
}

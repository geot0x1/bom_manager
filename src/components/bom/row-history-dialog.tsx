"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { getBomEntryHistory } from "@/lib/actions/boms";
import { Loader2, History } from "lucide-react";
import { format } from "date-fns";

interface RowHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string | null;
  mpn: string | null;
}

export function RowHistoryDialog({
  open,
  onOpenChange,
  entryId,
  mpn,
}: RowHistoryDialogProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entryId) {
      setLoading(true);
      getBomEntryHistory(entryId)
        .then((data) => {
          setHistory(data);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setHistory([]);
    }
  }, [open, entryId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Part History: {mpn}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Fetching history from lineage...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[100px]">Version</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>BOM / Comment</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item, idx) => (
                    <TableRow key={idx} className={idx === 0 ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono-display">
                          v{item.bom.version}
                        </Badge>
                        {idx === 0 && (
                          <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 text-[10px] h-4 px-1">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono-display font-medium text-sm">
                            {item.part.mpn}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {item.part.manufacturer}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{item.bom.name}</span>
                          {item.bom.comment && (
                            <span className="text-xs text-muted-foreground italic">
                              "{item.bom.comment}"
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(item.bom.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No historical data found for these designators in previous versions.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

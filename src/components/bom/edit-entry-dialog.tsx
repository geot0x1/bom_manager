"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { updateBomEntryMpn } from "@/lib/actions/boms";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditEntryMpnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: {
    id: string;
    part: {
      mpn: string;
      description: string;
    };
  } | null;
}

export function EditEntryMpnDialog({
  open,
  onOpenChange,
  entry,
}: EditEntryMpnDialogProps) {
  const [newMpn, setNewMpn] = useState("");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (open && entry) {
      setNewMpn(entry.part.mpn);
    }
    onOpenChange(open);
  };

  const handleSave = async () => {
    if (!entry || !newMpn.trim() || newMpn === entry.part.mpn) {
      onOpenChange(false);
      return;
    }

    setIsPending(true);
    try {
      const result = await updateBomEntryMpn(entry.id, newMpn.trim());
      if (result.success) {
        toast.success("Entry updated successfully");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update entry");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Part Number</DialogTitle>
          <DialogDescription>
            Change the MPN for this row. If the new MPN exists in another row,
            they will be merged automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current-mpn" className="text-muted-foreground">
              Current Part
            </Label>
            <div className="text-sm font-medium">
              {entry?.part.mpn} — {entry?.part.description}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-mpn">New MPN</Label>
            <Input
              id="new-mpn"
              value={newMpn}
              onChange={(e) => setNewMpn(e.target.value)}
              placeholder="Enter new part number..."
              className="font-mono-display"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !newMpn.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

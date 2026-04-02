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
import { createBuild } from "@/lib/actions/boms";
import { Package, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BuildDialogProps {
  bomId: string;
  bomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuildDialog({
  bomId,
  bomName,
  open,
  onOpenChange,
}: BuildDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleBuild = () => {
    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }

    startTransition(async () => {
      try {
        await createBuild(bomId, quantity);
        toast.success(`Registered build for ${quantity} units`);
        onOpenChange(false);
        router.refresh();
      } catch (error: any) {
        toast.error(error.message || "Failed to create build");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Build BOM
          </DialogTitle>
          <DialogDescription>
            Register a new physical build of &ldquo;{bomName}&rdquo;. 
            This will record the build quantity and current timestamp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Build Quantity</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter build quantity"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBuild} disabled={isPending || quantity <= 0}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Register Build
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

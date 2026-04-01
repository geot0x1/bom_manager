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
import { forkBom } from "@/lib/actions/boms";
import { GitFork, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ForkDialogProps {
  bomId: string;
  bomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForkDialog({
  bomId,
  bomName,
  open,
  onOpenChange,
}: ForkDialogProps) {
  const [name, setName] = useState(`${bomName} (Fork)`);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleFork = () => {
    startTransition(async () => {
      const forked = await forkBom(bomId, name);
      onOpenChange(false);
      router.push(`/boms/${forked.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-primary" />
            Fork BOM
          </DialogTitle>
          <DialogDescription>
            Create a new version by forking &ldquo;{bomName}&rdquo;. All entries
            and designators will be deep-copied.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New BOM Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name for forked BOM"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleFork} disabled={isPending || !name.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <GitFork className="h-4 w-4 mr-2" />
            )}
            Fork BOM
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

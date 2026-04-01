"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitFork, Save, Loader2, AlertTriangle } from "lucide-react";
import { commitDraftBom } from "@/lib/actions/boms";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId: string;
}

export function SaveDialog({ open, onOpenChange, draftId }: SaveDialogProps) {
  const [isPending, setIsPending] = useState<"overwrite" | "fork" | null>(null);
  const router = useRouter();

  const handleSave = async (strategy: "overwrite" | "fork") => {
    setIsPending(strategy);
    try {
      const result = await commitDraftBom(draftId, strategy);
      toast.success(
        strategy === "fork"
          ? "BOM saved as new version"
          : "Official version updated"
      );
      onOpenChange(false);
      // Wait for revalidation and redirect
      router.push(`/boms/${result.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Save Changes
          </DialogTitle>
          <DialogDescription>
            Choose how you want to apply these changes to the production record.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <button
            onClick={() => handleSave("overwrite")}
            disabled={!!isPending}
            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all text-left group"
          >
            <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500 mt-1">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Overwrite Existing BOM
              </p>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">
                Replace the contents of the official version with your draft.
                This is permanent and affects everyone viewing that version.
              </p>
            </div>
            {isPending === "overwrite" && (
              <Loader2 className="h-5 w-5 animate-spin text-primary self-center" />
            )}
          </button>

          <button
            onClick={() => handleSave("fork")}
            disabled={!!isPending}
            className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all text-left group"
          >
            <div className="rounded-lg bg-primary/10 p-2 text-primary mt-1">
              <GitFork className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                New Version (Fork)
              </p>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">
                Creates a new revision (e.g. v1 $\rightarrow$ v2) while keeping the original
                version unchanged for historical reference.
              </p>
            </div>
            {isPending === "fork" && (
              <Loader2 className="h-5 w-5 animate-spin text-primary self-center" />
            )}
          </button>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={!!isPending}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

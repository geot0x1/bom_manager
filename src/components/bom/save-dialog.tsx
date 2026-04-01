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
import { Check, Save, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { commitDraftBom } from "@/lib/actions/boms";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftId: string;
}

export function SaveDialog({ open, onOpenChange, draftId }: SaveDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [comment, setComment] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!comment.trim()) {
      toast.error("Please add a revision note");
      return;
    }

    setIsPending(true);
    const strategy = overwrite ? "overwrite" : "fork";
    
    try {
      const result = await commitDraftBom(draftId, strategy, comment.trim());
      toast.success(
        strategy === "fork"
          ? "BOM saved as new history entry"
          : "Previous version updated"
      );
      onOpenChange(false);
      router.push(`/boms/${result.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Save Changes
          </DialogTitle>
          <DialogDescription>
            Document your edits to maintain a clean production history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="comment" className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              Revision Note (Required)
            </Label>
            <Textarea
              id="comment"
              placeholder="E.g., 'Corrected R1 footprint', 'Shifted BOM to new manufacturing batch'..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30 border border-border/50">
            <Checkbox
              id="overwrite"
              checked={overwrite}
              onCheckedChange={(checked) => setOverwrite(!!checked)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="overwrite"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Overwrite current version
              </Label>
              <p className="text-xs text-muted-foreground">
                Merge these edits into the latest history entry instead of creating a new one (e.g., for correcting typos).
              </p>
            </div>
          </div>
          
          {overwrite && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10 text-orange-500 text-[10px] uppercase tracking-wider font-bold">
              <AlertCircle className="h-4 w-4" />
              This will replace the previous version's data
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending || !comment.trim()}
            className="px-8 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

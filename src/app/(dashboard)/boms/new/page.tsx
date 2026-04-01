"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadFlow } from "@/components/upload/upload-flow";
import { createBom } from "@/lib/actions/boms";
import { Plus, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function NewBomPage() {
  const [name, setName] = useState("");
  const [bomId, setBomId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const bom = await createBom(name);
      setBomId(bom.id);
      toast.success("BOM created! Now upload your file.");
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New BOM</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new Bill of Materials and optionally upload a file to populate it.
        </p>
      </div>

      {/* Step 1: Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4" />
            Step 1: Name your BOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="e.g., Motor Controller Board v1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!bomId}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={isPending || !name.trim() || !!bomId}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload */}
      {bomId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Step 2: Upload BOM File (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UploadFlow bomId={bomId} />
          </CardContent>
        </Card>
      )}

      {/* Skip / Go to BOM */}
      {bomId && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => router.push(`/boms/${bomId}`)}>
            Go to BOM →
          </Button>
        </div>
      )}
    </div>
  );
}

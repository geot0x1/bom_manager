import { prisma } from "@/lib/prisma";
import { DiffView } from "@/components/compare/diff-view";

export default async function ComparePage() {
  const boms = await prisma.bom.findMany({
    select: { id: true, name: true, version: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare Versions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Side-by-side comparison of two BOM versions with change highlighting
        </p>
      </div>

      <DiffView boms={boms} />
    </div>
  );
}

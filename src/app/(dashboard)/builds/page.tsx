import { getBuilds } from "@/lib/actions/boms";
import { BuildList } from "@/components/builds/build-list";
import { History, Package } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build History | BOM Manager",
  description: "View all historical builds across all BOMs",
};

export default async function BuildsPage() {
  const builds = await getBuilds();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            Build History
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4" />
            Tracking all physical production builds across the organization.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <BuildList builds={builds as any} />
      </div>
    </div>
  );
}

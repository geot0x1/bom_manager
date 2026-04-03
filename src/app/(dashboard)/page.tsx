import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  Package,
  Cpu,
  GitFork,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  const [bomCount, partCount, recentBoms] = await Promise.all([
    prisma.bom.count({ 
      where: { 
        isDraft: false,
        children: { none: {} }
      } 
    }),
    prisma.part.count(),
    prisma.bom.findMany({
      where: { 
        isDraft: false,
        children: { none: {} }
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        entries: { include: { designators: true } },
        _count: { select: { entries: true, children: true } },
      },
    }),
  ]);

  const totalDesignators = await prisma.designator.count();
  const projectCount = await prisma.bom.count({
    where: { 
      parentId: null,
      isDraft: false 
    },
  });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back,{" "}
          <span className="text-primary">{session?.user?.name || "Engineer"}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your PCB Bills of Materials
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="group hover:border-primary/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total BOMs</p>
                <p className="text-3xl font-bold font-mono-display mt-1">
                  {bomCount}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Part Library</p>
                <p className="text-3xl font-bold font-mono-display mt-1">
                  {partCount}
                </p>
              </div>
              <div className="rounded-lg bg-chart-2/10 p-3 group-hover:bg-chart-2/20 transition-colors">
                <Cpu className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Projects</p>
                <p className="text-3xl font-bold font-mono-display mt-1">
                  {projectCount}
                </p>
              </div>
              <div className="rounded-lg bg-chart-5/10 p-3 group-hover:bg-chart-5/20 transition-colors">
                <GitFork className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:border-primary/30 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Designators
                </p>
                <p className="text-3xl font-bold font-mono-display mt-1">
                  {totalDesignators}
                </p>
              </div>
              <div className="rounded-lg bg-chart-3/10 p-3 group-hover:bg-chart-3/20 transition-colors">
                <TrendingUp className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent BOMs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent BOMs
          </CardTitle>
          <Link
            href="/boms"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentBoms.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No BOMs yet. Create your first one!
                </p>
                <Link href="/boms/new">
                  <button className="mt-3 text-sm text-primary hover:underline">
                    Upload a BOM →
                  </button>
                </Link>
              </div>
            ) : (
              recentBoms.map((bom: any) => {
                const totalCost = bom.entries.reduce(
                  (sum: number, e: any) => sum + e.unitCost * e.designators.length,
                  0
                );
                return (
                  <Link
                    key={bom.id}
                    href={`/boms/${bom.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {bom.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono-display">
                          {format(new Date(bom.updatedAt), "MMM d, yyyy")} ·{" "}
                          {bom._count.entries} parts
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        v{bom.version}
                      </Badge>
                      {bom.isLocked && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-warning/10 text-warning border-warning/30"
                        >
                          Locked
                        </Badge>
                      )}
                      <span className="font-mono-display text-sm font-medium">
                        ${totalCost.toFixed(2)}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

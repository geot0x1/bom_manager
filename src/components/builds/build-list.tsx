"use client";

import { Build } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Hash, History, ExternalLink } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BuildWithBom extends Build {
  bom: {
    id: string;
    name: string;
    version: number;
  };
}

interface BuildListProps {
  builds: BuildWithBom[];
}

export function BuildList({ builds }: BuildListProps) {
  if (builds.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No builds recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border border-border/50 bg-card/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead>BOM Name</TableHead>
            <TableHead className="w-[100px]">Version</TableHead>
            <TableHead className="w-[100px]">Quantity</TableHead>
            <TableHead className="w-[100px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {builds.map((build) => (
            <TableRow key={build.id}>
              <TableCell className="font-medium text-primary">
                {format(new Date(build.date || build.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="font-semibold">
                {build.bom.name}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20">
                  v{build.bom.version}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{build.quantity}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Link 
                  href={`/boms/${build.bom.id}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

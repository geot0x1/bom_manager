"use client";

import { Build } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Hash, History } from "lucide-react";

interface BuildHistoryProps {
  builds: Build[];
}

export function BuildHistory({ builds }: BuildHistoryProps) {
  if (builds.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No builds recorded for this version.
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
            <TableHead className="w-[180px]">Date & Time</TableHead>
            <TableHead className="w-[100px]">Quantity</TableHead>
            <TableHead>Build ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {builds.map((build) => (
            <TableRow key={build.id}>
              <TableCell className="font-medium">
                {format(new Date(build.date || build.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{build.quantity}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs font-mono">
                {build.id}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

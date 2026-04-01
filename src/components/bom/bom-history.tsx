"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, MessageSquare, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  id: string;
  name: string;
  version: number;
  comment: string | null;
  createdAt: Date;
  userName: string | null;
}

interface BomHistoryProps {
  lineage: HistoryItem[];
  currentId: string;
}

export function BomHistory({ lineage, currentId }: BomHistoryProps) {
  // Sort by version descending for timeline
  const sortedLineage = [...lineage].sort((a, b) => b.version - a.version);

  if (sortedLineage.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History className="h-12 w-12 opacity-20 mb-4" />
        <p>No version history available.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:ml-[2.5rem] md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
      {sortedLineage.map((item, index) => {
        const isCurrent = item.id === currentId;

        return (
          <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            {/* Dot */}
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
                isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              )}
            >
              <span className={cn("text-xs font-bold", isCurrent ? "text-primary" : "text-muted-foreground")}>
                v{item.version}
              </span>
            </div>

            {/* Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-1 md:p-4">
              <Link href={`/boms/${item.id}`} className="block">
                <Card className={cn(
                  "overflow-hidden transition-all duration-200 hover:ring-1 hover:ring-primary/30",
                  isCurrent ? "border-primary/50 bg-primary/5" : "bg-muted/30"
                )}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={isCurrent ? "default" : "outline"} className="text-[10px] uppercase tracking-wider">
                          {isCurrent ? "Current Revision" : `Revision ${item.version}`}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                        <User className="h-3 w-3" />
                        {item.userName}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        <MessageSquare className="h-4 w-4 text-primary/60" />
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed italic">
                        "{item.comment || "No revision note provided."}"
                      </p>
                    </div>

                    {!isCurrent && (
                      <div className="mt-4 flex items-center justify-end text-[10px] font-semibold text-primary/70 uppercase tracking-widest group-hover:text-primary transition-colors">
                        View this version
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

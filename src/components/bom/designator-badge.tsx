"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DesignatorBadgeProps {
  label: string;
  id?: string;
  interactive?: boolean;
  selected?: boolean;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: "default" | "added" | "removed" | "moved";
}

const variantClasses = {
  default: "border-border bg-muted/50 text-foreground",
  added: "border-success/50 bg-success/10 text-success",
  removed: "border-destructive/50 bg-destructive/10 text-destructive line-through",
  moved: "border-warning/50 bg-warning/10 text-warning",
};

export function DesignatorBadge({
  label,
  id,
  interactive = false,
  selected = false,
  removable = false,
  onClick,
  onRemove,
  variant = "default",
}: DesignatorBadgeProps) {
  return (
    <span
      data-designator-id={id}
      onClick={interactive ? onClick : undefined}
      className={cn(
        "designator-badge",
        variantClasses[variant],
        interactive && "interactive",
        selected && "selected"
      )}
    >
      {label}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

interface DesignatorGroupProps {
  designators: { id: string; label: string }[];
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  variant?: DesignatorBadgeProps["variant"];
}

export function DesignatorGroup({
  designators,
  interactive = false,
  selectedId,
  onSelect,
  variant = "default",
}: DesignatorGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {designators.map((d) => (
        <DesignatorBadge
          key={d.id}
          id={d.id}
          label={d.label}
          interactive={interactive}
          selected={selectedId === d.id}
          onClick={() => onSelect?.(d.id)}
          variant={variant}
        />
      ))}
    </div>
  );
}

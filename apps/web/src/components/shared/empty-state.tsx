"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/* ============================================================
   EmptyState - turn dead-ends into on-ramps.
   UX laws:
   • Aesthetic-Usability - calm, centered, never apologetic.
   • Law of Proximity - suggestion list grouped tight so each
     option reads as a discrete next-step.
   • Hick's Law - cap suggestions at 3 (Miller's 7±2 → 3 is the
     sweet spot for decisions).
   • Peak-End Rule - a satisfying CTA leaves a positive last
     impression even on an empty screen.
   ============================================================ */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  suggestions?: { label: string; onClick: () => void; icon?: ReactNode }[];
  className?: string;
  /** Compact variant for inline panels. */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  suggestions,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-[6px] border border-border text-muted-foreground",
            compact ? "h-9 w-9" : "h-12 w-12",
          )}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className={cn("font-medium tracking-tight text-foreground", compact ? "text-[13px]" : "text-[15px]")}>
          {title}
        </h3>
        {description && (
          <p className={cn("mx-auto max-w-sm text-muted-foreground", compact ? "text-[12px]" : "text-[13px]")}>
            {description}
          </p>
        )}
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="mt-1 w-full max-w-sm divide-y divide-border rounded-[6px] border border-border bg-card text-left">
          {suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={s.onClick}
              className="group flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 tap"
            >
              {s.icon && <span className="text-muted-foreground">{s.icon}</span>}
              <span className="flex-1 text-[13px] text-foreground">{s.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
          ))}
        </div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ===== Table skeleton - Doherty threshold for perceived load ===== */
interface SkeletonRowProps {
  cols: number;
  rows?: number;
}

export function TableSkeleton({ cols, rows = 8 }: SkeletonRowProps) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton h-3.5 rounded-[2px]"
              style={{ width: `${[20, 12, 18, 14, 10, 16, 12][c % 7]}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ===== Inline skeleton block ===== */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[2px]", className)} />;
}

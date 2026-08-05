"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

/* ============================================================
   SectionCard - the canonical "common region" wrapper.
   UX laws:
   • Law of Common Region - a single bordered surface signals
     "these things belong together" stronger than proximity alone.
   • Law of Proximity - header, body, footer separated by
     consistent rhythm, not extra borders.
   • Tesler's Law - optional collapsible absorbs the complexity
     of "show/hide" so the parent doesn't have to manage it.
   ============================================================ */

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Remove inner padding (for tables/Lists that manage their own). */
  flush?: boolean;
}

export function SectionCard({
  title,
  description,
  icon,
  badge,
  action,
  children,
  footer,
  className,
  bodyClassName,
  collapsible,
  defaultOpen = true,
  flush,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("flex flex-col rounded-[3px] border border-border bg-card", className)}>
      <header
        className={cn(
          "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
          collapsible && "cursor-pointer select-none hover:bg-accent/40 transition-colors",
        )}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[14px] font-medium tracking-tight text-foreground">{title}</h3>
              {badge}
            </div>
            {description && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible && (
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
          )}
        </div>
      </header>
      {(!collapsible || open) && (
        <div className={cn(!flush && "p-4", bodyClassName)}>{children}</div>
      )}
      {footer && (!collapsible || open) && (
        <footer className="border-t border-border px-4 py-2.5">{footer}</footer>
      )}
    </section>
  );
}

/* ============================================================
   ProgressMeter - Goal-Gradient Effect.
   As the user nears the target, motivation increases.
   ============================================================ */

interface ProgressMeterProps {
  value: number;
  max?: number;
  label?: string;
  valueLabel?: string;
  className?: string;
  /** Show a target tick mark. */
  target?: number;
  tone?: "solid" | "muted";
}

export function ProgressMeter({
  value,
  max = 100,
  label,
  valueLabel,
  className,
  target,
  tone = "solid",
}: ProgressMeterProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const targetPct = target !== undefined ? Math.min(100, Math.max(0, (target / max) * 100)) : null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between text-[11px]">
          {label && <span className="text-muted-foreground">{label}</span>}
          {valueLabel && <span className="tabular font-medium text-foreground">{valueLabel}</span>}
        </div>
      )}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            tone === "solid" ? "bg-foreground" : "bg-muted-foreground",
          )}
          style={{ width: `${pct}%` }}
        />
        {targetPct !== null && (
          <div
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-background"
            style={{ left: `${targetPct}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

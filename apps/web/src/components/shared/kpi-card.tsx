"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight, Loader2 } from "lucide-react";

/* ============================================================
   KpiCard - the primary metric surface across Reanzly.
   UX laws applied:
   • Serial Position Effect - label/value/delta ordered so the
     most important glyph (value) is anchored; delta recency.
   • Goal-Gradient Effect - optional progress meter toward a
     target motivates completion as the bar fills.
   • Von Restorff Effect - clickable cards get a directional
     chevron + stronger hover border so they stand out from
     static tiles.
   • Doherty Threshold - `loading` renders a shimmer skeleton
     so the layout never reflows; perceived < 400ms.
   • Aesthetic-Usability - tabular mono numerals, hairline
     border, soft 120ms transitions, no shadows.
   ============================================================ */

export interface KpiCardProps {
  label: string;
  value: string | number;
  /** Delta vs previous period, e.g. "3.2%". Pass `trend` for direction. */
  delta?: string;
  trend?: "up" | "down" | "flat";
  /** Treat a downward trend as good (e.g. expenses, accidents). */
  invertDelta?: boolean;
  icon?: ReactNode;
  /** 0–100, renders a goal-gradient progress meter. */
  progress?: number;
  progressLabel?: string;
  /** Monochrome sparkline points (0..1 normalized or raw numbers). */
  spark?: number[];
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  trend,
  invertDelta,
  icon,
  progress,
  progressLabel,
  spark,
  onClick,
  loading,
  className,
}: KpiCardProps) {
  if (loading) return <KpiCardSkeleton className={className} />;

  const isClickable = !!onClick;
  const trendDir = trend ?? (delta ? "up" : undefined);
  const trendIsGood =
    trendDir === undefined
      ? undefined
      : invertDelta
        ? trendDir === "down"
        : trendDir === "up";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-[3px] border border-border bg-card p-4 tap",
        isClickable &&
          "cursor-pointer hover:border-foreground/35 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors duration-100",
        className,
      )}
    >
      {/* Row 1: label + icon */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.5px] font-medium text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground/80">{icon}</span>}
      </div>

      {/* Row 2: value + delta */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="tick-up font-mono text-[20px] font-semibold leading-none tracking-tight tabular text-foreground">
            {value}
          </span>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium tabular",
                trendIsGood === false && "text-muted-foreground",
                trendIsGood === true && "text-foreground",
                trendIsGood === undefined && "text-muted-foreground",
              )}
            >
              {trendDir === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trendDir === "down" && <ArrowDownRight className="h-3 w-3" />}
              {delta}
            </span>
          )}
        </div>
        {isClickable && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>

      {/* Row 3: sparkline (Law of Proximity - visually bonded to value) */}
      {spark && spark.length > 1 && (
        <Sparkline points={spark} className="-mb-1 h-7 w-full" />
      )}

      {/* Row 4: goal-gradient progress meter */}
      {progress !== undefined && (
        <div className="flex flex-col gap-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {progressLabel && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular">
              <span>{progressLabel}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Sparkline - monochrome SVG, no axis chrome ===== */
export function Sparkline({
  points,
  className,
  strokeWidth = 1.5,
}: {
  points: number[];
  className?: string;
  strokeWidth?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const step = w / (points.length - 1);
  const norm = points.map((p) => h - ((p - min) / range) * (h - 4) - 2);
  const path = norm.map((y, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  const last = norm[norm.length - 1];
  const trendUp = points[points.length - 1] >= points[0];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={areaPath} fill="currentColor" className="text-foreground/10" />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        className={trendUp ? "text-foreground" : "text-muted-foreground"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={w} cy={last} r={1.6} fill="currentColor" className={trendUp ? "text-foreground" : "text-muted-foreground"} />
    </svg>
  );
}

/* ===== Skeleton - Doherty threshold; layout never reflows ===== */
export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-[3px] border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-20 rounded-[2px]" />
        <div className="skeleton h-3.5 w-3.5 rounded-[2px]" />
      </div>
      <div className="skeleton h-6 w-24 rounded-[2px]" />
      <div className="skeleton h-7 w-full rounded-[2px]" />
    </div>
  );
}

/* ===== Compact stat tile - for list headers / sub-totals ===== */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-[3px] border border-border bg-card px-3.5 py-2.5", className)}>
      <span className="font-mono text-[11px] uppercase tracking-[0.5px] font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[19px] font-semibold leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/* ===== Inline loading spinner for buttons ===== */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-3.5 w-3.5 animate-spin", className)} />;
}

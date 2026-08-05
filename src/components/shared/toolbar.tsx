"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

/* ============================================================
   FilterChip + Toolbar - Hick's Law + Law of Proximity.
   Chunk filters into a single row; active chips stand out
   (Von Restorff). Clear-all keeps decision count low.
   ============================================================ */

export interface FilterChipOption {
  label: string;
  value: string;
  count?: number;
}

export function FilterChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors tap",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "tabular text-[10px]",
            active ? "text-background/70" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
  allowMultiple = false,
  showCounts = true,
  className,
}: {
  options: FilterChipOption[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  allowMultiple?: boolean;
  showCounts?: boolean;
  className?: string;
}) {
  const isActive = (v: string) =>
    allowMultiple ? (value as string[]).includes(v) : value === v;

  const toggle = (v: string) => {
    if (allowMultiple) {
      const arr = value as string[];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange(v === value ? "" : v);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          active={isActive(opt.value)}
          count={showCounts ? opt.count : undefined}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}

/* ============================================================
   SearchInput - Doherty threshold: instant filter feedback.
   ============================================================ */

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex h-8 w-full max-w-xs items-center", className)}>
      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 rounded-[5px] border-border bg-background pl-8 pr-7 text-[13px]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Toolbar - wraps SearchInput + ChipGroup + actions in a
   single common region so the eye chunks "filter zone".
   ============================================================ */

export function Toolbar({
  children,
  className,
  count,
  countLabel = "records",
}: {
  children: ReactNode;
  className?: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5", className)}>
      {children}
      {count !== undefined && (
        <>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {count} {count === 1 ? countLabel.replace(/s$/, "") : countLabel}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   FilterButton - dropdown trigger with active-state indicator.
   ============================================================ */

export function FilterButton({
  label,
  value,
  onClick,
  active,
  icon,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  active?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors tap",
        active
          ? "border-foreground text-foreground"
          : "border-border text-foreground hover:bg-accent",
      )}
    >
      {icon ?? <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />}
      <span className="text-muted-foreground">{label}:</span>
      <span className="max-w-[100px] truncate">{value}</span>
    </button>
  );
}

/**
 * BtnGroup - a monochrome segmented control (toggle group) for switching
 * between a small set of view modes (e.g. list / matrix). Hick's Law: the
 * limited options keep the decision fast.
 */
export function BtnGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[6px] border border-border bg-muted/30 p-0.5">
      {children}
    </div>
  );
}

export function BtnGroupItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors tap",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

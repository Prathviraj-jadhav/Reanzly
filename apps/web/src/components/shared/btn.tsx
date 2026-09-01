"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/* ============================================================
   Btn - the single button primitive for Reanzly.
   UX laws:
   • Fitts's Law - minimum 32px (sm) / 36px (md) / 40px (lg)
     touch targets; full hit area, no dead zones.
   • Von Restorff Effect - `primary` is the only filled style;
     outline/ghost stay quiet so the primary CTA wins attention.
   • Doherty Threshold - `loading` swaps label for spinner in
     < 120ms with no layout shift.
   • Aesthetic-Usability - 120ms transitions, tap scale feedback,
     crisp focus ring (accessibility).
   • Tesler's Law - `iconRight` lets callers place disclosure
     chevrons without bespoke markup.
   ============================================================ */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "link";
  size?: "xs" | "sm" | "md" | "lg";
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  /** Stretch to fill container width. */
  block?: boolean;
}

export function Btn({
  variant = "outline",
  size = "md",
  icon,
  iconRight,
  loading,
  block,
  children,
  className,
  disabled,
  ...props
}: BtnProps) {
  const sizeCls =
    size === "xs"
      ? "h-6 px-2 text-[11px] gap-1"
      : size === "sm"
        ? "h-7 px-2.5 text-[12px] gap-1.5"
        : size === "lg"
          ? "h-10 px-4 text-[14px] gap-2"
          : "h-8 px-3 text-[13px] gap-1.5";

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center rounded-[2px] font-medium whitespace-nowrap tap transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        sizeCls,
        block && "w-full",
        variant === "primary" &&
          "bg-foreground text-background border border-foreground hover:opacity-85 active:bg-foreground",
        variant === "outline" &&
          "border border-border bg-background text-foreground hover:bg-accent hover:border-[var(--rz-border-hover)]",
        variant === "ghost" &&
          "text-muted-foreground font-normal hover:bg-accent hover:text-foreground",
        variant === "link" &&
          "text-foreground hover:underline underline-offset-4 px-0 h-auto",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  );
}

/* ===== Button group - for segmented choices ===== */
export function BtnGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[2px] border border-border bg-background p-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BtnGroupItem({
  active,
  onClick,
  children,
  className,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-6 items-center rounded-[2px] px-2.5 text-[12px] font-medium transition-colors duration-100 tap",
        disabled && "cursor-not-allowed opacity-40 pointer-events-none",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

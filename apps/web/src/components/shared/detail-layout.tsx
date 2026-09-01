"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { useMigratedNavBack } from "@/lib/navigation/use-migrated-nav-back";
import { ArrowLeft, ChevronRight, Clock, MoreHorizontal } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SectionCard } from "@/components/shared/section-card";
import { Sparkline } from "@/components/shared/kpi-card";

/* ============================================================
   DetailLayout - the canonical detail-page shell for Reanzly.
   Used by every detail screen (trips, vehicles, customers,
   invoices, etc.). Backwards-compatible prop signature - every
   new prop is optional.

   UX laws applied (cited inline):
   • Peak-End Rule - header is the "peak" moment: confident 24px
     title, badges inline-right, muted subtitle, meta strip of
     discrete fact chips, and a subtle "last updated" footer
     closes every screen for a controlled end.
   • Law of Common Region - content panels are wrapped in
     SectionCard / InfoSection (single bordered surface) so the
     eye reads "these belong together".
   • Fitts's Law - sticky tab bar (sticky top-0); back button is
     a 36px bordered square top-left; quick-action trigger is a
     36px square. Generous hit areas, always reachable.
   • Law of Proximity - meta items grouped with consistent gap;
     tab strip shares an edge with the content.
   • Hick's Law - quickActions dropdown is capped at 6; the
     "more" menu absorbs secondary actions so primary actions
     stay visible.
   • Aesthetic-Usability Effect - header gets an
     `animate-slide-up` entrance; back + quick-action triggers
     get `tap` feedback; clickable StatCards get a hover border.
   • Serial Position Effect - caller is expected to order meta +
     stats most-important-first; layout reinforces it by reading
     left-to-right.
   • Von Restorff Effect - active tab has a 2px bottom border;
     primary CTA in the actions zone should use Btn
     variant="primary" (filled) so it wins attention.
   • Tesler's Law - InfoSection supports `collapsible` so long
     detail pages can collapse secondary sections, absorbing
     complexity for the parent.
   ============================================================ */

interface DetailLayoutProps {
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  meta?: ReactNode;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  actions?: ReactNode;
  quickActions?: { label: string; onClick: () => void }[];
  /** Closure line at the very bottom (Peak-End Rule). Defaults to "Synced just now". */
  lastUpdated?: ReactNode;
  children: ReactNode;
}

export function DetailLayout({
  title,
  subtitle,
  badges,
  meta,
  tabs,
  activeTab,
  onTabChange,
  actions,
  quickActions = [],
  lastUpdated,
  children,
}: DetailLayoutProps) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const navigateBack = useMigratedNavBack(activeView.module);

  // Hick's Law - cap quickActions to 6; caller curates beyond that.
  const visibleQuickActions = quickActions.slice(0, 6);

  return (
    <div className="flex flex-col gap-0">
      {/* Row 1 - Breadcrumb (top) */}
      <div className="pb-3">
        <Breadcrumb>
          <BreadcrumbList>
            {activeView.breadcrumb.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator className="text-muted-foreground/50" />}
                <BreadcrumbItem>
                  {i === activeView.breadcrumb.length - 1 ? (
                    <BreadcrumbPage className="text-[13px] text-muted-foreground">{b.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      onClick={() => b.module && navigateCompat(b.module as never)}
                      className="cursor-pointer text-[13px] text-muted-foreground hover:text-foreground"
                    >
                      {b.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Rows 2–4 - Header block (Peak-End peak moment) */}
      <div className="animate-slide-up border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* [back + title + badges] row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={navigateBack}
                    aria-label="Back"
                    className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Back</TooltipContent>
              </Tooltip>
              <h1 className="text-[24px] font-medium leading-tight tracking-tight text-foreground">{title}</h1>
              {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
            </div>

            {/* subtitle */}
            {subtitle && <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p>}

            {/* meta strip - discrete fact chips (Law of Common Region per item) */}
            {meta && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {Children.toArray(meta).map((child, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-[5px] border border-foreground/10 bg-background px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {child}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* actions + quickActions */}
          {(actions || visibleQuickActions.length > 0) && (
            <div className="flex items-center gap-2">
              {actions}
              {visibleQuickActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More actions"
                      className="tap flex h-9 w-9 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {visibleQuickActions.map((a) => (
                      <DropdownMenuItem key={a.label} onClick={a.onClick} className="text-[13px]">
                        {a.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky tab bar - Fitts's Law (always reachable) + Von Restorff (active = 2px underline) */}
      <div className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors",
              activeTab === tab.id
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-5">{children}</div>

      {/* Peak-End - closure footer */}
      <footer className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {lastUpdated ?? "Synced just now"}
        </span>
        <span className="tabular">Reanzly · detail view</span>
      </footer>
    </div>
  );
}

/* ============================================================
   StatCard - compact metric tile used inside detail pages.
   UX laws:
   • Serial Position Effect - label/value/delta ordered so the
     most important glyph (value) is anchored.
   • Von Restorff Effect - clickable cards get a chevron +
     hover border so they stand out from static tiles.
   • Doherty Threshold - `loading` renders a skeleton so the
     layout never reflows; perceived < 400ms.
   • Aesthetic-Usability - tabular mono numerals, hairline
     border, `tap` feedback, no shadows.
   ============================================================ */

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  /** Monochrome sparkline points (raw numbers; auto-normalised). */
  spark?: number[];
  loading?: boolean;
  /** Optional small hint rendered below the value. */
  hint?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  onClick,
  spark,
  loading,
  hint,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2 rounded-[6px] border border-border bg-card p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="skeleton h-3 w-20 rounded-[2px]" />
          {icon && <div className="skeleton h-3.5 w-3.5 rounded-[2px]" />}
        </div>
        <div className="skeleton h-6 w-24 rounded-[2px]" />
        {spark && <div className="skeleton h-7 w-full rounded-[2px]" />}
      </div>
    );
  }

  const clickable = !!onClick;

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group flex flex-col gap-2 rounded-[6px] border border-border bg-card p-4 tap",
        clickable &&
          "cursor-pointer hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[24px] font-medium leading-none tracking-tight tabular text-foreground">
            {value}
          </span>
          {delta && (
            <span className={cn("text-[12px] tabular", deltaPositive ? "text-foreground" : "text-muted-foreground")}>
              {deltaPositive ? "↑" : "↓"} {delta}
            </span>
          )}
        </div>
        {clickable && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      {spark && spark.length > 1 && <Sparkline points={spark} className="-mb-1 h-7 w-full" />}
    </div>
  );
}

/* ============================================================
   InfoRow - a single label/value row inside an InfoSection.
   UX laws:
   • Law of Proximity - label + value share a row with a
     consistent gap; `divide-y` on the parent bonds rows.
   • Aesthetic-Usability - `mono` renders tabular numerals for
     IDs / amounts; `hint` adds a small muted sub-line.
   ============================================================ */

interface InfoRowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  /** Small muted text below the value (e.g. unit, context). */
  hint?: ReactNode;
}

export function InfoRow({ label, value, mono, hint }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className={cn("text-[13px] text-foreground", mono && "tabular")}>{value}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

/* ============================================================
   InfoSection - a labelled panel of InfoRows.
   Refactored to use SectionCard under the hood (Law of Common
   Region) so it gains `collapsible` + `action` (Tesler's Law)
   without breaking the existing call signature.
   ============================================================ */

interface InfoSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** Tesler's Law - let long detail pages collapse secondary sections. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function InfoSection({
  title,
  children,
  action,
  collapsible,
  defaultOpen = true,
  className,
}: InfoSectionProps) {
  return (
    <SectionCard
      title={title}
      action={action}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      className={className}
      flush
      bodyClassName="px-4 py-2 divide-y divide-border"
    >
      {children}
    </SectionCard>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppNavigation, useActiveModuleFromPath } from "@/lib/navigation/use-app-navigation";
import { useMigratedNavBack } from "@/lib/navigation/use-migrated-nav-back";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/* ============================================================
   PageHeader - every list/dashboard surface starts here.
   UX laws:
   • Peak-End Rule - a clean, confident header sets the tone
     for the whole screen; first impression matters.
   • Law of Proximity - breadcrumb, title, description, actions
     are chunked into a single region with consistent rhythm.
   • Aesthetic-Usability - hairline divider, tight tracking,
     staggered entrance so the eye lands on the title first.
   • Fitts's Law - back button is a 32px square, always top-left.
   ============================================================ */

interface MetaItem {
  label: string;
  value: ReactNode;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; module?: string }[];
  actions?: ReactNode;
  /** Inline metadata strip below description (e.g. "12 active · 3 overdue"). */
  meta?: MetaItem[];
  showBack?: boolean;
  className?: string;
  /** Right-aligned context slot (e.g. live status, filter summary). */
  context?: ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  meta,
  showBack,
  className,
  context,
}: PageHeaderProps) {
  const { module } = useActiveModuleFromPath();
  const { goToModule } = useAppNavigation();
  const navigateBack = useMigratedNavBack(module);

  return (
    <div className={cn("flex flex-col gap-3 border-b border-border pb-4 animate-slide-up", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumb.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator className="text-muted-foreground/50" />}
                <BreadcrumbItem>
                  {i === breadcrumb.length - 1 ? (
                    <BreadcrumbPage className="text-[12px] text-muted-foreground">{b.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      onClick={() => b.module && goToModule(b.module as never)}
                      className="cursor-pointer text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      {b.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {showBack && (
            <button
              onClick={navigateBack}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-100 tap"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-[16px] font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
            {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
            {meta && meta.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {meta.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.5px] text-muted-foreground">
                    <span>{m.label}</span>
                    <span className="font-medium text-foreground tabular">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {context}
          {actions}
        </div>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";

/**
 * Shared tab-strip shell for a "cluster" of related standalone modules that
 * used to each have their own top-level sidebar entry (cluttering the "More"
 * drawer with pages nobody could tell apart from one another). The sidebar
 * now only ever links to the cluster's home module (e.g. "Vehicles") - this
 * strip is how you move between the sibling pages instead.
 *
 * Deliberately does NOT touch any of the wrapped modules' internals: each
 * one keeps owning its own activeView.module value, its own detail/create
 * sub-routing, its own edit drawers - exactly as it did as a standalone
 * page. Clicking a tab is just the existing navigate(moduleId) call, so
 * every already-real, already-CRUD-wired module underneath keeps working
 * unmodified.
 */
export interface ClusterTab {
  id: ModuleId;
  label: string;
}

export function ModuleClusterTabs({
  tabs,
  active,
  children,
}: {
  tabs: ClusterTab[];
  active: ModuleId;
  children: React.ReactNode;
}) {
  const navigate = useAppStore((s) => s.navigate);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => navigate(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
                isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
            </button>
          );
        })}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

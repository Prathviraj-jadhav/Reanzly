"use client";

import { cn } from "@/lib/utils";
import type { ModuleId } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";

export interface AppClusterTab {
  id: ModuleId;
  label: string;
}

/** URL-authoritative cluster tab strip for migrated `/app/*` routes (B0R-8P). */
export function AppClusterTabs({
  tabs,
  active,
  children,
}: {
  tabs: AppClusterTab[];
  active: ModuleId;
  children: React.ReactNode;
}) {
  const { goToModule } = useAppNavigation();

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => goToModule(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
                isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
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

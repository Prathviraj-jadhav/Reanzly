"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";

/**
 * Rollback-only cluster tab strip (ModuleRouter / legacy SPA).
 * App Router cluster layouts use URL tabs directly.
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
  const legacyNavigate = useAppStore((s) => s.navigate);
  const { navigateCompat } = useNavigateCompat();

  const onTabClick = (moduleId: ModuleId) => {
    navigateCompat(moduleId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onTabClick(t.id)}
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

"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store/app-store";
import { pathToModule } from "./module-paths";
import { isModuleMigrated, isRoutingMigrationEnabled } from "./routing-config";

function currentAppPath(pathname: string, search: string): string {
  return search ? `${pathname}${search}` : pathname;
}

/**
 * Rollback-only: keeps Zustand `activeView` aligned with `/app/*` URL during
 * dual-write migration. **Disabled when `NEXT_PUBLIC_ROUTING_MIGRATION=1`**
 * (B0R-8P) — URL is authoritative; chrome derives state from pathname.
 */
export function useActiveViewSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = useAppStore((s) => s.activeView);
  const syncActiveView = useAppStore((s) => s.syncActiveView);
  const lastSyncedPath = useRef<string | null>(null);

  useEffect(() => {
    // B0R-8P: normal migrated nav does not read activeView for routing.
    if (isRoutingMigrationEnabled()) return;
    if (!pathname.startsWith("/app")) return;

    const search = searchParams.toString();
    const searchSuffix = search ? `?${search}` : "";
    const fullPath = currentAppPath(pathname, searchSuffix);

    const parsed = pathToModule(pathname, searchParams);
    if (!parsed || !isModuleMigrated(parsed.module)) return;

    if (lastSyncedPath.current === fullPath) return;

    const sameModule = activeView.module === parsed.module;
    const sameView = activeView.view === parsed.view;
    const sameId = (activeView.id ?? undefined) === parsed.id;
    const sameTab = (activeView.tab ?? undefined) === parsed.tab;
    if (sameModule && sameView && sameId && sameTab) {
      lastSyncedPath.current = fullPath;
      return;
    }

    syncActiveView(parsed.module, parsed.view, parsed.id, parsed.tab);
    lastSyncedPath.current = fullPath;
  }, [
    pathname,
    searchParams,
    activeView.module,
    activeView.view,
    activeView.id,
    activeView.tab,
    syncActiveView,
  ]);
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/app-store";
import { pathToModule } from "./module-paths";
import { isModuleMigrated } from "./routing-config";

/**
 * Keeps Zustand `activeView` aligned with the current `/app/*` URL for migrated
 * modules without triggering navigation loops.
 *
 * Dual-write contract (B0R-1):
 * - URL → Zustand: this hook (pathname change / refresh / back-forward)
 * - Zustand → URL: `useNavigateCompat()` (sidebar clicks)
 * - Loop guard: skip sync when `activeView` already matches parsed path
 */
export function useActiveViewSync() {
  const pathname = usePathname();
  const activeView = useAppStore((s) => s.activeView);
  const syncActiveView = useAppStore((s) => s.syncActiveView);
  const lastSyncedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/app")) return;

    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : undefined;
    const parsed = pathToModule(pathname, searchParams);
    if (!parsed || !isModuleMigrated(parsed.module)) return;

    if (lastSyncedPath.current === pathname) return;

    const sameModule = activeView.module === parsed.module;
    const sameView = activeView.view === parsed.view;
    const sameId = (activeView.id ?? undefined) === parsed.id;
    const sameTab = (activeView.tab ?? undefined) === parsed.tab;
    if (sameModule && sameView && sameId && sameTab) {
      lastSyncedPath.current = pathname;
      return;
    }

    syncActiveView(parsed.module, parsed.view, parsed.id, parsed.tab);
    lastSyncedPath.current = pathname;
  }, [
    pathname,
    activeView.module,
    activeView.view,
    activeView.id,
    activeView.tab,
    syncActiveView,
  ]);
}

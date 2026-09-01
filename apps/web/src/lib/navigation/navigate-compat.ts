"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore, type ModuleId, type ViewState } from "@/lib/store/app-store";
import { moduleToPath } from "./module-paths";
import { isModuleMigrated } from "./routing-config";

function currentAppPath(pathname: string, search: string): string {
  return search ? `${pathname}${search}` : pathname;
}

/**
 * Dual-write navigation adapter for incremental App Router migration.
 *
 * - Migrated modules: `router.push()` drives browser history; Zustand
 *   `activeView` is synced without the legacy 20-entry stack.
 * - Unmigrated modules: legacy `navigate()` only (SPA at `/dashboard`).
 */
export function useNavigateCompat() {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useAppStore((s) => s.navigate);
  const syncActiveView = useAppStore((s) => s.syncActiveView);
  const inFlightRef = useRef(false);

  const navigateCompat = useCallback(
    (
      module: ModuleId,
      view: ViewState["view"] = "list",
      id?: string,
      tab?: string,
    ) => {
      if (isModuleMigrated(module)) {
        const path = moduleToPath(module, view, id, tab);
        inFlightRef.current = true;
        syncActiveView(module, view, id, tab);
        const search =
          typeof window !== "undefined" ? window.location.search : "";
        if (currentAppPath(pathname, search) !== path) {
          router.push(path);
        }
        queueMicrotask(() => {
          inFlightRef.current = false;
        });
        return;
      }
      navigate(module, view, id, tab);
    },
    [navigate, pathname, router, syncActiveView],
  );

  const navigateDetailCompat = useCallback(
    (module: ModuleId, id: string, tab?: string) => {
      navigateCompat(module, "detail", id, tab);
    },
    [navigateCompat],
  );

  return { navigateCompat, navigateDetailCompat, isNavigatingFromCompat: () => inFlightRef.current };
}

/** Imperative helper for non-hook call sites (e.g. future header migration). */
export function navigateCompatStatic(
  module: ModuleId,
  view: ViewState["view"] = "list",
  id?: string,
  tab?: string,
): void {
  const store = useAppStore.getState();
  if (isModuleMigrated(module)) {
    const path = moduleToPath(module, view, id, tab);
    store.syncActiveView(module, view, id, tab);
    if (typeof window !== "undefined") {
      const current = currentAppPath(window.location.pathname, window.location.search);
      if (current !== path) {
        window.history.pushState(null, "", path);
      }
    }
    return;
  }
  store.navigate(module, view, id, tab);
}

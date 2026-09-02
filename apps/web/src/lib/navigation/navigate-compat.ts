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
 * Rollback-only dual-write navigation adapter (B0R-8P).
 * Used by legacy AppShell / ModuleRouter paths when `NEXT_PUBLIC_ROUTING_MIGRATION=0`.
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

/** Rollback-only module navigation for legacy SPA module components. */
export function useModuleNavigation() {
  const legacy = useAppStore();
  const { navigateCompat, navigateDetailCompat } = useNavigateCompat();
  return {
    navigate: (
      module: ModuleId,
      view: ViewState["view"] = "list",
      id?: string,
      tab?: string,
    ) => {
      if (isModuleMigrated(module)) return navigateCompat(module, view, id, tab);
      return legacy.navigate(module, view, id, tab);
    },
    navigateDetail: (module: ModuleId, id: string, tab?: string) => {
      if (isModuleMigrated(module)) return navigateDetailCompat(module, id, tab);
      return legacy.navigateDetail(module, id, tab);
    },
  };
}

/** Rollback-only imperative helper for demoEnter and legacy paths. */
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

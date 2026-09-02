"use client";

import { useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ModuleId, ViewState } from "@/lib/store/app-store";
import { moduleToPath, pathToModule } from "./module-paths";

function currentAppPath(pathname: string, search: string): string {
  return search ? `${pathname}${search}` : pathname;
}

/** Static URL builder for non-hook contexts (no navigation side effects). */
export function buildModulePath(
  module: ModuleId,
  view: ViewState["view"] = "list",
  id?: string,
  tab?: string,
): string {
  return moduleToPath(module, view, id, tab);
}

/**
 * Imperative navigation for non-hook contexts when routing migration is ON.
 * Prefer `useAppNavigation()` in React components.
 */
export function pushModulePath(
  module: ModuleId,
  view: ViewState["view"] = "list",
  id?: string,
  tab?: string,
): void {
  const path = moduleToPath(module, view, id, tab);
  if (typeof window === "undefined") return;
  const current = currentAppPath(window.location.pathname, window.location.search);
  if (current !== path) {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

/**
 * Canonical URL navigation for migrated App Router surfaces (B0R-8P).
 * Uses `router.push(moduleToPath(...))` only — no Zustand routing mutation.
 */
export function useAppNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const inFlightRef = useRef(false);

  const push = useCallback(
    (
      module: ModuleId,
      view: ViewState["view"] = "list",
      id?: string,
      tab?: string,
    ) => {
      const path = moduleToPath(module, view, id, tab);
      inFlightRef.current = true;
      const search = typeof window !== "undefined" ? window.location.search : "";
      if (currentAppPath(pathname, search) !== path) {
        router.push(path);
      }
      queueMicrotask(() => {
        inFlightRef.current = false;
      });
    },
    [pathname, router],
  );

  const goToModule = useCallback(
    (
      module: ModuleId,
      view: ViewState["view"] = "list",
      id?: string,
      tab?: string,
    ) => push(module, view, id, tab),
    [push],
  );

  const goToDetail = useCallback(
    (module: ModuleId, id: string, tab?: string) => push(module, "detail", id, tab),
    [push],
  );

  const goToCreate = useCallback(
    (module: ModuleId, tab?: string) => push(module, "create", undefined, tab),
    [push],
  );

  const goToTab = useCallback(
    (module: ModuleId, tab: string) => push(module, "list", undefined, tab),
    [push],
  );

  const goBack = useCallback(
    (module: ModuleId) => push(module, "list"),
    [push],
  );

  return {
    goToModule,
    goToDetail,
    goToCreate,
    goToTab,
    goBack,
    push,
    isNavigating: () => inFlightRef.current,
  };
}

/** Derive active module highlight from URL (B0R-8P — pathname authoritative). */
export function useActiveModuleFromPath(): { module: ModuleId; id?: string } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(() => {
    const parsed = pathToModule(pathname, searchParams);
    if (parsed) return { module: parsed.module, id: parsed.id };
    return { module: "dashboard" as ModuleId };
  }, [pathname, searchParams]);
}

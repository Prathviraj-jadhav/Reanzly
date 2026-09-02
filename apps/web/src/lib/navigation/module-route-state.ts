import type { ModuleId, ViewState } from "@/lib/store/app-store";

/** Route-derived state passed from App Router page wrappers to module components. */
export interface ModuleRouteState {
  module: ModuleId;
  view: ViewState["view"];
  id?: string;
  tab?: string;
}

/**
 * @deprecated B0R-8P — App Router pages pass explicit `route` props.
 * Rollback-only: use `legacyResolveModuleView` from `legacy-module-route.ts`.
 */
export function resolveModuleView(
  route: ModuleRouteState | undefined,
  activeView: ViewState,
  module: ModuleId,
): ModuleRouteState {
  if (route) return route;
  if (activeView.module === module) {
    return {
      module,
      view: activeView.view,
      id: activeView.id,
      tab: activeView.tab,
    };
  }
  return { module, view: "list" };
}

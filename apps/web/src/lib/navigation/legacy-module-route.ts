import type { ModuleId, ViewState } from "@/lib/store/app-store";
import type { ModuleRouteState } from "./module-route-state";

/** Legacy SPA adapter: derive route state from Zustand activeView (ModuleRouter only). */
export function legacyRouteFromActiveView(activeView: ViewState): ModuleRouteState {
  return {
    module: activeView.module,
    view: activeView.view,
    id: activeView.id,
    tab: activeView.tab,
  };
}

/** Resolve route for a specific module inside ModuleRouter (rollback path only). */
export function legacyResolveModuleView(
  activeView: ViewState,
  module: ModuleId,
): ModuleRouteState {
  if (activeView.module === module) {
    return legacyRouteFromActiveView(activeView);
  }
  return { module, view: "list" };
}

import type { ModuleId } from "@/lib/store/app-store";

/** Canonical authenticated ERP URL prefix (B0R-1). */
export const APP_ROUTE_PREFIX = "/app";

/** Dashboard list route — first migrated module surface. */
export const DASHBOARD_ROUTE = `${APP_ROUTE_PREFIX}/dashboard`;

/**
 * True when incremental App Router migration is enabled for this build.
 * Set `NEXT_PUBLIC_ROUTING_MIGRATION=1` in the environment.
 */
export function isRoutingMigrationEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ROUTING_MIGRATION;
  return flag === "1" || flag === "true";
}

/**
 * Modules that route through Next.js App Router segments (dual-write with Zustand).
 * B0R-1: dashboard. B0R-2: core operations (trips, fleet-map, vehicles, pod, lorry-receipts).
 */
export const MIGRATED_MODULES: ReadonlySet<ModuleId> = new Set([
  "dashboard",
  "trips",
  "fleet-map",
  "vehicles",
  "pod",
  "lorry-receipts",
]);

export function isModuleMigrated(module: ModuleId): boolean {
  return isRoutingMigrationEnabled() && MIGRATED_MODULES.has(module);
}

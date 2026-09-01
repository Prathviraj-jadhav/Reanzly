import { redirect } from "next/navigation";
import { isRoutingMigrationEnabled, DASHBOARD_ROUTE } from "@/lib/navigation/routing-config";
import LegacyDashboardClient from "./legacy-client";

/**
 * Legacy SPA entry at `/dashboard`.
 *
 * When `NEXT_PUBLIC_ROUTING_MIGRATION=1`, redirects to `/app/dashboard` (307)
 * unless `?legacy=1` (cluster tabs opening unmigrated sibling modules).
 * When disabled, renders the full AppShell SPA (ModuleRouter + Zustand nav).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ legacy?: string }>;
}) {
  const params = await searchParams;
  if (isRoutingMigrationEnabled() && params.legacy !== "1") {
    redirect(DASHBOARD_ROUTE);
  }
  return <LegacyDashboardClient />;
}

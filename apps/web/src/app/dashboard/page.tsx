import { redirect } from "next/navigation";
import { isRoutingMigrationEnabled, DASHBOARD_ROUTE } from "@/lib/navigation/routing-config";
import LegacyDashboardClient from "./legacy-client";

/**
 * Legacy SPA entry at `/dashboard`.
 *
 * When `NEXT_PUBLIC_ROUTING_MIGRATION=1`, redirects to `/app/dashboard` (307).
 * When disabled, renders the full AppShell SPA (ModuleRouter + Zustand nav).
 */
export default function DashboardPage() {
  if (isRoutingMigrationEnabled()) {
    redirect(DASHBOARD_ROUTE);
  }
  return <LegacyDashboardClient />;
}

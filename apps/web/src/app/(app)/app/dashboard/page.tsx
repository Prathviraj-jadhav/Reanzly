"use client";

import { DashboardModule } from "@/components/modules/dashboard";
import { useModuleRouteGuard } from "@/lib/navigation/use-module-route-guard";
import { Loader2 } from "lucide-react";

/**
 * Migrated dashboard route — renders DashboardModule directly (not ModuleRouter).
 * activeView sync: module=dashboard, view=list via useActiveViewSync in layout.
 */
export default function AppDashboardPage() {
  const status = useModuleRouteGuard("dashboard");

  if (status === "checking" || status === "denied") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DashboardModule />;
}

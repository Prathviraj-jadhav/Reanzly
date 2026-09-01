"use client";

import { MaintenanceModule } from "@/components/modules/maintenance";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppMaintenancePage() {
  return (
    <ModulePageShell module="maintenance">
      <MaintenanceModule route={{ module: "maintenance", view: "list" }} />
    </ModulePageShell>
  );
}

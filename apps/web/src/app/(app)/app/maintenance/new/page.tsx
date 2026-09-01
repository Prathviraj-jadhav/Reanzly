"use client";

import { MaintenanceModule } from "@/components/modules/maintenance";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppMaintenanceCreatePage() {
  return (
    <ModulePageShell module="maintenance">
      <MaintenanceModule route={{ module: "maintenance", view: "create" }} />
    </ModulePageShell>
  );
}

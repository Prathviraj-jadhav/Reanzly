"use client";

import { VehiclesModule } from "@/components/modules/vehicles";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppVehiclesNewPage() {
  return (
    <ModulePageShell module="vehicles">
      <VehiclesModule route={{ module: "vehicles", view: "create" }} />
    </ModulePageShell>
  );
}

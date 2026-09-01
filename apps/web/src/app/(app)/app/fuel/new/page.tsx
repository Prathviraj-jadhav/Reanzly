"use client";

import { FuelEnergyModule } from "@/components/modules/fuel-energy";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppFuelCreatePage() {
  return (
    <ModulePageShell module="fuel-energy">
      <FuelEnergyModule route={{ module: "fuel-energy", view: "create" }} />
    </ModulePageShell>
  );
}

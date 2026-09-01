"use client";

import { FuelEnergyModule } from "@/components/modules/fuel-energy";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppFuelPage() {
  return (
    <ModulePageShell module="fuel-energy">
      <FuelEnergyModule route={{ module: "fuel-energy", view: "list" }} />
    </ModulePageShell>
  );
}

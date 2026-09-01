"use client";

import { use } from "react";
import { FuelEnergyModule } from "@/components/modules/fuel-energy";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppFuelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ModulePageShell module="fuel-energy">
      <FuelEnergyModule route={{ module: "fuel-energy", view: "detail", id }} />
    </ModulePageShell>
  );
}

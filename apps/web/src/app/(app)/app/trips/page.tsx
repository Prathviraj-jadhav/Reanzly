"use client";

import { TripsModule } from "@/components/modules/trips";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppTripsPage() {
  return (
    <ModulePageShell module="trips">
      <TripsModule route={{ module: "trips", view: "list" }} />
    </ModulePageShell>
  );
}

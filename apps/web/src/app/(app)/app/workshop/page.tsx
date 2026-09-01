"use client";

import { FleetClusterLayout } from "@/components/shared/fleet-cluster-layout";
import { WorkshopModule } from "@/components/modules/workshop";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppWorkshopPage() {
  return (
    <ModulePageShell module="workshop">
      <FleetClusterLayout>
        <WorkshopModule route={{ module: "workshop", view: "list" }} />
      </FleetClusterLayout>
    </ModulePageShell>
  );
}

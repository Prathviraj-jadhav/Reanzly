"use client";

import { InspectionModule } from "@/components/modules/inspection";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppInspectionPage() {
  return (
    <ModulePageShell module="inspection">
      <InspectionModule route={{ module: "inspection", view: "list" }} />
    </ModulePageShell>
  );
}

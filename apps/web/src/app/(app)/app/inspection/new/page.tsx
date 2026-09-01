"use client";

import { InspectionModule } from "@/components/modules/inspection";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppInspectionCreatePage() {
  return (
    <ModulePageShell module="inspection">
      <InspectionModule route={{ module: "inspection", view: "create" }} />
    </ModulePageShell>
  );
}

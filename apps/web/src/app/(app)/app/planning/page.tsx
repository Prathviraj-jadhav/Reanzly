"use client";

import { PlanningModule } from "@/components/modules/planning";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="planning">
      <PlanningModule route={{ module: "planning", view: "list", tab: "week" }} />
    </ModulePageShell>
  );
}

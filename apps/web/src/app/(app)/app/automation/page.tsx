"use client";

import { AutomationModule } from "@/components/modules/automation";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="automation">
      <AutomationModule />
    </ModulePageShell>
  );
}

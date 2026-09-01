"use client";

import { ReportsModule } from "@/components/modules/reports";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="reports">
      <ReportsModule route={{ module: "reports", view: "list", tab: "library" }} />
    </ModulePageShell>
  );
}

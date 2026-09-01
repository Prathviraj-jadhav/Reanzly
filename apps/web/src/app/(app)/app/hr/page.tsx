"use client";

import { HRModule } from "@/components/modules/hr";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="hr">
      <HRModule route={{ module: "hr", view: "list", tab: "overview" }} />
    </ModulePageShell>
  );
}

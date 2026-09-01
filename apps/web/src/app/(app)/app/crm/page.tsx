"use client";

import { CRMModule } from "@/components/modules/crm";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="crm">
      <CRMModule route={{ module: "crm", view: "list", tab: "pipeline" }} />
    </ModulePageShell>
  );
}

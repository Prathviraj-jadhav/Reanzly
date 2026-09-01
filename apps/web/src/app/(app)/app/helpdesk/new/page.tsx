"use client";

import { HelpdeskModule } from "@/components/modules/helpdesk";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="helpdesk">
      <HelpdeskModule route={{ module: "helpdesk", view: "create" }} />
    </ModulePageShell>
  );
}

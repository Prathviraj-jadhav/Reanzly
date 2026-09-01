"use client";

import { VendorsModule } from "@/components/modules/vendors";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="vendors">
      <VendorsModule route={{ module: "vendors", view: "list" }} />
    </ModulePageShell>
  );
}

"use client";

import { PayrollModule } from "@/components/modules/payroll";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="payroll">
      <PayrollModule route={{ module: "payroll", view: "list", tab: "overview" }} />
    </ModulePageShell>
  );
}

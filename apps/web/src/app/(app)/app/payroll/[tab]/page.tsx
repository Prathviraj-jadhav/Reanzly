"use client";

import { use } from "react";
import { PayrollModule } from "@/components/modules/payroll";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="payroll">
      <PayrollModule route={{ module: "payroll", view: "list", tab }} />
    </ModulePageShell>
  );
}

"use client";

import { FinancialServicesModule } from "@/components/modules/financial-services";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="financial-services">
      <FinancialServicesModule />
    </ModulePageShell>
  );
}

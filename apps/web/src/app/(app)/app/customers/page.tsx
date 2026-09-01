"use client";

import { CustomersModule } from "@/components/modules/customers";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="customers">
      <CustomersModule route={{ module: "customers", view: "list" }} />
    </ModulePageShell>
  );
}

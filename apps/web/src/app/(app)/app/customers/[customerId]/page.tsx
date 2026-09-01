"use client";

import { use } from "react";
import { CustomersModule } from "@/components/modules/customers";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="customers">
      <CustomersModule route={{ module: "customers", view: "detail", id: p.customerId }} />
    </ModulePageShell>
  );
}

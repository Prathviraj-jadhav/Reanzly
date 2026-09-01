"use client";

import { use } from "react";
import { VendorsModule } from "@/components/modules/vendors";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ vendorId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="vendors">
      <VendorsModule route={{ module: "vendors", view: "detail", id: p.vendorId }} />
    </ModulePageShell>
  );
}

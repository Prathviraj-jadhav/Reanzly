"use client";

import { use } from "react";
import { CRMModule } from "@/components/modules/crm";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="crm">
      <CRMModule route={{ module: "crm", view: "list", tab }} />
    </ModulePageShell>
  );
}

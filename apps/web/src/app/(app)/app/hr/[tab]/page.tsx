"use client";

import { use } from "react";
import { HRModule } from "@/components/modules/hr";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="hr">
      <HRModule route={{ module: "hr", view: "list", tab }} />
    </ModulePageShell>
  );
}

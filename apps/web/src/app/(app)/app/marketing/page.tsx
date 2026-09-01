"use client";

import { MarketingModule } from "@/components/modules/marketing";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="marketing">
      <MarketingModule route={{ module: "marketing", view: "list" }} />
    </ModulePageShell>
  );
}

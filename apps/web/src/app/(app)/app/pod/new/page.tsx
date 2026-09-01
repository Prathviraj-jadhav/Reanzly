"use client";

import { PODModule } from "@/components/modules/pod";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppPodNewPage() {
  return (
    <ModulePageShell module="pod">
      <PODModule route={{ module: "pod", view: "create" }} />
    </ModulePageShell>
  );
}

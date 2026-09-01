"use client";

import { PODModule } from "@/components/modules/pod";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppPodPage() {
  return (
    <ModulePageShell module="pod">
      <PODModule route={{ module: "pod", view: "list" }} />
    </ModulePageShell>
  );
}

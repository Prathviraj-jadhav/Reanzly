"use client";

import { SystemDesignModule } from "@/components/modules/system-design";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="system-design">
      <SystemDesignModule />
    </ModulePageShell>
  );
}

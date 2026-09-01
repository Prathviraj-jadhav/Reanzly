"use client";

import { PartnerProgrammeModule } from "@/components/modules/partner-programme";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="partner-programme">
      <PartnerProgrammeModule />
    </ModulePageShell>
  );
}

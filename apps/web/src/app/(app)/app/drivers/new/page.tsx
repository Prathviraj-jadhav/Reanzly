"use client";

import { DriversStaffModule } from "@/components/modules/drivers-staff";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="drivers-staff">
      <DriversStaffModule route={{ module: "drivers-staff", view: "create" }} />
    </ModulePageShell>
  );
}

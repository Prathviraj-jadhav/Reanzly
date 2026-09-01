"use client";

import { use } from "react";
import { DriversStaffModule } from "@/components/modules/drivers-staff";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ driverId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="drivers-staff">
      <DriversStaffModule route={{ module: "drivers-staff", view: "detail", id: p.driverId }} />
    </ModulePageShell>
  );
}

"use client";

import { Suspense } from "react";
import { FleetMapModule } from "@/components/modules/fleet-map";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";
import { Loader2 } from "lucide-react";

export default function AppFleetMapPage() {
  return (
    <ModulePageShell module="fleet-map">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <FleetMapModule />
      </Suspense>
    </ModulePageShell>
  );
}

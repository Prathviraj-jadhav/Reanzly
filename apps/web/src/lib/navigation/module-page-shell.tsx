"use client";

import { Loader2 } from "lucide-react";
import type { ModuleId } from "@/lib/store/app-store";
import { useModuleRouteGuard } from "./use-module-route-guard";

/** Shared loading / permission gate for migrated App Router module pages. */
export function ModulePageShell({
  module,
  children,
}: {
  module: ModuleId;
  children: React.ReactNode;
}) {
  const status = useModuleRouteGuard(module);

  if (status === "checking" || status === "denied") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { moduleToPath } from "./module-paths";
import { isRoutingMigrationEnabled } from "./routing-config";

/**
 * Back navigation for detail screens: migrated modules use the list route;
 * legacy SPA uses store navigateBack() when migration flag is OFF.
 */
export function useMigratedNavBack(module: ModuleId) {
  const router = useRouter();
  const navigateBack = useAppStore((s) => s.navigateBack);

  return useCallback(() => {
    if (isRoutingMigrationEnabled()) {
      router.push(moduleToPath(module));
      return;
    }
    navigateBack();
  }, [module, navigateBack, router]);
}

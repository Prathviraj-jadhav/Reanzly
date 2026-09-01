"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { moduleToPath } from "./module-paths";
import { isModuleMigrated } from "./routing-config";

/**
 * Back navigation for detail screens: migrated modules use the list route
 * (browser-history friendly); unmigrated modules keep legacy navigateBack().
 */
export function useMigratedNavBack(module: ModuleId) {
  const router = useRouter();
  const navigateBack = useAppStore((s) => s.navigateBack);

  return useCallback(() => {
    if (isModuleMigrated(module)) {
      router.push(moduleToPath(module));
      return;
    }
    navigateBack();
  }, [module, navigateBack, router]);
}

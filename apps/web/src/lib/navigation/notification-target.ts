import type { ModuleId } from "@/lib/store/app-store";
import { moduleToPath } from "./module-paths";
import { isModuleMigrated } from "./routing-config";

/** Map notification `link` payloads to App Router paths for migrated modules. */
export function notificationTargetToPath(link: {
  module: string;
  id?: string;
}): string | null {
  const mod = link.module as ModuleId;
  if (!isModuleMigrated(mod)) return null;
  if (link.id) return moduleToPath(mod, "detail", link.id);
  return moduleToPath(mod);
}

import { redirect } from "next/navigation";
import { MODULE_BASE_PATH } from "@/lib/navigation/module-paths";

/** Legacy `app-store` module id → integrations (B0R-6). */
export default function AppStoreAliasPage() {
  redirect(MODULE_BASE_PATH.integrations);
}

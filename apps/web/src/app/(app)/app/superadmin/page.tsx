import { redirect } from "next/navigation";
import { isRoutingMigrationEnabled } from "@/lib/navigation/routing-config";
import { ADMIN_BASE_PATH } from "@/lib/navigation/portal-paths";

/** Legacy in-app superadmin module URL → canonical admin portal (B0R-7). */
export default function SuperadminLegacyRedirect() {
  if (isRoutingMigrationEnabled()) {
    redirect(ADMIN_BASE_PATH);
  }
  redirect("/dashboard?legacy=1");
}

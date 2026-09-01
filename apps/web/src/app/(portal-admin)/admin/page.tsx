"use client";

import { SuperAdminShell } from "@/components/layout/superadmin-shell";
import { ADMIN_DEFAULT_VIEW } from "@/lib/navigation/portal-paths";
import { useAdminPortalNavigation } from "@/lib/navigation/use-portal-navigation";

export default function AdminPortalPage() {
  const nav = useAdminPortalNavigation(ADMIN_DEFAULT_VIEW);
  return <SuperAdminShell {...nav} />;
}

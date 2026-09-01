"use client";

import { use } from "react";
import { SuperAdminShell } from "@/components/layout/superadmin-shell";
import {
  ADMIN_DEFAULT_VIEW,
  isValidAdminView,
  type AdminView,
} from "@/lib/navigation/portal-paths";
import { useAdminPortalNavigation } from "@/lib/navigation/use-portal-navigation";

export default function AdminPortalViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = use(params);
  const resolvedView: AdminView = isValidAdminView(view) ? view : ADMIN_DEFAULT_VIEW;
  const nav = useAdminPortalNavigation(resolvedView);

  if (!isValidAdminView(view)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-[13px] text-muted-foreground">
        Unknown admin view.
      </div>
    );
  }

  return <SuperAdminShell {...nav} />;
}

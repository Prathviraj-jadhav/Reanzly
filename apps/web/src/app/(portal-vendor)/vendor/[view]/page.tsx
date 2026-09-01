"use client";

import { use } from "react";
import { VendorShell } from "@/components/layout/vendor-shell";
import {
  VENDOR_DEFAULT_VIEW,
  isValidVendorView,
  type VendorView,
} from "@/lib/navigation/portal-paths";
import { useVendorPortalNavigation } from "@/lib/navigation/use-portal-navigation";

export default function VendorPortalViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = use(params);
  const resolvedView: VendorView = isValidVendorView(view) ? view : VENDOR_DEFAULT_VIEW;
  const nav = useVendorPortalNavigation(resolvedView);

  if (!isValidVendorView(view)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-[13px] text-muted-foreground">
        Unknown vendor portal view.
      </div>
    );
  }

  return <VendorShell {...nav} />;
}

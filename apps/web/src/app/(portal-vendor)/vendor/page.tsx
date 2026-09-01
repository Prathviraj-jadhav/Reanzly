"use client";

import { VendorShell } from "@/components/layout/vendor-shell";
import { VENDOR_DEFAULT_VIEW } from "@/lib/navigation/portal-paths";
import { useVendorPortalNavigation } from "@/lib/navigation/use-portal-navigation";

export default function VendorPortalPage() {
  const nav = useVendorPortalNavigation(VENDOR_DEFAULT_VIEW);
  return <VendorShell {...nav} />;
}

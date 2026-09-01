import type { Metadata } from "next";
import { PortalRouteShell } from "@/components/layout/portal-route-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalRouteShell kind="vendor">{children}</PortalRouteShell>;
}

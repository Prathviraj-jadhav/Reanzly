import type { Metadata } from "next";
import { PortalRouteShell } from "@/components/layout/portal-route-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WarehouseFieldLayout({ children }: { children: React.ReactNode }) {
  return <PortalRouteShell kind="warehouse">{children}</PortalRouteShell>;
}

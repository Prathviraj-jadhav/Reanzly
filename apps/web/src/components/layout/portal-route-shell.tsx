"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store/app-store";
import { buildLoginUrl } from "@/lib/navigation/return-to";
import {
  canAccessPortalKind,
  getPortalLandingRoute,
  type PortalRouteKind,
} from "@/lib/navigation/portal-landing";

/**
 * Auth + portal-role gate for migrated portal App Router segments (B0R-7).
 * Fastify session is re-validated client-side; API remains security authority.
 */
export function PortalRouteShell({
  kind,
  children,
}: {
  kind: PortalRouteKind;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, portal, currentRole, restoreSession } = useAppStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let active = true;
    void restoreSession().finally(() => {
      if (active) setSessionChecked(true);
    });
    return () => {
      active = false;
    };
  }, [restoreSession]);

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!hydrated || !sessionChecked) return;
    if (!isAuthenticated) {
      router.replace(buildLoginUrl(pathname));
      return;
    }

    if (!canAccessPortalKind(kind, portal, currentRole.id)) {
      toast.error("Your role does not have access to this portal.");
      router.replace(getPortalLandingRoute(portal, currentRole.id));
    }
  }, [
    hydrated,
    sessionChecked,
    isAuthenticated,
    kind,
    portal,
    currentRole.id,
    pathname,
    router,
  ]);

  if (!hydrated || !sessionChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[12px] font-bold text-background">
            RZ
          </span>
          <span className="text-[14px] font-semibold tracking-tight">Reanzly</span>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!canAccessPortalKind(kind, portal, currentRole.id)) return null;

  return <>{children}</>;
}

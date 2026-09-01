"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { AppDesktopShell } from "./app-desktop-shell";
import { useActiveViewSync } from "@/lib/navigation/use-active-view-sync";
import { buildLoginUrl } from "@/lib/navigation/return-to";
import { usePathname } from "next/navigation";

function ActiveViewSyncBridge() {
  useActiveViewSync();
  return null;
}

/**
 * Client layout gate for `/app/*`.
 *
 * Auth: middleware checks session cookie; this wrapper re-validates via
 * `restoreSession()` → Fastify `/v1/auth/me` (no JWT decode in Next.js).
 *
 * Portal gating (B0R-1): only the regular tenant desktop shell renders here.
 * Driver, warehouse-crew, vendor, broker, and superadmin portals keep their
 * dedicated shells at legacy `/dashboard` until B0R-7 migrates portal routes.
 */
export function AppRouteShell({ children }: { children: React.ReactNode }) {
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

    const nonAppPortal =
      portal === "superadmin" ||
      portal === "broker" ||
      portal === "vendor" ||
      portal === "driver" ||
      currentRole.id === "driver" ||
      currentRole.id === "warehouse-crew";

    if (nonAppPortal) {
      router.replace("/dashboard");
    }
  }, [hydrated, sessionChecked, isAuthenticated, portal, currentRole.id, pathname, router]);

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

  if (
    portal === "superadmin" ||
    portal === "broker" ||
    portal === "vendor" ||
    portal === "driver" ||
    currentRole.id === "driver" ||
    currentRole.id === "warehouse-crew"
  ) {
    return null;
  }

  return (
    <>
      <Suspense fallback={null}>
        <ActiveViewSyncBridge />
      </Suspense>
      <AppDesktopShell>{children}</AppDesktopShell>
    </>
  );
}

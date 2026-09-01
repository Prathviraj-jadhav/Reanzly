"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { hasModuleAccess, moduleAccessDeniedMessage } from "@reanzly/shared";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { DASHBOARD_ROUTE } from "./routing-config";

export type ModuleRouteGuardStatus = "checking" | "allowed" | "denied";

/**
 * Client-side module permission gate (UX only — Fastify remains authority).
 * Unauthorized users are redirected to dashboard with a toast.
 */
export function useModuleRouteGuard(moduleId: ModuleId): ModuleRouteGuardStatus {
  const router = useRouter();
  const currentRole = useAppStore((s) => s.currentRole);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const deniedRef = useRef(false);

  const allowed =
    isAuthenticated && hasModuleAccess(currentRole.id, moduleId);

  useEffect(() => {
    if (!isAuthenticated || allowed || deniedRef.current) return;
    deniedRef.current = true;
    toast.error(moduleAccessDeniedMessage());
    router.replace(DASHBOARD_ROUTE);
  }, [allowed, currentRole.id, isAuthenticated, moduleId, router]);

  if (!isAuthenticated) return "checking";
  if (!allowed) return "denied";
  return "allowed";
}

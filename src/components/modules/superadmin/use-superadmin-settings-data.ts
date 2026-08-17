"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Gateway } from "./_data";

/**
 * Fetches + owns feature flags and email/SMS gateways from
 * /api/superadmin/feature-flags and /api/superadmin/gateways, replacing
 * the old useSuperadminStore mock slice for Settings.
 */
export function useSuperadminSettingsData() {
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [flagsRes, gatewaysRes] = await Promise.all([
        fetch("/api/superadmin/feature-flags"),
        fetch("/api/superadmin/gateways"),
      ]);
      const flagsJson = flagsRes.ok ? await flagsRes.json() : { flags: {} };
      const gatewaysJson = gatewaysRes.ok ? await gatewaysRes.json() : { gateways: [] };
      setFeatureFlags(flagsJson.flags ?? {});
      setGateways(gatewaysJson.gateways ?? []);
    } catch {
      toast.error("Could not load settings.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setFeatureFlag = useCallback(async (moduleId: string, enabled: boolean, actor?: string) => {
    setFeatureFlags((prev) => ({ ...prev, [moduleId]: enabled }));
    const res = await fetch("/api/superadmin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, enabled, actor }),
    });
    if (!res.ok) {
      setFeatureFlags((prev) => ({ ...prev, [moduleId]: !enabled }));
      toast.error("Could not update feature flag.");
    }
  }, []);

  const updateGateway = useCallback(async (id: "email" | "sms", patch: Partial<Gateway>, actor?: string) => {
    const res = await fetch("/api/superadmin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch, actor }),
    });
    if (!res.ok) {
      toast.error("Could not update gateway.");
      return;
    }
    const { gateway } = await res.json();
    setGateways((prev) => prev.map((g) => (g.id === id ? gateway : g)));
  }, []);

  const testGateway = useCallback(async (id: "email" | "sms", actor?: string) => {
    const res = await fetch("/api/superadmin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "test", actor }),
    });
    if (!res.ok) return null;
    const { gateway } = await res.json();
    setGateways((prev) => prev.map((g) => (g.id === id ? gateway : g)));
    return gateway as Gateway;
  }, []);

  return { featureFlags, gateways, loaded, reload, setFeatureFlag, updateGateway, testGateway };
}

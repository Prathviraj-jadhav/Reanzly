"use client";

import { useEffect, useState, useCallback } from "react";

// Shared real-data hook backing every "Recent Activity"/"Audit Trail"
// widget (HR overview, Compliance audit tab, Settings > Access & Security)
// off the single real /api/audit-log endpoint, replacing each module's own
// hand-rolled fake actor data.

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  timestamp: string;
}

export function useAuditLog(entities?: string[], limit = 50) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const entityKey = entities?.join(",") ?? "";

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityKey) entityKey.split(",").forEach((e) => params.append("entity", e));
    params.set("limit", String(limit));
    try {
      const res = await fetch(`/api/audit-log?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [entityKey, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "./_data";

/**
 * Fetches the real platform-level audit log from
 * /api/superadmin/audit-log, replacing the old useSuperadminStore mock
 * `auditLog` slice. Read-only (this log is meant to be immutable), so the
 * hook only exposes entries + reload.
 */
export function useSuperadminAuditData() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/audit-log");
      const json = res.ok ? await res.json() : { auditLog: [] };
      setAuditLog(json.auditLog ?? []);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { auditLog, loaded, reload };
}

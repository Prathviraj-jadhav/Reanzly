"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { GSTReturn, GSTReconLine, ReconStatus } from "@/components/modules/ledger/_tally-data";

/**
 * Fetches + owns GST Returns' real state (GSTR-1/3B/2B + reconciliation
 * lines) from /api/ledger/gst/*, replacing the old useLedgerTallyStore
 * slice. Same shapes and action signatures, so gst-returns.tsx needs only
 * swap its hook, not its rendering logic.
 */
export function useGstData() {
  const [gstReturns, setGstReturns] = useState<GSTReturn[]>([]);
  const [reconLines, setReconLines] = useState<GSTReconLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [returnsRes, reconRes] = await Promise.all([
        fetch("/api/ledger/gst/returns"),
        fetch("/api/ledger/gst/recon"),
      ]);
      const returnsJson = returnsRes.ok ? await returnsRes.json() : { returns: [] };
      const reconJson = reconRes.ok ? await reconRes.json() : { lines: [] };
      setGstReturns(returnsJson.returns ?? []);
      setReconLines(reconJson.lines ?? []);
    } catch {
      toast.error("Could not load GST data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateGstReturn = useCallback(async (id: string, patch: Partial<GSTReturn>) => {
    const res = await fetch(`/api/ledger/gst/returns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Could not update return.");
      return;
    }
    const { return: updated } = await res.json();
    setGstReturns((prev) => prev.map((g) => (g.id === id ? updated : g)));
  }, []);

  const setReconStatus = useCallback(async (id: string, status: ReconStatus, reason?: string) => {
    const res = await fetch(`/api/ledger/gst/recon/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
      toast.error("Could not update reconciliation line.");
      return;
    }
    const { line } = await res.json();
    setReconLines((prev) => prev.map((l) => (l.id === id ? line : l)));
  }, []);

  return { gstReturns, reconLines, loaded, reload, updateGstReturn, setReconStatus };
}

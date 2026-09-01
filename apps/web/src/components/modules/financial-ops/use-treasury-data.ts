"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { FinOpsVoucher } from "@/lib/store/financial-ops-store";

/**
 * Fetches + owns Treasury Ops' real state (all 7 voucher types) from
 * /api/treasury/vouchers, replacing the old localStorage-only
 * financial-ops-store.ts. Same FinOpsVoucher shape, so consumers
 * (VoucherForm, treasury-ops.tsx) need only swap their hook, not their
 * rendering logic.
 */
export function useTreasuryData() {
  const [vouchers, setVouchers] = useState<FinOpsVoucher[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/treasury/vouchers");
      const json = res.ok ? await res.json() : { vouchers: [] };
      setVouchers(json.vouchers ?? []);
    } catch {
      toast.error("Could not load Treasury Ops data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addVoucher = useCallback(async (v: Omit<FinOpsVoucher, "id" | "number" | "createdAt" | "updatedAt">) => {
    const res = await fetch("/api/treasury/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create voucher.");
      return "";
    }
    const { voucher } = await res.json();
    setVouchers((prev) => [voucher, ...prev]);
    return voucher.id as string;
  }, []);

  const updateVoucher = useCallback(async (id: string, patch: Partial<FinOpsVoucher>) => {
    const res = await fetch(`/api/treasury/vouchers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Could not update voucher.");
      return;
    }
    const { voucher } = await res.json();
    setVouchers((prev) => prev.map((v) => (v.id === id ? voucher : v)));
  }, []);

  const removeVoucher = useCallback(async (id: string) => {
    const res = await fetch(`/api/treasury/vouchers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove voucher.");
      return;
    }
    setVouchers((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const setVoucherStatus = useCallback(
    (id: string, status: FinOpsVoucher["status"]) => updateVoucher(id, { status }),
    [updateVoucher],
  );

  return { vouchers, loaded, reload, addVoucher, updateVoucher, removeVoucher, setVoucherStatus };
}

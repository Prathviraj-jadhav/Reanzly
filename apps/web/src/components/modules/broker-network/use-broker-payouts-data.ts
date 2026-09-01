"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { SettlementCycleType } from "./_helpers";

export interface NachMandateDTO {
  id: string;
  mandateId: string;
  party: string;
  partyType: "Sub-Broker" | "Customer" | "Reanzly";
  bank: string;
  accountLast4: string;
  amountINR: number;
  frequency: "Weekly" | "Fortnightly" | "Monthly" | "One-time";
  status: "Active" | "Pending" | "Suspended";
  createdOn: string;
  nextDebit?: string;
}

export interface PayoutRecipientDTO {
  id: string;
  name: string;
  amountINR: number;
  status: "Draft" | "Processing" | "Completed" | "Failed";
  utr?: string;
}

export interface PayoutRunDTO {
  id: string;
  runNo: string;
  date: string;
  cycle: SettlementCycleType;
  totalAmountINR: number;
  recipientsCount: number;
  status: "Draft" | "Processing" | "Completed" | "Failed";
  bankRef?: string;
  completedAt?: string;
  recipients: PayoutRecipientDTO[];
}

export function useBrokerPayoutsData() {
  const [mandates, setMandates] = useState<NachMandateDTO[]>([]);
  const [payoutRuns, setPayoutRuns] = useState<PayoutRunDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch("/api/broker/mandates"),
        fetch("/api/broker/payouts"),
      ]);
      setMandates(mRes.ok ? await mRes.json() : []);
      setPayoutRuns(pRes.ok ? await pRes.json() : []);
    } catch {
      toast.error("Could not load payouts data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addMandate = useCallback(async (input: Partial<NachMandateDTO>) => {
    const res = await fetch("/api/broker/mandates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not create NACH mandate.", { description: body.error });
      return null;
    }
    setMandates((prev) => [body, ...prev]);
    return body as NachMandateDTO;
  }, []);

  const addPayoutRun = useCallback(async (input: Partial<PayoutRunDTO>) => {
    const res = await fetch("/api/broker/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not start payout run.", { description: body.error });
      return null;
    }
    setPayoutRuns((prev) => [body, ...prev]);
    return body as PayoutRunDTO;
  }, []);

  const updatePayoutRun = useCallback(async (id: string, patch: Partial<PayoutRunDTO>) => {
    const res = await fetch(`/api/broker/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not update payout run.", { description: body.error });
      return false;
    }
    setPayoutRuns((prev) => prev.map((s) => (s.id === id ? body : s)));
    return true;
  }, []);

  return { mandates, payoutRuns, loaded, reload, addMandate, addPayoutRun, updatePayoutRun };
}

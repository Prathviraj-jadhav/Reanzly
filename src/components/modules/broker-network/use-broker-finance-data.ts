"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface LedgerEntryDTO {
  id: string;
  entryId: string;
  date: string;
  type: "Credit" | "Debit";
  description: string;
  refId: string;
  amountINR: number;
  runningBalanceINR: number;
}

export interface SettlementCycleDTO {
  id: string;
  cycleId: string;
  periodStart: string;
  periodEnd: string;
  grossTrips: number;
  grossValueINR: number;
  commissionPct: number;
  commissionEarnedINR: number;
  tdsPct: number;
  tdsDeductedINR: number;
  gstTreatment: "Forward Charge" | "Reverse Charge";
  netPayableINR: number;
  status: "Draft" | "Approved" | "Paid";
}

export interface BankDetailsDTO {
  bankName: string | null;
  bankBranch: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  nachUmr: string | null;
  nextPayoutDate: string | null;
  nextPayoutAmount: number;
  brokerCode: string;
  companyName: string;
}

/**
 * Fetches + owns real ledger entries, settlement cycles, and bank details
 * from /api/broker/{ledger,settlements,bank-details} - all pre-existing,
 * working, session-scoped routes that had no frontend consumer. Shared by
 * broker-ledger.tsx, broker-settlements.tsx, and broker-bank-details.tsx
 * since their KPI strips all derive from the same underlying data.
 */
export function useBrokerFinanceData() {
  const [ledger, setLedger] = useState<LedgerEntryDTO[]>([]);
  const [settlements, setSettlements] = useState<SettlementCycleDTO[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetailsDTO | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [ledgerRes, settlementsRes, bankRes] = await Promise.all([
        fetch("/api/broker/ledger"),
        fetch("/api/broker/settlements"),
        fetch("/api/broker/bank-details"),
      ]);
      setLedger(ledgerRes.ok ? await ledgerRes.json() : []);
      setSettlements(settlementsRes.ok ? await settlementsRes.json() : []);
      const bankJson = bankRes.ok ? await bankRes.json() : {};
      setBankDetails(bankJson?.brokerCode ? bankJson : null);
    } catch {
      toast.error("Could not load broker finance data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSettlement = useCallback(async (input: {
    periodStart: string; periodEnd: string; grossTrips: number; grossValueINR: number;
    commissionPct: number; tdsPct: number; gstTreatment: string;
  }) => {
    const res = await fetch("/api/broker/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not create settlement cycle.", { description: body.error });
      return null;
    }
    setSettlements((prev) => [body, ...prev]);
    return body as SettlementCycleDTO;
  }, []);

  const updateSettlementStatus = useCallback(async (id: string, status: "Draft" | "Approved" | "Paid") => {
    const res = await fetch(`/api/broker/settlements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not update settlement cycle.", { description: body.error });
      return false;
    }
    setSettlements((prev) => prev.map((s) => (s.id === id ? body : s)));
    // Approve/Pay both write a real ledger entry + touch bank details server-side.
    await reload();
    return true;
  }, [reload]);

  const updateBankDetails = useCallback(async (patch: Partial<BankDetailsDTO>) => {
    const res = await fetch("/api/broker/bank-details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not update bank details.", { description: body.error });
      return false;
    }
    setBankDetails(body);
    return true;
  }, []);

  return { ledger, settlements, bankDetails, loaded, reload, createSettlement, updateSettlementStatus, updateBankDetails };
}

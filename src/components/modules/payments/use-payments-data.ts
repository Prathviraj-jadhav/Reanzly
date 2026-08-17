"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Payment, VoucherType } from "@/lib/types";

type TreasuryVoucher = {
  id: string;
  type: string;
  number: string;
  party: string;
  amount: number;
  mode: string;
  date: string;
  status: string;
  against?: string;
  lrNumber?: string;
};

const VOUCHER_TYPES: VoucherType[] = [
  "Advance",
  "Add Money",
  "Withdrawal",
  "Movement",
  "Truck Forwarding",
  "Settlement",
  "Recovery",
];

function toVoucherType(type: string): VoucherType {
  if (type === "Recovery Voucher") return "Recovery";
  return (VOUCHER_TYPES as string[]).includes(type) ? (type as VoucherType) : "Advance";
}

function toPaymentStatus(status: string): Payment["status"] {
  if (status === "Approved") return "Approved";
  if (status === "Completed") return "Completed";
  return "Pending";
}

function toPayment(v: TreasuryVoucher): Payment {
  const against = v.against || "";
  const linkedInvoice = /inv/i.test(against) ? against : undefined;
  const linkedTrip = v.lrNumber || (/trp|lr[-_ ]/i.test(against) ? against : undefined);
  return {
    id: v.id,
    voucherType: toVoucherType(v.type),
    referenceNumber: v.number,
    date: v.date,
    party: v.party,
    amount: v.amount,
    mode: v.mode,
    status: toPaymentStatus(v.status),
    linkedInvoice,
    linkedTrip,
  };
}

function toTreasuryBody(p: Partial<Payment>) {
  const type = p.voucherType === "Recovery" ? "Recovery Voucher" : p.voucherType;
  const status =
    p.status === "Completed" || p.status === "Approved" ? "Approved" : p.status === "Pending" ? "Pending" : undefined;
  return {
    type,
    party: p.party,
    amount: p.amount,
    mode: p.mode,
    date: p.date,
    status,
    against: p.linkedInvoice || p.linkedTrip || undefined,
    lrNumber: p.linkedTrip,
  };
}

export function usePaymentsData() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/treasury/vouchers");
      const json = res.ok ? await res.json() : { vouchers: [] };
      setPayments((json.vouchers ?? []).map(toPayment));
    } catch {
      toast.error("Could not load payments.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addPayment = useCallback(async (p: Payment) => {
    const res = await fetch("/api/treasury/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toTreasuryBody(p)),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create voucher.");
      return "";
    }
    const { voucher } = await res.json();
    const mapped = toPayment(voucher);
    setPayments((prev) => [mapped, ...prev]);
    return mapped.id;
  }, []);

  const updatePayment = useCallback(async (id: string, data: Partial<Payment>) => {
    const res = await fetch(`/api/treasury/vouchers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toTreasuryBody(data)),
    });
    if (!res.ok) {
      toast.error("Could not update voucher.");
      return;
    }
    const { voucher } = await res.json();
    const mapped = toPayment(voucher);
    setPayments((prev) => prev.map((p) => (p.id === id ? mapped : p)));
  }, []);

  return { payments, loaded, reload, addPayment, updatePayment };
}

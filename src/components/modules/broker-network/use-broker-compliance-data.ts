"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface BrokerTaxReturnDTO {
  id: string;
  taxType: "GST" | "TDS";
  period: string;
  formType: string;
  filedDate?: string | null;
  dueDate?: string | null;
  ackNo?: string | null;
  liabilityINR: number;
  status: "Due" | "Filed" | "Overdue";
  deducteeCount?: number;
}

export interface BrokerLicenseDTO {
  id: string;
  licenseType: string;
  licenseNumber: string;
  issuedBy: string;
  issueDate?: string | null;
  expiresAt: string;
  status: "Valid" | "Expiring Soon" | "Expired";
}

export function useBrokerComplianceData() {
  const [taxReturns, setTaxReturns] = useState<BrokerTaxReturnDTO[]>([]);
  const [licenses, setLicenses] = useState<BrokerLicenseDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/compliance");
      const data = res.ok ? await res.json() : { taxReturns: [], licenses: [] };
      setTaxReturns(data.taxReturns || []);
      setLicenses(data.licenses || []);
    } catch {
      toast.error("Could not load broker compliance data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const fileTaxReturn = useCallback(async (id: string) => {
    const res = await fetch(`/api/broker/compliance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "file_tax" }),
    });
    if (!res.ok) {
      toast.error("Could not file return.");
      return false;
    }
    setTaxReturns((prev) => prev.map((r) => r.id === id ? { ...r, status: "Filed" } : r));
    return true;
  }, []);

  const renewLicense = useCallback(async (id: string) => {
    const res = await fetch(`/api/broker/compliance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "renew_license" }),
    });
    if (!res.ok) {
      toast.error("Could not renew license.");
      return false;
    }
    setLicenses((prev) => prev.map((l) => l.id === id ? { ...l, status: "Valid" } : l));
    return true;
  }, []);

  return { taxReturns, licenses, loaded, reload, fileTaxReturn, renewLicense };
}

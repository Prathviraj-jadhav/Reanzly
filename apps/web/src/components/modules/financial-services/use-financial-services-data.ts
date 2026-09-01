"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { FinancingProductType } from "./_helpers";

export interface EligibleInvoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  status: string;
  dueDate: string | null;
  totalAmount: number;
}

export interface FinancingEligibility {
  eligibleInvoices: EligibleInvoice[];
  eligibleOutstandingTotal: number;
  availableCreditLine: number;
  workingCapitalEligible: number;
  fuelCardEligible: number;
  avgProcessingHours: number | null;
}

export interface FinancingApplicationDTO {
  id: string;
  applicationNumber: string;
  productType: FinancingProductType;
  linkedInvoiceIds: string[];
  requestedAmount: number;
  tenureMonths: number;
  status: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_ELIGIBILITY: FinancingEligibility = {
  eligibleInvoices: [],
  eligibleOutstandingTotal: 0,
  availableCreditLine: 0,
  workingCapitalEligible: 0,
  fuelCardEligible: 0,
  avgProcessingHours: null,
};

/**
 * Fetches + owns the Financial Services module's real state (eligibility
 * math against real Invoice/Vehicle data, the applications ledger) and
 * exposes CRUD helpers against the real /api/financial-services/* routes.
 * Replaces what used to be client-computed mock eligibility plus a
 * localStorage-persisted Zustand store for applications.
 */
export function useFinancialServicesData() {
  const [eligibility, setEligibility] = useState<FinancingEligibility>(EMPTY_ELIGIBILITY);
  const [applications, setApplications] = useState<FinancingApplicationDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [eligRes, appsRes] = await Promise.all([
        fetch("/api/financial-services/eligibility"),
        fetch("/api/financial-services/applications"),
      ]);
      const eligJson = eligRes.ok ? await eligRes.json() : EMPTY_ELIGIBILITY;
      const appsJson = appsRes.ok ? await appsRes.json() : { applications: [] };
      setEligibility(eligJson);
      setApplications(appsJson.applications ?? []);
    } catch {
      toast.error("Could not load Financial Services data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const applyForFinancing = useCallback(async (payload: {
    productType: FinancingProductType;
    linkedInvoiceIds: string[];
    requestedAmount: number;
    tenureMonths: number;
    notes?: string;
  }): Promise<FinancingApplicationDTO | null> => {
    const res = await fetch("/api/financial-services/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not submit application.");
      return null;
    }
    const { application } = await res.json();
    setApplications((prev) => [application, ...prev]);
    return application;
  }, []);

  const withdrawApplication = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/financial-services/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw" }),
    });
    if (!res.ok) return false;
    const { application } = await res.json();
    setApplications((prev) => prev.map((a) => (a.id === id ? application : a)));
    return true;
  }, []);

  return { eligibility, applications, loaded, reload, applyForFinancing, withdrawApplication };
}

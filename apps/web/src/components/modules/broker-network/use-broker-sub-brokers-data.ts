"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface SubBrokerDTO {
  id: string;
  name: string;
  brokerCode: string;
  contactName: string;
  email: string;
  phone: string;
  markupPct: number;
  coverageLanes: string[];
  settlementCycle: "Weekly" | "Fortnightly" | "Monthly";
  gstTreatment: "Forward Charge" | "Reverse Charge";
  gstin: string | null;
  status: "Active" | "Pending" | "Suspended";
  settlementsDueINR: number;
  onboardedAt: string;
}

/**
 * Fetches + owns real sub-brokers from /api/broker/sub-brokers - a
 * pre-existing, working, session-scoped CRUD route with no frontend
 * consumer. Replaces the old SEED_SUB_BROKERS local-state array.
 */
export function useBrokerSubBrokersData() {
  const [subBrokers, setSubBrokers] = useState<SubBrokerDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/sub-brokers");
      setSubBrokers(res.ok ? await res.json() : []);
    } catch {
      toast.error("Could not load sub-brokers.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addSubBroker = useCallback(async (input: Partial<SubBrokerDTO>) => {
    const res = await fetch("/api/broker/sub-brokers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not onboard sub-broker.", { description: body.error });
      return null;
    }
    setSubBrokers((prev) => [body, ...prev]);
    return body as SubBrokerDTO;
  }, []);

  const updateSubBroker = useCallback(async (id: string, patch: Partial<SubBrokerDTO>) => {
    const res = await fetch(`/api/broker/sub-brokers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not update sub-broker.", { description: body.error });
      return false;
    }
    setSubBrokers((prev) => prev.map((s) => (s.id === id ? body : s)));
    return true;
  }, []);

  const removeSubBroker = useCallback(async (id: string) => {
    const res = await fetch(`/api/broker/sub-brokers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove sub-broker.");
      return false;
    }
    setSubBrokers((prev) => prev.filter((s) => s.id !== id));
    return true;
  }, []);

  return { subBrokers, loaded, reload, addSubBroker, updateSubBroker, removeSubBroker };
}

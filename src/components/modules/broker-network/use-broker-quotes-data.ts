"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface BrokerQuoteDTO {
  id: string;
  quoteId: string;
  loadId: string;
  lane: string;
  vehicleType: string;
  customer: string;
  quotedRatePerKm: number;
  baseRatePerKm: number;
  markupPct: number;
  status: "Pending" | "Accepted" | "Rejected" | "Expired";
  quotedAt: string;
  decidedAt?: string | null;
}

/**
 * Fetches + owns real broker quotes from /api/broker/quotes.
 * Replaces the old SEED_QUOTES + INITIAL_QUOTES local-state arrays.
 */
export function useBrokerQuotesData() {
  const [quotes, setQuotes] = useState<BrokerQuoteDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/quotes");
      setQuotes(res.ok ? await res.json() : []);
    } catch {
      toast.error("Could not load quotes.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateStatus = useCallback(async (id: string, status: BrokerQuoteDTO["status"]) => {
    const res = await fetch(`/api/broker/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not update quote.", { description: body.error });
      return null;
    }
    setQuotes((prev) => prev.map((q) => (q.id === id ? body : q)));
    return body as BrokerQuoteDTO;
  }, []);

  return { quotes, loaded, reload, updateStatus };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface EnquiryDTO {
  id: string;
  enquiryId: string;
  lane: string;
  vehicleType: string;
  weightTon: number;
  expectedRatePerKm: number;
  customer: string;
  pickupDate: string;
  status: "New" | "Quoted" | "Won" | "Lost";
  quotedRate: number | null;
  receivedAt: string;
  /** Optional UI fields when sourced from marketplace seed data */
  baseRatePerKm?: number;
  timeToQuoteHrs?: number;
  postedAt?: string;
  customerRating?: number;
}

/**
 * Fetches + owns real inbound enquiries from /api/broker/enquiries - a
 * pre-existing, working, session-scoped route with no frontend consumer.
 * Replaces the old SEED_ENQUIRIES local-state array.
 */
export function useBrokerEnquiriesData() {
  const [enquiries, setEnquiries] = useState<EnquiryDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/enquiries");
      setEnquiries(res.ok ? await res.json() : []);
    } catch {
      toast.error("Could not load enquiries.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const quoteEnquiry = useCallback(async (id: string, quotedRate: number) => {
    const res = await fetch(`/api/broker/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Quoted", quotedRate }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not send quote.", { description: body.error });
      return null;
    }
    setEnquiries((prev) => prev.map((e) => (e.id === id ? body : e)));
    return body as EnquiryDTO;
  }, []);

  return { enquiries, loaded, reload, quoteEnquiry };
}

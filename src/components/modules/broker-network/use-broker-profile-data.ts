"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Fetches + owns the real BrokerProfile from /api/broker/profile, and the
 * real published lane rates from /api/broker/lane-rates. Both routes
 * already existed (session-scoped, real DB) but were never wired to any
 * frontend view - broker-rate-card.tsx and broker-settings.tsx were
 * reading authUser.brokerProfile (a stale onboarding-time snapshot in the
 * Zustand app-store, never refreshed) and the REANZLY_LANE_RATES mock
 * constant instead.
 */

export interface BrokerProfileDTO {
  id: string;
  brokerCode: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  gstin?: string;
  markupPct: number;
  settlementCycle: "Weekly" | "Fortnightly" | "Monthly";
  gstTreatment: "Forward Charge" | "Reverse Charge";
  coverageLanes: string[];
  status: string;
  parentBrokerId?: string;
}

export interface LaneRateDTO {
  id: string;
  laneId: string;
  lane: string;
  origin: string;
  destination: string;
  distanceKm: number;
  baseRatePerKm: number;
  vehicleTypes: string[];
  transitHours: number;
  active: boolean;
}

export function useBrokerProfileData() {
  const [profile, setProfile] = useState<BrokerProfileDTO | null>(null);
  const [laneRates, setLaneRates] = useState<LaneRateDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [profileRes, lanesRes] = await Promise.all([
        fetch("/api/broker/profile"),
        fetch("/api/broker/lane-rates"),
      ]);
      const profileJson = profileRes.ok ? await profileRes.json() : {};
      const lanesJson = lanesRes.ok ? await lanesRes.json() : [];
      setProfile(profileJson?.id ? profileJson : null);
      setLaneRates(Array.isArray(lanesJson) ? lanesJson : []);
    } catch {
      toast.error("Could not load broker profile.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateProfile = useCallback(async (patch: Partial<BrokerProfileDTO>) => {
    const res = await fetch("/api/broker/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not save broker profile.", { description: body.error });
      return false;
    }
    setProfile(body);
    return true;
  }, []);

  return { profile, laneRates, loaded, reload, updateProfile };
}

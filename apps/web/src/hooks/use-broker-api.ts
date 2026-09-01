"use client";

import { useEffect, useState, useCallback } from "react";

// ===== useBrokerApi =====
// Fetch broker data from the API with a seed-data fallback.
//
// Why a fallback: the broker panel ships with rich seed data in
// _helpers.tsx so the UI is fully populated even before the broker tables
// are seeded. This hook tries the API first; if the API returns an empty
// array (fresh DB / not seeded) or the request fails, it falls back to the
// seed data the caller passed in, so the UI never shows an empty state by
// accident.
//
// Pattern:
//   const { data, loading, error, refresh } = useBrokerApi(
//     "lane-rates",
//     REANZLY_LANE_RATES
//   );
//
// The `endpoint` is appended to /api/broker/. The seed data is captured at
// first render and reused on every fallback, so it stays stable across
// re-renders.

export interface UseBrokerApiResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBrokerApi<T>(endpoint: string, seedData: T): UseBrokerApiResult<T> {
  const [data, setData] = useState<T>(seedData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/broker/${endpoint}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();

      // Empty-array response: keep seed data so the UI stays populated.
      if (Array.isArray(json) && json.length === 0) {
        setData(seedData);
      } else if (json && typeof json === "object" && !Array.isArray(json)) {
        // Single-object response (e.g., profile, bank-details): only adopt
        // the API payload if it actually has fields. An empty {} means the
        // DB has no profile yet - keep the seed.
        if (Object.keys(json as Record<string, unknown>).length > 0) {
          setData(json as T);
        } else {
          setData(seedData);
        }
      } else {
        // Non-empty array (or non-object primitive) - adopt as-is.
        setData(json as T);
      }
      setError(null);
    } catch (e) {
      // Fall back to seed data on any error so the UI never breaks.
      setData(seedData);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
    // seedData is captured by reference; if the caller passes a new instance
    // every render (rare for module-level constants), we'd loop. Depend on
    // endpoint only to keep refresh semantics simple.
  }, [endpoint]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentRoute {
  href: string;
  label: string;
  visitedAt: number;
}

const MAX_RECENTS = 20;

interface RecentRoutesState {
  routes: RecentRoute[];
  recordVisit: (href: string, label: string) => void;
}

export const useRecentRoutesStore = create<RecentRoutesState>()(
  persist(
    (set) => ({
      routes: [],
      recordVisit: (href, label) =>
        set((state) => {
          const filtered = state.routes.filter((r) => r.href !== href);
          const next: RecentRoute[] = [
            { href, label, visitedAt: Date.now() },
            ...filtered,
          ].slice(0, MAX_RECENTS);
          return { routes: next };
        }),
    }),
    { name: "reanzly-recent-routes" },
  ),
);

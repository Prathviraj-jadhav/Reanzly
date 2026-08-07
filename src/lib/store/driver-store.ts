"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Trip } from "@/lib/types";

// ===== Driver Field App Store =====
// Persists driver identity, per-trip status overrides, activity log, GPS pings,
// duty session, and earnings to localStorage. Mirrors new activities + pings
// to the backend (/api/driver/activity, /api/driver/location) for durability.

export type DriverActivityType =
  | "STATUS_UPDATE"
  | "FUEL_LOG"
  | "EXPENSE"
  | "ISSUE"
  | "INSPECTION"
  | "POD"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "NOTE";

export interface DriverActivityRecord {
  id: string; // client-generated cuid-like
  driverId: string;
  driverName: string;
  tripId?: string;
  vehicleId?: string;
  type: DriverActivityType;
  payload: Record<string, unknown>; // type-specific fields
  photoDataUrl?: string; // downsampled JPEG data URL
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  note?: string;
  createdAt: string; // ISO
  synced: boolean; // mirrored to backend?
}

export interface DriverLocationPingRecord {
  id: string;
  driverId: string;
  driverName: string;
  tripId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  address?: string;
  createdAt: string;
  synced: boolean;
}

export type TripFieldStatus =
  | "Assigned"
  | "Started"
  | "At Pickup"
  | "Loaded"
  | "In Transit"
  | "At Delivery"
  | "Unloaded"
  | "Delivered"
  | "Cancelled";

export interface DutySession {
  checkedIn: boolean;
  startedAt?: string;
  endedAt?: string;
  driverId: string;
  driverName: string;
}

export interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  tripsCompletedToday: number;
  tripsCompletedWeek: number;
}

interface DriverState {
  // Identity (seeded from ROLE_ARCHETYPES driver)
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  phone: string;
  licenseNumber: string;
  setIdentity: (p: Partial<Pick<DriverState, "driverId" | "driverName" | "vehicleId" | "vehicleName" | "phone" | "licenseNumber">>) => void;

  // Per-trip status overrides (tripId -> status)
  tripStatus: Record<string, TripFieldStatus>;
  setTripStatus: (tripId: string, status: TripFieldStatus) => void;

  // Active trip (the one the driver is currently driving)
  activeTripId: string | null;
  setActiveTrip: (tripId: string | null) => void;

  // Append-only activity log (capped 500)
  activities: DriverActivityRecord[];
  addActivity: (a: Omit<DriverActivityRecord, "id" | "createdAt" | "synced" | "driverId" | "driverName">) => DriverActivityRecord;
  clearActivities: () => void;

  // GPS pings (capped 200)
  locationPings: DriverLocationPingRecord[];
  addPing: (p: Omit<DriverLocationPingRecord, "id" | "createdAt" | "synced" | "driverId" | "driverName">) => void;

  // Duty session
  duty: DutySession;
  checkIn: () => void;
  checkOut: () => void;

  // Tracking
  trackingEnabled: boolean;
  setTracking: (v: boolean) => void;
  locationPermission: "granted" | "denied" | "prompt" | "unknown";
  setLocationPermission: (p: "granted" | "denied" | "prompt" | "unknown") => void;

  // Pending photo (for cross-screen handoff)
  pendingPhoto?: { full: string; thumb: string; bytes: number } | undefined;
  setPendingPhoto: (p: { full: string; thumb: string; bytes: number } | undefined) => void;

  // Earnings (computed from POD activities payload.amount)
  earnings: EarningsSummary;
  recomputeEarnings: (tripFreightMap: Record<string, number>) => void;

  // Backend sync
  syncing: boolean;
  lastSyncError: string | null;
  syncToBackend: () => Promise<void>;

  // Real assigned trips (GET /api/driver/me), replacing the old
  // mock-data.ts TRIPS array filtered by a hardcoded driverId. Not
  // persisted - always refetched on field-app mount so a reassignment made
  // elsewhere (dispatch, ops) shows up.
  trips: Trip[];
  tripsLoaded: boolean;
  hydrate: () => Promise<void>;
}

const DEFAULT_IDENTITY = {
  driverId: "drv-23",
  driverName: "Kuldeep Singh",
  vehicleId: "veh-11",
  vehicleName: "MH12 AB 7890",
  phone: "+91 98765 43210",
  licenseNumber: "MH04 20180001234",
};

function genId(): string {
  // Lightweight unique id (no crypto dependency in older browsers)
  return `da-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_IDENTITY,
      setIdentity: (p) => set((s) => ({ ...s, ...p })),

      tripStatus: {},
      setTripStatus: (tripId, status) =>
        set((s) => ({ tripStatus: { ...s.tripStatus, [tripId]: status } })),

      activeTripId: null,
      setActiveTrip: (tripId) => set({ activeTripId: tripId }),

      activities: [],
      addActivity: (a) => {
        const record: DriverActivityRecord = {
          ...a,
          id: genId(),
          driverId: get().driverId,
          driverName: get().driverName,
          createdAt: new Date().toISOString(),
          synced: false,
        };
        set((s) => ({
          activities: [record, ...s.activities].slice(0, 500),
        }));
        // Fire-and-forget backend mirror
        void get().syncToBackend();
        return record;
      },
      clearActivities: () => set({ activities: [] }),

      locationPings: [],
      addPing: (p) => {
        const record: DriverLocationPingRecord = {
          ...p,
          id: genId(),
          driverId: get().driverId,
          driverName: get().driverName,
          createdAt: new Date().toISOString(),
          synced: false,
        };
        set((s) => ({
          locationPings: [record, ...s.locationPings].slice(0, 200),
        }));
        // Mirror single ping to backend (best-effort, non-blocking)
        const { driverId, driverName, activeTripId } = get();
        fetch("/api/driver/location?XTransformPort=3000", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId,
            driverName,
            tripId: activeTripId || record.tripId,
            lat: record.lat,
            lng: record.lng,
            accuracy: record.accuracy,
            speed: record.speed,
            heading: record.heading,
            altitude: record.altitude,
            address: record.address,
          }),
        })
          .then(() => {
            set((s) => ({
              locationPings: s.locationPings.map((x) =>
                x.id === record.id ? { ...x, synced: true } : x
              ),
            }));
          })
          .catch((e) => console.warn("[driver ping sync]", e));
      },

      duty: {
        checkedIn: false,
        driverId: DEFAULT_IDENTITY.driverId,
        driverName: DEFAULT_IDENTITY.driverName,
      },
      checkIn: () => {
        const { driverId, driverName } = get();
        const now = new Date().toISOString();
        set({
          duty: { checkedIn: true, startedAt: now, driverId, driverName },
        });
        get().addActivity({
          type: "CHECK_IN",
          tripId: get().activeTripId || undefined,
          vehicleId: get().vehicleId,
          payload: { time: now },
          note: "Duty started",
        });
      },
      checkOut: () => {
        const now = new Date().toISOString();
        const startedAt = get().duty.startedAt;
        set((s) => ({
          duty: { ...s.duty, checkedIn: false, endedAt: now },
        }));
        get().addActivity({
          type: "CHECK_OUT",
          tripId: get().activeTripId || undefined,
          vehicleId: get().vehicleId,
          payload: { time: now, startedAt, durationMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0 },
          note: "Duty ended",
        });
      },

      trackingEnabled: true,
      setTracking: (v) => set({ trackingEnabled: v }),
      locationPermission: "unknown",
      setLocationPermission: (p) => set({ locationPermission: p }),

      pendingPhoto: undefined,
      setPendingPhoto: (p) => set({ pendingPhoto: p }),

      earnings: { today: 0, week: 0, month: 0, tripsCompletedToday: 0, tripsCompletedWeek: 0 },
      recomputeEarnings: (tripFreightMap) => {
        const acts = get().activities;
        const now = Date.now();
        const DAY = 86400000;
        let today = 0;
        let week = 0;
        let month = 0;
        let tripsToday = 0;
        let tripsWeek = 0;
        const completedToday = new Set<string>();
        const completedWeek = new Set<string>();
        for (const a of acts) {
          if (a.type !== "STATUS_UPDATE") continue;
          if (a.payload?.status !== "Delivered") continue;
          const t = new Date(a.createdAt).getTime();
          const age = now - t;
          const freight = a.tripId ? tripFreightMap[a.tripId] || 0 : 0;
          if (age < DAY) {
            today += freight;
            if (a.tripId) completedToday.add(a.tripId);
          }
          if (age < 7 * DAY) {
            week += freight;
            if (a.tripId) completedWeek.add(a.tripId);
          }
          if (age < 30 * DAY) {
            month += freight;
          }
        }
        tripsToday = completedToday.size;
        tripsWeek = completedWeek.size;
        set({
          earnings: {
            today,
            week,
            month,
            tripsCompletedToday: tripsToday,
            tripsCompletedWeek: tripsWeek,
          },
        });
      },

      syncing: false,
      lastSyncError: null,
      syncToBackend: async () => {
        const { activities, driverId, driverName, activeTripId } = get();
        const unsynced = activities.filter((a) => !a.synced);
        if (unsynced.length === 0) {
          set({ syncing: false, lastSyncError: null });
          return;
        }
        set({ syncing: true, lastSyncError: null });
        const syncedIds = new Set<string>();
        let lastErr: string | null = null;
        await Promise.all(
          unsynced.map(async (a) => {
            try {
              const res = await fetch("/api/driver/activity?XTransformPort=3000", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  driverId,
                  driverName,
                  tripId: a.tripId || activeTripId || undefined,
                  vehicleId: a.vehicleId,
                  type: a.type,
                  payload: a.payload,
                  photoDataUrl: a.photoDataUrl,
                  lat: a.lat,
                  lng: a.lng,
                  accuracy: a.accuracy,
                  address: a.address,
                  note: a.note,
                }),
              });
              if (res.ok) syncedIds.add(a.id);
              else lastErr = `HTTP ${res.status}`;
            } catch (e) {
              lastErr = (e as Error).message;
            }
          })
        );
        set((s) => ({
          syncing: false,
          lastSyncError: lastErr,
          activities: s.activities.map((a) =>
            syncedIds.has(a.id) ? { ...a, synced: true } : a
          ),
        }));
      },

      trips: [],
      tripsLoaded: false,
      hydrate: async () => {
        try {
          const res = await fetch("/api/driver/me");
          if (!res.ok) {
            set({ tripsLoaded: true });
            return;
          }
          const { driver, trips } = await res.json();
          set({
            driverId: driver.id,
            driverName: driver.name,
            phone: driver.phone || get().phone,
            licenseNumber: driver.licenseNumber || get().licenseNumber,
            trips,
            tripsLoaded: true,
          });
        } catch {
          set({ tripsLoaded: true });
        }
      },
    }),
    {
      name: "reanzly-driver",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        driverId: s.driverId,
        driverName: s.driverName,
        vehicleId: s.vehicleId,
        vehicleName: s.vehicleName,
        phone: s.phone,
        licenseNumber: s.licenseNumber,
        tripStatus: s.tripStatus,
        activeTripId: s.activeTripId,
        activities: s.activities,
        locationPings: s.locationPings.slice(0, 50), // persist a small tail
        duty: s.duty,
        trackingEnabled: s.trackingEnabled,
        locationPermission: s.locationPermission,
        earnings: s.earnings,
      }),
    }
  )
);

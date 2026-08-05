"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ===== Warehouse Crew Field App Store =====
// Task-centric sibling of driver-store.ts: persists crew identity, per-task
// status overrides, an activity log (task confirmations, scans, exceptions,
// check-in/out), and a duty (shift) session to localStorage. No GPS/location
// tracking here - that's driver-specific; floor crew work a fixed site.

export type WarehouseTaskStatus = "Assigned" | "In Progress" | "Completed" | "Exception";

export type WarehouseTaskKind = "putaway" | "pick" | "dispatch";

export type WarehouseActivityType =
  | "STATUS_UPDATE"
  | "SCAN"
  | "EXCEPTION"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "NOTE";

export interface WarehouseActivityRecord {
  id: string; // client-generated cuid-like
  crewId: string;
  crewName: string;
  taskId?: string;
  taskKind?: WarehouseTaskKind;
  refId?: string; // GRN / PL / ODO number for quick reference
  type: WarehouseActivityType;
  payload: Record<string, unknown>; // type-specific fields
  photoDataUrl?: string; // downsampled JPEG data URL
  note?: string;
  createdAt: string; // ISO
}

export interface DutySession {
  checkedIn: boolean;
  startedAt?: string;
  endedAt?: string;
  crewId: string;
  crewName: string;
}

interface WarehouseFieldState {
  // Identity (seeded from ROLE_ARCHETYPES warehouse-crew)
  crewId: string;
  crewName: string;
  employeeCode: string;
  phone: string;
  godown: string;
  setIdentity: (p: Partial<Pick<WarehouseFieldState, "crewId" | "crewName" | "employeeCode" | "phone" | "godown">>) => void;

  // Per-task status overrides (taskId -> status)
  taskStatus: Record<string, WarehouseTaskStatus>;
  setTaskStatus: (taskId: string, status: WarehouseTaskStatus) => void;

  // Active task (the one the crew member is currently confirming)
  activeTaskId: string | null;
  setActiveTask: (taskId: string | null) => void;

  // Append-only activity log (capped 500)
  activities: WarehouseActivityRecord[];
  addActivity: (a: Omit<WarehouseActivityRecord, "id" | "createdAt" | "crewId" | "crewName">) => WarehouseActivityRecord;
  clearActivities: () => void;

  // Duty (shift) session
  duty: DutySession;
  checkIn: () => void;
  checkOut: () => void;

  // Pending photo (for cross-screen handoff)
  pendingPhoto?: { full: string; thumb: string; bytes: number } | undefined;
  setPendingPhoto: (p: { full: string; thumb: string; bytes: number } | undefined) => void;
}

const DEFAULT_IDENTITY = {
  crewId: "whc-14",
  crewName: "Deepak Yadav",
  employeeCode: "WH-1042",
  phone: "+91 98221 45590",
  godown: "Pune Chakan DC",
};

function genId(): string {
  // Lightweight unique id (no crypto dependency in older browsers)
  return `wa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useWarehouseFieldStore = create<WarehouseFieldState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_IDENTITY,
      setIdentity: (p) => set((s) => ({ ...s, ...p })),

      taskStatus: {},
      setTaskStatus: (taskId, status) =>
        set((s) => ({ taskStatus: { ...s.taskStatus, [taskId]: status } })),

      activeTaskId: null,
      setActiveTask: (taskId) => set({ activeTaskId: taskId }),

      activities: [],
      addActivity: (a) => {
        const record: WarehouseActivityRecord = {
          ...a,
          id: genId(),
          crewId: get().crewId,
          crewName: get().crewName,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          activities: [record, ...s.activities].slice(0, 500),
        }));
        return record;
      },
      clearActivities: () => set({ activities: [] }),

      duty: {
        checkedIn: false,
        crewId: DEFAULT_IDENTITY.crewId,
        crewName: DEFAULT_IDENTITY.crewName,
      },
      checkIn: () => {
        const { crewId, crewName } = get();
        const now = new Date().toISOString();
        set({
          duty: { checkedIn: true, startedAt: now, crewId, crewName },
        });
        get().addActivity({
          type: "CHECK_IN",
          payload: { time: now },
          note: "Shift started",
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
          payload: { time: now, startedAt, durationMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0 },
          note: "Shift ended",
        });
      },

      pendingPhoto: undefined,
      setPendingPhoto: (p) => set({ pendingPhoto: p }),
    }),
    {
      name: "reanzly-warehouse-crew",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        crewId: s.crewId,
        crewName: s.crewName,
        employeeCode: s.employeeCode,
        phone: s.phone,
        godown: s.godown,
        taskStatus: s.taskStatus,
        activeTaskId: s.activeTaskId,
        activities: s.activities,
        duty: s.duty,
      }),
    }
  )
);

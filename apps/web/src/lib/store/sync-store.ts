"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ════════════════════════════════════════════════════════════════
// Offline-first sync + autosave store
// ════════════════════════════════════════════════════════════════
// Reanzly is offline-first by default. Every mutation a user makes
// (POD capture, fuel log, trip update, expense, inspection, chat message,
// CRM/HR edits) is:
//   1. Written to localStorage immediately (durability against tab crash).
//   2. Enqueued in this sync store as a pending mutation.
//   3. Flushed to the server the moment the connection returns.
//
// This mirrors the architecture the user asked for:
//   "if the user is not online we will store the data offline and then it
//    will go to our server when he comes online. add the features by default
//    and add the autosave option as well. backup options."
//
// The superadmin panel's "Offline Sync Health" view monitors this queue
// across tenants (see src/components/modules/superadmin/offline-sync.tsx).

export type MutationType =
  | "pod.create"
  | "pod.update"
  | "fuel.create"
  | "trip.update"
  | "expense.create"
  | "inspection.create"
  | "chat.send"
  | "crm.lead.update"
  | "crm.deal.update"
  | "hr.employee.update"
  | "hr.leave.update"
  | "invoice.update"
  | "vehicle.update"
  | "generic";

export interface PendingMutation {
  id: string;
  type: MutationType;
  module: string;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: "pending" | "syncing" | "failed";
}

export interface AutosaveEntry {
  key: string; // e.g. "trip:T-1042:manifest"
  data: string;
  savedAt: number;
}

export interface BackupSnapshot {
  id: string;
  createdAt: number;
  size: number; // bytes
  storeKeys: string[];
  label: string;
}

interface SyncState {
  // Connection
  online: boolean;
  setOnline: (v: boolean) => void;

  // Pending mutation queue (persisted so it survives reloads while offline)
  queue: PendingMutation[];
  enqueue: (m: Omit<PendingMutation, "id" | "createdAt" | "attempts" | "status">) => string;
  markSyncing: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  remove: (id: string) => void;
  clearQueue: () => void;
  flush: () => Promise<void>;

  // Autosave registry (lightweight pointers to localStorage blobs)
  autosaves: AutosaveEntry[];
  autosave: (key: string, data: string) => void;
  removeAutosave: (key: string) => void;

  // Last successful sync timestamp
  lastSyncAt: number | null;
  setLastSyncAt: (t: number) => void;

  // Backups (manifest of snapshot metadata; the actual blob lives in a
  // separate localStorage key `reanzly-backup-blob-<id>`)
  backups: BackupSnapshot[];
  createBackup: (label?: string) => string;
  restoreBackup: (id: string) => void;
  deleteBackup: (id: string) => void;

  // Conflict log (same record edited on two devices)
  conflicts: { id: string; module: string; recordId: string; deviceA: string; deviceB: string; resolvedAt?: number }[];
  resolveConflict: (id: string) => void;
}

const BACKUP_KEY_PREFIX = "reanzly-backup-blob-";

function genId(prefix = "m"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// The set of localStorage keys that constitute "all Reanzly data" -
// used by createBackup/restoreBackup to snapshot/restore the whole tenant.
const TENANT_STORE_KEYS = [
  "reanzly-app",
  "reanzly-chat",
  "reanzly-superadmin",
  "reanzly-crm",
  "reanzly-hr",
  "reanzly-pod",
  "reanzly-rate-cards",
  "reanzly-driver",
  "reanzly-financial-ops",
  "reanzly-dashboard",
  "reanzly-sync",
];

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      online: true,
      setOnline: (v) => set({ online: v }),

      queue: [],
      enqueue: (m) => {
        const id = genId();
        const entry: PendingMutation = {
          id,
          type: m.type,
          module: m.module,
          payload: m.payload,
          createdAt: Date.now(),
          attempts: 0,
          status: "pending",
        };
        set((s) => ({ queue: [...s.queue, entry] }));
        // If we're online, kick off a flush so the mutation lands quickly.
        if (get().online) void get().flush();
        return id;
      },
      markSyncing: (id) =>
        set((s) => ({
          queue: s.queue.map((m) => (m.id === id ? { ...m, status: "syncing" } : m)),
        })),
      markFailed: (id, error) =>
        set((s) => ({
          queue: s.queue.map((m) =>
            m.id === id ? { ...m, status: "failed", attempts: m.attempts + 1, lastError: error } : m
          ),
        })),
      remove: (id) => set((s) => ({ queue: s.queue.filter((m) => m.id !== id) })),
      clearQueue: () => set({ queue: [] }),

      // flush attempts to drain the pending queue. In this demo build there's
      // no real server endpoint, so we simulate a successful network round-trip
      // with a short delay and remove the mutation. In production this would
      // POST each mutation to /api/sync and only remove on 2xx.
      flush: async () => {
        const { online, queue } = get();
        if (!online || queue.length === 0) return;
        const pending = queue.filter((m) => m.status === "pending");
        for (const m of pending) {
          get().markSyncing(m.id);
          try {
            // Simulated network call - 120-400ms jitter (Doherty threshold).
            await new Promise((r) => setTimeout(r, 120 + Math.random() * 280));
            get().remove(m.id);
          } catch (e) {
            get().markFailed(m.id, e instanceof Error ? e.message : "network error");
          }
        }
        if (pending.length > 0) {
          get().setLastSyncAt(Date.now());
        }
      },

      autosaves: [],
      autosave: (key, data) => {
        const entry: AutosaveEntry = { key, data, savedAt: Date.now() };
        set((s) => {
          const exists = s.autosaves.some((a) => a.key === key);
          return {
            autosaves: exists
              ? s.autosaves.map((a) => (a.key === key ? entry : a))
              : [...s.autosaves, entry],
          };
        });
        // Every autosave also enqueues a sync mutation so the server copy
        // stays current once connectivity returns.
        get().enqueue({
          type: "generic",
          module: key.split(":")[0] || "generic",
          payload: { key, data },
        });
      },
      removeAutosave: (key) =>
        set((s) => ({ autosaves: s.autosaves.filter((a) => a.key !== key) })),

      lastSyncAt: null,
      setLastSyncAt: (t) => set({ lastSyncAt: t }),

      backups: [],
      createBackup: (label) => {
        const id = genId("bk");
        const snapshot: Record<string, unknown> = {};
        let size = 0;
        const storeKeys: string[] = [];
        for (const k of TENANT_STORE_KEYS) {
          const raw = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
          if (raw) {
            snapshot[k] = JSON.parse(raw);
            size += raw.length;
            storeKeys.push(k);
          }
        }
        const blob = JSON.stringify(snapshot);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(BACKUP_KEY_PREFIX + id, blob);
        }
        const entry: BackupSnapshot = {
          id,
          createdAt: Date.now(),
          size,
          storeKeys,
          label: label || `Backup ${new Date().toLocaleString("en-IN")}`,
        };
        set((s) => ({ backups: [entry, ...s.backups].slice(0, 20) }));
        return id;
      },
      restoreBackup: (id) => {
        if (typeof localStorage === "undefined") return;
        const raw = localStorage.getItem(BACKUP_KEY_PREFIX + id);
        if (!raw) return;
        const snapshot = JSON.parse(raw) as Record<string, unknown>;
        for (const [k, v] of Object.entries(snapshot)) {
          localStorage.setItem(k, JSON.stringify(v));
        }
        // Reload so every store re-hydrates from the restored blobs.
        if (typeof window !== "undefined") window.location.reload();
      },
      deleteBackup: (id) => {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(BACKUP_KEY_PREFIX + id);
        }
        set((s) => ({ backups: s.backups.filter((b) => b.id !== id) }));
      },

      conflicts: [],
      resolveConflict: (id) =>
        set((s) => ({
          conflicts: s.conflicts.map((c) =>
            c.id === id ? { ...c, resolvedAt: Date.now() } : c
          ),
        })),
    }),
    {
      name: "reanzly-sync",
      // Persist the queue + autosaves + backups + lastSyncAt + conflicts.
      // `online` is NOT persisted (it's live browser state).
      partialize: (s) => ({
        queue: s.queue,
        autosaves: s.autosaves,
        backups: s.backups,
        lastSyncAt: s.lastSyncAt,
        conflicts: s.conflicts,
      }),
    }
  )
);

// ════════════════════════════════════════════════════════════════
// Convenience selectors
// ════════════════════════════════════════════════════════════════

export const selectPendingCount = (s: SyncState) =>
  s.queue.filter((m) => m.status !== "failed").length;

export const selectFailedCount = (s: SyncState) =>
  s.queue.filter((m) => m.status === "failed").length;

export const selectOldestPendingMs = (s: SyncState) => {
  const pending = s.queue.filter((m) => m.status === "pending");
  if (pending.length === 0) return 0;
  return Date.now() - Math.min(...pending.map((m) => m.createdAt));
};

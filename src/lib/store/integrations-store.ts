"use client";

/* ============================================================
   Integrations Store (Zustand + persist)
   ------------------------------------------------------------
   Persists connected integrations across page reloads. Each
   connection record stores the providerId, status, mode,
   field values (secrets masked), priority, primary flag, and
   last-sync telemetry.

   In addition, this store now persists a per-connection
   `syncState` map (lastSyncAt, nextSyncAt, recordsPulled,
   recordsPushed, syncErrors) and a rolling `syncHistory`
   array (last N SyncEvents per connection). The `triggerSync`
   action simulates a real round-trip: sets status to
   "syncing", waits ~1.2s, picks a deterministic record count
   based on the provider's syncConfig.typicalRecordsPerSync,
   and pushes a SyncEvent to the history.

   All sync state is persisted to localStorage so it survives
   reloads — exactly like the connections themselves.
   ============================================================ */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ALL_PROVIDERS,
  SEED_CONNECTIONS,
  type IntegrationCategory,
  type IntegrationStatus,
  type SyncFrequency,
} from "@/components/modules/integrations/_data";

export interface IntegrationConnection {
  /** Stable id = providerId + "-" + connectedAt epoch (so multi-instance providers get unique ids). */
  id: string;
  providerId: string;
  status: IntegrationStatus;
  mode: "live" | "test";
  priority?: number;
  isPrimary?: boolean;
  /** Stored field values. Secrets are masked with •••• after first save (this is a UI demo). */
  fieldValues: Record<string, string>;
  connectedAt: string;
  lastSyncAt?: string;
  lastSyncStatus?: "ok" | "error" | "pending";
  lastSyncMessage?: string;
  /** User-facing label for multi-instance connections (e.g. "Razorpay — Mumbai"). */
  label?: string;
  /** Sync frequency override (falls back to provider.syncConfig.frequency if unset). */
  syncFrequency?: SyncFrequency;
}

/** A single sync run for a connection. Drives the Sync history drawer. */
export interface SyncEvent {
  id: string;
  connectionId: string;
  providerId: string;
  /** scheduled | manual | webhook-triggered */
  syncType: "scheduled" | "manual" | "webhook-triggered";
  status: "ok" | "error" | "partial" | "syncing";
  recordsPulled: number;
  recordsPushed: number;
  durationMs: number;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  message: string;
  errorMessage?: string;
}

/** Per-connection sync state shown on the connection card. */
export interface ConnectionSyncState {
  /** ISO timestamp of the last sync (most recent SyncEvent.completedAt). */
  lastSyncAt?: string;
  /** ISO timestamp of the next scheduled sync (computed from frequency). */
  nextSyncAt?: string;
  /** Cumulative records pulled across all syncs for this connection. */
  recordsPulled: number;
  /** Cumulative records pushed across all syncs for this connection. */
  recordsPushed: number;
  /** Last 10 sync events (most recent first). */
  history: SyncEvent[];
  /** Active sync state — when "syncing", the UI shows a spinner. */
  liveStatus: "idle" | "syncing" | "ok" | "error";
  /** Last error message (cleared on next successful sync). */
  lastError?: string;
}

interface IntegrationsState {
  connections: IntegrationConnection[];
  /** Per-connection sync state, keyed by connection.id. */
  syncState: Record<string, ConnectionSyncState>;
  /** Last-loaded at (used to surface "synced 3m ago" on the page header). */
  lastRefreshedAt: string;
  /** True while a server sync is in-flight. */
  syncing: boolean;
  /** Last server sync outcome — shown as a tiny toast-style badge. */
  syncOutcome: { ok: boolean; message: string; at: string } | null;

  // === Actions ===
  connect: (
    providerId: string,
    fieldValues: Record<string, string>,
    mode: "live" | "test",
    label?: string,
    syncFrequency?: SyncFrequency,
  ) => IntegrationConnection;
  updateConnection: (id: string, patch: Partial<IntegrationConnection>) => void;
  disconnect: (id: string) => void;
  setPrimary: (id: string) => void;
  setPriority: (id: string, priority: number) => void;
  testConnection: (id: string) => Promise<{ ok: boolean; message: string }>;
  refreshAll: () => void;
  reset: () => void;
  /** Trigger an on-demand sync for a connection. Returns the SyncEvent once complete. */
  triggerSync: (connectionId: string, syncType?: SyncEvent["syncType"]) => Promise<SyncEvent>;
  /** Compute next sync timestamp from frequency. */
  computeNextSyncAt: (frequency: SyncFrequency, from?: Date) => string;

  // === Server sync (Prisma-backed) ===
  /** Pull connections from /api/integrations?companyId=... and hydrate store. */
  syncFromServer: (companyId?: string) => Promise<void>;
  /** Push the current local connections to the server (idempotent seed). */
  seedToServer: (companyId?: string) => Promise<void>;
  /** Convenience: call test connection via the real API. */
  testConnectionRemote: (
    providerId: string,
    fieldValues: Record<string, string>,
    mode: "live" | "test",
    connectionId?: string,
  ) => Promise<{ ok: boolean; message: string; latencyMs?: number }>;
}

const STORAGE_KEY = "reanzly-integrations-v2";

/** Mask a secret field value after the first save. */
function maskSecret(value: string): string {
  if (!value) return "";
  // Keep the first 4 + last 2 characters visible if the value is long enough.
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-2);
}

/** Returns true if the field id looks secret/password/key/etc. */
function isSecretField(fieldId: string): boolean {
  return (
    fieldId.toLowerCase().includes("secret") ||
    fieldId.toLowerCase().includes("password") ||
    fieldId.toLowerCase().includes("token") ||
    fieldId.toLowerCase().includes("apikey") ||
    fieldId.toLowerCase().includes("authkey") ||
    fieldId.toLowerCase().includes("key")
  );
}

function maskFieldValues(providerId: string, fieldValues: Record<string, string>): Record<string, string> {
  const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return fieldValues;
  const masked: Record<string, string> = { ...fieldValues };
  for (const field of provider.fields) {
    const isSecret = field.secret || isSecretField(field.id);
    if (isSecret && masked[field.id]) {
      masked[field.id] = maskSecret(masked[field.id]);
    }
  }
  return masked;
}

/** Lookup table for frequency -> next-sync interval in ms. */
const FREQUENCY_INTERVAL_MS: Record<SyncFrequency, number> = {
  "real-time": 60_000, // 1 min (we surface as "continuous")
  hourly: 3_600_000,
  daily: 86_400_000,
  "on-demand": 0, // no auto next sync
};

/** Convert a frequency into a human label, e.g. "Daily at 03:00 IST". */
export function frequencyLabel(freq: SyncFrequency): string {
  switch (freq) {
    case "real-time":
      return "Real-time";
    case "hourly":
      return "Hourly";
    case "daily":
      return "Daily · 03:00 IST";
    case "on-demand":
      return "On-demand";
  }
}

/** Sample sync messages per provider id — used to make the SyncEvent.message feel real. */
const SYNC_MESSAGES: Record<string, string[]> = {
  gstn: [
    "Pulled 184 GSTR-2A line items · pushed GSTR-1 draft (47 invoices)",
    "Reconciled ITC: 172 matched, 12 unmatched (vendor follow-up queued)",
    "ARN AA2706241234567X received for GSTR-3B · tax ₹4,82,310 paid",
  ],
  epfo: [
    "ECR filed for 45 members · TRRN 0123456789 received",
    "Member master synced: 3 new joiners enrolled, 2 exiters marked",
    "PF passbook pulled for 38 active UANs",
  ],
  esic: [
    "Monthly return filed for 38 IPs · challan 8012345678 generated",
    "2 new IPs registered, 1 wage-ceiling exit flagged",
    "Pehchan card download queued for 4 new IPs",
  ],
  traces: [
    "Form 16 generated for 45 employees · 92 challans matched in OLTAS",
    "24Q return filed for Q1 · 92 deductee rows, ₹6,42,180 TDS",
    "Justification report pulled · 0 defaults",
  ],
  ptax: [
    "PT monthly return filed for MH · ₹18,450 challan generated",
    "RC amendment acknowledged · new branch added",
    "45 deductee rows synced for KA state",
  ],
  sarathi: [
    "32 DL verifications completed · 1 expiry flagged (60d)",
    "Conviction history pulled for 28 active drivers · 0 convictions",
    "2 DL renewals submitted to RTO MH-14",
  ],
  "fastag-nhai": [
    "412 toll transactions pulled (last 1h) · 386 auto-matched to trips",
    "Daily statement reconciled for 28 vehicles · 26 unmatched tolls queued",
    "Low balance alert: 3 vehicles below ₹100 threshold",
  ],
  pucc: [
    "PUC status pulled for 28 vehicles · 2 expiring within 7 days",
    "3 new PUC certs generated at centre MH-14-PT-1124",
    "Bulk verify completed · 0 expired, 2 expiring soon",
  ],
  "national-permit": [
    "Permit status pulled for 12 vehicles · 1 renewal due in 28 days",
    "Composite tax ₹1,98,000 paid for 12 vehicles · receipts downloaded",
    "Authorisation letter sync complete for FY 2024-25",
  ],
  "e-way-bill-gov": [
    "86 e-Way Bills generated from invoices (real-time)",
    "3 e-Way Bills approaching expiry (8h window) · validity extended",
    "1 cancellation processed within 24h window",
  ],
  dgft: [
    "IEC validity confirmed · 18 unclaimed RoDTEP scrips surfaced",
    "3 licence applications tracked · 1 approved (₹4.2L scrip)",
    "MEIS ledger pulled · ₹12,400 scrip balance",
  ],
  mca: [
    "Company master data pulled for 6 vendors/customers",
    "DIN verification for 4 new directors · all valid",
    "DSC expiry calendar updated · 1 DSC expiring in 45 days",
  ],
  "india-post": [
    "64 tracking events pulled (last 1h) · 2 deliveries confirmed",
    "COD remittance cycle synced · ₹1,84,500 due for settlement",
    "PIN code serviceability matrix refreshed · 18,420 PIN codes covered",
  ],
  vahan: [
    "28 RC records pulled · 1 fitness expiry within 30 days",
    "PUC expiry calendar refreshed · 2 vehicles need re-test",
    "Insurance status verified for 28 vehicles",
  ],
  icegate: [
    "12 shipping bills status updated · 4 with duty refund pending",
    "EGM/IGM reconciled for 8 cross-border trips",
    "RoDTEP scrip credit ₹2,84,150 received",
  ],
  digilocker: [
    "5 driver KYC docs pulled via consent flow",
    "3 vehicle RC/insurance docs auto-attached",
    "e-KYC completed for 2 new joiners",
  ],
};

/** Deterministic pick from a list (so the same connection always shows the same first message). */
function pickMessage(providerId: string, counter: number): string {
  const list = SYNC_MESSAGES[providerId] ?? [
    "Sync completed",
    "Records reconciled",
    "Webhook events processed",
  ];
  return list[counter % list.length];
}

/** Compute next-sync ISO timestamp from a frequency. */
function computeNextSyncAtImpl(freq: SyncFrequency, from = new Date()): string {
  const interval = FREQUENCY_INTERVAL_MS[freq];
  if (interval === 0) return ""; // on-demand: no auto next sync
  return new Date(from.getTime() + interval).toISOString();
}

/** Build a seed SyncState for a connection based on its provider's syncConfig. */
function seedSyncStateForConnection(
  conn: IntegrationConnection,
  ageMinutes: number,
): ConnectionSyncState | null {
  const provider = ALL_PROVIDERS.find((p) => p.id === conn.providerId);
  if (!provider?.syncConfig) return null;
  const cfg = provider.syncConfig;
  const lastSyncAt = new Date(Date.now() - ageMinutes * 60_000).toISOString();
  const nextSyncAt = computeNextSyncAtImpl(cfg.frequency, new Date(lastSyncAt));
  // Seed 3 historical events leading up to the most recent.
  const history: SyncEvent[] = [];
  for (let i = 2; i >= 0; i--) {
    const startedAt = new Date(Date.now() - (ageMinutes + i * (cfg.frequency === "real-time" ? 60 : cfg.frequency === "hourly" ? 360 : 1440)) * 60_000).toISOString();
    const completedAt = new Date(new Date(startedAt).getTime() + 1200 + i * 400).toISOString();
    const isError = i === 1 && conn.status === "error";
    history.push({
      id: `seed-${conn.id}-${i}`,
      connectionId: conn.id,
      providerId: conn.providerId,
      syncType: i === 0 ? "manual" : "scheduled",
      status: isError ? "error" : "ok",
      recordsPulled: isError ? 0 : Math.round(cfg.typicalRecordsPerSync * (0.7 + i * 0.1)),
      recordsPushed: isError ? 0 : Math.round(cfg.typicalRecordsPerSync * 0.3),
      durationMs: 1100 + i * 350,
      startedAt,
      completedAt,
      message: isError
        ? "Sync failed — upstream returned 503 (service unavailable)"
        : pickMessage(conn.providerId, i),
      errorMessage: isError ? "503 Service Unavailable from upstream portal" : undefined,
    });
  }
  history.reverse();
  const last = history[history.length - 1];
  return {
    lastSyncAt,
    nextSyncAt,
    recordsPulled: cfg.typicalRecordsPerSync * 8 + 142,
    recordsPushed: Math.round(cfg.typicalRecordsPerSync * 2.5),
    history,
    liveStatus: last?.status === "error" ? "error" : "ok",
    lastError: last?.errorMessage,
  };
}

/** Build initial syncState map from seed connections. */
function buildSeedSyncState(connections: IntegrationConnection[]): Record<string, ConnectionSyncState> {
  const out: Record<string, ConnectionSyncState> = {};
  let i = 0;
  for (const conn of connections) {
    // Vary the age between 2 minutes and ~5 hours for realism.
    const ageMinutes = [3, 18, 47, 142, 8, 32, 95, 12, 67, 220][i % 10] + (i % 7);
    const ss = seedSyncStateForConnection(conn, ageMinutes);
    if (ss) out[conn.id] = ss;
    i++;
  }
  return out;
}

export const useIntegrationsStore = create<IntegrationsState>()(
  persist(
    (set, get) => ({
      connections: SEED_CONNECTIONS as IntegrationConnection[],
      syncState: buildSeedSyncState(SEED_CONNECTIONS as IntegrationConnection[]),
      lastRefreshedAt: new Date().toISOString(),
      syncing: false,
      syncOutcome: null,

      connect: (providerId, fieldValues, mode, label, syncFrequency) => {
        const now = new Date();
        const id = `${providerId}-${now.getTime()}`;
        const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
        const masked = maskFieldValues(providerId, fieldValues);
        const connection: IntegrationConnection = {
          id,
          providerId,
          status: "connected",
          mode,
          priority: provider?.defaultPriority,
          isPrimary: false,
          fieldValues: masked,
          connectedAt: now.toISOString(),
          lastSyncAt: now.toISOString(),
          lastSyncStatus: "ok",
          lastSyncMessage: "Connection established",
          label,
          syncFrequency: syncFrequency ?? provider?.syncConfig?.frequency,
        };
        set((state) => {
          // Seed an initial sync state for connections that have a syncConfig.
          const newSyncState = { ...state.syncState };
          if (provider?.syncConfig) {
            newSyncState[id] = {
              lastSyncAt: now.toISOString(),
              nextSyncAt: computeNextSyncAtImpl(provider.syncConfig.frequency, now),
              recordsPulled: 0,
              recordsPushed: 0,
              history: [
                {
                  id: `init-${id}`,
                  connectionId: id,
                  providerId,
                  syncType: "manual",
                  status: "ok",
                  recordsPulled: 0,
                  recordsPushed: 0,
                  durationMs: 0,
                  startedAt: now.toISOString(),
                  completedAt: now.toISOString(),
                  message: "Connection established — initial test sync OK",
                },
              ],
              liveStatus: "ok",
            };
          }
          return {
            connections: [...state.connections, connection],
            syncState: newSyncState,
            lastRefreshedAt: now.toISOString(),
          };
        });
        // Auto-set primary if no other connection exists for this provider's category.
        const all = get().connections;
        const sameCategory = all.filter((c) => {
          const p = ALL_PROVIDERS.find((pp) => pp.id === c.providerId);
          const myProvider = ALL_PROVIDERS.find((pp) => pp.id === providerId);
          return p?.category === myProvider?.category;
        });
        if (sameCategory.length === 1) {
          get().setPrimary(id);
        }
        return connection;
      },

      updateConnection: (id, patch) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  fieldValues:
                    patch.fieldValues && c.providerId
                      ? maskFieldValues(c.providerId, patch.fieldValues)
                      : c.fieldValues,
                  lastSyncAt: new Date().toISOString(),
                }
              : c,
          ),
          lastRefreshedAt: new Date().toISOString(),
        }));
      },

      disconnect: (id) => {
        set((state) => {
          const target = state.connections.find((c) => c.id === id);
          const next = state.connections.filter((c) => c.id !== id);
          const nextSyncState = { ...state.syncState };
          delete nextSyncState[id];
          // If we removed the primary, promote the next in the same category.
          if (target?.isPrimary) {
            const replacement = next.find((c) => {
              const p = ALL_PROVIDERS.find((pp) => pp.id === c.providerId);
              const myP = ALL_PROVIDERS.find((pp) => pp.id === target.providerId);
              return p?.category === myP?.category;
            });
            if (replacement) {
              return {
                connections: next.map((c) =>
                  c.id === replacement.id ? { ...c, isPrimary: true } : c,
                ),
                syncState: nextSyncState,
                lastRefreshedAt: new Date().toISOString(),
              };
            }
          }
          return {
            connections: next,
            syncState: nextSyncState,
            lastRefreshedAt: new Date().toISOString(),
          };
        });
      },

      setPrimary: (id) => {
        set((state) => {
          const target = state.connections.find((c) => c.id === id);
          if (!target) return state;
          const targetProvider = ALL_PROVIDERS.find((p) => p.id === target.providerId);
          return {
            connections: state.connections.map((c) => {
              const cProvider = ALL_PROVIDERS.find((p) => p.id === c.providerId);
              if (cProvider?.category !== targetProvider?.category) return c;
              return { ...c, isPrimary: c.id === id };
            }),
            lastRefreshedAt: new Date().toISOString(),
          };
        });
      },

      setPriority: (id, priority) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, priority } : c,
          ),
          lastRefreshedAt: new Date().toISOString(),
        }));
      },

      testConnection: async (id) => {
        // Simulate a real network round-trip.
        await new Promise((r) => setTimeout(r, 1100));
        const target = get().connections.find((c) => c.id === id);
        if (!target) return { ok: false, message: "Connection not found." };
        // Mark as connecting then ok (or error for the seed fastag broken state).
        const isError = target.providerId === "fastag" && target.status === "needs-config";
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  lastSyncAt: new Date().toISOString(),
                  lastSyncStatus: isError ? "error" : "ok",
                  status: isError ? "needs-config" : "connected",
                  lastSyncMessage: isError
                    ? "Missing credentials — re-enter HDFC API JSON"
                    : "Test successful · 200 OK in 412ms",
                }
              : c,
          ),
        }));
        return isError
          ? { ok: false, message: "Missing credentials. Re-enter the API JSON." }
          : { ok: true, message: "Test successful · 200 OK in 412ms" };
      },

      refreshAll: () => {
        set((state) => ({
          connections: state.connections.map((c) => ({
            ...c,
            lastSyncAt: new Date().toISOString(),
            lastSyncMessage: c.lastSyncMessage?.includes("Synced")
              ? c.lastSyncMessage
              : "Refreshed",
          })),
          lastRefreshedAt: new Date().toISOString(),
        }));
      },

      reset: () => {
        set({
          connections: SEED_CONNECTIONS as IntegrationConnection[],
          syncState: buildSeedSyncState(SEED_CONNECTIONS as IntegrationConnection[]),
          lastRefreshedAt: new Date().toISOString(),
        });
      },

      computeNextSyncAt: (frequency, from = new Date()) => {
        return computeNextSyncAtImpl(frequency, from);
      },

      triggerSync: async (connectionId, syncType = "manual") => {
        const conn = get().connections.find((c) => c.id === connectionId);
        if (!conn) {
          throw new Error(`Connection ${connectionId} not found`);
        }
        const provider = ALL_PROVIDERS.find((p) => p.id === conn.providerId);
        const cfg = provider?.syncConfig;
        const startedAt = new Date();
        const eventId = `sync-${connectionId}-${startedAt.getTime()}`;

        // Mark as syncing.
        set((state) => {
          const cur = state.syncState[connectionId] ?? {
            lastSyncAt: undefined,
            nextSyncAt: undefined,
            recordsPulled: 0,
            recordsPushed: 0,
            history: [],
            liveStatus: "idle" as const,
          };
          const pendingEvent: SyncEvent = {
            id: eventId,
            connectionId,
            providerId: conn.providerId,
            syncType,
            status: "syncing",
            recordsPulled: 0,
            recordsPushed: 0,
            durationMs: 0,
            startedAt: startedAt.toISOString(),
            message: "Syncing…",
          };
          return {
            syncState: {
              ...state.syncState,
              [connectionId]: {
                ...cur,
                liveStatus: "syncing",
                history: [pendingEvent, ...cur.history].slice(0, 10),
              },
            },
          };
        });

        // Simulate the network round-trip. Real-time providers are faster.
        const delay = cfg?.frequency === "real-time" ? 700 : 1100 + Math.random() * 800;
        await new Promise((r) => setTimeout(r, delay));

        // Determine outcome.
        // 8% chance of error on non-real-time providers, 4% on real-time (less likely).
        const isError =
          Math.random() < (cfg?.frequency === "real-time" ? 0.04 : 0.08) &&
          conn.providerId !== "digilocker";
        const completedAt = new Date();
        const durationMs = Math.round(completedAt.getTime() - startedAt.getTime());
        const recordsPulled = isError
          ? 0
          : Math.max(
              1,
              Math.round((cfg?.typicalRecordsPerSync ?? 10) * (0.7 + Math.random() * 0.5)),
            );
        const recordsPushed = isError
          ? 0
          : Math.round(recordsPulled * (0.25 + Math.random() * 0.2));
        const counter = (get().syncState[connectionId]?.history.length ?? 0) + 1;
        const message = isError
          ? "Sync failed — upstream returned 503 (service unavailable)"
          : pickMessage(conn.providerId, counter);

        const event: SyncEvent = {
          id: eventId,
          connectionId,
          providerId: conn.providerId,
          syncType,
          status: isError ? "error" : "ok",
          recordsPulled,
          recordsPushed,
          durationMs,
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          message,
          errorMessage: isError ? "503 Service Unavailable from upstream portal" : undefined,
        };

        // Apply final state.
        set((state) => {
          const cur = state.syncState[connectionId] ?? {
            lastSyncAt: undefined,
            nextSyncAt: undefined,
            recordsPulled: 0,
            recordsPushed: 0,
            history: [],
            liveStatus: "idle" as const,
          };
          const frequency = conn.syncFrequency ?? cfg?.frequency ?? "on-demand";
          const nextSyncAt = computeNextSyncAtImpl(frequency, completedAt);
          // Replace the pending event with the completed one.
          const history = [event, ...cur.history.filter((e) => e.id !== eventId)].slice(0, 10);
          return {
            syncState: {
              ...state.syncState,
              [connectionId]: {
                lastSyncAt: completedAt.toISOString(),
                nextSyncAt,
                recordsPulled: cur.recordsPulled + recordsPulled,
                recordsPushed: cur.recordsPushed + recordsPushed,
                history,
                liveStatus: isError ? "error" : "ok",
                lastError: isError ? event.errorMessage : undefined,
              },
            },
            // Also reflect the sync on the connection's lastSyncAt/Message (drives the card telemetry).
            connections: state.connections.map((c) =>
              c.id === connectionId
                ? {
                    ...c,
                    lastSyncAt: completedAt.toISOString(),
                    lastSyncStatus: isError ? "error" : "ok",
                    lastSyncMessage: message,
                    status: isError && c.status === "connected" ? "error" : c.status === "error" && !isError ? "connected" : c.status,
                  }
                : c,
            ),
            lastRefreshedAt: completedAt.toISOString(),
          };
        });

        return event;
      },

      // === Server sync (Prisma-backed) ===
      syncFromServer: async (companyId = "PLATFORM") => {
        set({ syncing: true });
        try {
          const res = await fetch(
            `/api/integrations?companyId=${encodeURIComponent(companyId)}`,
            { method: "GET", headers: { "Content-Type": "application/json" } },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const connections: IntegrationConnection[] = (data.connections || []).map((c: {
            id: string;
            providerId: string;
            status: IntegrationStatus;
            mode: "live" | "test";
            priority?: number;
            isPrimary?: boolean;
            fieldValues: Record<string, string>;
            connectedAt: string;
            lastSyncAt?: string | null;
            lastSyncStatus?: "ok" | "error" | "pending" | null;
            lastSyncMessage?: string | null;
            label?: string | null;
          }) => ({
            id: c.id,
            providerId: c.providerId,
            status: c.status,
            mode: c.mode,
            priority: c.priority,
            isPrimary: c.isPrimary,
            fieldValues: c.fieldValues,
            connectedAt: c.connectedAt,
            lastSyncAt: c.lastSyncAt ?? undefined,
            lastSyncStatus: c.lastSyncStatus ?? undefined,
            lastSyncMessage: c.lastSyncMessage ?? undefined,
            label: c.label ?? undefined,
          }));
          set({
            connections,
            lastRefreshedAt: new Date().toISOString(),
            syncing: false,
            syncOutcome: {
              ok: true,
              message: `${connections.length} connections synced from server`,
              at: new Date().toISOString(),
            },
          });
        } catch (err) {
          set({
            syncing: false,
            syncOutcome: {
              ok: false,
              message: err instanceof Error ? err.message : "Sync failed",
              at: new Date().toISOString(),
            },
          });
        }
      },

      seedToServer: async (companyId = "PLATFORM") => {
        set({ syncing: true });
        try {
          const res = await fetch("/api/integrations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // Re-pull to hydrate the freshly seeded state.
          await get().syncFromServer(companyId);
          set({
            syncing: false,
            syncOutcome: {
              ok: true,
              message: `Seeded ${data.inserted} new, ${data.skipped} already present`,
              at: new Date().toISOString(),
            },
          });
        } catch (err) {
          set({
            syncing: false,
            syncOutcome: {
              ok: false,
              message: err instanceof Error ? err.message : "Seed failed",
              at: new Date().toISOString(),
            },
          });
        }
      },

      testConnectionRemote: async (providerId, fieldValues, mode, connectionId) => {
        try {
          const res = await fetch("/api/integrations/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerId, fieldValues, mode, connectionId }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // Reflect the result in local state.
          if (connectionId) {
            set((state) => ({
              connections: state.connections.map((c) =>
                c.id === connectionId
                  ? {
                      ...c,
                      status: data.ok ? "connected" : "error",
                      lastSyncAt: new Date().toISOString(),
                      lastSyncStatus: data.ok ? "ok" : "error",
                      lastSyncMessage: data.message,
                    }
                  : c,
              ),
            }));
          }
          return {
            ok: data.ok,
            message: data.message,
            latencyMs: data.latencyMs,
          };
        } catch (err) {
          return {
            ok: false,
            message: err instanceof Error ? err.message : "Network error",
          };
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the connections + syncState + lastRefreshedAt, not the actions.
      partialize: (state) => ({
        connections: state.connections,
        syncState: state.syncState,
        lastRefreshedAt: state.lastRefreshedAt,
      }),
      // Migration: if a v1 cache exists, drop its syncState (which doesn't exist there)
      // and let us rebuild from seeds. Connections from v1 are still valid because the
      // IntegrationConnection shape is backward-compatible.
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted as Partial<IntegrationsState>;
        const p = persisted as Partial<IntegrationsState> & { syncState?: Record<string, unknown> };
        if (version < 2) {
          // Rebuild syncState from the connections list.
          if (Array.isArray(p.connections)) {
            p.syncState = buildSeedSyncState(p.connections as IntegrationConnection[]);
          }
        }
        return p;
      },
    },
  ),
);

/* ============================================================
   Selectors (memoised, return new objects only when needed)
   ============================================================ */

export function selectConnectionsByCategory(
  connections: IntegrationConnection[],
  category: IntegrationCategory,
): IntegrationConnection[] {
  return connections.filter((c) => {
    const provider = ALL_PROVIDERS.find((p) => p.id === c.providerId);
    return provider?.category === category;
  });
}

export function selectPrimaryConnection(
  connections: IntegrationConnection[],
  category: IntegrationCategory,
): IntegrationConnection | undefined {
  return selectConnectionsByCategory(connections, category).find((c) => c.isPrimary);
}

export function selectKpis(connections: IntegrationConnection[]) {
  const byStatus = {
    connected: connections.filter((c) => c.status === "connected").length,
    sandbox: connections.filter((c) => c.status === "sandbox").length,
    needsConfig: connections.filter((c) => c.status === "needs-config").length,
    error: connections.filter((c) => c.status === "error").length,
    available: ALL_PROVIDERS.length - connections.length,
  };
  const byCategory: Record<IntegrationCategory, number> = {
    payment: 0, sms: 0, whatsapp: 0, extension: 0, plugin: 0, telemetry: 0, identity: 0,
    logistics: 0, ecommerce: 0, warehouse: 0, maps: 0, gov: 0, fuel: 0, banking: 0,
  };
  for (const c of connections) {
    const provider = ALL_PROVIDERS.find((p) => p.id === c.providerId);
    if (provider) byCategory[provider.category]++;
  }
  return { byStatus, byCategory, totalConnected: connections.length, totalAvailable: ALL_PROVIDERS.length };
}

/** Selector: sync state for a single connection (returns a default if absent). */
export function selectSyncState(
  syncState: Record<string, ConnectionSyncState>,
  connectionId: string,
): ConnectionSyncState | null {
  return syncState[connectionId] ?? null;
}

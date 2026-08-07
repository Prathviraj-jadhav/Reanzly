"use client";

import { create } from "zustand";

/* ============================================================
   pod-store.ts - Proof of Delivery records.
   Backed by the real Pod model via /api/pod (session/company-scoped),
   replacing the former Zustand persist()+localStorage store. Photos stay
   inline as base64 data URLs (src/lib/photo.ts fileToCapturedPhoto), just
   persisted as Pod columns instead of browser storage.
   ============================================================ */

export type PODType = "Delivery" | "Pickup" | "Return";
export type PODStatus = "Delivered" | "Pending" | "Rejected" | "Damaged";
export type PODSubmissionStatus = "Draft" | "Submitted" | "Approved";

export interface CapturedImage {
  full: string; // base64 data URL
  thumb: string;
  bytes: number;
}

export interface PODAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

export interface ProofOfDelivery {
  id: string;
  voucherNumber: string;
  consignmentNumber: string;
  type: PODType;
  source: string;
  destination: string;
  consignee: string;
  consignor: string;
  consignmentDate: string;
  loadingDate: string;
  // POD capture
  frontImage?: CapturedImage;
  backImage?: CapturedImage;
  signatureImage?: CapturedImage;
  receivingDate?: string;
  reportingDate?: string;
  unloadingDate?: string;
  weight?: number; // kg
  packages?: number;
  // Status & report
  status: PODStatus;
  reportNumber: string;
  submissionStatus: PODSubmissionStatus;
  deliveryDate?: string;
  // Additional
  contactPhone?: string;
  contactEmail?: string;
  contactRelation?: string;
  stampImage?: CapturedImage;
  signatureDrawn?: string; // base64 PNG from canvas
  startOdometer?: number;
  endOdometer?: number;
  distance?: number;
  remarks?: string;
  // Charges
  unloadingCharges?: number;
  otherCharges?: number;
  vehicleNumber?: string;
  vehicleHireNumber?: string;
  // Audit
  audit: PODAuditEntry[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

type NewPOD = Omit<ProofOfDelivery, "id" | "voucherNumber" | "reportNumber" | "audit" | "createdAt" | "updatedAt" | "createdBy">;

interface PODState {
  pods: ProofOfDelivery[];
  hasHydrated: boolean;
  fetchPods: () => Promise<void>;

  addPOD: (p: NewPOD) => Promise<ProofOfDelivery | null>;
  updatePOD: (id: string, patch: Partial<ProofOfDelivery>) => Promise<ProofOfDelivery | null>;
  removePOD: (id: string) => Promise<boolean>;
  setSubmissionStatus: (id: string, status: PODSubmissionStatus) => Promise<boolean>;
}

export const usePODStore = create<PODState>()((set, get) => ({
  pods: [],
  hasHydrated: false,

  fetchPods: async () => {
    try {
      const res = await fetch("/api/pod");
      if (!res.ok) {
        set({ hasHydrated: true });
        return;
      }
      const { pods } = await res.json();
      set({ pods, hasHydrated: true });
    } catch {
      set({ hasHydrated: true });
    }
  },

  addPOD: async (p) => {
    try {
      const res = await fetch("/api/pod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!res.ok) return null;
      const { pod } = await res.json();
      set((s) => ({ pods: [pod, ...s.pods] }));
      return pod as ProofOfDelivery;
    } catch {
      return null;
    }
  },

  updatePOD: async (id, patch) => {
    try {
      const res = await fetch(`/api/pod/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return null;
      const { pod } = await res.json();
      set((s) => ({ pods: s.pods.map((x) => (x.id === id ? pod : x)) }));
      return pod as ProofOfDelivery;
    } catch {
      return null;
    }
  },

  removePOD: async (id) => {
    try {
      const res = await fetch(`/api/pod/${id}`, { method: "DELETE" });
      if (!res.ok) return false;
      set((s) => ({ pods: s.pods.filter((p) => p.id !== id) }));
      return true;
    } catch {
      return false;
    }
  },

  setSubmissionStatus: async (id, status) => {
    const updated = await get().updatePOD(id, { submissionStatus: status });
    return updated !== null;
  },
}));

/* ============================================================
   Constants
   ============================================================ */
export const POD_TYPES: PODType[] = ["Delivery", "Pickup", "Return"];
export const POD_STATUSES: PODStatus[] = ["Delivered", "Pending", "Rejected", "Damaged"];
export const POD_SUBMISSION_STATUSES: PODSubmissionStatus[] = ["Draft", "Submitted", "Approved"];

/* ============================================================
   Format helpers (self-contained)
   ============================================================ */
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}

/** Real lorry receipts (for the create wizard's autocomplete), fetched fresh each call. */
export async function lorryReceiptOptions(): Promise<{ lrNumber: string; origin: string; destination: string; consignor: string; consignee: string }[]> {
  try {
    const res = await fetch("/api/lorry-receipts");
    if (!res.ok) return [];
    const { lrs } = await res.json();
    return (lrs ?? []).slice(0, 30).map((lr: any) => ({
      lrNumber: lr.lrNumber,
      origin: lr.origin,
      destination: lr.destination,
      consignor: lr.consignor,
      consignee: lr.consignee,
    }));
  } catch {
    return [];
  }
}

/** Days-from-now ISO string (used by the create wizard). */
export function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

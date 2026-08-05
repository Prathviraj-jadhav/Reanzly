"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LORRY_RECEIPTS, TRIPS } from "@/lib/mock-data";

/* ============================================================
   pod-store.ts - Proof of Delivery records.
   Persisted to localStorage under "reanzly-pod".

   Photos are stored inline as base64 data URLs (downscaled by
   src/lib/photo.ts fileToCapturedPhoto). For larger deploys,
   swap to /api/storage/[...key] uploads.
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

interface PODState {
  pods: ProofOfDelivery[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  addPOD: (p: Omit<ProofOfDelivery, "id" | "voucherNumber" | "reportNumber" | "audit" | "createdAt" | "updatedAt" | "createdBy">) => string;
  updatePOD: (id: string, patch: Partial<ProofOfDelivery>) => void;
  removePOD: (id: string) => void;
  setSubmissionStatus: (id: string, status: PODSubmissionStatus) => void;
  appendAudit: (id: string, user: string, action: string) => void;
}

const NOW = () => new Date().toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const DAYS_FROM_NOW = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

function seedPODs(): ProofOfDelivery[] {
  const out: ProofOfDelivery[] = [];
  const sample = LORRY_RECEIPTS.slice(0, 14);
  sample.forEach((lr, i) => {
    const trip = TRIPS.find((t) => t.lrNumber === lr.lrNumber);
    const delivered = trip?.status === "Delivered";
    const statuses: PODStatus[] = ["Delivered", "Delivered", "Delivered", "Pending", "Damaged", "Rejected"];
    const subs: PODSubmissionStatus[] = ["Approved", "Approved", "Submitted", "Submitted", "Draft", "Approved"];
    const status = delivered ? statuses[i % statuses.length] : "Pending";
    const sub = delivered ? subs[i % subs.length] : "Draft";
    const pod: ProofOfDelivery = {
      id: `pod-${i + 1}`,
      voucherNumber: `RZ-POD-${String(i + 1).padStart(5, "0")}`,
      consignmentNumber: lr.lrNumber,
      type: i % 5 === 0 ? "Return" : i % 3 === 0 ? "Pickup" : "Delivery",
      source: lr.origin,
      destination: lr.destination,
      consignee: lr.consignee,
      consignor: lr.consignor,
      consignmentDate: lr.date,
      loadingDate: DAYS_AGO(8 - (i % 7)),
      receivingDate: delivered ? DAYS_AGO(6 - (i % 5)) : undefined,
      reportingDate: delivered ? DAYS_AGO(7 - (i % 5)) : undefined,
      unloadingDate: delivered ? DAYS_AGO(5 - (i % 4)) : undefined,
      weight: 1200 + (i % 9) * 800,
      packages: 12 + (i % 30),
      status,
      reportNumber: `RZ-PODR-${String(i + 1).padStart(4, "0")}`,
      submissionStatus: sub,
      deliveryDate: delivered ? DAYS_AGO(5 - (i % 4)) : undefined,
      contactPhone: `+91 ${(9876543210 - i * 13).toString().slice(0, 10)}`,
      contactEmail: `consignee.${i + 1}@example.in`,
      contactRelation: i % 2 === 0 ? "Owner" : "Authorized Representative",
      startOdometer: 48210 + i * 137,
      endOdometer: 48210 + i * 137 + 240 + (i % 80),
      distance: 240 + (i % 80),
      remarks: i % 4 === 0 ? "Goods received in good condition" : i % 4 === 1 ? "Minor delay due to traffic" : "",
      unloadingCharges: 600 + (i % 5) * 200,
      otherCharges: i % 3 === 0 ? 250 : 0,
      vehicleNumber: trip?.vehicleName ?? "MH 12 AB 7896",
      vehicleHireNumber: `VH-${String(1000 + i).padStart(5, "0")}`,
      createdBy: i % 2 === 0 ? "Driver · Rohit D." : "Driver · Sukhbir S.",
      createdAt: DAYS_AGO(6 - (i % 5)),
      updatedAt: DAYS_AGO(5 - (i % 4)),
      audit: [
        {
          id: `a-${i}-1`,
          timestamp: DAYS_AGO(6 - (i % 5)),
          user: i % 2 === 0 ? "Driver · Rohit D." : "Driver · Sukhbir S.",
          action: "POD created",
        },
        ...(delivered
          ? [{
              id: `a-${i}-2`,
              timestamp: DAYS_AGO(5 - (i % 4)),
              user: "Accountant · Meena",
              action: "Submission approved",
            }]
          : []),
      ],
    };
    out.push(pod);
  });
  // add one future pending POD for variety
  out.push({
    id: "pod-15",
    voucherNumber: "RZ-POD-00015",
    consignmentNumber: LORRY_RECEIPTS[14]?.lrNumber ?? "RZ-LR-2024-0350",
    type: "Delivery",
    source: LORRY_RECEIPTS[14]?.origin ?? "Mumbai",
    destination: LORRY_RECEIPTS[14]?.destination ?? "Nagpur",
    consignee: LORRY_RECEIPTS[14]?.consignee ?? "Bharat Logistics",
    consignor: LORRY_RECEIPTS[14]?.consignor ?? "Sterling Industries",
    consignmentDate: DAYS_AGO(1),
    loadingDate: DAYS_AGO(1),
    status: "Pending",
    reportNumber: "RZ-PODR-0015",
    submissionStatus: "Draft",
    remarks: "Awaiting delivery confirmation",
    vehicleNumber: "MH 14 PQ 4421",
    createdBy: "Driver · Murthy I.",
    createdAt: DAYS_AGO(1),
    updatedAt: DAYS_AGO(1),
    audit: [
      {
        id: "a-15-1",
        timestamp: DAYS_AGO(1),
        user: "Driver · Murthy I.",
        action: "POD created (draft)",
      },
    ],
  });
  return out;
}

function nextVoucherNumber(existing: { voucherNumber: string }[]): string {
  const nums = existing
    .map((x) => parseInt(x.voucherNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `RZ-POD-${String(max + 1).padStart(5, "0")}`;
}

export const usePODStore = create<PODState>()(
  persist(
    (set, get) => ({
      pods: seedPODs(),
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addPOD: (p) => {
        const id = `pod-${Date.now().toString(36)}-${Math.floor(Math.random() * 99)}`;
        const voucherNumber = nextVoucherNumber(get().pods);
        const reportNumber = `RZ-PODR-${String(get().pods.length + 1).padStart(4, "0")}`;
        const ts = NOW();
        const full: ProofOfDelivery = {
          ...p,
          id,
          voucherNumber,
          reportNumber,
          audit: [
            { id: `a-${id}`, timestamp: ts, user: "Current user", action: "POD created" },
          ],
          createdBy: "Current user",
          createdAt: ts,
          updatedAt: ts,
        };
        set((s) => ({ pods: [full, ...s.pods] }));
        return id;
      },
      updatePOD: (id, patch) =>
        set((s) => ({
          pods: s.pods.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: NOW() } : p,
          ),
        })),
      removePOD: (id) =>
        set((s) => ({ pods: s.pods.filter((p) => p.id !== id) })),
      setSubmissionStatus: (id, status) =>
        set((s) => ({
          pods: s.pods.map((p) =>
            p.id === id
              ? {
                  ...p,
                  submissionStatus: status,
                  updatedAt: NOW(),
                  audit: [
                    ...p.audit,
                    {
                      id: `a-${Date.now().toString(36)}`,
                      timestamp: NOW(),
                      user: "Current user",
                      action: `Submission status → ${status}`,
                    },
                  ],
                }
              : p,
          ),
        })),
      appendAudit: (id, user, action) =>
        set((s) => ({
          pods: s.pods.map((p) =>
            p.id === id
              ? {
                  ...p,
                  updatedAt: NOW(),
                  audit: [
                    ...p.audit,
                    {
                      id: `a-${Date.now().toString(36)}`,
                      timestamp: NOW(),
                      user,
                      action,
                    },
                  ],
                }
              : p,
          ),
        })),
    }),
    {
      name: "reanzly-pod",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ pods: s.pods }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PODState>;
        const base = current as PODState;
        return {
          ...base,
          ...p,
          hasHydrated: base.hasHydrated,
        };
      },
    },
  ),
);

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

/** Lorry receipts list - used by the create wizard for autocomplete. */
export function lorryReceiptOptions(): { lrNumber: string; origin: string; destination: string; consignor: string; consignee: string }[] {
  return LORRY_RECEIPTS.slice(0, 30).map((lr) => ({
    lrNumber: lr.lrNumber,
    origin: lr.origin,
    destination: lr.destination,
    consignor: lr.consignor,
    consignee: lr.consignee,
  }));
}

/** Days-from-now ISO string (used by the create wizard). */
export function daysFromNow(n: number): string {
  return DAYS_FROM_NOW(n);
}

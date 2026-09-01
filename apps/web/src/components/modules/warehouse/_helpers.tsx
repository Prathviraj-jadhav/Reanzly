"use client";

import type { ReactNode } from "react";

/* ============================================================
   Warehouse module - domain types, formatters, and mock data.
   Indian logistics context: godowns, SKUs (cement, steel, plywood,
   paint, etc.), GSTIN-formatted consignors, INR amounts.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
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
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

// ===== Domain enums =====
export const SKU_CATEGORIES = [
  "Cement",
  "Steel & Iron",
  "Plywood",
  "Paints",
  "Hardware",
  "Electrical",
  "Plumbing",
  "Chemicals",
] as const;

export const INBOUND_STATUSES = [
  "Scheduled",
  "In Transit",
  "Received",
  "Partial",
  "Cancelled",
] as const;

export const OUTBOUND_STATUSES = [
  "Picking",
  "Packed",
  "Dispatched",
  "Delivered",
  "Cancelled",
] as const;

export const POD_STATUSES = [
  "Pending",
  "Received",
  "Verified",
  "Rejected",
] as const;

export const STORAGE_TYPES = ["Open Yard", "Covered Shed", "Cold Storage", "Bonded", "Hazmat"] as const;

// ===== Types =====
export type SkuCategory = (typeof SKU_CATEGORIES)[number];
export type InboundStatus = (typeof INBOUND_STATUSES)[number];
export type OutboundStatus = (typeof OUTBOUND_STATUSES)[number];
export type PodStatus = (typeof POD_STATUSES)[number];
export type StorageType = (typeof STORAGE_TYPES)[number];

export interface Sku {
  id: string;
  skuCode: string;
  name: string;
  category: SkuCategory;
  hsn: string;
  unit: string;
  stock: number;
  reserved: number;
  minLevel: number;
  reorderQty: number;
  unitCost: number;
  location: string;
  godown: string;
  supplier: string;
  gstRate: number;
  lastMovement?: string;
}

export interface InboundShipment {
  id: string;
  grn: string;
  refNo: string;
  consignor: string;
  origin: string;
  vehicle: string;
  lrNumber: string;
  expectedDate: string;
  receivedDate?: string;
  skus: { skuCode: string; name: string; qty: number; received: number; unit: string }[];
  status: InboundStatus;
  godown: string;
  totalValue: number;
  receiver?: string;
  remarks?: string;
}

export interface OutboundShipment {
  id: string;
  odo: string;
  refNo: string;
  consignee: string;
  destination: string;
  vehicle: string;
  lrNumber: string;
  orderDate: string;
  dispatchDate?: string;
  deliveryDate?: string;
  skus: { skuCode: string; name: string; qty: number; unit: string }[];
  status: OutboundStatus;
  godown: string;
  totalValue: number;
  picker?: string;
  remarks?: string;
}

export interface StorageLocation {
  id: string;
  code: string;
  name: string;
  type: StorageType;
  godown: string;
  capacityPallets: number;
  occupiedPallets: number;
  manager: string;
  area: number;
  lastStocktake?: string;
}

export interface PodReceive {
  id: string;
  podNo: string;
  lrNumber: string;
  consignor: string;
  consignee: string;
  destination: string;
  vehicle: string;
  deliveryDate?: string;
  receivedDate?: string;
  status: PodStatus;
  damageCount: number;
  shortageQty: number;
  receiver?: string;
  remarks?: string;
}

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function inboundStatusBadge(status: InboundStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<InboundStatus, { variant: Variant; pulse?: boolean }> = {
    Scheduled: { variant: "muted" },
    "In Transit": { variant: "outline", pulse: true },
    Received: { variant: "solid" },
    Partial: { variant: "outline" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function outboundStatusBadge(status: OutboundStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<OutboundStatus, { variant: Variant; pulse?: boolean }> = {
    Picking: { variant: "outline", pulse: true },
    Packed: { variant: "outline" },
    Dispatched: { variant: "solid", pulse: true },
    Delivered: { variant: "solid" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function podStatusBadge(status: PodStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<PodStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    Received: { variant: "solid" },
    Verified: { variant: "solid" },
    Rejected: { variant: "muted" },
  };
  return map[status];
}

export function stockLevelMeta(sku: Sku): { variant: Variant; label: string } {
  if (sku.stock <= 0) return { variant: "solid", label: "Out of stock" };
  if (sku.stock <= sku.minLevel) return { variant: "solid", label: "Low stock" };
  if (sku.stock <= sku.minLevel * 2) return { variant: "outline", label: "Below target" };
  return { variant: "muted", label: "Healthy" };
}

export function utilisationMeta(pct: number): { variant: Variant; label: string } {
  if (pct >= 95) return { variant: "solid", label: "Critical" };
  if (pct >= 80) return { variant: "outline", label: "High" };
  if (pct >= 40) return { variant: "muted", label: "Balanced" };
  return { variant: "muted", label: "Low" };
}

// ===== Tab config =====
export const WAREHOUSE_TABS = [
  { id: "inventory", label: "Inventory" },
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
  { id: "storage", label: "Storage Locations" },
  { id: "pod-receive", label: "POD Receive" },
  { id: "pick-pack", label: "Pick & Pack" },
  { id: "cycle-count", label: "Cycle Count" },
  { id: "cross-docking", label: "Cross-Docking" },
  { id: "returns", label: "Returns / RMA" },
  { id: "yard", label: "Yard" },
  { id: "dock-scheduling", label: "Dock Scheduling" },
] as const;

export type WarehouseTab = (typeof WAREHOUSE_TABS)[number]["id"];

// ===== Mock data =====
const GODOWNS = [
  "Bhiwandi Godown A",
  "Bhiwandi Godown B",
  "Taloja Warehouse",
  "Pune Chakan DC",
  "Nagpur Hub",
];

const CONSIGNORS = [
  "UltraTech Cement Ltd",
  "Tata Steel BSL",
  "Century Plywood",
  "Asian Paints Ltd",
  "Havells India",
  "Supreme Industries",
  "Finolex Pipes",
  "JK Cement",
];

const CONSIGNEES = [
  "Shree Construction",
  "Patil Builders",
  "Maharashtra Infra",
  "Verma & Sons Hardware",
  "Coastal Developers",
  "Sharma Contractors",
  "Reddy Civil Works",
  "Nair Enterprises",
];

const CITIES = [
  "Mumbai", "Pune", "Nashik", "Nagpur", "Aurangabad",
  "Surat", "Ahmedabad", "Hyderabad", "Bengaluru", "Indore",
];

const VEHICLES = [
  "MH 14 AB 1234", "MH 12 JK 4521", "MH 04 MN 7820", "GJ 01 XY 9931",
  "MH 09 PQ 3344", "MH 47 RS 6677", "KA 05 GH 1199", "TS 09 KL 4488",
];

const SKU_NAMES: { name: string; cat: SkuCategory; hsn: string; unit: string; rate: number; gst: number }[] = [
  { name: "OPC Cement 53 Grade - 50kg", cat: "Cement", hsn: "2523", unit: "Bag", rate: 380, gst: 28 },
  { name: "PPC Cement - 50kg", cat: "Cement", hsn: "2523", unit: "Bag", rate: 340, gst: 28 },
  { name: "TMT Steel Bar Fe500 - 12mm", cat: "Steel & Iron", hsn: "7213", unit: "Ton", rate: 58000, gst: 18 },
  { name: "TMT Steel Bar Fe500 - 16mm", cat: "Steel & Iron", hsn: "7213", unit: "Ton", rate: 58400, gst: 18 },
  { name: "Mild Steel Angle - 50x50x6", cat: "Steel & Iron", hsn: "7216", unit: "Meter", rate: 245, gst: 18 },
  { name: "Century Plywood MR - 8x4 ft", cat: "Plywood", hsn: "4412", unit: "Sheet", rate: 1450, gst: 28 },
  { name: "Greenply Marine Ply - 18mm", cat: "Plywood", hsn: "4412", unit: "Sheet", rate: 2840, gst: 28 },
  { name: "Asian Paints Apex Ultima - 20L", cat: "Paints", hsn: "3208", unit: "Drum", rate: 8200, gst: 28 },
  { name: "Berger Weathercoat - 10L", cat: "Paints", hsn: "3208", unit: "Drum", rate: 4150, gst: 28 },
  { name: "Havells Wires 1.5 sqmm - 90m", cat: "Electrical", hsn: "8544", unit: "Coil", rate: 2880, gst: 18 },
  { name: "Polycab Wire 2.5 sqmm - 90m", cat: "Electrical", hsn: "8544", unit: "Coil", rate: 4150, gst: 18 },
  { name: "Anchor Switch Socket 6A", cat: "Electrical", hsn: "8536", unit: "Pcs", rate: 65, gst: 18 },
  { name: "Finolex PVC Pipe - 4 inch", cat: "Plumbing", hsn: "3917", unit: "Meter", rate: 320, gst: 18 },
  { name: "Supreme CPVC Elbow 4 inch", cat: "Plumbing", hsn: "3917", unit: "Pcs", rate: 145, gst: 18 },
  { name: "Jaquar CP Faucet - Pillar", cat: "Plumbing", hsn: "7418", unit: "Pcs", rate: 890, gst: 18 },
  { name: "Dewalt Drill Machine 13mm", cat: "Hardware", hsn: "8467", unit: "Pcs", rate: 4250, gst: 28 },
  { name: "Stanley Claw Hammer 500g", cat: "Hardware", hsn: "8205", unit: "Pcs", rate: 540, gst: 18 },
  { name: "Bosch Angle Grinder 4 inch", cat: "Hardware", hsn: "8467", unit: "Pcs", rate: 2890, gst: 28 },
  { name: "Tile Adhesive 25kg", cat: "Chemicals", hsn: "3214", unit: "Bag", rate: 720, gst: 28 },
  { name: "Wall Putty 40kg", cat: "Chemicals", hsn: "3214", unit: "Bag", rate: 680, gst: 28 },
  { name: "Waterproofing Compound 1kg", cat: "Chemicals", hsn: "3824", unit: "Pcs", rate: 165, gst: 18 },
  { name: "Britannia Rat Trap Bond Brick", cat: "Hardware", hsn: "6901", unit: "1000 Pcs", rate: 8400, gst: 5 },
];

export const SKUS: Sku[] = SKU_NAMES.map((s, i) => {
  const stock = [0, 12, 24, 48, 96, 156, 240, 320, 540][i % 9];
  const reserved = Math.floor(stock * 0.18);
  const minLevel = Math.max(12, Math.floor(stock * 0.15));
  return {
    id: `sku-${String(i + 1).padStart(3, "0")}`,
    skuCode: `RZ-${s.hsn}-${String(i + 1).padStart(3, "0")}`,
    name: s.name,
    category: s.cat,
    hsn: s.hsn,
    unit: s.unit,
    stock,
    reserved,
    minLevel,
    reorderQty: minLevel * 3,
    unitCost: s.rate,
    location: `Rack-${String.fromCharCode(65 + (i % 8))}-${(i % 9) + 1}`,
    godown: GODOWNS[i % GODOWNS.length],
    supplier: CONSIGNORS[i % CONSIGNORS.length],
    gstRate: s.gst,
    lastMovement: daysAgo(i * 6 + 1),
  };
});

// Inbound shipments - 14 records
export const INBOUND_SHIPMENTS: InboundShipment[] = Array.from({ length: 14 }).map((_, i) => {
  const status: InboundStatus =
    i < 4 ? "Received" : i < 6 ? "Partial" : i < 10 ? "In Transit" : i < 13 ? "Scheduled" : "Cancelled";
  const skuPick = SKUS.slice(i * 1, i * 1 + 3);
  const skus = skuPick.map((s) => ({
    skuCode: s.skuCode,
    name: s.name,
    qty: 50 + (i * 13) % 200,
    received: status === "Received" ? 50 + (i * 13) % 200 : status === "Partial" ? Math.floor((50 + (i * 13) % 200) * 0.6) : 0,
    unit: s.unit,
  }));
  const totalValue = skus.reduce((sum, k) => sum + k.qty * (SKUS.find((x) => x.skuCode === k.skuCode)?.unitCost || 0), 0);
  return {
    id: `inb-${String(i + 1).padStart(3, "0")}`,
    grn: `GRN-${String(2400 + i).padStart(4, "0")}`,
    refNo: `PO-${String(11800 + i).padStart(5, "0")}`,
    consignor: CONSIGNORS[i % CONSIGNORS.length],
    origin: CITIES[(i + 3) % CITIES.length],
    vehicle: VEHICLES[i % VEHICLES.length],
    lrNumber: `LR-${String(88000 + i * 7).padStart(6, "0")}`,
    expectedDate: daysAhead((i - 4) * 2),
    receivedDate: status === "Received" || status === "Partial" ? daysAgo(i + 1) : undefined,
    skus,
    status,
    godown: GODOWNS[i % GODOWNS.length],
    totalValue,
    receiver: status === "Received" || status === "Partial" ? "Balwinder Sandhu" : undefined,
    remarks: status === "Partial" ? "Shortage of 12 bags - under claim" : undefined,
  };
});

// Outbound shipments - 14 records
export const OUTBOUND_SHIPMENTS: OutboundShipment[] = Array.from({ length: 14 }).map((_, i) => {
  const status: OutboundStatus =
    i < 3 ? "Delivered" : i < 6 ? "Dispatched" : i < 9 ? "Packed" : i < 12 ? "Picking" : "Cancelled";
  const skuPick = SKUS.slice((i + 2) * 1, (i + 2) * 1 + 2);
  const skus = skuPick.map((s) => ({
    skuCode: s.skuCode,
    name: s.name,
    qty: 20 + (i * 11) % 150,
    unit: s.unit,
  }));
  const totalValue = skus.reduce((sum, k) => sum + k.qty * (SKUS.find((x) => x.skuCode === k.skuCode)?.unitCost || 0), 0);
  return {
    id: `out-${String(i + 1).padStart(3, "0")}`,
    odo: `ODO-${String(3120 + i).padStart(4, "0")}`,
    refNo: `SO-${String(24700 + i).padStart(5, "0")}`,
    consignee: CONSIGNEES[i % CONSIGNEES.length],
    destination: CITIES[(i + 5) % CITIES.length],
    vehicle: VEHICLES[(i + 2) % VEHICLES.length],
    lrNumber: `LR-${String(88200 + i * 5).padStart(6, "0")}`,
    orderDate: daysAgo(i + 2),
    dispatchDate: status === "Delivered" || status === "Dispatched" ? daysAgo(i) : status === "Packed" ? daysAgo(0) : undefined,
    deliveryDate: status === "Delivered" ? daysAgo(i - 1) : undefined,
    skus,
    status,
    godown: GODOWNS[i % GODOWNS.length],
    totalValue,
    picker: status !== "Cancelled" ? "Sukhbir Singh" : undefined,
    remarks: status === "Picking" ? "Awaiting forklift availability" : undefined,
  };
});

// Storage locations - 10 records
export const STORAGE_LOCATIONS: StorageLocation[] = Array.from({ length: 10 }).map((_, i) => {
  const cap = [40, 60, 80, 120, 200][i % 5];
  const occ = Math.floor(cap * (0.45 + (i * 0.07) % 0.55));
  const type: StorageType = ["Covered Shed", "Open Yard", "Covered Shed", "Cold Storage", "Bonded", "Hazmat"][i % 6] as StorageType;
  return {
    id: `loc-${String(i + 1).padStart(2, "0")}`,
    code: `RZ-${GODOWNS[i % GODOWNS.length].split(" ")[0].slice(0, 3).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
    name: `${GODOWNS[i % GODOWNS.length]} - Block ${String.fromCharCode(65 + (i % 4))}`,
    type,
    godown: GODOWNS[i % GODOWNS.length],
    capacityPallets: cap,
    occupiedPallets: occ,
    manager: ["Balwinder Sandhu", "Manjeet Singh", "Sukhbir Brar", "Jaspal Gill"][i % 4],
    area: cap * 12,
    lastStocktake: daysAgo(i * 4 + 2),
  };
});

// POD receives - 15 records
export const POD_RECEIVES: PodReceive[] = Array.from({ length: 15 }).map((_, i) => {
  const status: PodStatus = i < 6 ? "Verified" : i < 10 ? "Received" : i < 13 ? "Pending" : "Rejected";
  const damage = status === "Rejected" ? 3 + (i % 4) : status === "Verified" ? 0 : i % 3;
  const shortage = status === "Verified" ? 0 : status === "Rejected" ? 8 + (i % 5) : i % 4;
  return {
    id: `pod-${String(i + 1).padStart(3, "0")}`,
    podNo: `POD-${String(71200 + i).padStart(5, "0")}`,
    lrNumber: `LR-${String(88400 + i * 3).padStart(6, "0")}`,
    consignor: CONSIGNORS[i % CONSIGNORS.length],
    consignee: CONSIGNEES[(i + 2) % CONSIGNEES.length],
    destination: CITIES[(i + 7) % CITIES.length],
    vehicle: VEHICLES[i % VEHICLES.length],
    deliveryDate: status === "Pending" ? undefined : daysAgo(i + 1),
    receivedDate: status === "Pending" ? undefined : daysAgo(i),
    status,
    damageCount: damage,
    shortageQty: shortage,
    receiver: status === "Pending" ? undefined : "Balwinder Sandhu",
    remarks:
      status === "Rejected"
        ? "Severe damage - rejected at delivery"
        : status === "Received"
          ? "Pending verification"
          : undefined,
  };
});

// ===== Small shared components =====
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

export function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

/* ============================================================
   Extended tabs (Task 13-c): Pick & Pack, Cycle Count,
   Cross-Docking, Returns/RMA, Yard Management, Dock Scheduling.
   ============================================================ */

// ===== Pick & Pack =====
export const PICK_STATUSES = [
  "Pending",
  "Picking",
  "Picked",
  "Packing",
  "Packed",
  "Dispatched",
] as const;
export type PickStatus = (typeof PICK_STATUSES)[number];

export interface PickList {
  id: string;
  pickId: string;
  order: string;
  consignee: string;
  skuCount: number;
  totalQty: number;
  pickedQty: number;
  status: PickStatus;
  picker?: string;
  packingStation?: string;
  assignedDate?: string;
  pickedDate?: string;
  godown: string;
  pickTimeMin?: number;
}

const PICKERS = [
  "Sukhbir Singh",
  "Manjeet Singh",
  "Jaspal Gill",
  "Harpreet Brar",
  "Gurmeet Sandhu",
  "Parminder Rao",
];
const PACKING_STATIONS = ["Pack-A1", "Pack-A2", "Pack-B1", "Pack-B2", "Pack-C1"];

export const PICK_LISTS: PickList[] = Array.from({ length: 14 }).map((_, i) => {
  const status: PickStatus =
    i < 2 ? "Pending" : i < 5 ? "Picking" : i < 7 ? "Picked" : i < 9 ? "Packing" : i < 12 ? "Packed" : "Dispatched";
  const totalQty = 24 + (i * 17) % 180;
  const pickedQty =
    status === "Pending"
      ? 0
      : status === "Picking"
        ? Math.floor(totalQty * 0.45)
        : status === "Picked" || status === "Packing" || status === "Packed" || status === "Dispatched"
          ? totalQty
          : 0;
  const skuCount = 2 + (i % 5);
  return {
    id: `pick-${String(i + 1).padStart(3, "0")}`,
    pickId: `PL-${String(3201 + i).padStart(4, "0")}`,
    order: `SO-${String(24700 + i * 3).padStart(5, "0")}`,
    consignee: CONSIGNEES[i % CONSIGNEES.length],
    skuCount,
    totalQty,
    pickedQty,
    status,
    picker: status === "Pending" ? undefined : PICKERS[i % PICKERS.length],
    packingStation:
      status === "Packing" || status === "Packed" || status === "Dispatched"
        ? PACKING_STATIONS[i % PACKING_STATIONS.length]
        : undefined,
    assignedDate: status === "Pending" ? undefined : daysAgo(i),
    pickedDate:
      status === "Picked" || status === "Packing" || status === "Packed" || status === "Dispatched"
        ? daysAgo(Math.max(0, i - 1))
        : undefined,
    godown: GODOWNS[i % GODOWNS.length],
    pickTimeMin:
      status === "Picked" || status === "Packing" || status === "Packed" || status === "Dispatched"
        ? 8 + (i * 5) % 22
        : undefined,
  };
});

export function pickStatusBadge(status: PickStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<PickStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "muted" },
    Picking: { variant: "outline", pulse: true },
    Picked: { variant: "outline" },
    Packing: { variant: "solid", pulse: true },
    Packed: { variant: "solid" },
    Dispatched: { variant: "solid" },
  };
  return map[status];
}

export function computePickPackKpis(picks: PickList[]) {
  const openPicks = picks.filter((p) => p.status !== "Dispatched").length;
  const inProgress = picks.filter((p) => p.status === "Picking" || p.status === "Packing").length;
  const packedToday = picks.filter(
    (p) => p.status === "Packed" || p.status === "Dispatched",
  ).length;
  const timed = picks.filter((p) => p.pickTimeMin !== undefined);
  const avgPickTimeMin =
    timed.length === 0
      ? 0
      : Math.round(timed.reduce((s, p) => s + (p.pickTimeMin ?? 0), 0) / timed.length);
  return { openPicks, inProgress, packedToday, avgPickTimeMin };
}

// ===== Cycle Count =====
export const CYCLE_COUNT_STATUSES = [
  "Scheduled",
  "Counting",
  "Counted",
  "Variance",
  "Approved",
  "Posted",
] as const;
export type CycleCountStatus = (typeof CYCLE_COUNT_STATUSES)[number];

export interface CycleCount {
  id: string;
  countId: string;
  location: string;
  skuCode: string;
  skuName: string;
  systemQty: number;
  countedQty?: number;
  variance?: number;
  status: CycleCountStatus;
  counter?: string;
  scheduledDate: string;
  countedDate?: string;
  unit: string;
  godown: string;
}

const COUNTERS = [
  "Manjeet Singh",
  "Jaspal Gill",
  "Harpreet Brar",
  "Sukhbir Singh",
  "Gurmeet Sandhu",
];
const BINS = [
  "Rack-A-1",
  "Rack-A-3",
  "Rack-B-2",
  "Rack-C-4",
  "Rack-D-1",
  "Rack-E-2",
  "Bin-01-A",
  "Bin-03-C",
  "Bin-07-B",
  "Bin-09-D",
  "Cold-02",
  "Bonded-01",
];

export const CYCLE_COUNTS: CycleCount[] = Array.from({ length: 12 }).map((_, i) => {
  const status: CycleCountStatus =
    i < 2 ? "Scheduled" : i < 4 ? "Counting" : i < 7 ? "Counted" : i < 9 ? "Variance" : i < 11 ? "Approved" : "Posted";
  const sku = SKUS[(i * 2) % SKUS.length];
  const systemQty = 40 + (i * 23) % 240;
  const countedQty =
    status === "Scheduled" || status === "Counting"
      ? undefined
      : status === "Variance"
        ? Math.max(0, systemQty - (8 + (i % 12)))
        : systemQty + ((i % 3) - 1) * 2;
  const variance =
    countedQty === undefined ? undefined : countedQty - systemQty;
  return {
    id: `cc-${String(i + 1).padStart(3, "0")}`,
    countId: `CC-${String(4501 + i).padStart(4, "0")}`,
    location: BINS[i % BINS.length],
    skuCode: sku.skuCode,
    skuName: sku.name,
    systemQty,
    countedQty,
    variance,
    status,
    counter: status === "Scheduled" ? undefined : COUNTERS[i % COUNTERS.length],
    scheduledDate: daysAgo(i - 2 < 0 ? 0 : i - 2),
    countedDate:
      status === "Counted" || status === "Variance" || status === "Approved" || status === "Posted"
        ? daysAgo(i)
        : undefined,
    unit: sku.unit,
    godown: sku.godown,
  };
});

export function cycleCountStatusBadge(status: CycleCountStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<CycleCountStatus, { variant: Variant; pulse?: boolean }> = {
    Scheduled: { variant: "muted" },
    Counting: { variant: "outline", pulse: true },
    Counted: { variant: "outline" },
    Variance: { variant: "solid", pulse: true },
    Approved: { variant: "solid" },
    Posted: { variant: "solid" },
  };
  return map[status];
}

export function varianceMeta(variance?: number): { variant: Variant; label: string } {
  if (variance === undefined) return { variant: "muted", label: "-" };
  if (variance === 0) return { variant: "muted", label: "Match" };
  const abs = Math.abs(variance);
  if (abs >= 10) return { variant: "solid", label: `High ${variance > 0 ? "+" : ""}${variance}` };
  if (abs >= 3) return { variant: "outline", label: `${variance > 0 ? "+" : ""}${variance}` };
  return { variant: "muted", label: `${variance > 0 ? "+" : ""}${variance}` };
}

export function computeCycleCountKpis(counts: CycleCount[]) {
  const scheduledToday = counts.filter((c) => c.status === "Scheduled" || c.status === "Counting").length;
  const pendingApproval = counts.filter((c) => c.status === "Counted" || c.status === "Variance").length;
  const variancesFound = counts.filter((c) => c.variance !== undefined && c.variance !== 0).length;
  const completed = counts.filter((c) => c.status === "Approved" || c.status === "Posted" || c.status === "Counted");
  const accurate = completed.filter((c) => c.variance === 0).length;
  const accuracyPct = completed.length === 0 ? 0 : Math.round((accurate / completed.length) * 100);
  return { scheduledToday, pendingApproval, variancesFound, accuracyPct };
}

// ===== Cross-Docking =====
export const CROSS_DOCK_STATUSES = [
  "Scheduled",
  "Arrived",
  "Unloading",
  "Staging",
  "Loading",
  "Dispatched",
] as const;
export type CrossDockStatus = (typeof CROSS_DOCK_STATUSES)[number];

export interface CrossDock {
  id: string;
  xdkId: string;
  inboundRef: string;
  outboundRef: string;
  skuCode: string;
  skuName: string;
  qty: number;
  unit: string;
  dockDoor: string;
  status: CrossDockStatus;
  dwellTimeMin: number;
  arrivedDate?: string;
  carrier: string;
}

const DOCK_DOORS = ["Dock-01", "Dock-02", "Dock-03", "Dock-04", "Dock-05", "Dock-06", "Dock-07", "Dock-08"];
const CARRIERS = [
  "VRL Logistics",
  "Transport Corporation of India",
  "Blue Dart Express",
  "DHL Supply Chain",
  "Allcargo Logistics",
  "Mahindra Logistics",
];

export const CROSS_DOCKS: CrossDock[] = Array.from({ length: 9 }).map((_, i) => {
  const status: CrossDockStatus =
    i < 1 ? "Scheduled" : i < 3 ? "Arrived" : i < 5 ? "Unloading" : i < 7 ? "Staging" : i < 8 ? "Loading" : "Dispatched";
  const sku = SKUS[(i + 4) % SKUS.length];
  const dwellTimeMin =
    status === "Scheduled" ? 0 : status === "Arrived" ? 12 + i * 4 : status === "Unloading" ? 24 + i * 6 : status === "Staging" ? 38 + i * 4 : status === "Loading" ? 52 + i * 3 : 64 + i * 2;
  return {
    id: `xdk-${String(i + 1).padStart(3, "0")}`,
    xdkId: `XDK-${String(7801 + i).padStart(4, "0")}`,
    inboundRef: `GRN-${String(2400 + i + 14).padStart(4, "0")}`,
    outboundRef: `ODO-${String(3120 + i + 14).padStart(4, "0")}`,
    skuCode: sku.skuCode,
    skuName: sku.name,
    qty: 30 + (i * 19) % 160,
    unit: sku.unit,
    dockDoor: DOCK_DOORS[i % DOCK_DOORS.length],
    status,
    dwellTimeMin,
    arrivedDate: status === "Scheduled" ? undefined : daysAgo(i),
    carrier: CARRIERS[i % CARRIERS.length],
  };
});

export function crossDockStatusBadge(status: CrossDockStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<CrossDockStatus, { variant: Variant; pulse?: boolean }> = {
    Scheduled: { variant: "muted" },
    Arrived: { variant: "outline", pulse: true },
    Unloading: { variant: "outline", pulse: true },
    Staging: { variant: "outline" },
    Loading: { variant: "solid", pulse: true },
    Dispatched: { variant: "solid" },
  };
  return map[status];
}

export function computeCrossDockKpis(xdks: CrossDock[]) {
  const active = xdks.filter(
    (x) => x.status !== "Dispatched" && x.status !== "Scheduled",
  ).length;
  const dwellArr = xdks.filter((x) => x.status !== "Scheduled").map((x) => x.dwellTimeMin);
  const avgDwellMin = dwellArr.length === 0 ? 0 : Math.round(dwellArr.reduce((s, d) => s + d, 0) / dwellArr.length);
  const throughputToday = xdks.filter((x) => x.status === "Dispatched").length;
  const dockUtilizationPct = Math.min(100, Math.round((active / DOCK_DOORS.length) * 100));
  return { active, avgDwellMin, throughputToday, dockUtilizationPct };
}

// ===== Returns / RMA =====
export const RMA_STATUSES = [
  "Requested",
  "Approved",
  "Inbound",
  "Inspected",
  "Dispositioned",
  "Closed",
] as const;
export type RmaStatus = (typeof RMA_STATUSES)[number];

export const RMA_REASONS = [
  "Damaged",
  "Wrong Item",
  "Expired",
  "Customer Return",
  "Quality Reject",
] as const;
export type RmaReason = (typeof RMA_REASONS)[number];

export const RMA_DISPOSITIONS = [
  "Restock",
  "Scrap",
  "Refurbish",
  "Return to Vendor",
] as const;
export type RmaDisposition = (typeof RMA_DISPOSITIONS)[number];

export interface Rma {
  id: string;
  rmaId: string;
  customer: string;
  originalOrder: string;
  skuCode: string;
  skuName: string;
  qty: number;
  unit: string;
  reason: RmaReason;
  status: RmaStatus;
  disposition?: RmaDisposition;
  unitValue: number;
  requestedDate: string;
  inspectedDate?: string;
  inspectedBy?: string;
  remarks?: string;
}

export function rmaStatusBadge(status: RmaStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<RmaStatus, { variant: Variant; pulse?: boolean }> = {
    Requested: { variant: "muted" },
    Approved: { variant: "outline" },
    Inbound: { variant: "outline", pulse: true },
    Inspected: { variant: "outline" },
    Dispositioned: { variant: "solid" },
    Closed: { variant: "solid" },
  };
  return map[status];
}

export function rmaReasonBadge(reason: RmaReason): Variant {
  const map: Record<RmaReason, Variant> = {
    Damaged: "solid",
    "Wrong Item": "outline",
    Expired: "solid",
    "Customer Return": "muted",
    "Quality Reject": "outline",
  };
  return map[reason];
}

export function rmaDispositionBadge(disposition: RmaDisposition): Variant {
  const map: Record<RmaDisposition, Variant> = {
    Restock: "solid",
    Scrap: "muted",
    Refurbish: "outline",
    "Return to Vendor": "outline",
  };
  return map[disposition];
}

export const RMAS: Rma[] = Array.from({ length: 11 }).map((_, i) => {
  const status: RmaStatus =
    i < 2 ? "Requested" : i < 4 ? "Approved" : i < 6 ? "Inbound" : i < 8 ? "Inspected" : i < 10 ? "Dispositioned" : "Closed";
  const reason: RmaReason = RMA_REASONS[i % RMA_REASONS.length];
  const sku = SKUS[(i + 6) % SKUS.length];
  const disposition: RmaDisposition | undefined =
    status === "Dispositioned" || status === "Closed"
      ? (["Restock", "Scrap", "Refurbish", "Return to Vendor"][i % 4] as RmaDisposition)
      : undefined;
  return {
    id: `rma-${String(i + 1).padStart(3, "0")}`,
    rmaId: `RMA-${String(9101 + i).padStart(4, "0")}`,
    customer: CONSIGNEES[i % CONSIGNEES.length],
    originalOrder: `SO-${String(24700 + i * 2).padStart(5, "0")}`,
    skuCode: sku.skuCode,
    skuName: sku.name,
    qty: 2 + (i % 12),
    unit: sku.unit,
    reason,
    status,
    disposition,
    unitValue: sku.unitCost,
    requestedDate: daysAgo(i + 1),
    inspectedDate: status === "Inspected" || status === "Dispositioned" || status === "Closed" ? daysAgo(i) : undefined,
    inspectedBy:
      status === "Inspected" || status === "Dispositioned" || status === "Closed"
        ? COUNTERS[i % COUNTERS.length]
        : undefined,
    remarks:
      reason === "Damaged"
        ? "Packaging crushed in transit - 3 units unsellable"
        : reason === "Expired"
          ? "Shelf life expired - cannot restock"
          : reason === "Quality Reject"
            ? "Batch failed incoming QC"
            : undefined,
  };
});

export function computeRmaKpis(rmas: Rma[]) {
  const openRmas = rmas.filter((r) => r.status !== "Closed").length;
  const pendingInspection = rmas.filter((r) => r.status === "Inbound" || r.status === "Approved").length;
  const restock = rmas.filter((r) => r.disposition === "Restock");
  const scrap = rmas.filter((r) => r.disposition === "Scrap");
  const restockValue = restock.reduce((s, r) => s + r.qty * r.unitValue, 0);
  const scrapValue = scrap.reduce((s, r) => s + r.qty * r.unitValue, 0);
  return { openRmas, pendingInspection, restockValue, scrapValue };
}

// ===== Yard Management =====
export const YARD_STATUSES = [
  "Pending",
  "In Yard",
  "At Dock",
  "Loading",
  "Unloading",
  "Released",
] as const;
export type YardStatus = (typeof YARD_STATUSES)[number];

export const YARD_TYPES = ["Trailer", "Container", "Pallet", "Trolley"] as const;
export type YardType = (typeof YARD_TYPES)[number];

export interface YardMovement {
  id: string;
  movementId: string;
  equipment: string;
  type: YardType;
  gateIn?: string;
  gateOut?: string;
  dock?: string;
  status: YardStatus;
  driver?: string;
  carrier: string;
  dwellMin: number;
}

const DRIVERS = [
  "Rajesh Kumar",
  "Suresh Patel",
  "Anil Verma",
  "Mahesh Yadav",
  "Deepak Sharma",
  "Vijay Nair",
];

export const YARD_MOVEMENTS: YardMovement[] = Array.from({ length: 14 }).map((_, i) => {
  const status: YardStatus =
    i < 1 ? "Pending" : i < 4 ? "In Yard" : i < 7 ? "At Dock" : i < 9 ? "Loading" : i < 11 ? "Unloading" : "Released";
  const type: YardType = YARD_TYPES[i % YARD_TYPES.length];
  const equipment =
    type === "Trailer"
      ? `TR-${String(4400 + i).padStart(4, "0")}`
      : type === "Container"
        ? `CN-${String(2200 + i).padStart(4, "0")}`
        : type === "Pallet"
          ? `PL-${String(8800 + i).padStart(4, "0")}`
          : `TR-${String(1100 + i).padStart(4, "0")}`;
  return {
    id: `ym-${String(i + 1).padStart(3, "0")}`,
    movementId: `YM-${String(6301 + i).padStart(4, "0")}`,
    equipment,
    type,
    gateIn: status === "Pending" ? undefined : new Date(Date.now() - (i + 1) * 3600000 - i * 600000).toISOString(),
    gateOut: status === "Released" ? new Date(Date.now() - i * 3600000).toISOString() : undefined,
    dock: status === "At Dock" || status === "Loading" || status === "Unloading" ? DOCK_DOORS[i % DOCK_DOORS.length] : undefined,
    status,
    driver: status === "Pending" ? undefined : DRIVERS[i % DRIVERS.length],
    carrier: CARRIERS[i % CARRIERS.length],
    dwellMin:
      status === "Pending"
        ? 0
        : status === "Released"
          ? 45 + i * 8
          : 15 + i * 12,
  };
});

export function yardStatusBadge(status: YardStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<YardStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "muted" },
    "In Yard": { variant: "outline" },
    "At Dock": { variant: "outline", pulse: true },
    Loading: { variant: "solid", pulse: true },
    Unloading: { variant: "solid", pulse: true },
    Released: { variant: "solid" },
  };
  return map[status];
}

export function yardTypeBadge(type: YardType): Variant {
  const map: Record<YardType, Variant> = {
    Trailer: "solid",
    Container: "outline",
    Pallet: "muted",
    Trolley: "muted",
  };
  return map[type];
}

export function computeYardKpis(movements: YardMovement[]) {
  const inYard = movements.filter((m) => m.status === "In Yard" || m.status === "Pending").length;
  const atDock = movements.filter((m) => m.status === "At Dock" || m.status === "Loading" || m.status === "Unloading").length;
  const dwellArr = movements.filter((m) => m.status !== "Pending").map((m) => m.dwellMin);
  const avgDwell = dwellArr.length === 0 ? 0 : Math.round(dwellArr.reduce((s, d) => s + d, 0) / dwellArr.length);
  const gateInToday = movements.filter((m) => m.gateIn && Date.now() - new Date(m.gateIn).getTime() < 86400000).length;
  return { inYard, atDock, avgDwell, gateInToday };
}

// ===== Dock Scheduling =====
export const DOCK_APPT_STATUSES = [
  "Scheduled",
  "Checked In",
  "At Dock",
  "Completed",
  "No-Show",
  "Cancelled",
] as const;
export type DockApptStatus = (typeof DOCK_APPT_STATUSES)[number];

export const DOCK_APPT_TYPES = ["Inbound", "Outbound", "Cross-Dock"] as const;
export type DockApptType = (typeof DOCK_APPT_TYPES)[number];

export interface DockAppt {
  id: string;
  apptId: string;
  carrier: string;
  dockDoor: string;
  date: string;
  timeWindow: string;
  type: DockApptType;
  status: DockApptStatus;
  checkInTime?: string;
  driver?: string;
  refNo: string;
  durationMin: number;
}

const TIME_WINDOWS = [
  "06:00–07:00",
  "07:30–08:30",
  "09:00–10:00",
  "10:30–11:30",
  "12:00–13:00",
  "13:30–14:30",
  "15:00–16:00",
  "16:30–17:30",
  "18:00–19:00",
];

export const DOCK_APPTS: DockAppt[] = Array.from({ length: 16 }).map((_, i) => {
  const status: DockApptStatus =
    i < 3 ? "Scheduled" : i < 6 ? "Checked In" : i < 9 ? "At Dock" : i < 13 ? "Completed" : i < 15 ? "No-Show" : "Cancelled";
  const type: DockApptType = DOCK_APPT_TYPES[i % DOCK_APPT_TYPES.length];
  const hour = i % 9;
  return {
    id: `appt-${String(i + 1).padStart(3, "0")}`,
    apptId: `APT-${String(5401 + i).padStart(4, "0")}`,
    carrier: CARRIERS[i % CARRIERS.length],
    dockDoor: DOCK_DOORS[i % DOCK_DOORS.length],
    date: i < 9 ? new Date(Date.now()).toISOString() : daysAgo(i - 8),
    timeWindow: TIME_WINDOWS[hour],
    type,
    status,
    checkInTime:
      status === "Checked In" || status === "At Dock" || status === "Completed"
        ? new Date(Date.now() - (i + 1) * 1800000).toISOString()
        : undefined,
    driver: status === "Scheduled" ? undefined : DRIVERS[i % DRIVERS.length],
    refNo:
      type === "Inbound"
        ? `GRN-${String(2400 + i + 20).padStart(4, "0")}`
        : type === "Outbound"
          ? `ODO-${String(3120 + i + 20).padStart(4, "0")}`
          : `XDK-${String(7801 + i).padStart(4, "0")}`,
    durationMin: 30 + (i % 4) * 15,
  };
});

export function dockApptStatusBadge(status: DockApptStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<DockApptStatus, { variant: Variant; pulse?: boolean }> = {
    Scheduled: { variant: "muted" },
    "Checked In": { variant: "outline", pulse: true },
    "At Dock": { variant: "outline", pulse: true },
    Completed: { variant: "solid" },
    "No-Show": { variant: "solid" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function dockApptTypeBadge(type: DockApptType): Variant {
  const map: Record<DockApptType, Variant> = {
    Inbound: "outline",
    Outbound: "outline",
    "Cross-Dock": "solid",
  };
  return map[type];
}

export function computeDockApptKpis(appts: DockAppt[]) {
  const todayAppts = appts.filter((a) => {
    const d = new Date(a.date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }).length;
  const checkedIn = appts.filter((a) => a.status === "Checked In" || a.status === "At Dock").length;
  const completed = appts.filter((a) => a.status === "Completed").length;
  const noShows = appts.filter((a) => a.status === "No-Show").length;
  const utilizationPct = todayAppts === 0 ? 0 : Math.min(100, Math.round((completed / todayAppts) * 100));
  return { todayAppts, checkedIn, utilizationPct, noShows };
}

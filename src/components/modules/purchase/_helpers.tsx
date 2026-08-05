"use client";
import type { ReactNode } from "react";
import { VENDORS } from "@/lib/mock-data";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
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
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

// ===== Purchase Order domain =====
export type POStatus =
  | "Draft"
  | "Sent"
  | "Confirmed"
  | "Partial Receipt"
  | "Received"
  | "Billed"
  | "Done"
  | "Cancelled";

export const PO_STATUSES: POStatus[] = [
  "Draft",
  "Sent",
  "Confirmed",
  "Partial Receipt",
  "Received",
  "Billed",
  "Done",
  "Cancelled",
];

export const PO_CATEGORIES = [
  "Tyres",
  "Spare Parts",
  "Fuel",
  "Lubricants",
  "Workshop Tools",
  "Safety Equipment",
  "Office Supplies",
] as const;

export const PO_PAYMENT_TERMS = [
  "On Delivery",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Advance 50%",
] as const;

export const PO_UOM = [
  "Each",
  "Nos",
  "Litre",
  "Kg",
  "Metre",
  "Box",
  "Set",
  "Drum",
] as const;

// ===== Line / Receipt / Bill =====
export interface POLine {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  uom: string;
  qty: number;
  receivedQty: number;
  unitPrice: number;
  taxRate: number; // percent e.g. 18
  taxAmount: number;
  total: number;
}

export interface POReceipt {
  id: string;
  receiptNo: string;
  date: string; // ISO
  receivedBy: string;
  lines: { lineId: string; description: string; ordered: number; received: number; variance: number }[];
  grnNo: string;
  warehouse: string;
  notes?: string;
}

export interface POBill {
  id: string;
  billNo: string;
  vendorInvoiceNo: string;
  date: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  total: number;
  status: "Pending" | "Approved" | "Paid" | "Disputed";
}

export interface POActivity {
  id: string;
  ts: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorId: string;
  category: string;
  poDate: string;
  expectedDelivery: string;
  deliveryLocation: string;
  paymentTerms: string;
  buyer: string;
  status: POStatus;
  currency: "INR";
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  lines: POLine[];
  receipts: POReceipt[];
  bills: POBill[];
  activity: POActivity[];
}

// ===== Mock vendor pull (use existing VENDORS) =====
const VENDOR_NAMES = VENDORS.map((v) => v.companyName);
const VENDOR_IDS = VENDORS.map((v) => v.id);
const VENDOR_TERMS = VENDORS.map((v) => v.paymentTerms);

// ===== Item catalogue by category =====
interface ItemDef {
  code: string;
  description: string;
  uom: string;
  unitPrice: number;
}
const ITEM_CATALOG: Record<string, ItemDef[]> = {
  Tyres: [
    { code: "TYR-315-80R22", description: "Apollo EnduMile LHD 315/80R22.5 drive tyre", uom: "Each", unitPrice: 28450 },
    { code: "TYR-295-80R22", description: "MRF SteelMuscle 295/80R22.5 trailer tyre", uom: "Each", unitPrice: 26800 },
    { code: "TYR-11R22-5", description: "JK Jet Steel 11R22.5 steer tyre", uom: "Each", unitPrice: 24200 },
    { code: "TYR-909-FLP", description: "Tubeless flap 909 for 22.5 rim", uom: "Each", unitPrice: 320 },
  ],
  "Spare Parts": [
    { code: "BRK-PAD-HD", description: "Brake pad set Hino / Tata heavy duty", uom: "Set", unitPrice: 4850 },
    { code: "CLT-PLT-ASB", description: "Clutch plate assembly 430mm diameter", uom: "Each", unitPrice: 14200 },
    { code: "FLT-AIR-PRM", description: "Air primary filter element Donaldson P535583", uom: "Each", unitPrice: 1450 },
    { code: "FLT-OIL-LR", description: "Lube spin-on filter Fleetguard LF3000", uom: "Each", unitPrice: 980 },
    { code: "BTR-150AH", description: "Exide 150Ah heavy-duty commercial battery", uom: "Each", unitPrice: 15600 },
    { code: "SUS-LEAF-RB", description: "Rear bumper leaf spring assembly 9-leaf", uom: "Each", unitPrice: 8900 },
  ],
  Fuel: [
    { code: "DSL-HSD-BULK", description: "High-speed diesel bulk (per litre)", uom: "Litre", unitPrice: 91.4 },
    { code: "DSL-HSD-DRM", description: "High-speed diesel 200L drum", uom: "Drum", unitPrice: 18280 },
    { code: "PET-REG-DRM", description: "Regular petrol 200L drum (genset)", uom: "Drum", unitPrice: 19400 },
  ],
  Lubricants: [
    { code: "OIL-ENG-15W40", description: "Shell Rimula R5 15W-40 engine oil 20L pail", uom: "Each", unitPrice: 6450 },
    { code: "OIL-GEAR-80W90", description: "Gear oil EP 80W-90 20L pail", uom: "Each", unitPrice: 5800 },
    { code: "GRS-LITH-COM", description: "Lithium complex grease EP3 18kg keg", uom: "Kg", unitPrice: 320 },
    { code: "OIL-HYD-68", description: "Hydraulic oil ISO VG68 20L pail", uom: "Each", unitPrice: 4900 },
    { code: "COL-COOL-RDY", description: "Readymix coolant -25°C 5L can", uom: "Each", unitPrice: 720 },
  ],
  "Workshop Tools": [
    { code: "TOL-TQR-WRNCH", description: "Click-type torque wrench 1/2\" drive 10-150Nm", uom: "Each", unitPrice: 3400 },
    { code: "TOL-JCK-10T", description: "Hydraulic bottle jack 10 tonne with pump", uom: "Each", unitPrice: 7800 },
    { code: "TOL-IMP-GUN", description: "Pneumatic impact wrench 1\" twin hammer", uom: "Each", unitPrice: 12900 },
    { code: "TOL-CMP-50L", description: "Air compressor 50L 2.5HP belt drive", uom: "Each", unitPrice: 18900 },
    { code: "TOL-WLD-INV", description: "Inverter welding set 200A IGBT", uom: "Each", unitPrice: 16500 },
  ],
  "Safety Equipment": [
    { code: "SAF-HLM-FRN", description: "ISI fire retardant safety helmet (white)", uom: "Each", unitPrice: 280 },
    { code: "SAF-VST-HV", description: "ANSI Class 2 hi-vis vest with tape", uom: "Each", unitPrice: 145 },
    { code: "SAF-GLV-NTR", description: "Nitrile grip gloves size L (pack of 12)", uom: "Box", unitPrice: 920 },
    { code: "SAF-EXT-5KG", description: "ABC dry powder fire extinguisher 5kg ISI", uom: "Each", unitPrice: 1850 },
    { code: "SAF-CONE-450", description: "Reflective road cone 450mm with collar", uom: "Each", unitPrice: 240 },
    { code: "SAF-SHO-STEEL", description: "Steel toe safety shoes size 9 (pair)", uom: "Each", unitPrice: 1450 },
  ],
  "Office Supplies": [
    { code: "OFC-PRN-A4-80", description: "A4 80GSM copier paper (500 sheets)", uom: "Box", unitPrice: 320 },
    { code: "OFC-INK-LJR", description: "Inkjet cartridge HP 803 black", uom: "Each", unitPrice: 1180 },
    { code: "OFC-FLE-CLIP", description: "Binder clip 25mm (pack of 12)", uom: "Set", unitPrice: 90 },
    { code: "OFC-WBT-BSK", description: "Whiteboard marker assorted (pack of 4)", uom: "Set", unitPrice: 180 },
  ],
};

const BUYERS = [
  "Anand Kulkarni",
  "Pooja Deshpande",
  "Vinod Menon",
  "Shreya Rao",
  "Karan Malhotra",
  "Imran Qureshi",
];

const WAREHOUSES = [
  "Bhiwandi DC",
  "Taloja WH-2",
  "Hoskote Bay 4",
  "Pilerne Hub",
  "Sanand Cross-Dock",
];

// ===== Deterministic helpers =====
function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Compute line total
function computeLine(qty: number, unitPrice: number, taxRate: number) {
  const subtotal = qty * unitPrice;
  const taxAmount = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal + taxAmount);
  return { subtotal, taxAmount, total };
}

function buildLines(seed: number, category: string): POLine[] {
  const catalog = ITEM_CATALOG[category] || ITEM_CATALOG["Spare Parts"];
  const lineCount = 2 + (seed % 3); // 2-4 lines per PO
  const lines: POLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const def = pick(catalog, seed * 3 + i * 7);
    const qty = 1 + ((seed + i * 5) % 18);
    const taxRate = pick([5, 12, 18, 28], seed + i);
    const { subtotal, taxAmount, total } = computeLine(qty, def.unitPrice, taxRate);
    lines.push({
      id: `pol-${seed}-${i}`,
      itemCode: def.code,
      description: def.description,
      category,
      uom: def.uom,
      qty,
      receivedQty: 0, // computed later based on status
      unitPrice: def.unitPrice,
      taxRate,
      taxAmount,
      total,
      // subtotal left unused — total includes tax (matches PO convention)
    });
    void subtotal;
  }
  return lines;
}

function buildReceipts(poId: string, lines: POLine[], status: POStatus, seed: number): POReceipt[] {
  if (status === "Draft" || status === "Sent" || status === "Cancelled" || status === "Confirmed") {
    return [];
  }
  // Partial Receipt → 1 receipt on a subset; Received/Billed/Done → 1-2 receipts covering all lines
  const fullReceipt = status === "Received" || status === "Billed" || status === "Done";
  const receiptCount = fullReceipt ? 1 + (seed % 2) : 1;
  const receipts: POReceipt[] = [];
  let receivedTracker: number[] = lines.map(() => 0);
  for (let r = 0; r < receiptCount; r++) {
    const receiptLines: POReceipt["lines"] = [];
    const lineSubset = fullReceipt ? lines : lines.slice(0, Math.max(1, Math.ceil(lines.length / 2)));
    lineSubset.forEach((line, idx) => {
      let rcv: number;
      if (r < receiptCount - 1) {
        rcv = Math.max(0, Math.floor(line.qty * (0.4 + (seed % 4) * 0.1)));
      } else {
        // Final receipt — finish what's left for full receipts, else partial
        rcv = fullReceipt ? line.qty - receivedTracker[idx] : Math.max(0, Math.ceil(line.qty * 0.5));
      }
      rcv = Math.min(rcv, line.qty - receivedTracker[idx]);
      if (rcv > 0) {
        receivedTracker[idx] += rcv;
        receiptLines.push({
          lineId: line.id,
          description: line.description,
          ordered: line.qty,
          received: rcv,
          variance: rcv - line.qty,
        });
      }
    });
    if (receiptLines.length === 0) continue;
    receipts.push({
      id: `rcpt-${poId}-${r}`,
      receiptNo: `GRN-${String(9000 + seed * 7 + r * 13).slice(-5)}`,
      date: new Date(Date.now() - (seed * 86400000) + r * 4 * 86400000).toISOString(),
      receivedBy: pick(BUYERS, seed + r * 3),
      grnNo: `GRN-${String(9000 + seed * 7 + r * 13).slice(-5)}`,
      warehouse: pick(WAREHOUSES, seed + r * 2),
      lines: receiptLines,
      notes: r === 0 && (seed % 5 === 0) ? "Outer carton damage on 1 box — contents verified intact." : undefined,
    });
  }
  // Reflect received qty back on lines (mutates local copy)
  lines.forEach((line, idx) => {
    line.receivedQty = receivedTracker[idx];
  });
  return receipts;
}

function buildBills(lines: POLine[], status: POStatus, seed: number, poDate: string): POBill[] {
  if (status === "Draft" || status === "Sent" || status === "Confirmed" || status === "Partial Receipt" || status === "Cancelled") {
    return [];
  }
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const taxTotal = lines.reduce((s, l) => s + l.taxAmount, 0);
  const total = subtotal + taxTotal;
  // For Billed / Done → 1 paid bill; for Received → 1 pending bill
  if (status === "Received") {
    return [{
      id: `bill-${seed}-1`,
      billNo: `RZ-BILL-${String(4500 + seed * 11).slice(-5)}`,
      vendorInvoiceNo: `VI/${String(seed * 137 + 9121).slice(-5)}/${new Date(poDate).getFullYear()}`,
      date: new Date(Date.now() - (seed - 2) * 86400000).toISOString(),
      dueDate: new Date(Date.now() + (15 - (seed % 5)) * 86400000).toISOString(),
      amount: round2(subtotal),
      taxAmount: round2(taxTotal),
      total: round2(total),
      status: "Pending",
    }];
  }
  return [{
    id: `bill-${seed}-1`,
    billNo: `RZ-BILL-${String(4500 + seed * 11).slice(-5)}`,
    vendorInvoiceNo: `VI/${String(seed * 137 + 9121).slice(-5)}/${new Date(poDate).getFullYear()}`,
    date: new Date(Date.now() - (seed + 2) * 86400000).toISOString(),
    dueDate: new Date(Date.now() - (seed % 3) * 86400000).toISOString(),
    amount: round2(subtotal),
    taxAmount: round2(taxTotal),
    total: round2(total),
    status: seed % 4 === 0 ? "Approved" : "Paid",
  }];
}

function buildActivity(po: { poNumber: string; vendor: string; buyer: string; status: POStatus; poDate: string; expectedDelivery: string }, seed: number): POActivity[] {
  const log: POActivity[] = [];
  const createdTs = po.poDate;
  log.push({
    id: `act-${seed}-1`,
    ts: createdTs,
    actor: po.buyer,
    action: "PO created",
    detail: `Drafted PO ${po.poNumber} for ${po.vendor}`,
  });
  if (po.status !== "Draft") {
    log.push({
      id: `act-${seed}-2`,
      ts: new Date(new Date(createdTs).getTime() + 6 * 3600000).toISOString(),
      actor: po.buyer,
      action: "PO sent to vendor",
      detail: `Emailed PO PDF · awaiting acknowledgement`,
    });
  }
  if (po.status === "Confirmed" || po.status === "Partial Receipt" || po.status === "Received" || po.status === "Billed" || po.status === "Done") {
    log.push({
      id: `act-${seed}-3`,
      ts: new Date(new Date(createdTs).getTime() + 1 * 86400000).toISOString(),
      actor: po.vendor,
      action: "Vendor confirmed PO",
      detail: `Acknowledged · ETA ${formatDate(po.expectedDelivery)}`,
    });
  }
  if (po.status === "Partial Receipt" || po.status === "Received" || po.status === "Billed" || po.status === "Done") {
    log.push({
      id: `act-${seed}-4`,
      ts: new Date(new Date(po.expectedDelivery).getTime() - 1 * 86400000).toISOString(),
      actor: "Warehouse Incharge",
      action: "Goods receipt recorded",
      detail: po.status === "Partial Receipt" ? "Partial GRN posted" : "Full GRN posted against all lines",
    });
  }
  if (po.status === "Billed" || po.status === "Done") {
    log.push({
      id: `act-${seed}-5`,
      ts: new Date(new Date(po.expectedDelivery).getTime() + 2 * 86400000).toISOString(),
      actor: "Accounts Payable",
      action: "Vendor bill received",
      detail: `Bill booked and matched to PO`,
    });
  }
  if (po.status === "Done") {
    log.push({
      id: `act-${seed}-6`,
      ts: new Date(new Date(po.expectedDelivery).getTime() + 8 * 86400000).toISOString(),
      actor: "Accounts Payable",
      action: "Payment released",
      detail: `Net 15 cleared · NEFT settled`,
    });
  }
  if (po.status === "Cancelled") {
    log.push({
      id: `act-${seed}-7`,
      ts: new Date(new Date(createdTs).getTime() + 2 * 86400000).toISOString(),
      actor: po.buyer,
      action: "PO cancelled",
      detail: `Requirement withdrawn by operations`,
    });
  }
  return log;
}

// ===== Build 22 mock POs =====
const STATUS_CYCLE: POStatus[] = [
  "Done",
  "Billed",
  "Received",
  "Partial Receipt",
  "Confirmed",
  "Sent",
  "Draft",
  "Done",
  "Billed",
  "Received",
  "Confirmed",
  "Cancelled",
  "Done",
  "Partial Receipt",
  "Sent",
  "Received",
  "Billed",
  "Confirmed",
  "Draft",
  "Done",
  "Received",
  "Sent",
];

function buildPO(i: number): PurchaseOrder {
  const seed = i + 11;
  const vendorIdx = seed % VENDOR_NAMES.length;
  const vendor = VENDOR_NAMES[vendorIdx];
  const vendorId = VENDOR_IDS[vendorIdx];
  const paymentTerms = VENDOR_TERMS[vendorIdx];
  const category = pick(PO_CATEGORIES, seed * 5 + 3);
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
  const poDate = new Date(Date.now() - (20 + i * 3) * 86400000).toISOString();
  const expectedDays = 3 + (seed % 12);
  const expectedDelivery = new Date(new Date(poDate).getTime() + expectedDays * 86400000).toISOString();
  const buyer = pick(BUYERS, seed * 2 + 1);
  const deliveryLocation = pick(WAREHOUSES, seed + 1);

  const lines = buildLines(seed, category);
  const receipts = buildReceipts(`po${i + 1}`, lines, status, seed);
  const bills = buildBills(lines, status, seed, poDate);
  const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  const total = round2(subtotal + taxTotal);

  const poMeta = { poNumber: `RZ-PO-${String(2400 + i * 7 + 3).slice(-5)}`, vendor, buyer, status, poDate, expectedDelivery };
  const activity = buildActivity(poMeta, seed);

  return {
    id: `po-${i + 1}`,
    poNumber: poMeta.poNumber,
    vendor,
    vendorId,
    category,
    poDate,
    expectedDelivery,
    deliveryLocation,
    paymentTerms,
    buyer,
    status,
    currency: "INR",
    subtotal,
    taxTotal,
    total,
    notes: i % 6 === 0 ? "Fleet expansion Q3 — urgent procurement. Ensure batch numbers match prior lot." : undefined,
    lines,
    receipts,
    bills,
    activity,
  };
}

export const PURCHASE_ORDERS: PurchaseOrder[] = Array.from({ length: 22 }, (_, i) => buildPO(i));

// ===== Status badge helper =====
export function poStatusBadge(status: POStatus): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (status) {
    case "Draft":
      return { variant: "muted" };
    case "Sent":
      return { variant: "outline" };
    case "Confirmed":
      return { variant: "outline" };
    case "Partial Receipt":
      return { variant: "solid", pulse: true };
    case "Received":
      return { variant: "outline" };
    case "Billed":
      return { variant: "outline" };
    case "Done":
      return { variant: "muted" };
    case "Cancelled":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

// ===== PO form (Add drawer) =====
export interface POLineForm {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  uom: string;
  qty: string;
  unitPrice: string;
  taxRate: string;
}

export interface POForm {
  vendor: string;
  category: string;
  poDate: string;
  expectedDelivery: string;
  deliveryLocation: string;
  paymentTerms: string;
  buyer: string;
  notes: string;
  lines: POLineForm[];
}

export function EMPTY_PO_FORM(): POForm {
  return {
    vendor: "",
    category: "Spare Parts",
    poDate: new Date().toISOString(),
    expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString(),
    deliveryLocation: WAREHOUSES[0],
    paymentTerms: "Net 30",
    buyer: BUYERS[0],
    notes: "",
    lines: [
      {
        id: `pol-new-${Date.now()}`,
        itemCode: "",
        description: "",
        category: "Spare Parts",
        uom: "Each",
        qty: "1",
        unitPrice: "0",
        taxRate: "18",
      },
    ],
  };
}

export const BUYER_OPTIONS = BUYERS;
export const WAREHOUSE_OPTIONS = WAREHOUSES;

export function getItemSuggestions(category: string): ItemDef[] {
  return ITEM_CATALOG[category] || ITEM_CATALOG["Spare Parts"];
}

// ===== Field label =====
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
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}

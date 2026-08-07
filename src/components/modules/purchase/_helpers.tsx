"use client";
import type { ReactNode } from "react";

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

"use client";
import type { ReactNode } from "react";
import type { Invoice, InvoiceStatus, PaymentStatus } from "@/lib/types";
import { CUSTOMERS } from "@/lib/mock-data";

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
export function daysBetween(from: string, to: string): number {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  if (isNaN(f) || isNaN(t)) return 0;
  return Math.round((t - f) / 86400000);
}
export function daysUntil(iso?: string): number {
  if (!iso) return 0;
  return daysBetween(new Date().toISOString(), iso);
}
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ===== Status unions =====
export const INVOICE_STATUSES = [
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
  "Credit Note",
] as const;

export const PAYMENT_STATUSES = [
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Overdue",
] as const;

// ===== Indian GST state codes =====
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (Old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

export function stateNameFromCode(code: string): string {
  return INDIAN_STATES.find((s) => s.code === code)?.name ?? "Unknown";
}

// ===== HSN codes for logistics services =====
export interface HsnCode {
  code: string;
  description: string;
  rate: number; // GST %
}
export const HSN_CODES: HsnCode[] = [
  { code: "996511", description: "Transport of goods by road (FTL)", rate: 5 },
  { code: "996512", description: "Transport of goods by road (LTL)", rate: 5 },
  { code: "996513", description: "Goods transport by rail", rate: 5 },
  { code: "996514", description: "Goods transport by air", rate: 5 },
  { code: "996515", description: "Pipeline transport of goods", rate: 18 },
  { code: "996521", description: "Cargo handling & loading", rate: 5 },
  { code: "996522", description: "Storage & warehousing", rate: 18 },
  { code: "996531", description: "Freight forwarding", rate: 18 },
  { code: "996541", description: "Courier services", rate: 18 },
  { code: "996551", description: "Packing & re-packing", rate: 18 },
  { code: "997331", description: "Leasing of trucks/vehicles", rate: 18 },
  { code: "998314", description: "Logistics consulting", rate: 18 },
];

export const PAYMENT_TERMS = [
  "Advance",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "COD",
] as const;

export const PAYMENT_MODES = [
  "UPI",
  "Bank Transfer (NEFT/RTGS/IMPS)",
  "Cheque",
  "Cash",
  "Card",
  "Demand Draft",
] as const;

// ===== GSTIN validation =====
export function isValidGSTIN(g: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g);
}
export function gstinValidationMeta(g: string): {
  state: "empty" | "invalid" | "valid";
  hint: string;
  stateCode?: string;
  stateName?: string;
} {
  if (!g.trim()) return { state: "empty", hint: "15-character GSTIN" };
  if (g.length < 15)
    return { state: "invalid", hint: `${g.length}/15 chars` };
  if (isValidGSTIN(g)) {
    const stateCode = g.slice(0, 2);
    const stateName = stateNameFromCode(stateCode);
    return {
      state: "valid",
      hint: `Valid · ${stateName}`,
      stateCode,
      stateName,
    };
  }
  return { state: "invalid", hint: "Format mismatch" };
}

// ===== Status badge mapping =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";
export function invoiceStatusBadge(status: string): {
  variant: BadgeVariant;
  pulse?: boolean;
} {
  const map: Record<string, { variant: BadgeVariant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    Sent: { variant: "outline" },
    "Partially Paid": { variant: "outline" },
    Paid: { variant: "solid" },
    Overdue: { variant: "solid", pulse: true },
    Cancelled: { variant: "muted" },
    "Credit Note": { variant: "muted" },
  };
  return map[status] || { variant: "outline" };
}

export function paymentStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Paid: "solid",
    "Partially Paid": "outline",
    Unpaid: "muted",
    Overdue: "solid",
  };
  return map[status] || "outline";
}

// ===== Line items & tax calc =====
export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  taxRate: number; // %
  amount: number; // qty * rate (taxable)
  taxAmount: number; // amount * taxRate / 100
}

export interface InvoiceTotals {
  subtotal: number;
  totalTax: number;
  total: number;
  igst: number;
  cgst: number;
  sgst: number;
  isInterState: boolean;
}

export function computeLineAmount(qty: number, rate: number): number {
  return Math.round(qty * rate * 100) / 100;
}

export function computeLineTax(amount: number, taxRate: number): number {
  return Math.round((amount * taxRate) / 100);
}

// Determines tax split: IGST for inter-state, CGST+SGST (split) for intra-state.
export function computeTotals(
  items: InvoiceLineItem[],
  supplierState: string,
  customerState: string,
): InvoiceTotals {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const isInterState =
    !!supplierState && !!customerState && supplierState !== customerState;
  if (isInterState) {
    return {
      subtotal,
      totalTax,
      total: subtotal + totalTax,
      igst: totalTax,
      cgst: 0,
      sgst: 0,
      isInterState: true,
    };
  }
  return {
    subtotal,
    totalTax,
    total: subtotal + totalTax,
    igst: 0,
    cgst: Math.round(totalTax / 2),
    sgst: Math.round(totalTax / 2),
    isInterState: false,
  };
}

// ===== Add-invoice stepper =====
export const ADD_INVOICE_STEPS = [
  { id: 1, label: "Customer & Billing", tier: "Bill To" },
  { id: 2, label: "Line Items", tier: "Services & HSN" },
  { id: 3, label: "Terms & Bank", tier: "Payment Setup" },
  { id: 4, label: "Review", tier: "Confirm" },
] as const;

export interface InvoiceForm {
  customerId: string;
  customerName: string;
  customerGstin: string;
  customerState: string;
  customerCity: string;
  billingAddress: string;
  tripRef: string;
  serviceDescription: string;
  lineItems: InvoiceLineItem[];
  paymentTerms: string;
  invoiceDate: string;
  dueDate: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  reverseCharge: boolean;
  notes: string;
  // Task 15-d: assign invoice to specific customer contacts.
  // Multi-select of CustomerContact ids (see CONTACTS seed above).
  assignedContactIds: string[];
}

export const EMPTY_LINE_ITEM: InvoiceLineItem = {
  id: "",
  description: "",
  hsn: "",
  quantity: 1,
  rate: 0,
  taxRate: 5,
  amount: 0,
  taxAmount: 0,
};

export const EMPTY_INVOICE_FORM: InvoiceForm = {
  customerId: "",
  customerName: "",
  customerGstin: "",
  customerState: "",
  customerCity: "",
  billingAddress: "",
  tripRef: "",
  serviceDescription: "",
  lineItems: [{ ...EMPTY_LINE_ITEM, id: "li-1" }],
  paymentTerms: "Net 30",
  invoiceDate: new Date().toISOString(),
  dueDate: addDays(new Date().toISOString(), 30),
  bankName: "HDFC Bank - Reanzly Operations",
  bankAccount: "50200012345678",
  bankIfsc: "HDFC0001234",
  reverseCharge: false,
  notes: "",
  assignedContactIds: [],
};

// ===== Edit mappers: Invoice <-> InvoiceForm =====
export function invoiceToForm(inv: Invoice): InvoiceForm {
  // Invoices store a flat total amount + tax breakdown; for the edit form we
  // reconstruct a single line item that sums to the existing amount so the
  // wizard's totals panel stays consistent with the saved record.
  const baseAmount = Math.max(0, inv.amount);
  const taxAmount = Math.max(0, inv.taxAmount);
  const lineItem: InvoiceLineItem = {
    id: "li-1",
    description: inv.tripRef ? `Freight - ${inv.tripRef}` : "Freight & services",
    hsn: "9965",
    quantity: 1,
    rate: baseAmount,
    taxRate: baseAmount > 0 ? Math.round((taxAmount / baseAmount) * 100) : 0,
    amount: baseAmount,
    taxAmount,
  };
  return {
    ...EMPTY_INVOICE_FORM,
    customerId: "",
    customerName: inv.customer,
    customerGstin: "",
    customerState: "27",
    customerCity: "",
    billingAddress: "",
    tripRef: inv.tripRef ?? "",
    serviceDescription: "Freight & services",
    lineItems: [lineItem],
    paymentTerms: "Net 30",
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    notes: "",
  };
}

export function formToInvoicePatch(form: InvoiceForm): Partial<Invoice> {
  const totals = computeTotals(form.lineItems, SUPPLIER_STATE_CODE, form.customerState);
  const status: InvoiceStatus = "Draft";
  const paymentStatus: PaymentStatus =
    totals.total <= 0 ? "Paid" : "Unpaid";
  return {
    customer: form.customerName,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    amount: totals.subtotal,
    taxAmount: totals.totalTax,
    totalAmount: totals.total,
    status,
    paymentStatus,
    tripRef: form.tripRef || undefined,
    igst: totals.igst,
    cgst: totals.cgst,
    sgst: totals.sgst,
  };
}

const SUPPLIER_STATE_CODE = "27";

// ===== Record payment form =====
export interface RecordPaymentForm {
  paymentDate: string;
  amountReceived: string;
  paymentMode: string;
  transactionRef: string;
  notes: string;
}

// ===== Reusable bits =====
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

// Generate a deterministic next invoice number (for new drafts)
export function nextInvoiceNumber(seed: number): string {
  return `RZ-INV-${String(2100 + seed).padStart(5, "0")}`;
}

// ============================================================
//   Invoice customization (Task 15-d)
//
//   Finance team can:
//   • customize the PDF design (template, format, accent, font…)
//   • choose page format & orientation
//   • assign invoices to specific customer contacts
//   • release invoices via Email / WhatsApp / Post / Manual
//
//   The Invoice type itself stays pristine; this feature layer
//   stores per-invoice meta in a parallel Record keyed by
//   invoiceNumber, lifted at the module root.
// ============================================================

// ===== Customer contacts (Billing / Operations / Finance / Owner) =====
export type ContactRole = "Billing" | "Operations" | "Finance" | "Owner";

export interface CustomerContact {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  email: string;
  phone: string;
  role: ContactRole;
  isPrimary: boolean;
}

// Deterministic contact seed across the existing 24 customers.
// Yields ~36 contacts (Billing + Finance always; Operations/Owner when
// the customer is large enough to warrant the role).
const CONTACT_FIRST = [
  "Rohit", "Sneha", "Anil", "Priya", "Vikram", "Deepa", "Rajesh",
  "Meera", "Suresh", "Kavya", "Pradeep", "Anjali", "Dinesh", "Reshma",
  "Naresh", "Pooja", "Mahesh", "Trisha", "Imran", "Fatima",
];
const CONTACT_LAST = [
  "Patil", "Sharma", "Reddy", "Iyer", "Khan", "Mehta", "Singh",
  "Nair", "Das", "Jain", "Shetty", "Verma", "Banerjee", "Pillai",
];

function contactName(seed: number): string {
  return `${CONTACT_FIRST[seed % CONTACT_FIRST.length]} ${CONTACT_LAST[(seed * 3 + 5) % CONTACT_LAST.length]}`;
}

function contactPhone(seed: number): string {
  return `+91 ${String(9000000000 + (seed * 73856093) % 999999999).slice(0, 10)}`;
}

function contactEmail(name: string, customerName: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, ".");
  const domain = customerName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 16) || "customer";
  return `${slug}@${domain}.in`;
}

export const CONTACTS: CustomerContact[] = CUSTOMERS.flatMap((c, i) => {
  const list: CustomerContact[] = [];
  // Primary Billing contact - uses the customer's existing contact person.
  list.push({
    id: `ct-${c.id}-b`,
    customerId: c.id,
    customerName: c.companyName,
    name: c.contactPerson,
    email: c.email,
    phone: c.phone,
    role: "Billing",
    isPrimary: true,
  });
  // Finance / Accounts contact.
  list.push({
    id: `ct-${c.id}-f`,
    customerId: c.id,
    customerName: c.companyName,
    name: contactName(i + 3),
    email: contactEmail(contactName(i + 3), c.companyName),
    phone: contactPhone(i + 11),
    role: "Finance",
    isPrimary: false,
  });
  // Operations contact (every third customer).
  if (i % 3 === 0) {
    list.push({
      id: `ct-${c.id}-o`,
      customerId: c.id,
      customerName: c.companyName,
      name: contactName(i + 9),
      email: contactEmail(contactName(i + 9), c.companyName),
      phone: contactPhone(i + 17),
      role: "Operations",
      isPrimary: false,
    });
  }
  // Owner (every fifth customer - only the larger accounts).
  if (i % 5 === 0) {
    list.push({
      id: `ct-${c.id}-x`,
      customerId: c.id,
      customerName: c.companyName,
      name: contactName(i + 13),
      email: contactEmail(contactName(i + 13), c.companyName),
      phone: contactPhone(i + 23),
      role: "Owner",
      isPrimary: false,
    });
  }
  return list;
});

export function contactsForCustomer(customerName: string): CustomerContact[] {
  return CONTACTS.filter((c) => c.customerName === customerName);
}

export function contactById(id: string): CustomerContact | undefined {
  return CONTACTS.find((c) => c.id === id);
}

export function contactLabel(c?: CustomerContact): string {
  if (!c) return "-";
  return `${c.name} (${c.role})`;
}

// ===== Invoice PDF design config =====
export type InvoiceTemplateId =
  | "classic"
  | "modern"
  | "minimal"
  | "letterhead"
  | "tax-invoice"
  | "proforma";

export interface InvoiceTemplateMeta {
  id: InvoiceTemplateId;
  label: string;
  description: string;
  tagline: string;
}

export const INVOICE_TEMPLATES: InvoiceTemplateMeta[] = [
  { id: "classic", label: "Classic", description: "Traditional GST invoice layout", tagline: "Lines + totals" },
  { id: "modern", label: "Modern", description: "Compact modern layout with accent rule", tagline: "Dense" },
  { id: "minimal", label: "Minimal", description: "Whitespace-led, no inner borders", tagline: "Clean" },
  { id: "letterhead", label: "Letterhead", description: "Branded header with monogram", tagline: "Branded" },
  { id: "tax-invoice", label: "Tax Invoice", description: "Detailed GST + TDS + TCS breakdown", tagline: "GST-first" },
  { id: "proforma", label: "Proforma", description: "Pre-shipment proforma / quote-style", tagline: "Quote-style" },
];

export const PAGE_FORMATS = [
  { id: "A4", label: "A4", description: "210 × 297 mm" },
  { id: "Letter", label: "Letter", description: "8.5 × 11 in" },
  { id: "Legal", label: "Legal", description: "8.5 × 14 in" },
] as const;

export const ORIENTATIONS = [
  { id: "Portrait", label: "Portrait" },
  { id: "Landscape", label: "Landscape" },
] as const;

// Accent is intentionally subtle - only a thin top rule + total row
// underline. Body stays monochrome.
export const ACCENT_CHOICES = [
  { id: "monochrome", label: "Monochrome", description: "Reanzly default", hex: "#0a0a0a" },
  { id: "blue", label: "Classic Blue", description: "Subtle accent line", hex: "#1e3a8a" },
  { id: "green", label: "Forest Green", description: "Subtle accent line", hex: "#14532d" },
  { id: "burgundy", label: "Burgundy", description: "Subtle accent line", hex: "#7f1d1d" },
] as const;

export const FONT_CHOICES = [
  { id: "sans", label: "Geist Sans", description: "Default" },
  { id: "serif", label: "Serif", description: "Traditional" },
  { id: "mono", label: "Mono", description: "Technical" },
] as const;

export interface InvoiceDesignConfig {
  template: InvoiceTemplateId;
  pageFormat: (typeof PAGE_FORMATS)[number]["id"];
  orientation: (typeof ORIENTATIONS)[number]["id"];
  letterhead: boolean;
  watermark: boolean;
  watermarkText: string;
  accent: (typeof ACCENT_CHOICES)[number]["id"];
  font: (typeof FONT_CHOICES)[number]["id"];
  sections: {
    lineItems: boolean;
    totals: boolean;
    paymentTerms: boolean;
    gstBreakdown: boolean;
    tcs: boolean;
    tds: boolean;
    notes: boolean;
    signature: boolean;
  };
  footerMessage: string;
}

export const DEFAULT_DESIGN_CONFIG: InvoiceDesignConfig = {
  template: "classic",
  pageFormat: "A4",
  orientation: "Portrait",
  letterhead: true,
  watermark: false,
  watermarkText: "DRAFT",
  accent: "monochrome",
  font: "sans",
  sections: {
    lineItems: true,
    totals: true,
    paymentTerms: true,
    gstBreakdown: true,
    tcs: false,
    tds: false,
    notes: true,
    signature: true,
  },
  footerMessage: "Thank you for your business. Subject to Mumbai jurisdiction.",
};

// ===== Activity timeline =====
export type InvoiceActivityType =
  | "created"
  | "edited"
  | "customized"
  | "assigned"
  | "released"
  | "payment"
  | "reminder"
  | "status"
  | "note";

export interface InvoiceActivityEntry {
  id: string;
  type: InvoiceActivityType;
  ts: string;          // ISO timestamp
  actor: string;       // user name
  label: string;       // short headline
  detail?: string;     // longer description
}

// Seed a baseline activity log for an invoice (so the timeline isn't empty
// for legacy mock invoices that predate this feature).
export function seedActivityLog(invoice: Invoice): InvoiceActivityEntry[] {
  const seed = parseInt(invoice.id.replace(/\D/g, "")) || 1;
  const actors = ["Reena Mehta", "Vikram Deshmukh", "Anil Reddy", "Sneha Iyer"];
  const entries: InvoiceActivityEntry[] = [];
  entries.push({
    id: `act-${invoice.id}-created`,
    type: "created",
    ts: invoice.invoiceDate,
    actor: actors[seed % actors.length],
    label: "Invoice created",
    detail: `Drafted by ${actors[seed % actors.length]} · ${invoice.invoiceNumber}`,
  });
  if (invoice.status !== "Draft") {
    entries.push({
      id: `act-${invoice.id}-sent`,
      type: "released",
      ts: new Date(new Date(invoice.invoiceDate).getTime() + 86400000).toISOString(),
      actor: actors[(seed + 1) % actors.length],
      label: "Invoice released",
      detail: `Emailed to ${invoice.customer}`,
    });
  }
  if (invoice.paymentStatus !== "Unpaid") {
    entries.push({
      id: `act-${invoice.id}-paid`,
      type: "payment",
      ts: new Date(new Date(invoice.invoiceDate).getTime() + 15 * 86400000).toISOString(),
      actor: actors[(seed + 2) % actors.length],
      label:
        invoice.paymentStatus === "Paid"
          ? "Payment received"
          : "Partial payment received",
      detail: `Via ${seed % 2 === 0 ? "Bank Transfer" : "UPI"}`,
    });
  }
  if (invoice.status === "Overdue") {
    entries.push({
      id: `act-${invoice.id}-overdue`,
      type: "status",
      ts: invoice.dueDate,
      actor: "System",
      label: "Marked overdue",
      detail: `Past due date ${formatDate(invoice.dueDate)}`,
    });
  }
  return entries.sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );
}

// ===== Release log =====
export type ReleaseChannel = "Email" | "WhatsApp" | "Both" | "Post" | "Manual";

export interface InvoiceReleaseLog {
  id: string;
  ts: string;
  channel: ReleaseChannel;
  recipientIds: string[];
  recipientSummary: string;
  actor: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  scheduledFor?: string;
}

// ===== Per-invoice meta (lifted at module root) =====
export interface InvoiceMeta {
  assignedContactIds: string[];
  designConfig: InvoiceDesignConfig;
  activityLog: InvoiceActivityEntry[];
  releaseLog: InvoiceReleaseLog[];
}

export function emptyInvoiceMeta(): InvoiceMeta {
  return {
    assignedContactIds: [],
    designConfig: { ...DEFAULT_DESIGN_CONFIG },
    activityLog: [],
    releaseLog: [],
  };
}

// Compose seed meta for an existing invoice - assigns a default
// Billing contact (the customer's primary) and seeds the activity
// timeline so the panel isn't empty on first open.
export function seedInvoiceMeta(invoice: Invoice): InvoiceMeta {
  const primary = contactsForCustomer(invoice.customer).find((c) => c.isPrimary);
  return {
    assignedContactIds: primary ? [primary.id] : [],
    designConfig: { ...DEFAULT_DESIGN_CONFIG },
    activityLog: seedActivityLog(invoice),
    releaseLog: [],
  };
}

// ===== Saved invoice templates =====
export interface SavedInvoiceTemplate {
  id: string;
  name: string;
  description: string;
  designConfig: InvoiceDesignConfig;
  lastUsed?: string;
  isDefault?: boolean;
  createdBy: string;
}

export const SAVED_INVOICE_TEMPLATES: SavedInvoiceTemplate[] = [
  {
    id: "tpl-default",
    name: "Reanzly Default",
    description: "Monochrome A4 portrait · Classic layout",
    designConfig: { ...DEFAULT_DESIGN_CONFIG },
    isDefault: true,
    createdBy: "System",
  },
  {
    id: "tpl-tax-gst",
    name: "GST Tax Invoice",
    description: "Detailed GST + TDS breakdown for B2B filing",
    designConfig: {
      ...DEFAULT_DESIGN_CONFIG,
      template: "tax-invoice",
      sections: {
        ...DEFAULT_DESIGN_CONFIG.sections,
        tds: true,
        gstBreakdown: true,
      },
    },
    lastUsed: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdBy: "Reena Mehta",
  },
  {
    id: "tpl-proforma",
    name: "Proforma Quote",
    description: "Pre-shipment proforma for advance payments",
    designConfig: {
      ...DEFAULT_DESIGN_CONFIG,
      template: "proforma",
      watermark: true,
      watermarkText: "PROFORMA",
    },
    lastUsed: new Date(Date.now() - 9 * 86400000).toISOString(),
    createdBy: "Vikram Deshmukh",
  },
  {
    id: "tpl-minimal",
    name: "Minimal Receipt",
    description: "Whitespace-led minimal invoice for repeat customers",
    designConfig: {
      ...DEFAULT_DESIGN_CONFIG,
      template: "minimal",
      sections: {
        ...DEFAULT_DESIGN_CONFIG.sections,
        tcs: false,
        tds: false,
        notes: false,
        signature: false,
      },
    },
    lastUsed: new Date(Date.now() - 16 * 86400000).toISOString(),
    createdBy: "Sneha Iyer",
  },
];

// ===== Release email templates =====
export function defaultReleaseSubject(invoice: Invoice): string {
  return `Invoice ${invoice.invoiceNumber} from Reanzly Logistics · ${formatINR(invoice.totalAmount)}`;
}

export function defaultReleaseBody(invoice: Invoice): string {
  return [
    `Dear Customer,`,
    ``,
    `Please find attached invoice ${invoice.invoiceNumber} dated ${formatDate(invoice.invoiceDate)} for ${formatINR(invoice.totalAmount)} (incl. GST).`,
    ``,
    `Payment is due by ${formatDate(invoice.dueDate)} as per the agreed terms (${invoice.tripRef ? `Trip ref: ${invoice.tripRef}` : "Net 30"}).`,
    ``,
    `For any clarifications, reply to this email or contact our accounts team at accounts@reanzly.in.`,
    ``,
    `Warm regards,`,
    `Accounts Team · Reanzly Logistics Pvt. Ltd.`,
  ].join("\n");
}

// Generate a deterministic activity id (used when callers don't supply one).
export function newActivityId(): string {
  return `act-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

// Add an activity entry to a log, keeping it sorted desc by ts.
export function appendActivity(
  log: InvoiceActivityEntry[],
  entry: InvoiceActivityEntry,
): InvoiceActivityEntry[] {
  return [...log, entry].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );
}

"use client";

/* ============================================================
   Ledger module - Tally feature seed data + types.
   Strict monochrome Swiss - copy + types only.

   Provides the seed/types for the Tally-like features added
   alongside the FinOps merge:
     • Cost Centers (vehicle / driver / route / branch profitability)
     • Budgets & Variance (per account / cost centre)
     • GST Returns (GSTR-1, GSTR-3B, GSTR-2B reconciliation)
     • Inventory Vouchers (Material Transfer, Stock Journal)
     • Bank Reconciliation (BRS lines)
     • Multi-Company (Tally's hallmark - company list)

   IDs are stable strings so store hydration across reloads
   keeps referential integrity.
   ============================================================ */

const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// ── Cost Centers ──────────────────────────────────────────────
export type CostCenterCategory =
  | "Vehicle"
  | "Driver"
  | "Route"
  | "Branch"
  | "Department";

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  category: CostCenterCategory;
  parent?: string;
  active: boolean;
  revenue: number;
  expense: number;
  notes?: string;
}

export const SEED_COST_CENTERS: CostCenter[] = [
  // Vehicles
  { id: "cc-veh-1", code: "VH-01", name: "MH 12 AB 7892 · Tata Ace", category: "Vehicle", active: true, revenue: 412000, expense: 268000, notes: "Mumbai-Pune route specialist" },
  { id: "cc-veh-2", code: "VH-02", name: "MH 04 GH 4471 · Eicher Pro", category: "Vehicle", active: true, revenue: 685000, expense: 421000, notes: "Long-haul northern belt" },
  { id: "cc-veh-3", code: "VH-03", name: "GJ 01 CY 4471 · Ashok Leyland", category: "Vehicle", active: true, revenue: 528000, expense: 344000, notes: "Surat-Bhiwandi container" },
  { id: "cc-veh-4", code: "VH-04", name: "MH 14 PQ 9921 · Tata 407", category: "Vehicle", active: true, revenue: 318000, expense: 217000, notes: "LTL/parcel runs" },
  { id: "cc-veh-5", code: "VH-05", name: "KA 05 MN 3344 · BharatBenz", category: "Vehicle", active: false, revenue: 0, expense: 38000, notes: "Under repair since 14 days" },

  // Drivers
  { id: "cc-drv-1", code: "DR-01", name: "Rohit Deshmukh", category: "Driver", active: true, revenue: 412000, expense: 168000, notes: "Sal + bhatta, vehicle VH-01" },
  { id: "cc-drv-2", code: "DR-02", name: "Sukhbir Singh", category: "Driver", active: true, revenue: 685000, expense: 214000, notes: "Sal + bhatta, vehicle VH-02" },
  { id: "cc-drv-3", code: "DR-03", name: "Murthy Iyengar", category: "Driver", active: true, revenue: 528000, expense: 196000, notes: "Sal + bhatta, vehicle VH-03" },
  { id: "cc-drv-4", code: "DR-04", name: "Vikram Pillai", category: "Driver", active: true, revenue: 318000, expense: 142000, notes: "Sal + bhatta, vehicle VH-04" },

  // Routes
  { id: "cc-rt-1", code: "RT-MUM-PUN", name: "Mumbai - Pune", category: "Route", active: true, revenue: 812000, expense: 421000, notes: "Round trips, 5 days/week" },
  { id: "cc-rt-2", code: "RT-MUM-DEL", name: "Mumbai - Delhi", category: "Route", active: true, revenue: 1240000, expense: 894000, notes: "Long-haul, 4 day turnaround" },
  { id: "cc-rt-3", code: "RT-MUM-NAG", name: "Mumbai - Nagpur", category: "Route", active: true, revenue: 446000, expense: 268000, notes: "Container + flatbed" },
  { id: "cc-rt-4", code: "RT-SUR-VAD", name: "Surat - Vadodara", category: "Route", active: true, revenue: 184000, expense: 112000, notes: "Forwarded leg" },

  // Branches
  { id: "cc-br-1", code: "BR-MUM", name: "Mumbai HQ", category: "Branch", active: true, revenue: 2840000, expense: 1820000, notes: "Head office + main yard" },
  { id: "cc-br-2", code: "BR-PUN", name: "Pune Branch", category: "Branch", active: true, revenue: 612000, expense: 428000, notes: "Cross-dock + warehouse" },
  { id: "cc-br-3", code: "BR-NSK", name: "Nashik Branch", category: "Branch", active: false, revenue: 0, expense: 22000, notes: "Closed for monsoon" },

  // Departments
  { id: "cc-dep-1", code: "DEP-OPS", name: "Operations", category: "Department", active: true, revenue: 0, expense: 412000, notes: "Dispatch + ops team" },
  { id: "cc-dep-2", code: "DEP-ADM", name: "Admin & Finance", category: "Department", active: true, revenue: 0, expense: 184000, notes: "Accountant + HR" },
];

// ── Budgets ───────────────────────────────────────────────────
export type BudgetPeriod = "Monthly" | "Quarterly" | "Annual";

export interface Budget {
  id: string;
  accountOrCostCentre: string;
  scope: "Account" | "Cost Centre";
  scopeId: string;
  period: BudgetPeriod;
  periodLabel: string;
  budgeted: number;
  actual: number;
  /** Committed (PO/contract signed but not yet billed). */
  committed?: number;
}

export const SEED_BUDGETS: Budget[] = [
  // Account-level
  { id: "bud-1", accountOrCostCentre: "Fuel & Diesel Expense", scope: "Account", scopeId: "acc-fuel-exp", period: "Monthly", periodLabel: "Oct 2024", budgeted: 220000, actual: 201200, committed: 28000 },
  { id: "bud-2", accountOrCostCentre: "Driver Salaries", scope: "Account", scopeId: "acc-driver-sal", period: "Monthly", periodLabel: "Oct 2024", budgeted: 180000, actual: 168000 },
  { id: "bud-3", accountOrCostCentre: "Toll & FASTag Charges", scope: "Account", scopeId: "acc-toll", period: "Monthly", periodLabel: "Oct 2024", budgeted: 32000, actual: 24600 },
  { id: "bud-4", accountOrCostCentre: "Vehicle Maintenance", scope: "Account", scopeId: "acc-maint", period: "Monthly", periodLabel: "Oct 2024", budgeted: 55000, actual: 42000, committed: 12000 },
  { id: "bud-5", accountOrCostCentre: "Office Rent", scope: "Account", scopeId: "acc-rent", period: "Monthly", periodLabel: "Oct 2024", budgeted: 65000, actual: 65000 },
  { id: "bud-6", accountOrCostCentre: "Freight Revenue", scope: "Account", scopeId: "acc-freight-rev", period: "Monthly", periodLabel: "Oct 2024", budgeted: 1850000, actual: 1642854 },
  { id: "bud-7", accountOrCostCentre: "Tyre & Tube Expense", scope: "Account", scopeId: "acc-tyre", period: "Quarterly", periodLabel: "Q2 FY25", budgeted: 240000, actual: 86000 },
  { id: "bud-8", accountOrCostCentre: "Audit & Professional Fees", scope: "Account", scopeId: "acc-audit", period: "Annual", periodLabel: "FY25", budgeted: 180000, actual: 0, committed: 45000 },

  // Cost Centre-level
  { id: "bud-9", accountOrCostCentre: "Mumbai - Pune route · Fuel", scope: "Cost Centre", scopeId: "cc-rt-1", period: "Monthly", periodLabel: "Oct 2024", budgeted: 120000, actual: 98400 },
  { id: "bud-10", accountOrCostCentre: "Mumbai - Delhi route · Fuel", scope: "Cost Centre", scopeId: "cc-rt-2", period: "Monthly", periodLabel: "Oct 2024", budgeted: 280000, actual: 294000 },
  { id: "bud-11", accountOrCostCentre: "Pune Branch · Salaries", scope: "Cost Centre", scopeId: "cc-br-2", period: "Monthly", periodLabel: "Oct 2024", budgeted: 94000, actual: 88000 },
  { id: "bud-12", accountOrCostCentre: "MH 12 AB 7892 · Maintenance", scope: "Cost Centre", scopeId: "cc-veh-1", period: "Monthly", periodLabel: "Oct 2024", budgeted: 18000, actual: 12400 },
];

// ── GST Returns ───────────────────────────────────────────────
export type GSTReturnType = "GSTR-1" | "GSTR-3B" | "GSTR-2B";
export type GSTReturnStatus =
  | "Draft"
  | "Prepared"
  | "Filed"
  | "Reconciling";

export interface GSTReturn {
  id: string;
  type: GSTReturnType;
  period: string;          // e.g. "Oct 2024"
  dueDate: string;
  filingDate?: string;
  status: GSTReturnStatus;
  taxableValue: number;
  outputTax: number;
  inputTaxCredit: number;
  netPayable: number;
  /** For GSTR-2B reconciliation: matched / mismatched / pending lines. */
  matched?: number;
  mismatched?: number;
  pending?: number;
  ackNo?: string;
}

export const SEED_GST_RETURNS: GSTReturn[] = [
  // GSTR-1 (outward supplies) - filed for Sep, prepared for Oct
  {
    id: "gst-1", type: "GSTR-1", period: "Sep 2024", dueDate: "2024-10-11", filingDate: "2024-10-09",
    status: "Filed", taxableValue: 1642854, outputTax: 295713, inputTaxCredit: 0, netPayable: 0,
    ackNo: "082410000123456",
  },
  {
    id: "gst-2", type: "GSTR-1", period: "Oct 2024", dueDate: "2024-11-11",
    status: "Prepared", taxableValue: 1728400, outputTax: 311112, inputTaxCredit: 0, netPayable: 0,
  },
  {
    id: "gst-3", type: "GSTR-1", period: "Nov 2024", dueDate: "2024-12-11",
    status: "Draft", taxableValue: 0, outputTax: 0, inputTaxCredit: 0, netPayable: 0,
  },

  // GSTR-3B (summary return)
  {
    id: "gst-4", type: "GSTR-3B", period: "Sep 2024", dueDate: "2024-10-20", filingDate: "2024-10-18",
    status: "Filed", taxableValue: 1642854, outputTax: 295713, inputTaxCredit: 248000, netPayable: 47713,
    ackNo: "082420000987654",
  },
  {
    id: "gst-5", type: "GSTR-3B", period: "Oct 2024", dueDate: "2024-11-20",
    status: "Reconciling", taxableValue: 1728400, outputTax: 311112, inputTaxCredit: 268400, netPayable: 42712,
  },

  // GSTR-2B (auto-drafted ITC statement - reconciliation view)
  {
    id: "gst-6", type: "GSTR-2B", period: "Oct 2024", dueDate: "2024-11-12",
    status: "Reconciling", taxableValue: 0, outputTax: 0, inputTaxCredit: 268400, netPayable: 0,
    matched: 38, mismatched: 6, pending: 4,
  },
  {
    id: "gst-7", type: "GSTR-2B", period: "Sep 2024", dueDate: "2024-10-12", filingDate: "2024-10-10",
    status: "Filed", taxableValue: 0, outputTax: 0, inputTaxCredit: 248000, netPayable: 0,
    matched: 42, mismatched: 2, pending: 0,
  },
];

// GSTR-2B reconciliation line items (matched / mismatched / pending)
export type ReconStatus = "Matched" | "Mismatched" | "Pending";

export interface GSTReconLine {
  id: string;
  vendorGstin: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  taxableValue: number;
  itcClaimed: number;
  itcAsPer2B: number;
  status: ReconStatus;
  reason?: string;
}

export const SEED_GST_RECON_LINES: GSTReconLine[] = [
  { id: "rec-1", vendorGstin: "27AAACHP1234M1Z5", vendorName: "Hindustan Petroleum", invoiceNo: "HP-2024-08812", invoiceDate: DAYS_AGO(27), taxableValue: 60717, itcClaimed: 10929, itcAsPer2B: 10929, status: "Matched" },
  { id: "rec-2", vendorGstin: "27AAACB1234M1Z2", vendorName: "Bharat Petroleum", invoiceNo: "BP-2024-07421", invoiceDate: DAYS_AGO(23), taxableValue: 46968, itcClaimed: 8454, itcAsPer2B: 8454, status: "Matched" },
  { id: "rec-3", vendorGstin: "27AAACA1234M1Z8", vendorName: "Anand Tyre House", invoiceNo: "TY-0451", invoiceDate: DAYS_AGO(21), taxableValue: 76520, itcClaimed: 13774, itcAsPer2B: 13774, status: "Matched" },
  { id: "rec-4", vendorGstin: "27AAACP1234M1Z3", vendorName: "Patel Workshop & Garage", invoiceNo: "PW-2024-1182", invoiceDate: DAYS_AGO(16), taxableValue: 37440, itcClaimed: 6739, itcAsPer2B: 0, status: "Mismatched", reason: "Invoice not uploaded by vendor in GSTR-1" },
  { id: "rec-5", vendorGstin: "27AAACHP1234M1Z5", vendorName: "Hindustan Petroleum", invoiceNo: "HP-2024-08942", invoiceDate: DAYS_AGO(18), taxableValue: 63850, itcClaimed: 11493, itcAsPer2B: 11200, status: "Mismatched", reason: "Rate mismatch - vendor filed 18% vs our 18% (rounding diff)" },
  { id: "rec-6", vendorGstin: "27AAACC1234M1Z1", vendorName: "Sterling Workshop", invoiceNo: "SW-2024-0214", invoiceDate: DAYS_AGO(11), taxableValue: 28000, itcClaimed: 5040, itcAsPer2B: 0, status: "Pending", reason: "Awaiting vendor filing (deadline 11th)" },
  { id: "rec-7", vendorGstin: "27AAACS1234M1Z9", vendorName: "Shree Balaji Transport", invoiceNo: "SBT-2024-1142", invoiceDate: DAYS_AGO(8), taxableValue: 184000, itcClaimed: 0, itcAsPer2B: 0, status: "Pending", reason: "Transportation under RCM - to be self-invoiced" },
  { id: "rec-8", vendorGstin: "27AAACE1234M1Z6", vendorName: "Reanzly Realty", invoiceNo: "RR-2024-0019", invoiceDate: DAYS_AGO(2), taxableValue: 55085, itcClaimed: 0, itcAsPer2B: 0, status: "Pending", reason: "Office rent - exempt supply, no ITC" },
];

// ── Inventory Vouchers ────────────────────────────────────────
export type InventoryVoucherType =
  | "Material Transfer"
  | "Stock Journal"
  | "Receipt Note"
  | "Delivery Note"
  | "Rejection In"
  | "Rejection Out";

export type InventoryVoucherStatus = "Draft" | "Posted";

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  rate: number;
  category: string;
  godown: string;
  openingQty: number;
}

export interface InventoryLine {
  itemId: string;
  qty: number;
  rate: number;
  /** Source godown (for transfers / stock journal In side). */
  fromGodown?: string;
  /** Destination godown (for transfers / stock journal Out side). */
  toGodown?: string;
  /** Stock journal: batch / lot reference. */
  batch?: string;
}

export interface InventoryVoucher {
  id: string;
  number: string;
  type: InventoryVoucherType;
  date: string;
  narration: string;
  status: InventoryVoucherStatus;
  lines: InventoryLine[];
  totalValue: number;
  createdBy: string;
  createdAt: string;
}

export const SEED_STOCK_ITEMS: StockItem[] = [
  { id: "stk-1", name: "Diesel (HSD)", unit: "Ltr", rate: 90, category: "Fuel & Lubricants", godown: "Mulund Fuel Yard", openingQty: 1200 },
  { id: "stk-2", name: "Engine Oil 15W40", unit: "Ltr", rate: 380, category: "Fuel & Lubricants", godown: "Mulund Fuel Yard", openingQty: 180 },
  { id: "stk-3", name: "Coolant 5L", unit: "Can", rate: 620, category: "Fuel & Lubricants", godown: "Mulund Fuel Yard", openingQty: 24 },
  { id: "stk-4", name: "Tyre 11R22.5", unit: "No", rate: 28500, category: "Tyres & Tubes", godown: "Bhiwandi Stores", openingQty: 18 },
  { id: "stk-5", name: "Tube 11R22.5", unit: "No", rate: 1850, category: "Tyres & Tubes", godown: "Bhiwandi Stores", openingQty: 36 },
  { id: "stk-6", name: "Brake Shoe Set", unit: "Set", rate: 4200, category: "Spare Parts", godown: "Bhiwandi Stores", openingQty: 12 },
  { id: "stk-7", name: "Clutch Plate", unit: "No", rate: 8800, category: "Spare Parts", godown: "Bhiwandi Stores", openingQty: 8 },
  { id: "stk-8", name: "Battery 180Ah", unit: "No", rate: 14500, category: "Electricals", godown: "Pune Stores", openingQty: 6 },
  { id: "stk-9", name: "Tarpaulin 24x16", unit: "No", rate: 2800, category: "Consumables", godown: "Pune Stores", openingQty: 14 },
  { id: "stk-10", name: "Diesel (HSD)", unit: "Ltr", rate: 90, category: "Fuel & Lubricants", godown: "Pune Stores", openingQty: 400 },
];

export const SEED_GODOWNS: string[] = [
  "Mulund Fuel Yard",
  "Bhiwandi Stores",
  "Pune Stores",
  "Nagpur Stores",
  "On Vehicle - MH 12 AB 7892",
  "On Vehicle - MH 04 GH 4471",
];

let invCounter = 0;
function nextInvNo(): string {
  invCounter += 1;
  return "IV-" + String(invCounter).padStart(4, "0");
}

function invVoucher(
  daysAgo: number,
  type: InventoryVoucherType,
  narration: string,
  lines: { itemId: string; qty: number; rate?: number; fromGodown?: string; toGodown?: string; batch?: string }[],
  opts: { status?: InventoryVoucherStatus; createdBy?: string } = {},
): InventoryVoucher {
  const status = opts.status ?? "Posted";
  const createdBy = opts.createdBy ?? "Storekeeper · Imran";
  const fullLines: InventoryLine[] = lines.map((l) => {
    const item = SEED_STOCK_ITEMS.find((s) => s.id === l.itemId);
    return {
      itemId: l.itemId,
      qty: l.qty,
      rate: l.rate ?? item?.rate ?? 0,
      fromGodown: l.fromGodown,
      toGodown: l.toGodown,
      batch: l.batch,
    };
  });
  const totalValue = fullLines.reduce((s, l) => s + l.qty * l.rate, 0);
  invCounter += 1;
  return {
    id: `iv-${invCounter}`,
    number: nextInvNo(),
    type,
    date: DAYS_AGO(daysAgo),
    narration,
    status,
    lines: fullLines,
    totalValue,
    createdBy,
    createdAt: DAYS_AGO(daysAgo),
  };
}

export const SEED_INVENTORY_VOUCHERS: InventoryVoucher[] = [
  invVoucher(8, "Receipt Note", "Diesel + oil top-up received from HP Petroleumpump Mulund", [
    { itemId: "stk-1", qty: 600, fromGodown: "Mulund Fuel Yard", toGodown: "Mulund Fuel Yard" },
    { itemId: "stk-2", qty: 40, fromGodown: "Mulund Fuel Yard", toGodown: "Mulund Fuel Yard" },
  ]),
  invVoucher(7, "Material Transfer", "Tyre stock issued to vehicle MH 12 AB 7892 for replacement", [
    { itemId: "stk-4", qty: 2, fromGodown: "Bhiwandi Stores", toGodown: "On Vehicle - MH 12 AB 7892" },
    { itemId: "stk-5", qty: 2, fromGodown: "Bhiwandi Stores", toGodown: "On Vehicle - MH 12 AB 7892" },
  ]),
  invVoucher(6, "Stock Journal", "Old battery swapped for new under warranty - MH 04 GH 4471", [
    { itemId: "stk-8", qty: 1, fromGodown: "Pune Stores", toGodown: "On Vehicle - MH 04 GH 4471", batch: "BAT-2024-A" },
    { itemId: "stk-8", qty: -1, fromGodown: "On Vehicle - MH 04 GH 4471", toGodown: "Pune Stores", batch: "BAT-2022-B (warranty)" },
  ]),
  invVoucher(5, "Delivery Note", "Brake shoes + clutch plate issued to Patel Workshop for MH 12 AB 7892 overhaul", [
    { itemId: "stk-6", qty: 1, fromGodown: "Bhiwandi Stores" },
    { itemId: "stk-7", qty: 1, fromGodown: "Bhiwandi Stores" },
  ]),
  invVoucher(4, "Material Transfer", "Diesel transfer Mulund → Pune stores (route contingency)", [
    { itemId: "stk-1", qty: 200, fromGodown: "Mulund Fuel Yard", toGodown: "Pune Stores" },
  ]),
  invVoucher(3, "Receipt Note", "New tyres received from Anand Tyre House against PO TY-PO-0142", [
    { itemId: "stk-4", qty: 8, fromGodown: "Bhiwandi Stores", toGodown: "Bhiwandi Stores", batch: "MRF-Q4-2024" },
    { itemId: "stk-5", qty: 16, fromGodown: "Bhiwandi Stores", toGodown: "Bhiwandi Stores" },
  ]),
  invVoucher(2, "Rejection Out", "Defective tube returned to vendor (manufacturing defect)", [
    { itemId: "stk-5", qty: -2, fromGodown: "Bhiwandi Stores", batch: "MRF-Q4-2024 (rejected)" },
  ]),
  invVoucher(1, "Stock Journal", "Coolant + oil standard restock on vehicle MH 04 GH 4471", [
    { itemId: "stk-2", qty: 10, fromGodown: "Mulund Fuel Yard", toGodown: "On Vehicle - MH 04 GH 4471" },
    { itemId: "stk-3", qty: 1, fromGodown: "Mulund Fuel Yard", toGodown: "On Vehicle - MH 04 GH 4471" },
  ], { status: "Draft" }),
];

// ── Bank Reconciliation (BRS) ─────────────────────────────────
export type BrsLineStatus = "Matched" | "Unmatched" | "Pending";

export interface BrsLine {
  id: string;
  /** Bank statement line - as imported from CSV / bank feed. */
  bankDate: string;
  bankDescription: string;
  bankRef: string;
  bankAmount: number; // +ve = credit (money in), -ve = debit (money out)
  /** Matched ledger entry id (if any). */
  matchedEntryId?: string;
  matchedVoucherNo?: string;
  matchedNarration?: string;
  status: BrsLineStatus;
  /** Ledger book balance per books as of the bank date. */
  ledgerBalanceAsOfDate?: number;
}

export interface BankAccount {
  id: string;
  name: string;
  number: string;
  ifsc: string;
  bank: string;
  /** Closing balance per bank statement. */
  balanceAsPerBank: number;
  /** Closing balance per ledger books. */
  balanceAsPerBooks: number;
  /** As-of date for both balances. */
  asOf: string;
}

export const SEED_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "acc-bank-hdfc", name: "HDFC Bank - Current A/C", number: "04521050001234", ifsc: "HDFC0000452", bank: "HDFC Bank",
    balanceAsPerBank: 1184400, balanceAsPerBooks: 1240000, asOf: new Date().toISOString().slice(0, 10),
  },
  {
    id: "acc-bank-icici", name: "ICICI Bank - Current A/C", number: "66100180004567", ifsc: "ICIC0006610", bank: "ICICI Bank",
    balanceAsPerBank: 486200, balanceAsPerBooks: 480000, asOf: new Date().toISOString().slice(0, 10),
  },
];

export const SEED_BRS_LINES: BrsLine[] = [
  // HDFC bank statement lines
  { id: "brs-1", bankDate: DAYS_AGO(25), bankDescription: "NEFT credit - Bharat Logistics", bankRef: "NEFT-20241105009923", bankAmount: 142500, matchedEntryId: "jv-8", matchedVoucherNo: "JV-0008", matchedNarration: "Receipt - Bharat Logistics, NEFT settlement INV-02019", status: "Matched" },
  { id: "brs-2", bankDate: DAYS_AGO(20), bankDescription: "RTGS credit - Asian Paints Ltd", bankRef: "RTGS-20241110007123", bankAmount: 88000, matchedEntryId: "jv-9", matchedVoucherNo: "JV-0009", matchedNarration: "Receipt - Asian Paints, RTGS settlement against freight", status: "Matched" },
  { id: "brs-3", bankDate: DAYS_AGO(15), bankDescription: "NEFT credit - Reliance Retail", bankRef: "NEFT-20241115004456", bankAmount: 120000, status: "Unmatched" },
  { id: "brs-4", bankDate: DAYS_AGO(14), bankDescription: "UPI debit - Diesel fill Mulund", bankRef: "UPI-8842719045", bankAmount: -41500, status: "Pending" },
  { id: "brs-5", bankDate: DAYS_AGO(11), bankDescription: "NEFT debit - Driver salaries batch 12", bankRef: "NEFT-DR-20241118", bankAmount: -168000, matchedEntryId: "jv-15", matchedVoucherNo: "JV-0015", matchedNarration: "Driver salary payout - 12 drivers, week 41, bank transfer", status: "Matched" },
  { id: "brs-6", bankDate: DAYS_AGO(7), bankDescription: "NEFT debit - Anand Tyre House", bankRef: "NEFT-DR-20241122", bankAmount: -101480, matchedEntryId: "jv-20", matchedVoucherNo: "JV-0020", matchedNarration: "Payment - Anand Tyre House, NEFT against bill TY-0451", status: "Matched" },
  { id: "brs-7", bankDate: DAYS_AGO(5), bankDescription: "UPI debit - Patel Workshop partial", bankRef: "UPI-7729193044", bankAmount: -30000, matchedEntryId: "jv-21", matchedVoucherNo: "JV-0021", matchedNarration: "Payment - Patel Workshop, partial settlement", status: "Matched" },
  { id: "brs-8", bankDate: DAYS_AGO(2), bankDescription: "NEFT debit - Office rent October", bankRef: "NEFT-DR-20241125", bankAmount: -65000, matchedEntryId: "jv-24", matchedVoucherNo: "JV-0024", matchedNarration: "Office rent - October, paid to Reanzly Realty", status: "Matched" },
  { id: "brs-9", bankDate: DAYS_AGO(1), bankDescription: "Bank charges - Q2 minimum balance", bankRef: "BC-2024-1108", bankAmount: -1180, status: "Pending" },
  { id: "brs-10", bankDate: DAYS_AGO(1), bankDescription: "Interest credit - Q2 sweep", bankRef: "INT-2024-1108", bankAmount: 4280, status: "Pending" },
  // Cheque issued but not presented
  { id: "brs-11", bankDate: DAYS_AGO(8), bankDescription: "Cheque debit - Sterling Workshop (issued, not presented)", bankRef: "CHQ-0044218", bankAmount: 0, status: "Pending" },
];

// ── Multi-Company ─────────────────────────────────────────────
export type CompanyStatus = "Active" | "Locked" | "Trial";

export interface Company {
  id: string;
  name: string;
  legalName: string;
  gstin: string;
  state: string;
  financialYear: string;
  booksStartFrom: string;
  currency: string;
  status: CompanyStatus;
  isCurrent: boolean;
  userRole: string;
  /** Counts for the switcher card. */
  accountCount: number;
  entryCount: number;
}

export const SEED_COMPANIES: Company[] = [
  {
    id: "co-1", name: "Reanzly Logistics Pvt Ltd", legalName: "Reanzly Logistics Private Limited",
    gstin: "27AABCR1234M1Z5", state: "Maharashtra", financialYear: "FY 2024-25",
    booksStartFrom: "2024-04-01", currency: "INR", status: "Active", isCurrent: true,
    userRole: "Owner", accountCount: 42, entryCount: 26,
  },
  {
    id: "co-2", name: "Reanzly Cold Chain", legalName: "Reanzly Cold Chain LLP",
    gstin: "27AAFCR5678N1Z2", state: "Maharashtra", financialYear: "FY 2024-25",
    booksStartFrom: "2024-04-01", currency: "INR", status: "Active", isCurrent: false,
    userRole: "Accountant", accountCount: 36, entryCount: 18,
  },
  {
    id: "co-3", name: "Patel Freight Movers", legalName: "Patel Freight Movers Pvt Ltd",
    gstin: "24AAACP9012M1Z8", state: "Gujarat", financialYear: "FY 2024-25",
    booksStartFrom: "2024-04-01", currency: "INR", status: "Active", isCurrent: false,
    userRole: "Accountant", accountCount: 28, entryCount: 14,
  },
  {
    id: "co-4", name: "Reanzly North Branch", legalName: "Reanzly Delhi Branch (Proprietor)",
    gstin: "07BZBPR3456M1Z1", state: "Delhi", financialYear: "FY 2024-25",
    booksStartFrom: "2024-04-01", currency: "INR", status: "Trial", isCurrent: false,
    userRole: "Owner", accountCount: 14, entryCount: 6,
  },
  {
    id: "co-5", name: "Shree Balaji Transport", legalName: "Shree Balaji Roadlines (P) Ltd",
    gstin: "27AAACS7890M1Z4", state: "Maharashtra", financialYear: "FY 2023-24",
    booksStartFrom: "2023-04-01", currency: "INR", status: "Locked", isCurrent: false,
    userRole: "Auditor", accountCount: 31, entryCount: 124,
  },
];

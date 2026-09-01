"use client";

/* ============================================================
   Ledger module - seed data.
   Strict monochrome Swiss - copy + types only.

   Provides:
     • AccountGroup / AccountSubgroup / OpeningNature unions
     • Account type
     • JournalEntry + JournalLine types
     • Party (customers/vendors for narration reference) type
     • SEED_ACCOUNTS - realistic Indian transport-company COA
     • SEED_ENTRIES - 26 realistic double-entry journal vouchers
     • SEED_PARTIES - transport parties for narration context

   IDs are stable strings (acc-XXX, jv-NNN) so store hydration
   across reloads keeps referential integrity.
   ============================================================ */

export type AccountGroup =
  | "Asset"
  | "Liability"
  | "Income"
  | "Expense"
  | "Equity";

export type AccountSubgroup =
  | "Current Asset"
  | "Fixed Asset"
  | "Bank & Cash"
  | "Current Liability"
  | "Long Term Liability"
  | "Equity Capital"
  | "Operating Income"
  | "Other Income"
  | "Direct Expense"
  | "Indirect Expense"
  | "Duties & Taxes";

export type OpeningNature = "Dr" | "Cr";

export interface Account {
  id: string;
  code: string;
  name: string;
  group: AccountGroup;
  subgroup: AccountSubgroup;
  openingBalance: number;
  openingNature: OpeningNature;
  /** Whether this account is system-protected (cannot delete). */
  system?: boolean;
}

export type EntryStatus = "Draft" | "Posted";

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  lines: JournalLine[];
  status: EntryStatus;
  createdBy: string;
  createdAt: string;
}

export interface Party {
  id: string;
  name: string;
  type: "Customer" | "Vendor" | "Employee" | "Other";
  city: string;
}

// ── Helpers ─────────────────────────────────────────────────
const NOW = () => new Date().toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// ── Chart of Accounts - realistic transport company ─────────
// Codes follow Indian convention: 1xxxx Asset, 2xxxx Liability,
// 3xxxx Equity, 4xxxx Income, 5xxxx Expense.
export const SEED_ACCOUNTS: Account[] = [
  // ── Bank & Cash (10000-10999) ──
  { id: "acc-cash", code: "10001", name: "Cash in Hand", group: "Asset", subgroup: "Bank & Cash", openingBalance: 185000, openingNature: "Dr", system: true },
  { id: "acc-bank-hdfc", code: "10010", name: "HDFC Bank - Current A/C", group: "Asset", subgroup: "Bank & Cash", openingBalance: 1240000, openingNature: "Dr", system: true },
  { id: "acc-bank-icici", code: "10011", name: "ICICI Bank - Current A/C", group: "Asset", subgroup: "Bank & Cash", openingBalance: 480000, openingNature: "Dr", system: true },
  { id: "acc-petty", code: "10020", name: "Petty Cash", group: "Asset", subgroup: "Bank & Cash", openingBalance: 25000, openingNature: "Dr", system: true },

  // ── Current Assets (11000-11999) ──
  { id: "acc-ar", code: "11000", name: "Accounts Receivable", group: "Asset", subgroup: "Current Asset", openingBalance: 2185000, openingNature: "Dr", system: true },
  { id: "acc-adv-taxi", code: "11010", name: "Advance to Drivers", group: "Asset", subgroup: "Current Asset", openingBalance: 142000, openingNature: "Dr" },
  { id: "acc-adv-vendor", code: "11020", name: "Advance to Vendors", group: "Asset", subgroup: "Current Asset", openingBalance: 78000, openingNature: "Dr" },
  { id: "acc-tds-rec", code: "11030", name: "TDS Receivable", group: "Asset", subgroup: "Current Asset", openingBalance: 96000, openingNature: "Dr" },
  { id: "acc-prepaid", code: "11040", name: "Prepaid Expenses", group: "Asset", subgroup: "Current Asset", openingBalance: 54000, openingNature: "Dr" },
  { id: "acc-fastag", code: "11050", name: "FASTag Wallet", group: "Asset", subgroup: "Current Asset", openingBalance: 38000, openingNature: "Dr" },
  { id: "acc-fuel-stock", code: "12000", name: "Fuel & Lubricant Stock", group: "Asset", subgroup: "Current Asset", openingBalance: 165000, openingNature: "Dr" },

  // ── Fixed Assets (15000-15999) ──
  { id: "acc-vehicle", code: "15000", name: "Vehicle Assets", group: "Asset", subgroup: "Fixed Asset", openingBalance: 8650000, openingNature: "Dr", system: true },
  { id: "acc-acc-dep", code: "15010", name: "Accumulated Depreciation", group: "Asset", subgroup: "Fixed Asset", openingBalance: 1840000, openingNature: "Cr", system: true },
  { id: "acc-office-eq", code: "15020", name: "Office Equipment", group: "Asset", subgroup: "Fixed Asset", openingBalance: 280000, openingNature: "Dr" },
  { id: "acc-furniture", code: "15030", name: "Furniture & Fixtures", group: "Asset", subgroup: "Fixed Asset", openingBalance: 165000, openingNature: "Dr" },

  // ── Current Liabilities (20000-20999) ──
  { id: "acc-ap", code: "20000", name: "Accounts Payable", group: "Liability", subgroup: "Current Liability", openingBalance: 945000, openingNature: "Cr", system: true },
  { id: "acc-salary-pay", code: "20010", name: "Salary Payable", group: "Liability", subgroup: "Current Liability", openingBalance: 386000, openingNature: "Cr" },
  { id: "acc-expense-pay", code: "20020", name: "Expense Payable", group: "Liability", subgroup: "Current Liability", openingBalance: 92000, openingNature: "Cr" },
  { id: "acc-adv-cust", code: "20030", name: "Advance from Customers", group: "Liability", subgroup: "Current Liability", openingBalance: 215000, openingNature: "Cr" },

  // ── Duties & Taxes (22000-22999) ──
  { id: "acc-gst-input", code: "22010", name: "GST Input (CGST+SGST+IGST)", group: "Asset", subgroup: "Duties & Taxes", openingBalance: 348000, openingNature: "Dr", system: true },
  { id: "acc-gst-output", code: "22011", name: "GST Output (CGST+SGST+IGST)", group: "Liability", subgroup: "Duties & Taxes", openingBalance: 412000, openingNature: "Cr", system: true },
  { id: "acc-tds-pay", code: "22020", name: "TDS Payable", group: "Liability", subgroup: "Duties & Taxes", openingBalance: 67000, openingNature: "Cr", system: true },
  { id: "acc-gst-pay", code: "22030", name: "GST Payable (Net)", group: "Liability", subgroup: "Duties & Taxes", openingBalance: 0, openingNature: "Cr" },

  // ── Long Term Liabilities (25000-25999) ──
  { id: "acc-vehicle-loan", code: "25000", name: "Vehicle Loan - HDFC", group: "Liability", subgroup: "Long Term Liability", openingBalance: 2840000, openingNature: "Cr", system: true },
  { id: "acc-term-loan", code: "25010", name: "Term Loan - ICICI", group: "Liability", subgroup: "Long Term Liability", openingBalance: 1200000, openingNature: "Cr" },

  // ── Equity (30000-30999) ──
  { id: "acc-capital", code: "30000", name: "Capital Account", group: "Equity", subgroup: "Equity Capital", openingBalance: 5000000, openingNature: "Cr", system: true },
  // 1,134,000 (not the original 1,240,000): the opening Chart of Accounts
  // didn't satisfy Assets = Liabilities + Equity as authored - total Dr
  // opening balances were Rs 106,000 short of total Cr. Reserves & Surplus
  // is the conventional balancing/plug account, so it absorbs the Rs
  // 106,000 correction rather than an asset or liability figure that's
  // meant to represent something specific.
  { id: "acc-reserves", code: "30010", name: "Reserves & Surplus", group: "Equity", subgroup: "Equity Capital", openingBalance: 1134000, openingNature: "Cr" },
  { id: "acc-drawings", code: "30020", name: "Drawings Account", group: "Equity", subgroup: "Equity Capital", openingBalance: 0, openingNature: "Dr" },

  // ── Operating Income (40000-40999) ──
  { id: "acc-freight-rev", code: "40000", name: "Freight Revenue", group: "Income", subgroup: "Operating Income", openingBalance: 0, openingNature: "Cr", system: true },
  { id: "acc-loading-rev", code: "40010", name: "Loading & Unloading Charges", group: "Income", subgroup: "Operating Income", openingBalance: 0, openingNature: "Cr" },
  { id: "acc-detention-rev", code: "40020", name: "Detention Charges", group: "Income", subgroup: "Operating Income", openingBalance: 0, openingNature: "Cr" },

  // ── Other Income (41000-41999) ──
  { id: "acc-commission-inc", code: "41000", name: "Commission Income", group: "Income", subgroup: "Other Income", openingBalance: 0, openingNature: "Cr" },
  { id: "acc-interest-inc", code: "41010", name: "Interest Income", group: "Income", subgroup: "Other Income", openingBalance: 0, openingNature: "Cr" },
  { id: "acc-scrap-sale", code: "41020", name: "Scrap Sale", group: "Income", subgroup: "Other Income", openingBalance: 0, openingNature: "Cr" },

  // ── Direct Expenses (50000-50999) ──
  { id: "acc-fuel-exp", code: "50000", name: "Fuel & Diesel Expense", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr", system: true },
  { id: "acc-driver-sal", code: "50010", name: "Driver Salaries", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr", system: true },
  { id: "acc-toll", code: "50020", name: "Toll & FASTag Charges", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-maint", code: "50030", name: "Vehicle Maintenance", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-tyre", code: "50040", name: "Tyre & Tube Expense", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-loading-exp", code: "50050", name: "Loading & Unloading Expense", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-trip-exp", code: "50060", name: "Trip Expenses (Bhatta, Halting)", group: "Expense", subgroup: "Direct Expense", openingBalance: 0, openingNature: "Dr" },

  // ── Indirect Expenses (51000-51999) ──
  { id: "acc-rent", code: "51000", name: "Office Rent", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-staff-sal", code: "51010", name: "Staff Salaries", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-elec", code: "51020", name: "Electricity & Water", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-telecom", code: "51030", name: "Telephone & Internet", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-insurance", code: "51040", name: "Insurance (Vehicle + Fleet)", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-permit", code: "51050", name: "Permits & Fitness Renewals", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-repair", code: "51060", name: "Repairs & Maintenance (Office)", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-dep", code: "51070", name: "Depreciation", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-bank-chg", code: "51080", name: "Bank Charges", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-audit", code: "51090", name: "Audit & Professional Fees", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-travel", code: "51100", name: "Travel & Conveyance", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
  { id: "acc-print", code: "51110", name: "Printing & Stationery", group: "Expense", subgroup: "Indirect Expense", openingBalance: 0, openingNature: "Dr" },
];

// ── Parties - for narration context only ──────────────────
export const SEED_PARTIES: Party[] = [
  { id: "p-1", name: "Bharat Logistics Pvt Ltd", type: "Customer", city: "Mumbai" },
  { id: "p-2", name: "Reliance Retail Ltd", type: "Customer", city: "Navi Mumbai" },
  { id: "p-3", name: "Asian Paints Ltd", type: "Customer", city: "Bhandup" },
  { id: "p-4", name: "Tata Steel Ltd", type: "Customer", city: "Kalamboli" },
  { id: "p-5", name: "Hindustan Petroleum", type: "Vendor", city: "Mumbai" },
  { id: "p-6", name: "Bharat Petroleum", type: "Vendor", city: "Pune" },
  { id: "p-7", name: "Anand Tyre House", type: "Vendor", city: "Thane" },
  { id: "p-8", name: "Patel Workshop & Garage", type: "Vendor", city: "Bhiwandi" },
  { id: "p-9", name: "Rohit Deshmukh", type: "Employee", city: "Mumbai" },
  { id: "p-10", name: "Sukhbir Singh", type: "Employee", city: "Pune" },
  { id: "p-11", name: "MH 04 Toll Plaza", type: "Other", city: "Mumbai" },
  { id: "p-12", name: "Shree Balaji Transport", type: "Vendor", city: "Vashi" },
];

// ── Helpers for seed entry construction ─────────────────────
let jvCounter = 0;
function nextVoucher(): string {
  jvCounter += 1;
  return "JV-" + String(jvCounter).padStart(4, "0");
}

/** Build a balanced entry. Lines already balance by construction. */
function entry(
  daysAgo: number,
  narration: string,
  lines: { accountId: string; debit?: number; credit?: number }[],
  opts: { status?: EntryStatus; createdBy?: string } = {},
): JournalEntry {
  const status = opts.status ?? "Posted";
  const createdBy = opts.createdBy ?? "Geeta Sharma";
  return {
    id: `jv-${jvCounter + 1}`,
    voucherNo: nextVoucher(),
    date: DAYS_AGO(daysAgo),
    narration,
    status,
    createdBy,
    createdAt: DAYS_AGO(daysAgo),
    lines: lines.map((l) => ({
      accountId: l.accountId,
      debit: Math.round(l.debit ?? 0),
      credit: Math.round(l.credit ?? 0),
    })),
  };
}

// ── Seed Journal Entries - 26 realistic transport-company entries ──
// Each entry is balanced (sum of debits == sum of credits) by construction.
export const SEED_ENTRIES: JournalEntry[] = [
  // Freight revenue bookings (last 30 days)
  entry(28, "Freight bill - Bharat Logistics, Mumbai to Pune, 2 trucks (INV RZ-INV-02031)", [
    { accountId: "acc-ar", debit: 184000 },
    { accountId: "acc-freight-rev", credit: 164107 },
    { accountId: "acc-gst-output", credit: 19893 },
  ]),
  entry(26, "Freight bill - Asian Paints, Bhandup to Nagpur, container load", [
    { accountId: "acc-ar", debit: 96200 },
    { accountId: "acc-freight-rev", credit: 85714 },
    { accountId: "acc-gst-output", credit: 10486 },
  ]),
  entry(24, "Freight bill - Reliance Retail, multiple LTL shipments, week 41", [
    { accountId: "acc-ar", debit: 245000 },
    { accountId: "acc-freight-rev", credit: 218304 },
    { accountId: "acc-gst-output", credit: 26696 },
  ]),
  entry(22, "Freight bill - Tata Steel, Kalamboli to Tatanagar, flatbed", [
    { accountId: "acc-ar", debit: 132000 },
    { accountId: "acc-freight-rev", credit: 117857 },
    { accountId: "acc-gst-output", credit: 14143 },
  ]),
  entry(19, "Detention charges - Bharat Logistics, unloading delay at Pune yard", [
    { accountId: "acc-ar", debit: 18000 },
    { accountId: "acc-detention-rev", credit: 16071 },
    { accountId: "acc-gst-output", credit: 1929 },
  ]),
  entry(17, "Loading charges billed - Reliance Retail warehouse DC-4", [
    { accountId: "acc-ar", debit: 9600 },
    { accountId: "acc-loading-rev", credit: 8571 },
    { accountId: "acc-gst-output", credit: 1029 },
  ]),

  // Customer receipts (money in)
  entry(25, "Receipt - Bharat Logistics, NEFT settlement INV-02019", [
    { accountId: "acc-bank-hdfc", debit: 142500 },
    { accountId: "acc-ar", credit: 142500 },
  ]),
  entry(20, "Receipt - Asian Paints, RTGS settlement against freight", [
    { accountId: "acc-bank-hdfc", debit: 88000 },
    { accountId: "acc-ar", credit: 88000 },
  ]),
  entry(15, "Receipt - Reliance Retail, partial payment INV-02025", [
    { accountId: "acc-bank-icici", debit: 120000 },
    { accountId: "acc-ar", credit: 120000 },
  ]),
  entry(12, "Advance received - Tata Steel, against upcoming Kalamboli loads", [
    { accountId: "acc-bank-hdfc", debit: 75000 },
    { accountId: "acc-adv-cust", credit: 75000 },
  ]),
  entry(8, "Receipt - Bharat Logistics, UPI part-payment", [
    { accountId: "acc-bank-hdfc", debit: 40000 },
    { accountId: "acc-ar", credit: 40000 },
  ]),

  // Fuel & diesel (largest recurring expense)
  entry(27, "Diesel fill - HP pump Mulund, MH 12 AB 7892 + MH 04 GH 4471", [
    { accountId: "acc-fuel-exp", debit: 68500 },
    { accountId: "acc-gst-input", debit: 12330 },
    { accountId: "acc-bank-hdfc", credit: 80830 },
  ]),
  entry(23, "Diesel fill - BP pump Pune, fleet refuel for Nashik route", [
    { accountId: "acc-fuel-exp", debit: 52400 },
    { accountId: "acc-gst-input", debit: 9432 },
    { accountId: "acc-bank-hdfc", credit: 61832 },
  ]),
  entry(18, "Diesel fill - HP pump Thane, multi-truck refuel", [
    { accountId: "acc-fuel-exp", debit: 71800 },
    { accountId: "acc-gst-input", debit: 12924 },
    { accountId: "acc-bank-icici", credit: 84724 },
  ]),
  entry(11, "Petty cash fuel - FASTag top-up + 2 minor fills", [
    { accountId: "acc-fuel-exp", debit: 8500 },
    { accountId: "acc-petty", credit: 8500 },
  ]),

  // Driver salaries and advances
  entry(14, "Driver salary payout - 12 drivers, week 41, bank transfer", [
    { accountId: "acc-driver-sal", debit: 168000 },
    { accountId: "acc-bank-hdfc", credit: 168000 },
  ]),
  entry(9, "Trip advance - 6 drivers for Mumbai-Pune-Belapur round", [
    { accountId: "acc-adv-taxi", debit: 48000 },
    { accountId: "acc-cash", credit: 48000 },
  ]),
  entry(6, "Driver bhatta + halting reimbursement - long-haul Delhi route", [
    { accountId: "acc-trip-exp", debit: 32400 },
    { accountId: "acc-cash", credit: 32400 },
  ]),

  // Maintenance, tyres, repairs
  entry(21, "Anand Tyre House - 8 truck tyres + tubes, tax invoice", [
    { accountId: "acc-tyre", debit: 86000 },
    { accountId: "acc-gst-input", debit: 15480 },
    { accountId: "acc-ap", credit: 101480 },
  ]),
  entry(16, "Patel Workshop - clutch + brake overhaul MH 12 AB 7892", [
    { accountId: "acc-maint", debit: 42000 },
    { accountId: "acc-gst-input", debit: 7560 },
    { accountId: "acc-ap", credit: 49560 },
  ]),
  entry(10, "Loading labour payout - Bhiwandi godown, week 41", [
    { accountId: "acc-loading-exp", debit: 28500 },
    { accountId: "acc-cash", credit: 28500 },
  ]),

  // Toll and FASTag
  entry(13, "FASTag toll deductions - week 41, multiple vehicles", [
    { accountId: "acc-toll", debit: 24600 },
    { accountId: "acc-fastag", credit: 24600 },
  ]),

  // Vendor payments
  entry(7, "Payment - Anand Tyre House, NEFT against bill TY-0451", [
    { accountId: "acc-ap", debit: 101480 },
    { accountId: "acc-bank-hdfc", credit: 101480 },
  ]),
  entry(5, "Payment - Patel Workshop, partial settlement", [
    { accountId: "acc-ap", debit: 30000 },
    { accountId: "acc-bank-icici", credit: 30000 },
  ]),

  // GST + TDS statutory
  entry(4, "GST payable set-off - net output against input for September", [
    { accountId: "acc-gst-output", debit: 412000 },
    { accountId: "acc-gst-input", credit: 348000 },
    { accountId: "acc-gst-pay", credit: 64000 },
  ]),
  entry(3, "TDS deduction - transporter charges section 194C, Q2", [
    { accountId: "acc-tds-pay", debit: 42000 },
    { accountId: "acc-ap", credit: 42000 },
  ]),

  // Office + indirect
  entry(2, "Office rent - October, paid to Reanzly Realty", [
    { accountId: "acc-rent", debit: 65000 },
    { accountId: "acc-bank-hdfc", credit: 65000 },
  ]),

  // Closing/reversal draft (left as draft)
  entry(1, "Month-end depreciation - October, provisional", [
    { accountId: "acc-dep", debit: 72500 },
    { accountId: "acc-acc-dep", credit: 72500 },
  ], { status: "Draft" }),
];

// ── Subgroup menu options (preserves order) ─────────────────
export const SUBGROUPS: AccountSubgroup[] = [
  "Bank & Cash",
  "Current Asset",
  "Fixed Asset",
  "Current Liability",
  "Long Term Liability",
  "Equity Capital",
  "Duties & Taxes",
  "Operating Income",
  "Other Income",
  "Direct Expense",
  "Indirect Expense",
];

/** Maps a subgroup to its parent group (for cascading selects). */
export const GROUP_FOR_SUBGROUP: Record<AccountSubgroup, AccountGroup> = {
  "Bank & Cash": "Asset",
  "Current Asset": "Asset",
  "Fixed Asset": "Asset",
  "Duties & Taxes": "Asset", // could be either - driver picks group separately
  "Current Liability": "Liability",
  "Long Term Liability": "Liability",
  "Equity Capital": "Equity",
  "Operating Income": "Income",
  "Other Income": "Income",
  "Direct Expense": "Expense",
  "Indirect Expense": "Expense",
};

export const GROUPS: AccountGroup[] = ["Asset", "Liability", "Equity", "Income", "Expense"];

export const ACCOUNT_GROUPS_META: { label: AccountGroup; description: string }[] = [
  { label: "Asset", description: "What the business owns - cash, receivables, vehicles." },
  { label: "Liability", description: "What the business owes - payables, loans, GST/TDS payable." },
  { label: "Equity", description: "Owner's capital, reserves and drawings." },
  { label: "Income", description: "Revenue earned - freight, loading, commission, interest." },
  { label: "Expense", description: "Costs incurred - fuel, salaries, toll, maintenance." },
];

// suppress unused var lint
void NOW;

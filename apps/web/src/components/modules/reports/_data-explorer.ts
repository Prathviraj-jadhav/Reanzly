/* ============================================================
   Data Explorer - seed data + report configs for the Reports
   module's 4th tab ("Data Explorer"). 10 report types, each
   with 30-50 rows of realistic Indian logistics data.

   All data is generated at module load using a deterministic
   LCG RNG so the rendered rows are stable across renders
   (HMR included). No colours, no emojis - just numbers.
   ============================================================ */

import {
  TrendingUp, Truck, Users, Receipt, Banknote, Fuel, Wallet,
  Building2, FileText, type LucideIcon,
} from "lucide-react";

export { formatINR, formatNumber, formatDate, toInputDate } from "./_helpers";

/* ---------- deterministic RNG (LCG) ---------- */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, rng: () => number, decimals = 2): number {
  const v = rng() * (max - min) + min;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}
function daysAgoIso(maxDays: number, rng: () => number, minDays = 0): string {
  const offset = randInt(minDays, maxDays, rng);
  return new Date(Date.now() - offset * 86_400_000).toISOString();
}

/* ---------- domain constants (Indian logistics) ---------- */
const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad",
  "Pune", "Ahmedabad", "Surat", "Jaipur", "Lucknow", "Nagpur",
  "Indore", "Visakhapatnam", "Kochi", "Coimbatore",
] as const;

const VEHICLE_PLATES = [
  "MH 01 AB 1234", "MH 02 CD 5678", "MH 03 EF 9012", "DL 01 GH 3456",
  "DL 02 IJ 7890", "KA 01 KL 1234", "KA 02 MN 5678", "TN 01 OP 9012",
  "TN 02 QR 3456", "GJ 01 ST 7890", "GJ 02 UV 1234", "RJ 01 WX 5678",
  "TS 01 YZ 9012", "TS 02 AB 3456", "WB 01 CD 7890", "WB 02 EF 1234",
  "UP 01 GH 5678", "UP 02 IJ 9012", "MP 01 KL 3456", "MP 02 MN 7890",
  "AP 01 OP 1234", "AP 02 QR 5678", "KL 01 ST 9012", "KL 02 UV 3456",
] as const;

const VEHICLE_TYPES = ["Truck 32ft", "Truck 24ft", "Container 20ft", "Container 40ft", "Tanker", "Pickup"] as const;

const DRIVERS = [
  "Rahul Sharma", "Amit Kumar", "Vikram Singh", "Sanjay Verma",
  "Deepak Nair", "Rajesh Mehta", "Suresh Patil", "Anil Reddy",
  "Kuldeep Singh", "Manoj Gupta", "Pradeep Yadav", "Sandeep Joshi",
  "Ramesh Iyer", "Dinesh Patel", "Harish Pandey", "Mohan Das",
  "Naresh Pillai", "Gopal Rao", "Vinod Shetty", "Arjun Nair",
  "Sai Krishna", "Jaspal Brar", "Imran Khan", "Bhupinder Gill",
] as const;

const CUSTOMERS = [
  "Reliance Industries", "Tata Steel", "Mahindra Logistics", "Asian Paints",
  "Hindalco", "Adani Cement", "Bajaj Electricals", "Pidilite Industries",
  "Godrej & Boyce", "L&T Construction", "ITC Limited", "Britannia Foods",
  "Dabur India", "Marico Industries", "Nestle India", "Colgate Palmolive",
  "HUL Distribution", "Coca-Cola India", "PepsiCo India", "Amul Dairy",
  "Jindal Steel", "Vedanta Ltd", "UltraTech Cement", "Shree Cement",
] as const;

const VENDORS = [
  "Bharat Petroleum", "Indian Oil Corp", "HPCL", "Shell India",
  "Reliance Fuels", "Essar Petroleum", "Toll Plaza Services",
  "Bridge Network India", "FastTrack Workshops", "TyreZone Distributors",
  "SpareHub India", "LogiParts Supply", "DriverStaff Agency",
  "SecureParking India", "RoadsideAssist 24x7", "National Highways Authority",
] as const;

const EMPLOYEES = [
  { name: "Reena Mehta", designation: "Operations Manager" },
  { name: "Sukhbir Gill", designation: "Fleet Manager" },
  { name: "Rohit Sharma", designation: "Senior Dispatcher" },
  { name: "Anil Reddy", designation: "Dispatcher" },
  { name: "Pooja Desai", designation: "Finance Lead" },
  { name: "Karthik Iyer", designation: "Accountant" },
  { name: "Manish Agarwal", designation: "Branch Manager" },
  { name: "Sneha Kapoor", designation: "HR Executive" },
  { name: "Vivek Joshi", designation: "Compliance Officer" },
  { name: "Farhan Ahmed", designation: "Maintenance Lead" },
  { name: "Lakshmi Nair", designation: "Customer Success" },
  { name: "Ramesh Babu", designation: "Warehouse Supervisor" },
  { name: "Imtiaz Khan", designation: "Driver" },
  { name: "Prakash Naik", designation: "Driver" },
  { name: "Sunil Pawar", designation: "Driver" },
  { name: "Deepak Salian", designation: "Driver" },
  { name: "Akshay Kale", designation: "Driver" },
  { name: "Bharat Patel", designation: "Mechanic" },
  { name: "Mahesh Yadav", designation: "Loader" },
  { name: "Sanjay Khanna", designation: "Sales Executive" },
  { name: "Tanvi Bhatt", designation: "Billing Clerk" },
  { name: "Umesh Dixit", designation: "Route Planner" },
  { name: "Vinod Kamath", designation: "Safety Officer" },
  { name: "Yash Pandit", designation: "Trainee" },
  { name: "Zara Sheikh", designation: "Trainee" },
  { name: "Aditya Menon", designation: "Junior Accountant" },
  { name: "Bhakti Rao", designation: "Junior HR" },
  { name: "Chetan Dube", designation: "Field Executive" },
  { name: "Divya Shah", designation: "Procurement Lead" },
  { name: "Eshaan Qureshi", designation: "Driver" },
] as const;

const EXPENSE_CATEGORIES = [
  "Fuel", "Toll", "Maintenance", "Driver Salary", "Repair",
  "Tyre Replacement", "Permit & Fitness", "Insurance", "Loading/Unloading",
  "Halting Charges",
] as const;

const DESIGNATIONS = [
  "Operations Manager", "Fleet Manager", "Senior Dispatcher", "Dispatcher",
  "Finance Lead", "Accountant", "Branch Manager", "HR Executive",
  "Compliance Officer", "Maintenance Lead", "Customer Success",
  "Warehouse Supervisor", "Driver", "Mechanic", "Loader",
  "Sales Executive", "Billing Clerk", "Route Planner", "Safety Officer",
] as const;

/* ============================================================
   Report type registry
   ============================================================ */
export type ExplorerReportId =
  | "trip-pl"
  | "vehicle-utilization"
  | "driver-performance"
  | "invoice-aging"
  | "expense-breakdown"
  | "fuel-efficiency"
  | "vendor-payments"
  | "customer-outstanding"
  | "lr-summary"
  | "payroll-summary";

export interface ExplorerKpiSpec {
  label: string;
  field: string;
  format: "inr" | "number" | "percent" | "count";
  /** Aggregate mode across rows. */
  aggregate: "sum" | "avg" | "count" | "max";
}

export interface ExplorerReportConfig {
  id: ExplorerReportId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Label + field name for the entity filter (e.g. "Vehicle" / "vehicle"). */
  entityLabel: string;
  entityField: string;
  /** Field name used for date-range filtering (ISO date column). */
  dateField: string;
  /** Field used for multi-select status filtering. */
  statusField: string;
  statusOptions: string[];
  /** Column key to sort by default. */
  defaultSortKey: string;
  /** KPI strip config (4 tiles). */
  kpis: ExplorerKpiSpec[];
}

export const EXPLORER_REPORTS: Record<ExplorerReportId, ExplorerReportConfig> = {
  "trip-pl": {
    id: "trip-pl",
    label: "Trip P&L",
    description: "Per-trip revenue, expense, profit and margin.",
    icon: TrendingUp,
    entityLabel: "Vehicle",
    entityField: "vehicle",
    dateField: "date",
    statusField: "status",
    statusOptions: ["Delivered", "In Transit", "Active", "Cancelled", "Breakdown"],
    defaultSortKey: "date",
    kpis: [
      { label: "Total Revenue", field: "revenue", format: "inr", aggregate: "sum" },
      { label: "Total Expense", field: "expense", format: "inr", aggregate: "sum" },
      { label: "Net Profit", field: "profit", format: "inr", aggregate: "sum" },
      { label: "Avg Margin", field: "marginPct", format: "percent", aggregate: "avg" },
    ],
  },
  "vehicle-utilization": {
    id: "vehicle-utilization",
    label: "Vehicle Utilization",
    description: "Distance, loaded vs empty km, idle days per vehicle.",
    icon: Truck,
    entityLabel: "Vehicle Type",
    entityField: "type",
    dateField: "_none",
    statusField: "status",
    statusOptions: ["Active", "Idle", "In Maintenance", "Offline"],
    defaultSortKey: "utilizationPct",
    kpis: [
      { label: "Total Km", field: "totalKm", format: "number", aggregate: "sum" },
      { label: "Avg Utilization", field: "utilizationPct", format: "percent", aggregate: "avg" },
      { label: "Idle Days", field: "idleDays", format: "number", aggregate: "sum" },
      { label: "Vehicles", field: "id", format: "count", aggregate: "count" },
    ],
  },
  "driver-performance": {
    id: "driver-performance",
    label: "Driver Performance",
    description: "Trips, on-time %, fuel efficiency and rating per driver.",
    icon: Users,
    entityLabel: "Driver",
    entityField: "driver",
    dateField: "_none",
    statusField: "status",
    statusOptions: ["Active", "On Leave", "Inactive"],
    defaultSortKey: "trips",
    kpis: [
      { label: "Total Trips", field: "trips", format: "number", aggregate: "sum" },
      { label: "Avg On-time", field: "onTimePct", format: "percent", aggregate: "avg" },
      { label: "Avg Rating", field: "rating", format: "number", aggregate: "avg" },
      { label: "Total Incentive", field: "incentive", format: "inr", aggregate: "sum" },
    ],
  },
  "invoice-aging": {
    id: "invoice-aging",
    label: "Invoice Aging",
    description: "Outstanding invoices bucketed by overdue age.",
    icon: Receipt,
    entityLabel: "Customer",
    entityField: "customer",
    dateField: "dueDate",
    statusField: "status",
    statusOptions: ["Paid", "Partially Paid", "Unpaid", "Overdue"],
    defaultSortKey: "dueDate",
    kpis: [
      { label: "Total Outstanding", field: "amount", format: "inr", aggregate: "sum" },
      { label: "Overdue (90+)", field: "bucket90Plus", format: "inr", aggregate: "sum" },
      { label: "Invoices", field: "id", format: "count", aggregate: "count" },
      { label: "Avg Days Overdue", field: "daysOverdue", format: "number", aggregate: "avg" },
    ],
  },
  "expense-breakdown": {
    id: "expense-breakdown",
    label: "Expense Breakdown",
    description: "Operating expenses by category, vendor and trip.",
    icon: Banknote,
    entityLabel: "Category",
    entityField: "category",
    dateField: "date",
    statusField: "status",
    statusOptions: ["Approved", "Pending", "Rejected"],
    defaultSortKey: "date",
    kpis: [
      { label: "Total Expense", field: "amount", format: "inr", aggregate: "sum" },
      { label: "Avg / Entry", field: "amount", format: "inr", aggregate: "avg" },
      { label: "Max Single", field: "amount", format: "inr", aggregate: "max" },
      { label: "Entries", field: "id", format: "count", aggregate: "count" },
    ],
  },
  "fuel-efficiency": {
    id: "fuel-efficiency",
    label: "Fuel Efficiency",
    description: "Fuel volume, kmpl and cost-per-km by vehicle.",
    icon: Fuel,
    entityLabel: "Vehicle",
    entityField: "vehicle",
    dateField: "date",
    statusField: "status",
    statusOptions: ["Normal", "Anomaly", "Under Review"],
    defaultSortKey: "date",
    kpis: [
      { label: "Total Fuel (L)", field: "fuelL", format: "number", aggregate: "sum" },
      { label: "Total Cost", field: "cost", format: "inr", aggregate: "sum" },
      { label: "Avg KMPL", field: "kmpl", format: "number", aggregate: "avg" },
      { label: "Total Km", field: "km", format: "number", aggregate: "sum" },
    ],
  },
  "vendor-payments": {
    id: "vendor-payments",
    label: "Vendor Payments",
    description: "Outstanding and overdue payments by vendor.",
    icon: Wallet,
    entityLabel: "Vendor",
    entityField: "vendor",
    dateField: "lastPayment",
    statusField: "status",
    statusOptions: ["Active", "On Hold", "Blocked"],
    defaultSortKey: "pending",
    kpis: [
      { label: "Total Pending", field: "pending", format: "inr", aggregate: "sum" },
      { label: "Total Overdue", field: "overdue", format: "inr", aggregate: "sum" },
      { label: "Total Paid", field: "paid", format: "inr", aggregate: "sum" },
      { label: "Vendors", field: "id", format: "count", aggregate: "count" },
    ],
  },
  "customer-outstanding": {
    id: "customer-outstanding",
    label: "Customer Outstanding",
    description: "Receivables aging and last receipt per customer.",
    icon: Building2,
    entityLabel: "Customer",
    entityField: "customer",
    dateField: "lastReceipt",
    statusField: "status",
    statusOptions: ["Active", "Watch", "Blocked"],
    defaultSortKey: "outstanding",
    kpis: [
      { label: "Total Outstanding", field: "outstanding", format: "inr", aggregate: "sum" },
      { label: "Overdue", field: "overdue", format: "inr", aggregate: "sum" },
      { label: "Total Collected", field: "collected", format: "inr", aggregate: "sum" },
      { label: "Customers", field: "id", format: "count", aggregate: "count" },
    ],
  },
  "lr-summary": {
    id: "lr-summary",
    label: "LR Summary",
    description: "Lorry receipts with consignor, consignee and amount.",
    icon: FileText,
    entityLabel: "Origin",
    entityField: "origin",
    dateField: "date",
    statusField: "status",
    statusOptions: ["Delivered", "In Transit", "Pending", "Cancelled"],
    defaultSortKey: "date",
    kpis: [
      { label: "Total Amount", field: "amount", format: "inr", aggregate: "sum" },
      { label: "Avg / LR", field: "amount", format: "inr", aggregate: "avg" },
      { label: "Max Single", field: "amount", format: "inr", aggregate: "max" },
      { label: "LR Count", field: "id", format: "count", aggregate: "count" },
    ],
  },
  "payroll-summary": {
    id: "payroll-summary",
    label: "Payroll Summary",
    description: "Employee gross, deductions and net pay per month.",
    icon: Wallet,
    entityLabel: "Designation",
    entityField: "designation",
    dateField: "_none",
    statusField: "status",
    statusOptions: ["Paid", "Pending", "Processing"],
    defaultSortKey: "gross",
    kpis: [
      { label: "Total Gross", field: "gross", format: "inr", aggregate: "sum" },
      { label: "Total Deductions", field: "deductions", format: "inr", aggregate: "sum" },
      { label: "Total Net", field: "net", format: "inr", aggregate: "sum" },
      { label: "Employees", field: "id", format: "count", aggregate: "count" },
    ],
  },
};

export const EXPLORER_REPORT_ORDER: ExplorerReportId[] = [
  "trip-pl",
  "vehicle-utilization",
  "driver-performance",
  "invoice-aging",
  "expense-breakdown",
  "fuel-efficiency",
  "vendor-payments",
  "customer-outstanding",
  "lr-summary",
  "payroll-summary",
];

/* ============================================================
   Row type - a flat record so the same DataTable generics work
   across all report types.
   ============================================================ */
export type ExplorerRow = { id: string; [key: string]: string | number };

/* ============================================================
   Generators
   ============================================================ */

function genTripPl(): ExplorerRow[] {
  const rng = makeRng(0x5eed01);
  const statuses = ["Delivered", "Delivered", "Delivered", "In Transit", "Active", "Cancelled", "Breakdown"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 40; i++) {
    const date = daysAgoIso(90, rng);
    const vehicle = pick(VEHICLE_PLATES, rng);
    const driver = pick(DRIVERS, rng);
    const origin = pick(CITIES, rng);
    let destination = pick(CITIES, rng);
    while (destination === origin) destination = pick(CITIES, rng);
    const revenue = randInt(25000, 300000, rng);
    const expense = randInt(15000, 250000, rng);
    const profit = revenue - expense;
    const marginPct = Math.round((profit / revenue) * 1000) / 10;
    rows.push({
      id: "tpl-" + (i + 1).toString().padStart(3, "0"),
      tripNo: "TRP-2024-" + (1001 + i),
      date,
      vehicle,
      driver,
      route: `${origin} → ${destination}`,
      revenue,
      expense,
      profit,
      marginPct,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genVehicleUtilization(): ExplorerRow[] {
  const rng = makeRng(0x5eed02);
  const statuses = ["Active", "Active", "Idle", "In Maintenance", "Offline"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 30; i++) {
    const plate = VEHICLE_PLATES[i % VEHICLE_PLATES.length];
    const type = pick(VEHICLE_TYPES, rng);
    const totalKm = randInt(2500, 18000, rng);
    const loadedKm = randInt(1500, Math.max(2000, totalKm - 500), rng);
    const emptyKm = totalKm - loadedKm;
    const utilizationPct = Math.round((loadedKm / totalKm) * 1000) / 10;
    const idleDays = randInt(0, 12, rng);
    const revenue = randInt(80000, 600000, rng);
    const revenuePerKm = Math.round((revenue / totalKm) * 100) / 10;
    rows.push({
      id: "vut-" + (i + 1).toString().padStart(3, "0"),
      vehicle: plate,
      type,
      totalKm,
      loadedKm,
      emptyKm,
      utilizationPct,
      idleDays,
      revenuePerKm,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genDriverPerformance(): ExplorerRow[] {
  const rng = makeRng(0x5eed03);
  const statuses = ["Active", "Active", "Active", "On Leave", "Inactive"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 35; i++) {
    const driver = DRIVERS[i % DRIVERS.length];
    const trips = randInt(8, 64, rng);
    const totalKm = randInt(4000, 35000, rng);
    const onTimePct = randInt(62, 99, rng);
    const idleHours = randInt(8, 180, rng);
    const fuelEfficiency = randFloat(3.2, 6.5, rng, 1);
    const rating = randFloat(3.4, 4.95, rng, 1);
    const incentive = randInt(1500, 22000, rng);
    rows.push({
      id: "dpr-" + (i + 1).toString().padStart(3, "0"),
      driver,
      trips,
      totalKm,
      onTimePct,
      idleHours,
      fuelEfficiency,
      rating,
      incentive,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genInvoiceAging(): ExplorerRow[] {
  const rng = makeRng(0x5eed04);
  const statuses = ["Paid", "Partially Paid", "Unpaid", "Overdue", "Overdue"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 40; i++) {
    const customer = pick(CUSTOMERS, rng);
    const amount = randInt(45000, 800000, rng);
    const dueDate = daysAgoIso(120, rng);
    const dueTime = new Date(dueDate).getTime();
    const daysOverdue = Math.max(0, Math.floor((Date.now() - dueTime) / 86_400_000));
    let bucket = 0;
    if (daysOverdue > 90) bucket = amount;
    else if (daysOverdue > 60) bucket = 0;
    else if (daysOverdue > 30) bucket = 0;
    else bucket = 0;
    // Distribute amount across buckets for visualization
    const bucket90Plus = daysOverdue > 90 ? amount : 0;
    const bucket6190 = daysOverdue > 60 && daysOverdue <= 90 ? amount : 0;
    const bucket3160 = daysOverdue > 30 && daysOverdue <= 60 ? amount : 0;
    const bucket030 = daysOverdue > 0 && daysOverdue <= 30 ? amount : 0;
    void bucket;
    rows.push({
      id: "iar-" + (i + 1).toString().padStart(3, "0"),
      invoiceNo: "INV-2024-" + (2001 + i),
      customer,
      amount,
      dueDate,
      daysOverdue,
      bucket030,
      bucket3160,
      bucket6190,
      bucket90Plus,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genExpenseBreakdown(): ExplorerRow[] {
  const rng = makeRng(0x5eed05);
  const statuses = ["Approved", "Approved", "Approved", "Pending", "Rejected"];
  const approvers = ["Reena Mehta", "Pooja Desai", "Karthik Iyer", "Manish Agarwal", "Sukhbir Gill"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 50; i++) {
    const category = pick(EXPENSE_CATEGORIES, rng);
    const vendor = pick(VENDORS, rng);
    const amount = randInt(2500, 175000, rng);
    const date = daysAgoIso(90, rng);
    const vehicle = pick(VEHICLE_PLATES, rng);
    const tripNo = "TRP-2024-" + (1001 + randInt(0, 39, rng));
    rows.push({
      id: "ebr-" + (i + 1).toString().padStart(3, "0"),
      category,
      vendor,
      amount,
      date,
      vehicle,
      tripNo,
      approvedBy: pick(approvers, rng),
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genFuelEfficiency(): ExplorerRow[] {
  const rng = makeRng(0x5eed06);
  const statuses = ["Normal", "Normal", "Normal", "Anomaly", "Under Review"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 40; i++) {
    const vehicle = pick(VEHICLE_PLATES, rng);
    const driver = pick(DRIVERS, rng);
    const fuelL = randInt(150, 1200, rng);
    const km = randInt(800, 6500, rng);
    const kmpl = Math.round((km / fuelL) * 10) / 10;
    const cost = fuelL * randInt(95, 112, rng);
    const costPerKm = Math.round((cost / km) * 100) / 10;
    const date = daysAgoIso(90, rng);
    rows.push({
      id: "fef-" + (i + 1).toString().padStart(3, "0"),
      vehicle,
      fuelL,
      km,
      kmpl,
      cost,
      costPerKm,
      driver,
      date,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genVendorPayments(): ExplorerRow[] {
  const rng = makeRng(0x5eed07);
  const statuses = ["Active", "Active", "On Hold", "Blocked"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 30; i++) {
    const vendor = VENDORS[i % VENDORS.length];
    const totalBills = randInt(4, 28, rng);
    const paid = randInt(50000, 1500000, rng);
    const pending = randInt(25000, 750000, rng);
    const overdue = randInt(0, 350000, rng);
    const lastPayment = daysAgoIso(60, rng);
    rows.push({
      id: "vpr-" + (i + 1).toString().padStart(3, "0"),
      vendor,
      totalBills,
      paid,
      pending,
      overdue,
      lastPayment,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genCustomerOutstanding(): ExplorerRow[] {
  const rng = makeRng(0x5eed08);
  const statuses = ["Active", "Active", "Watch", "Blocked"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 30; i++) {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const totalInvoiced = randInt(500000, 5000000, rng);
    const collected = randInt(200000, 3500000, rng);
    const outstanding = Math.max(0, totalInvoiced - collected);
    const overdue = randInt(0, Math.max(50000, outstanding), rng);
    const lastReceipt = daysAgoIso(90, rng);
    rows.push({
      id: "cor-" + (i + 1).toString().padStart(3, "0"),
      customer,
      totalInvoiced,
      collected,
      outstanding,
      overdue,
      lastReceipt,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genLrSummary(): ExplorerRow[] {
  const rng = makeRng(0x5eed09);
  const statuses = ["Delivered", "Delivered", "In Transit", "Pending", "Cancelled"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 50; i++) {
    const consignor = pick(CUSTOMERS, rng);
    let consignee = pick(CUSTOMERS, rng);
    while (consignee === consignor) consignee = pick(CUSTOMERS, rng);
    const origin = pick(CITIES, rng);
    let destination = pick(CITIES, rng);
    while (destination === origin) destination = pick(CITIES, rng);
    const amount = randInt(18000, 250000, rng);
    const date = daysAgoIso(90, rng);
    const vehicle = pick(VEHICLE_PLATES, rng);
    rows.push({
      id: "lrs-" + (i + 1).toString().padStart(3, "0"),
      lrNo: "LR-2024-" + (3001 + i),
      date,
      consignor,
      consignee,
      origin,
      destination,
      vehicle,
      amount,
      status: pick(statuses, rng),
    });
  }
  return rows;
}

function genPayrollSummary(): ExplorerRow[] {
  const rng = makeRng(0x5eed0a);
  const statuses = ["Paid", "Paid", "Pending", "Processing"];
  const months = ["Oct 2024", "Oct 2024", "Nov 2024", "Nov 2024", "Dec 2024"];
  const rows: ExplorerRow[] = [];
  for (let i = 0; i < 30; i++) {
    const emp = EMPLOYEES[i % EMPLOYEES.length];
    const designation = emp.designation;
    // Salary bands by designation family
    const isManager = designation.includes("Manager") || designation.includes("Lead") || designation.includes("Officer");
    const isDriver = designation === "Driver" || designation === "Mechanic" || designation === "Loader";
    const gross = isManager ? randInt(55000, 125000, rng) : isDriver ? randInt(22000, 48000, rng) : randInt(28000, 75000, rng);
    const deductions = Math.round(gross * randFloat(0.08, 0.22, rng, 2));
    const net = gross - deductions;
    rows.push({
      id: "psr-" + (i + 1).toString().padStart(3, "0"),
      employee: emp.name,
      designation,
      gross,
      deductions,
      net,
      month: pick(months, rng),
      status: pick(statuses, rng),
    });
  }
  return rows;
}

/* ============================================================
   Seed data - computed once at module load.
   ============================================================ */
export const EXPLORER_DATA: Record<ExplorerReportId, ExplorerRow[]> = {
  "trip-pl": genTripPl(),
  "vehicle-utilization": genVehicleUtilization(),
  "driver-performance": genDriverPerformance(),
  "invoice-aging": genInvoiceAging(),
  "expense-breakdown": genExpenseBreakdown(),
  "fuel-efficiency": genFuelEfficiency(),
  "vendor-payments": genVendorPayments(),
  "customer-outstanding": genCustomerOutstanding(),
  "lr-summary": genLrSummary(),
  "payroll-summary": genPayrollSummary(),
};

/* ============================================================
   Helpers - entity options per report (derived from data).
   ============================================================ */
export function getEntityOptions(config: ExplorerReportConfig, rows: ExplorerRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[config.entityField];
    if (v !== undefined && v !== null && v !== "") set.add(String(v));
  }
  return Array.from(set).sort();
}

/* ============================================================
   Aggregation helpers used by KPI strip + totals row.
   ============================================================ */
export function aggregate(
  rows: ExplorerRow[],
  field: string,
  mode: ExplorerKpiSpec["aggregate"],
): number {
  if (mode === "count") return rows.length;
  if (rows.length === 0) return 0;
  let sum = 0;
  let n = 0;
  let max = -Infinity;
  for (const r of rows) {
    const v = r[field];
    if (typeof v === "number" && !Number.isNaN(v)) {
      sum += v;
      n += 1;
      if (v > max) max = v;
    }
  }
  if (n === 0) return 0;
  if (mode === "max") return max === -Infinity ? 0 : max;
  return mode === "avg" ? sum / n : sum;
}

export function formatKpi(value: number, format: ExplorerKpiSpec["format"]): string {
  switch (format) {
    case "inr":
      return "\u20B9" + Math.round(value).toLocaleString("en-IN");
    case "number":
      return Math.round(value).toLocaleString("en-IN");
    case "percent":
      return (Math.round(value * 10) / 10).toFixed(1) + "%";
    case "count":
      return String(Math.round(value));
  }
}

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
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// ===== License expiry → badge state =====
export function licenseExpiryBadge(
  iso?: string,
): { variant: "solid" | "outline" | "muted"; pulse?: boolean; label: string } {
  const days = daysUntil(iso);
  if (days === null) return { variant: "muted", label: "-" };
  if (days < 0) return { variant: "solid", label: `Expired ${Math.abs(days)}d` };
  if (days <= 30)
    return { variant: "solid", pulse: true, label: `${days}d left` };
  if (days <= 90) return { variant: "outline", label: `${days}d left` };
  return { variant: "muted", label: `${days}d left` };
}

// ===== Constants =====
export const EMPLOYEE_STATUSES = ["Active", "On Leave", "Inactive"] as const;
export const EMPLOYEE_ROLES = ["Driver", "Staff"] as const;
export const DEPARTMENTS = [
  "Operations",
  "Fleet",
  "Finance",
  "HR",
  "Dispatch",
  "Maintenance",
] as const;
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Probation",
] as const;
export const SYSTEM_ROLES = [
  "Owner",
  "Operations Manager",
  "Fleet Manager",
  "Finance Manager",
  "Dispatcher",
  "Driver (Mobile)",
  "Analyst",
  "No Access",
] as const;
export const BRANCHES = [
  "Mumbai HQ",
  "Pune Branch",
  "Delhi Branch",
  "Bengaluru Branch",
  "Field",
] as const;
export const MODULES = [
  "Dashboard",
  "Operations Hub",
  "Trips",
  "Fleet Map",
  "Vehicles",
  "Lorry Receipts",
  "Invoice",
  "Expenses",
  "Payments",
  "Customers",
  "Vendors",
  "Drivers & Staff",
  "Inspection",
  "Issues",
  "Maintenance",
  "Services",
  "Fuel & Energy",
  "Reminders",
  "Documents",
  "Reports",
  "Settings",
  "Automation",
];
export const LICENSE_CLASSES = [
  "LMV",
  "MCWG",
  "HMV",
  "HMV + Trailer",
  "Heavy Passenger",
  "Light Commercial",
];
export const CITIES = [
  "Mumbai", "Pune", "Nashik", "Nagpur", "Aurangabad",
  "Delhi", "Gurgaon", "Noida", "Faridabad", "Jaipur",
  "Ahmedabad", "Surat", "Vadodara", "Rajkot",
  "Bengaluru", "Chennai", "Hyderabad", "Kochi", "Coimbatore",
  "Kolkata", "Bhubaneswar", "Raipur", "Visakhapatnam",
  "Indore", "Bhopal", "Lucknow", "Kanpur", "Patna",
];
export const INDIAN_STATES = [
  "Maharashtra", "Delhi", "Gujarat", "Karnataka", "Tamil Nadu",
  "Telangana", "West Bengal", "Rajasthan", "Uttar Pradesh",
  "Madhya Pradesh", "Punjab", "Kerala",
];

// ===== Add-employee stepper config =====
export const ADD_EMPLOYEE_STEPS = [
  { id: 1, label: "Personal", tier: "Identity" },
  { id: 2, label: "Role", tier: "Classification" },
  { id: 3, label: "Access", tier: "Permissions" },
  { id: 4, label: "Employment", tier: "Compensation" },
  { id: 5, label: "License", tier: "Compliance" },
  { id: 6, label: "Review", tier: "Confirm" },
] as const;

// ===== Employee create form =====
export interface EmployeeForm {
  // Step 1 - Personal
  fullName: string;
  dob: string;
  gender: string;
  phone: string;
  altPhone: string;
  email: string;
  altEmail: string;
  address: string;
  emergencyContact: string;
  // Step 2 - Role
  role: string;
  department: string;
  jobTitle: string;
  reportingManager: string;
  group: string;
  // Step 3 - Access
  systemRole: string;
  modulePermissions: string[];
  branch: string;
  // Step 4 - Employment
  joiningDate: string;
  employmentType: string;
  salary: string;
  hourlyRate: string;
  bankName: string;
  bankAccount: string;
  ifsc: string;
  pan: string;
  aadhaar: string;
  // Step 5 - License (driver)
  isDriver: boolean;
  licenseNumber: string;
  licenseClass: string;
  issuingState: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  medicalCert: string;
  badge: string;
}

export const EMPTY_EMPLOYEE_FORM: EmployeeForm = {
  fullName: "",
  dob: "",
  gender: "Male",
  phone: "",
  altPhone: "",
  email: "",
  altEmail: "",
  address: "",
  emergencyContact: "",
  role: "Driver",
  department: "Operations",
  jobTitle: "",
  reportingManager: "",
  group: "Line Haul",
  systemRole: "Driver (Mobile)",
  modulePermissions: ["Dashboard", "Trips", "Documents"],
  branch: "Mumbai HQ",
  joiningDate: new Date().toISOString().slice(0, 10),
  employmentType: "Full-time",
  salary: "",
  hourlyRate: "",
  bankName: "",
  bankAccount: "",
  ifsc: "",
  pan: "",
  aadhaar: "",
  isDriver: true,
  licenseNumber: "",
  licenseClass: "HMV",
  issuingState: "Maharashtra",
  licenseIssueDate: "",
  licenseExpiryDate: "",
  medicalCert: "",
  badge: "",
};

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

// ===== Initials avatar =====
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// ===== Seeded RNG (deterministic per-driver sub-data) =====
// Mulberry32 - fast, deterministic, no global state.
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededInt(seed: number, min: number, max: number): number {
  const r = seededRandom(seed)();
  return Math.floor(r * (max - min + 1)) + min;
}

export function driverSeed(driverId: string): number {
  const m = driverId.match(/\d+/);
  return m ? parseInt(m[0], 10) : 1;
}

// ===== Driver sub-data generators =====

export interface AssignmentHistoryRow {
  id: string;
  vehicleName: string;
  vehicleId?: string;
  from: string;
  to: string;
  trips: number;
  reason: string;
}

export function generateAssignmentHistory(driverId: string, currentVehicleName?: string): AssignmentHistoryRow[] {
  const seed = driverSeed(driverId);
  const rand = seededRandom(seed * 7 + 1);
  const reasons = [
    "Routine rotation",
    "Vehicle service",
    "Driver transfer",
    "Ownership change",
    "Breakdown cover",
    "New vehicle onboarding",
    "Performance review",
  ];
  // Pull a few distinct vehicle names from VEHICLES lazily to avoid circular
  // import cost at module top - caller passes nothing; we resolve names below.
  // We use the seed to pick a stable subset of pseudo vehicle names.
  const pool = Array.from({ length: 8 }, (_, i) => `Unit ${(seed * 3 + i * 5) % 28 + 1}`);
  const rows: AssignmentHistoryRow[] = [];
  const count = 4 + Math.floor(rand() * 3); // 4–6
  let cursor = Date.now();
  for (let i = 0; i < count; i++) {
    const vName = i === 0 && currentVehicleName ? currentVehicleName : pool[Math.floor(rand() * pool.length)];
    const daysTo = 60 + Math.floor(rand() * 90);
    const daysFrom = daysTo + 30 + Math.floor(rand() * 120);
    cursor -= daysTo * 86400000;
    const to = new Date(cursor).toISOString();
    const from = new Date(cursor - daysFrom * 86400000).toISOString();
    rows.push({
      id: `asg-${driverId}-${i}`,
      vehicleName: vName,
      from,
      to: i === 0 && currentVehicleName ? new Date().toISOString() : to,
      trips: 8 + Math.floor(rand() * 32),
      reason: reasons[Math.floor(rand() * reasons.length)],
    });
  }
  return rows;
}

export interface PayrollRow {
  id: string;
  month: string;
  monthIso: string;
  baseSalary: number;
  tripsIncentive: number;
  overtime: number;
  deductions: number;
  netPaid: number;
  status: "Paid" | "Pending" | "Processing";
}

export function generatePayroll(driverId: string, baseSalary: number): PayrollRow[] {
  const seed = driverSeed(driverId);
  const rand = seededRandom(seed * 13 + 5);
  const year = new Date().getFullYear();
  const rows: PayrollRow[] = [];
  for (let i = 0; i < 6; i++) {
    const mi = (new Date().getMonth() - 5 + i + 12) % 12;
    const monthLabel = new Date(year, mi, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
    const monthIso = new Date(year, mi, 1).toISOString();
    const trips = 8 + Math.floor(rand() * 28);
    const tripsIncentive = trips * (380 + Math.floor(rand() * 220));
    const overtime = Math.floor(rand() * 5) * 480 + Math.floor(rand() * 400);
    const deductions = 800 + Math.floor(rand() * 2200);
    const net = baseSalary + tripsIncentive + overtime - deductions;
    const status: PayrollRow["status"] =
      i < 5 ? "Paid" : i === 5 ? "Processing" : "Pending";
    rows.push({
      id: `pay-${driverId}-${i}`,
      month: monthLabel,
      monthIso,
      baseSalary,
      tripsIncentive,
      overtime,
      deductions,
      netPaid: net,
      status,
    });
  }
  return rows;
}

export type AttendanceCode = "P" | "A" | "L" | "T" | "WD";
export const ATTENDANCE_LABEL: Record<AttendanceCode, string> = {
  P: "Present",
  A: "Absent",
  L: "Leave",
  T: "On Trip",
  WD: "Weekly Off",
};

export interface AttendanceMatrix {
  monthLabel: string;
  days: { date: number; code: AttendanceCode }[];
  summary: { P: number; A: number; L: number; T: number; WD: number };
}

export function generateAttendance(driverId: string, monthsBack = 0): AttendanceMatrix {
  const seed = driverSeed(driverId) + monthsBack * 17;
  const rand = seededRandom(seed * 23 + 9);
  const now = new Date();
  const baseMonth = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const daysInMonth = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0).getDate();
  const codes: AttendanceCode[] = ["P", "P", "P", "P", "P", "T", "WD", "L", "A"];
  const days: { date: number; code: AttendanceCode }[] = [];
  const summary = { P: 0, A: 0, L: 0, T: 0, WD: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(baseMonth.getFullYear(), baseMonth.getMonth(), d).getDay();
    let code: AttendanceCode;
    if (dow === 0) code = "WD";
    else code = codes[Math.floor(rand() * codes.length)];
    // Future days: blank-but-noted as upcoming (still counts as nothing yet)
    if (monthsBack === 0 && d > now.getDate()) {
      code = "P"; // optimistic projection
    }
    days.push({ date: d, code });
    summary[code]++;
  }
  const monthLabel = baseMonth.toLocaleString("en-IN", { month: "short", year: "numeric" });
  return { monthLabel, days, summary };
}

export interface PerformanceTrendPoint {
  label: string;
  trips: number;
  onTime: number; // %
  fuelEff: number; // km/L
  idleHours: number;
  rating: number;
}

export function generatePerformanceTrend(driverId: string, points = 6): PerformanceTrendPoint[] {
  const seed = driverSeed(driverId);
  const rand = seededRandom(seed * 29 + 3);
  const out: PerformanceTrendPoint[] = [];
  const now = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: d.toLocaleString("en-IN", { month: "short" }),
      trips: 14 + Math.floor(rand() * 24),
      onTime: 72 + Math.floor(rand() * 26),
      fuelEff: Math.round((3.4 + rand() * 1.6) * 10) / 10,
      idleHours: 18 + Math.floor(rand() * 32),
      rating: Math.round((3.6 + rand() * 1.3) * 10) / 10,
    });
  }
  return out;
}

export interface ActivityTimelineEntry {
  id: string;
  ts: string;
  icon: "trip" | "fuel" | "issue" | "doc" | "pay" | "msg" | "inspect";
  title: string;
  detail: string;
}

export function generateActivityTimeline(driverId: string): ActivityTimelineEntry[] {
  const seed = driverSeed(driverId);
  const rand = seededRandom(seed * 41 + 7);
  const now = Date.now();
  const samples: Omit<ActivityTimelineEntry, "id" | "ts">[] = [
    { icon: "trip", title: "Completed trip RZ-TRP-0042", detail: "Mumbai → Pune · 187 km · delivered on time" },
    { icon: "fuel", title: "Fuel log submitted", detail: "48 L diesel @ ₹94.20 · HP Pump, Lonavala" },
    { icon: "inspect", title: "Post-trip inspection passed", detail: "Brakes, lights, tyres - all nominal" },
    { icon: "pay", title: "Payroll processed for last month", detail: "Net ₹38,420 credited to HDFC ****1234" },
    { icon: "doc", title: "Medical certificate uploaded", detail: "Valid until 14 Apr 2026 · HR-verified" },
    { icon: "msg", title: "Messaged dispatcher", detail: "“ETA pushed by 40 mins - traffic at Talegaon”" },
    { icon: "issue", title: "Issue flagged: minor dent", detail: "Rear bumper - closed with verbal coaching" },
  ];
  return samples
    .map((s, i) => ({
      ...s,
      id: `act-${driverId}-${i}`,
      ts: new Date(now - (i * 1.5 + Math.floor(rand() * 12)) * 3600000).toISOString(),
    }))
    .sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
}

// ===== Driver document type catalog (for documents tab) =====
export const DRIVER_DOC_TYPES = [
  "Driving License",
  "RC Book",
  "Insurance Certificate",
  "National Permit",
  "Aadhaar Card",
  "PAN Card",
  "Medical Certificate",
  "Police Verification",
] as const;

export interface DriverDocRow {
  id: string;
  type: string;
  number: string;
  issueDate: string;
  expiryDate?: string;
  status: "Valid" | "Expiring Soon" | "Expired";
  uploadedBy: string;
}

export function generateDriverDocs(driverId: string, licenseNumber: string, licenseExpiry: string): DriverDocRow[] {
  const seed = driverSeed(driverId);
  const rand = seededRandom(seed * 53 + 11);
  const now = Date.now();
  const out: DriverDocRow[] = [];
  for (const t of DRIVER_DOC_TYPES) {
    const expiryOffsetDays = Math.floor((rand() - 0.4) * 120); // -48..+72 ish
    const expiry = new Date(now + expiryOffsetDays * 86400000).toISOString();
    const issue = new Date(now - (180 + Math.floor(rand() * 800)) * 86400000).toISOString();
    const status: DriverDocRow["status"] =
      expiryOffsetDays < 0 ? "Expired" : expiryOffsetDays < 30 ? "Expiring Soon" : "Valid";
    let number = "";
    if (t === "Driving License") {
      number = licenseNumber || `MH04${String(seed * 7919).padStart(8, "0")}`;
      out.push({
        id: `d-doc-${driverId}-${t}`,
        type: t,
        number,
        issueDate: issue,
        expiryDate: licenseExpiry,
        status:
          new Date(licenseExpiry).getTime() < now
            ? "Expired"
            : new Date(licenseExpiry).getTime() - now < 30 * 86400000
              ? "Expiring Soon"
              : "Valid",
        uploadedBy: "HR Team",
      });
      continue;
    }
    if (t === "Aadhaar Card") number = `XXXX XXXX ${String((seed * 137) % 9000 + 1000)}`;
    else if (t === "PAN Card") number = `${["ABCD", "EFGH", "IJKL"][seed % 3]}${seed * 7 % 9000 + 1000}Z`;
    else if (t === "RC Book") number = `RC-${String(seed * 4417).padStart(8, "0")}`;
    else if (t === "Insurance Certificate") number = `POL-${String(seed * 313).padStart(8, "0")}`;
    else if (t === "National Permit") number = `NP-${String(seed * 211).padStart(7, "0")}`;
    else if (t === "Medical Certificate") number = `MC-${String(seed * 89).padStart(6, "0")}`;
    else number = `PV-${String(seed * 137).padStart(6, "0")}`;
    out.push({
      id: `d-doc-${driverId}-${t}`,
      type: t,
      number,
      issueDate: issue,
      expiryDate: t === "Aadhaar Card" || t === "PAN Card" || t === "Police Verification" ? undefined : expiry,
      status: t === "Aadhaar Card" || t === "PAN Card" || t === "Police Verification" ? "Valid" : status,
      uploadedBy: ["HR Team", "Operations", "Driver Self-upload"][seed % 3],
    });
  }
  return out;
}

// ===== Compliance checklist items =====
export interface ComplianceItem {
  id: string;
  label: string;
  status: "Compliant" | "Warning" | "Non-Compliant";
  detail: string;
}

export function generateCompliance(driverId: string, licenseExpiry: string): ComplianceItem[] {
  const seed = driverSeed(driverId);
  const rand = seededRandom(seed * 61 + 13);
  const days = Math.ceil((new Date(licenseExpiry).getTime() - Date.now()) / 86400000);
  return [
    {
      id: `cmp-${driverId}-1`,
      label: "Driving License Valid",
      status: days < 0 ? "Non-Compliant" : days < 30 ? "Warning" : "Compliant",
      detail: days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`,
    },
    {
      id: `cmp-${driverId}-2`,
      label: "Medical Certificate Current",
      status: rand() > 0.7 ? "Warning" : "Compliant",
      detail: rand() > 0.7 ? "Renewal due in 18d" : "Valid through 2026",
    },
    {
      id: `cmp-${driverId}-3`,
      label: "Training Current",
      status: rand() > 0.85 ? "Non-Compliant" : "Compliant",
      detail: rand() > 0.85 ? "Defensive driving refresher overdue" : "Last session 42d ago",
    },
    {
      id: `cmp-${driverId}-4`,
      label: "Hours-of-Service Compliance",
      status: rand() > 0.6 ? "Warning" : "Compliant",
      detail: rand() > 0.6 ? "1 minor breach last week (11.2h drive)" : "Within 9h drive / 60h weekly limits",
    },
    {
      id: `cmp-${driverId}-5`,
      label: "Background Verification",
      status: "Compliant",
      detail: "Police verification on file",
    },
  ];
}

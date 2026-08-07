"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
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

// ===== Section metadata =====
export interface SettingsSection {
  id: SettingsTab;
  label: string;
  description: string;
  icon: string;
}

import type { SettingsTab } from "@/lib/store/app-store";

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "profile", label: "Profile", description: "Personal information & contact", icon: "User" },
  { id: "notifications", label: "Notifications", description: "Channels, events, quiet hours", icon: "Bell" },
  { id: "login", label: "Login & Security", description: "Password, 2FA, sessions", icon: "Lock" },
  { id: "appearance", label: "Appearance", description: "Theme, logo, palette", icon: "Palette" },
  { id: "access-security", label: "Access & Roles", description: "Users, roles, permissions", icon: "ShieldCheck" },
  { id: "access-matrix", label: "Access Matrix", description: "Role-by-module permission map", icon: "Grid3x3" },
  { id: "organization", label: "Organization", description: "Company, branches, groups", icon: "Building2" },
  { id: "data-management", label: "Data Management", description: "Fields, templates, exports", icon: "Database" },
  { id: "companies", label: "Companies", description: "Multi-company & RLS isolation", icon: "Layers" },
  { id: "integrations", label: "Integrations", description: "Payments, SMS, WhatsApp, ERP", icon: "Plug" },
  { id: "billing", label: "Billing & Plan", description: "Subscription, payment method, invoices", icon: "CreditCard" },
];

// ===== Field label helper =====
export function FieldLabel({
  children, required, hint,
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

// ===== Notification event categories =====
export const NOTIF_EVENTS = [
  { id: "trip", label: "Trip", description: "Created, started, delayed, delivered" },
  { id: "vehicle", label: "Vehicle", description: "Status change, breakdown, GPS loss" },
  { id: "document", label: "Document Expiry", description: "Expiring, expired renewals" },
  { id: "invoice", label: "Invoice", description: "Issued, paid, overdue, viewed" },
  { id: "payment", label: "Payment", description: "Voucher created, approved, settled" },
  { id: "inspection", label: "Inspection", description: "Scheduled, completed, failed" },
  { id: "rean", label: "Rean", description: "Anomaly, recommendation, prediction" },
  { id: "system", label: "System", description: "Login, role change, settings update" },
  { id: "maintenance", label: "Maintenance", description: "Work order created, completed" },
  { id: "fuel", label: "Fuel", description: "Logged, anomaly, threshold crossed" },
];

export const NOTIF_CHANNELS = [
  { id: "in-app", label: "In-App" },
  { id: "email", label: "Email" },
  { id: "sms", label: "SMS" },
  { id: "push", label: "Push" },
  { id: "whatsapp", label: "WhatsApp" },
];

// Default notification matrix - seed values
export const DEFAULT_NOTIF_MATRIX: Record<string, Record<string, boolean>> = {
  trip: { "in-app": true, email: true, sms: false, push: true, whatsapp: false },
  vehicle: { "in-app": true, email: true, sms: true, push: true, whatsapp: false },
  document: { "in-app": true, email: true, sms: false, push: false, whatsapp: false },
  invoice: { "in-app": true, email: true, sms: false, push: false, whatsapp: false },
  payment: { "in-app": true, email: false, sms: false, push: true, whatsapp: false },
  inspection: { "in-app": true, email: false, sms: false, push: false, whatsapp: false },
  rean: { "in-app": true, email: true, sms: false, push: true, whatsapp: false },
  system: { "in-app": true, email: false, sms: false, push: false, whatsapp: false },
  maintenance: { "in-app": true, email: true, sms: false, push: true, whatsapp: false },
  fuel: { "in-app": true, email: false, sms: false, push: false, whatsapp: false },
};

// ===== User management mock data =====
export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Invited" | "Suspended";
  branch: string;
  lastActive: string;
}

export const USERS_MOCK: UserRow[] = [
  { id: "u1", name: "Vikram Deshmukh", email: "vikram@reanzly.in", role: "Owner", status: "Active", branch: "Mumbai HQ", lastActive: new Date(Date.now() - 0.02 * 86400000).toISOString() },
  { id: "u2", name: "Rohit Sharma", email: "rohit@reanzly.in", role: "Operations Manager", status: "Active", branch: "Mumbai HQ", lastActive: new Date(Date.now() - 0.1 * 86400000).toISOString() },
  { id: "u3", name: "Reena Mehta", email: "reena@reanzly.in", role: "Finance Manager", status: "Active", branch: "Mumbai HQ", lastActive: new Date(Date.now() - 0.4 * 86400000).toISOString() },
  { id: "u4", name: "Sukhbir Gill", email: "sukhbir@reanzly.in", role: "Fleet Manager", status: "Active", branch: "Pune", lastActive: new Date(Date.now() - 0.3 * 86400000).toISOString() },
  { id: "u5", name: "Anil Reddy", email: "anil@reanzly.in", role: "Dispatcher", status: "Active", branch: "Bengaluru", lastActive: new Date(Date.now() - 0.6 * 86400000).toISOString() },
  { id: "u6", name: "Kuldeep Singh", email: "kuldeep@reanzly.in", role: "Driver", status: "Active", branch: "Delhi", lastActive: new Date(Date.now() - 1.2 * 86400000).toISOString() },
  { id: "u7", name: "Trisha Nair", email: "trisha@reanzly.in", role: "Analyst", status: "Active", branch: "Mumbai HQ", lastActive: new Date(Date.now() - 0.8 * 86400000).toISOString() },
  { id: "u8", name: "Joseph Mathew", email: "joseph@reanzly.in", role: "Driver", status: "Invited", branch: "Chennai", lastActive: "-" },
  { id: "u9", name: "Farhan Khan", email: "farhan@reanzly.in", role: "Workshop Lead", status: "Active", branch: "Pune", lastActive: new Date(Date.now() - 2.5 * 86400000).toISOString() },
  { id: "u10", name: "Geeta Sharma", email: "geeta@reanzly.in", role: "Accountant", status: "Suspended", branch: "Mumbai HQ", lastActive: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "u11", name: "Naresh Patel", email: "naresh@reanzly.in", role: "Driver", status: "Active", branch: "Ahmedabad", lastActive: new Date(Date.now() - 0.5 * 86400000).toISOString() },
  { id: "u12", name: "Pooja Iyer", email: "pooja@reanzly.in", role: "Compliance Officer", status: "Active", branch: "Mumbai HQ", lastActive: new Date(Date.now() - 0.7 * 86400000).toISOString() },
];

// ===== Roles =====
export interface RoleRow {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  isSystem: boolean;
  permissions: Record<string, ("View" | "Create" | "Edit" | "Delete" | "Export" | "Manage")[]>;
}

export const PERMISSION_MODULES = [
  "Dashboard", "Operations Hub", "Trips", "Fleet Map", "Vehicles", "Lorry Receipts",
  "Invoice", "Expenses", "Payments", "Customers", "Vendors", "Drivers & Staff",
  "Inspection", "Issues", "Maintenance", "Services", "Fuel & Energy",
  "Reminders", "Documents", "Reports", "Automation", "Settings",
];

export const PERMISSION_ACTIONS = ["View", "Create", "Edit", "Delete", "Export", "Manage"] as const;

export const ROLES_MOCK: RoleRow[] = [
  {
    id: "role-owner",
    name: "Owner",
    description: "Full access to every module, branch, and financial record.",
    usersCount: 1,
    isSystem: true,
    permissions: Object.fromEntries(PERMISSION_MODULES.map((m) => [m, [...PERMISSION_ACTIONS]])),
  },
  {
    id: "role-ops",
    name: "Operations Manager",
    description: "Manages trips, vehicles, drivers; read access to finance.",
    usersCount: 1,
    isSystem: true,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => {
        if (["Dashboard", "Operations Hub", "Trips", "Fleet Map", "Vehicles", "Lorry Receipts", "Drivers & Staff", "Inspection", "Issues", "Maintenance", "Services", "Fuel & Energy", "Reminders", "Documents", "Reports"].includes(m)) {
          return [m, ["View", "Create", "Edit", "Export"]];
        }
        if (["Invoice", "Expenses", "Payments", "Customers", "Vendors"].includes(m)) {
          return [m, ["View"]];
        }
        return [m, ["View"]];
      })
    ),
  },
  {
    id: "role-finance",
    name: "Finance Manager",
    description: "Manages invoices, payments, expenses; read on operations.",
    usersCount: 1,
    isSystem: true,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => {
        if (["Dashboard", "Invoice", "Expenses", "Payments", "Customers", "Vendors", "Reports"].includes(m)) {
          return [m, ["View", "Create", "Edit", "Delete", "Export"]];
        }
        return [m, ["View"]];
      })
    ),
  },
  {
    id: "role-fleet",
    name: "Fleet Manager",
    description: "Manages vehicles, maintenance, inspections, fuel.",
    usersCount: 1,
    isSystem: true,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => {
        if (["Dashboard", "Vehicles", "Maintenance", "Inspection", "Services", "Fuel & Energy", "Issues", "Reports"].includes(m)) {
          return [m, ["View", "Create", "Edit", "Export"]];
        }
        return [m, ["View"]];
      })
    ),
  },
  {
    id: "role-dispatcher",
    name: "Dispatcher",
    description: "Creates and tracks trips; limited vehicle management.",
    usersCount: 1,
    isSystem: true,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => {
        if (["Dashboard", "Trips", "Operations Hub", "Fleet Map", "Lorry Receipts", "Drivers & Staff"].includes(m)) {
          return [m, ["View", "Create", "Edit"]];
        }
        return [m, ["View"]];
      })
    ),
  },
  {
    id: "role-driver",
    name: "Driver",
    description: "Self-service trips, documents, and expenses only.",
    usersCount: 8,
    isSystem: true,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => {
        if (["Dashboard", "Trips", "Documents", "Expenses", "Reminders"].includes(m)) {
          return [m, ["View", "Create", "Edit"]];
        }
        return [m, []];
      })
    ),
  },
  {
    id: "role-analyst",
    name: "Analyst",
    description: "Read-only access across modules for reporting and Rean insights.",
    usersCount: 1,
    isSystem: true,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => [m, ["View", "Export"]])
    ),
  },
  {
    id: "role-compliance",
    name: "Compliance Officer",
    description: "Reads compliance, inspections, documents; manages reminders.",
    usersCount: 1,
    isSystem: false,
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((m) => {
        if (["Dashboard", "Inspection", "Documents", "Reminders", "Reports"].includes(m)) {
          return [m, ["View", "Create", "Edit", "Export"]];
        }
        return [m, ["View"]];
      })
    ),
  },
];

// ===== Active sessions =====
export interface SessionRow {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const SESSIONS_MOCK: SessionRow[] = [
  { id: "s1", device: "MacBook Pro 14\"", browser: "Chrome 124", ip: "103.21.58.42", location: "Mumbai, IN", lastActive: new Date().toISOString(), isCurrent: true },
  { id: "s2", device: "iPhone 14", browser: "Safari Mobile", ip: "103.21.58.100", location: "Mumbai, IN", lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), isCurrent: false },
  { id: "s3", device: "Windows PC", browser: "Edge 124", ip: "49.36.84.12", location: "Pune, IN", lastActive: new Date(Date.now() - 1 * 86400000).toISOString(), isCurrent: false },
  { id: "s4", device: "iPad Air", browser: "Safari Mobile", ip: "157.32.14.88", location: "Bengaluru, IN", lastActive: new Date(Date.now() - 3 * 86400000).toISOString(), isCurrent: false },
];

// ===== Branches =====
export interface BranchRow {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  usersCount: number;
  vehiclesCount: number;
  status: "Active" | "Inactive";
  gstin: string;
}

export const BRANCHES_MOCK: BranchRow[] = [
  { id: "b1", name: "Mumbai HQ", code: "BOM-HQ", city: "Mumbai", state: "Maharashtra", usersCount: 6, vehiclesCount: 12, status: "Active", gstin: "27ABCDE1234F1Z5" },
  { id: "b2", name: "Pune", code: "PUN-01", city: "Pune", state: "Maharashtra", usersCount: 2, vehiclesCount: 6, status: "Active", gstin: "27PQRSX5678K1Z2" },
  { id: "b3", name: "Delhi", code: "DEL-01", city: "New Delhi", state: "Delhi", usersCount: 1, vehiclesCount: 4, status: "Active", gstin: "07DLWXY9012L1Z9" },
  { id: "b4", name: "Bengaluru", code: "BLR-01", city: "Bengaluru", state: "Karnataka", usersCount: 1, vehiclesCount: 3, status: "Active", gstin: "29KARLM3456P1Z7" },
  { id: "b5", name: "Chennai", code: "MAA-01", city: "Chennai", state: "Tamil Nadu", usersCount: 1, vehiclesCount: 2, status: "Active", gstin: "33TNMNO7890R1Z4" },
  { id: "b6", name: "Ahmedabad", code: "AMD-01", city: "Ahmedabad", state: "Gujarat", usersCount: 1, vehiclesCount: 1, status: "Inactive", gstin: "24GJABC2345S1Z8" },
];

// ===== Groups & Subgroups =====
export interface GroupRow {
  id: string;
  name: string;
  type: "Department" | "Cost Center";
  parent?: string;
  subgroups: string[];
}

export const GROUPS_MOCK: GroupRow[] = [
  { id: "g1", name: "HR", type: "Department", subgroups: ["Recruitment", "Payroll", "Compliance"] },
  { id: "g2", name: "Finance", type: "Department", subgroups: ["Accounts Receivable", "Accounts Payable", "Audit"] },
  { id: "g3", name: "Operations", type: "Department", subgroups: ["Dispatch", "Trip Planning", "Fleet Ops"] },
  { id: "g4", name: "Maintenance", type: "Department", parent: "Operations", subgroups: ["Workshop", "Spare Parts", "Vendor Mgmt"] },
  { id: "g5", name: "Sales", type: "Department", subgroups: ["Account Mgmt", "New Business"] },
  { id: "g6", name: "Mumbai Cost Center", type: "Cost Center", subgroups: ["Mumbai-HQ-01", "Mumbai-Field-02"] },
  { id: "g7", name: "Pune Cost Center", type: "Cost Center", subgroups: ["Pune-01"] },
];

// ===== Companies =====
export interface CompanyRow {
  id: string;
  legalName: string;
  tradeName: string;
  gstin: string;
  status: "Active" | "Inactive";
  createdDate: string;
  branchesCount: number;
  usersCount: number;
  vehiclesCount: number;
}

export const COMPANIES_MOCK: CompanyRow[] = [
  {
    id: "co1",
    legalName: "Reanzly Transport Private Limited",
    tradeName: "Reanzly",
    gstin: "27ABCDE1234F1Z5",
    status: "Active",
    createdDate: new Date(Date.now() - 720 * 86400000).toISOString(),
    branchesCount: 6,
    usersCount: 12,
    vehiclesCount: 28,
  },
  {
    id: "co2",
    legalName: "Meridian Logistics LLP",
    tradeName: "Meridian Logistics",
    gstin: "27MERID5678G1Z2",
    status: "Active",
    createdDate: new Date(Date.now() - 380 * 86400000).toISOString(),
    branchesCount: 2,
    usersCount: 4,
    vehiclesCount: 8,
  },
  {
    id: "co3",
    legalName: "Coastal Freight Carriers Pvt Ltd",
    tradeName: "Coastal Freight",
    gstin: "33CFCXY9012H1Z9",
    status: "Active",
    createdDate: new Date(Date.now() - 180 * 86400000).toISOString(),
    branchesCount: 1,
    usersCount: 2,
    vehiclesCount: 5,
  },
  {
    id: "co4",
    legalName: "Northern Express Cargo Pvt Ltd",
    tradeName: "Northern Express",
    gstin: "07NEXPQ3456J1Z7",
    status: "Inactive",
    createdDate: new Date(Date.now() - 90 * 86400000).toISOString(),
    branchesCount: 1,
    usersCount: 1,
    vehiclesCount: 0,
  },
];

// ===== Field Management =====
export interface FieldRow {
  id: string;
  module: string;
  label: string;
  type: "Text" | "Number" | "Date" | "Dropdown" | "Checkbox" | "Currency";
  isDefault: boolean;
  required: boolean;
}

export const FIELDS_MOCK: FieldRow[] = [
  // Trips
  { id: "f1", module: "Trips", label: "Trip ID", type: "Text", isDefault: true, required: true },
  { id: "f2", module: "Trips", label: "Customer", type: "Dropdown", isDefault: true, required: true },
  { id: "f3", module: "Trips", label: "Origin", type: "Text", isDefault: true, required: true },
  { id: "f4", module: "Trips", label: "Destination", type: "Text", isDefault: true, required: true },
  { id: "f5", module: "Trips", label: "Freight Amount", type: "Currency", isDefault: true, required: true },
  { id: "f6", module: "Trips", label: "Special Instructions", type: "Text", isDefault: false, required: false },
  { id: "f7", module: "Trips", label: "Loading Bay #", type: "Text", isDefault: false, required: false },
  // Vehicles
  { id: "f8", module: "Vehicles", label: "License Plate", type: "Text", isDefault: true, required: true },
  { id: "f9", module: "Vehicles", label: "Make/Model", type: "Text", isDefault: true, required: true },
  { id: "f10", module: "Vehicles", label: "Year", type: "Number", isDefault: true, required: true },
  { id: "f11", module: "Vehicles", label: "Ownership", type: "Dropdown", isDefault: true, required: true },
  { id: "f12", module: "Vehicles", label: "Telematics Provider", type: "Dropdown", isDefault: false, required: false },
  // Customers
  { id: "f13", module: "Customers", label: "Company Name", type: "Text", isDefault: true, required: true },
  { id: "f14", module: "Customers", label: "GSTIN", type: "Text", isDefault: true, required: true },
  { id: "f15", module: "Customers", label: "Credit Limit", type: "Currency", isDefault: true, required: false },
  { id: "f16", module: "Customers", label: "Industry Segment", type: "Dropdown", isDefault: false, required: false },
];

// ===== Dataset Templates =====
export interface DatasetTemplate {
  id: string;
  name: string;
  type: "Route" | "Customer" | "Cargo" | "Vendor" | "Vehicle";
  description: string;
  fieldsCount: number;
  lastUpdated: string;
}

export const DATASET_TEMPLATES_MOCK: DatasetTemplate[] = [
  { id: "dt1", name: "Standard Route Card", type: "Route", description: "Origin, destination, distance, tolls, ETA, default carrier.", fieldsCount: 12, lastUpdated: new Date(Date.now() - 14 * 86400000).toISOString() },
  { id: "dt2", name: "Customer Onboarding", type: "Customer", description: "Legal name, GSTIN, PAN, billing address, credit terms, KYC.", fieldsCount: 18, lastUpdated: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "dt3", name: "Cargo Manifest", type: "Cargo", description: "SKU, weight, dimensions, HSN, value, hazardous flag.", fieldsCount: 14, lastUpdated: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "dt4", name: "Vendor Verification", type: "Vendor", description: "GSTIN, PAN, MSME, banking, performance rating.", fieldsCount: 16, lastUpdated: new Date(Date.now() - 21 * 86400000).toISOString() },
  { id: "dt5", name: "Vehicle Master", type: "Vehicle", description: "RC, insurance, permit, fitness, telematics, ownership.", fieldsCount: 22, lastUpdated: new Date(Date.now() - 5 * 86400000).toISOString() },
];

// ===== Document Templates =====
export interface DocumentTemplateRow {
  id: string;
  name: string;
  type: string;
  lastUpdated: string;
  updatedBy: string;
}

export const DOC_TEMPLATES_MOCK: DocumentTemplateRow[] = [
  { id: "dct1", name: "GST Tax Invoice", type: "Invoice", lastUpdated: new Date(Date.now() - 3 * 86400000).toISOString(), updatedBy: "Reena Mehta" },
  { id: "dct2", name: "Lorry Receipt (Standard)", type: "LR", lastUpdated: new Date(Date.now() - 18 * 86400000).toISOString(), updatedBy: "Anil Reddy" },
  { id: "dct3", name: "Driver Settlement", type: "Settlement", lastUpdated: new Date(Date.now() - 9 * 86400000).toISOString(), updatedBy: "Reena Mehta" },
  { id: "dct4", name: "POD Acknowledgement", type: "POD", lastUpdated: new Date(Date.now() - 42 * 86400000).toISOString(), updatedBy: "Rohit Sharma" },
  { id: "dct5", name: "Vendor PO", type: "Purchase Order", lastUpdated: new Date(Date.now() - 60 * 86400000).toISOString(), updatedBy: "Reena Mehta" },
];

// ===== Strength meter =====
export function passwordStrength(pw: string): { score: number; label: string; checks: Record<string, boolean> } {
  const checks = {
    "At least 8 characters": pw.length >= 8,
    "One uppercase letter": /[A-Z]/.test(pw),
    "One lowercase letter": /[a-z]/.test(pw),
    "One number": /\d/.test(pw),
    "One special character": /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label = score === 0 ? "Empty" : score <= 2 ? "Weak" : score <= 3 ? "Fair" : score <= 4 ? "Good" : "Strong";
  return { score, label, checks };
}

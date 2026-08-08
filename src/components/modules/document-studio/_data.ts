"use client";

// ============================================================
//   Document Studio - data model & template catalog.
//
//   12 sellable / business-grade document templates that any
//   role can generate, customize, brand, print and download.
//
//   Each template ships with:
//     • id, label, category, icon name, description, output prefix
//     • defaultSubject, defaultBody (the editable starting copy)
//     • fieldSchema (named fields the builder renders as inputs)
//     • lineItemsEnabled (Quotation / PO / Invoice / Delivery Note)
//
//   The "Created by Reanzly" brand toggle is a per-document and
//   per-org default - surfaced on every template.
// ============================================================

import type { LucideIcon } from "lucide-react";
import {
  FileText,
  FileSignature,
  Award,
  ScrollText,
  Truck,
  Receipt,
  ShoppingCart,
  PackageCheck,
  ShieldCheck,
  Handshake,
  Banknote,
  GraduationCap,
} from "lucide-react";

// ===== Template id union =====
export type TemplateId =
  | "offer-letter"
  | "experience-letter"
  | "relieving-letter"
  | "salary-certificate"
  | "training-certificate"
  | "driver-certificate"
  | "quotation"
  | "purchase-order"
  | "delivery-note"
  | "noc"
  | "sla"
  | "payslip";

export type TemplateCategory =
  | "Human Resources"
  | "Finance"
  | "Operations"
  | "Compliance"
  | "Sales";

// ===== Branding =====
export interface BrandingConfig {
  companyName: string;
  legalName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
  // Logo as monogram (max 3 chars). Studio is monochrome - no image upload.
  monogram: string;
  // Authorized signatory
  signatoryName: string;
  signatoryTitle: string;
  // Brand toggle: when ON, every generated doc carries the
  // "Created by Reanzly" watermark + footer attribution.
  reanzlyBranded: boolean;
  // Accent - only "ink" (monochrome) or "muted". No hues allowed.
  accent: "ink" | "muted";
}

export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: "Reanzly Logistics",
  legalName: "Reanzly Logistics Private Limited",
  addressLine1: "Plot 14, MIDC Industrial Area",
  addressLine2: "Andheri East",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400093",
  gstin: "27AABCR1234F1Z5",
  phone: "+91 22 4567 8900",
  email: "ops@reanzly.in",
  website: "www.reanzly.in",
  monogram: "RZ",
  signatoryName: "Rohit Deshpande",
  signatoryTitle: "Director - Operations",
  reanzlyBranded: true,
  accent: "ink",
};

// ===== Field schema =====
// Drives the builder's "Content" step. Each field is rendered as
// the appropriate input control based on `type`.
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "currency"
  | "select"
  | "lineitems";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldSchema {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: FieldOption[];
  // For lineitems: column schema
  columns?: { key: string; label: string; type: "text" | "number" | "currency"; width?: string }[];
  defaultRows?: number;
}

// ===== Line item (for Quotation / PO / Delivery Note / Payslip breakdown) =====
export interface LineItemRow {
  id: string;
  description: string;
  hsn?: string;
  qty: number;
  rate: number;
  taxRate?: number;
  amount: number;
}

// ===== Generated document record =====
export type DocStatus = "Draft" | "Issued" | "Sent" | "Archived";

export interface GeneratedDocument {
  id: string;
  docNumber: string;
  templateId: TemplateId;
  title: string;
  // Parties
  recipientName: string;
  recipientOrg?: string;
  recipientAddress?: string;
  // Content - a flat key/value map matching the field schema
  fields: Record<string, string>;
  // Optional line items (for finance/ops templates)
  lineItems?: LineItemRow[];
  // Tax + totals (computed)
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  // Branding snapshot at generation time
  branding: BrandingConfig;
  // Status + dates
  status: DocStatus;
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
  createdBy: string;
  tags: string[];
}

// ===== Template catalog =====
export interface TemplateMeta {
  id: TemplateId;
  label: string;
  shortLabel: string;
  category: TemplateCategory;
  icon: LucideIcon;
  description: string;
  // Doc number prefix (e.g. "RZ-OFR")
  prefix: string;
  // Default subject line (becomes the doc title)
  defaultSubject: string;
  // Default body copy - editable in the builder
  defaultBody: string;
  // Recipient label hint (e.g. "Candidate", "Vendor", "Consignee")
  recipientLabel: string;
  // Whether this template supports line items
  lineItemsEnabled: boolean;
  // Whether tax (GST) is computed on line items
  taxEnabled: boolean;
  // Field schema for the content step
  fields: FieldSchema[];
  // Highlight tags for the gallery
  highlights: string[];
}

export const TEMPLATES: TemplateMeta[] = [
  // ---------------- HR ----------------
  {
    id: "offer-letter",
    label: "Offer Letter",
    shortLabel: "Offer Letter",
    category: "Human Resources",
    icon: FileSignature,
    description:
      "Formal employment offer with CTC breakdown, probation, joining date and terms.",
    prefix: "RZ-OFR",
    defaultSubject: "Offer of Employment",
    defaultBody:
      "We are pleased to offer you the position of {position} at {company}. Your employment will commence on {joiningDate} at our {location} office. The compensation package, terms of probation, notice period and other conditions are detailed below. Kindly confirm your acceptance by signing and returning a copy of this letter.",
    recipientLabel: "Candidate",
    lineItemsEnabled: true,
    taxEnabled: false,
    highlights: ["CTC breakdown", "Probation terms", "Notice period"],
    fields: [
      { id: "position", label: "Position / Designation", type: "text", placeholder: "Fleet Operations Executive", required: true },
      { id: "department", label: "Department", type: "text", placeholder: "Operations" },
      { id: "joiningDate", label: "Joining Date", type: "date", required: true },
      { id: "location", label: "Work Location", type: "text", placeholder: "Mumbai HQ", required: true },
      { id: "reportingTo", label: "Reporting Manager", type: "text", placeholder: "VP Operations" },
      { id: "probation", label: "Probation Period", type: "text", placeholder: "6 months", hint: "e.g. 3 / 6 months" },
      { id: "noticePeriod", label: "Notice Period", type: "text", placeholder: "30 days" },
      { id: "ctcAnnual", label: "Annual CTC (INR)", type: "currency", required: true, hint: "Total cost-to-company" },
      { id: "ctcBreakdown", label: "CTC Breakdown (line items)", type: "lineitems", columns: [
        { key: "description", label: "Component", type: "text" },
        { key: "amount", label: "Monthly (INR)", type: "currency" },
      ], defaultRows: 5 },
      { id: "terms", label: "Additional Terms", type: "textarea", placeholder: "Confidentiality, IP assignment, non-compete clause…" },
    ],
  },
  {
    id: "experience-letter",
    label: "Experience Letter",
    shortLabel: "Experience",
    category: "Human Resources",
    icon: ScrollText,
    description:
      "Employment duration and conduct certificate issued on exit or request.",
    prefix: "RZ-EXP",
    defaultSubject: "Certificate of Employment",
    defaultBody:
      "This is to certify that {employeeName} was employed with {company} from {startDate} to {endDate}, last holding the designation of {designation}. During the tenure, the employee's conduct and character were satisfactory. We wish them success in future endeavours.",
    recipientLabel: "Employee",
    lineItemsEnabled: false,
    taxEnabled: false,
    highlights: ["Tenure", "Designation", "Conduct note"],
    fields: [
      { id: "employeeName", label: "Employee Name", type: "text", required: true },
      { id: "employeeCode", label: "Employee Code", type: "text", placeholder: "RZ-EMP-0142" },
      { id: "designation", label: "Designation", type: "text", required: true },
      { id: "department", label: "Department", type: "text" },
      { id: "startDate", label: "Start Date", type: "date", required: true },
      { id: "endDate", label: "End Date", type: "date", required: true },
      { id: "conduct", label: "Conduct Remarks", type: "textarea", placeholder: "Satisfactory conduct and character." },
    ],
  },
  {
    id: "relieving-letter",
    label: "Relieving Letter",
    shortLabel: "Relieving",
    category: "Human Resources",
    icon: FileText,
    description:
      "Formal acceptance of resignation and clearance confirmation on last working day.",
    prefix: "RZ-REL",
    defaultSubject: "Relieving Letter",
    defaultBody:
      "This is to acknowledge the resignation submitted by {employeeName} (Employee Code: {employeeCode}) from the role of {designation}, effective {lastWorkingDay}. We confirm that all dues have been cleared, company assets returned and full & final settlement processed. The employee is hereby relieved from duties with effect from the close of business on {lastWorkingDay}.",
    recipientLabel: "Employee",
    lineItemsEnabled: false,
    taxEnabled: false,
    highlights: ["Resignation accepted", "Dues cleared", "Asset returned"],
    fields: [
      { id: "employeeName", label: "Employee Name", type: "text", required: true },
      { id: "employeeCode", label: "Employee Code", type: "text", required: true },
      { id: "designation", label: "Designation", type: "text", required: true },
      { id: "resignationDate", label: "Resignation Date", type: "date", required: true },
      { id: "lastWorkingDay", label: "Last Working Day", type: "date", required: true },
      { id: "clearance", label: "Clearance Status", type: "select", required: true, options: [
        { label: "Full & Final Settled", value: "settled" },
        { label: "Pending - Notice Period", value: "notice" },
        { label: "Pending - Asset Recovery", value: "asset" },
      ]},
      { id: "notes", label: "Notes", type: "textarea", placeholder: "Any handover notes or outstanding items." },
    ],
  },
  {
    id: "salary-certificate",
    label: "Salary Certificate",
    shortLabel: "Salary Cert",
    category: "Human Resources",
    icon: Banknote,
    description:
      "Monthly and annual salary proof for bank loans, visas, and tenant verification.",
    prefix: "RZ-SAL",
    defaultSubject: "Salary Certificate",
    defaultBody:
      "This is to certify that {employeeName} is a permanent employee of {company} drawing a gross monthly salary of INR {grossMonthly} and a net monthly salary of INR {netMonthly}. The annual CTC is INR {ctcAnnual}. This certificate is issued for the purpose of {purpose} and is valid for 90 days from the date of issue.",
    recipientLabel: "Employee",
    lineItemsEnabled: true,
    taxEnabled: false,
    highlights: ["Gross / Net monthly", "Annual CTC", "Purpose declaration"],
    fields: [
      { id: "employeeName", label: "Employee Name", type: "text", required: true },
      { id: "employeeCode", label: "Employee Code", type: "text" },
      { id: "designation", label: "Designation", type: "text", required: true },
      { id: "doj", label: "Date of Joining", type: "date", required: true },
      { id: "employmentType", label: "Employment Type", type: "select", required: true, options: [
        { label: "Permanent", value: "permanent" },
        { label: "Probation", value: "probation" },
        { label: "Contract", value: "contract" },
      ]},
      { id: "grossMonthly", label: "Gross Monthly (INR)", type: "currency", required: true },
      { id: "netMonthly", label: "Net Monthly (INR)", type: "currency", required: true },
      { id: "ctcAnnual", label: "Annual CTC (INR)", type: "currency", required: true },
      { id: "purpose", label: "Purpose", type: "text", placeholder: "Bank Loan / Visa / Tenant Verification", required: true },
      { id: "breakdown", label: "Salary Breakdown (line items)", type: "lineitems", columns: [
        { key: "description", label: "Component", type: "text" },
        { key: "amount", label: "Monthly (INR)", type: "currency" },
      ], defaultRows: 6 },
    ],
  },
  // ---------------- Compliance ----------------
  {
    id: "training-certificate",
    label: "Training Certificate",
    shortLabel: "Training",
    category: "Compliance",
    icon: GraduationCap,
    description:
      "Course completion certificate for safety, route, and skill training programs.",
    prefix: "RZ-TRN",
    defaultSubject: "Certificate of Training Completion",
    defaultBody:
      "This is to certify that {traineeName} has successfully completed the {programName} training program conducted by {company} from {startDate} to {endDate}. The program covered {skillsCovered}. The trainee demonstrated proficiency and is awarded a grade of {grade}.",
    recipientLabel: "Trainee",
    lineItemsEnabled: false,
    taxEnabled: false,
    highlights: ["Program name", "Skills covered", "Grade awarded"],
    fields: [
      { id: "traineeName", label: "Trainee Name", type: "text", required: true },
      { id: "traineeId", label: "Trainee ID / Employee Code", type: "text" },
      { id: "programName", label: "Program Name", type: "text", required: true, placeholder: "Defensive Driving - Level 2" },
      { id: "startDate", label: "Start Date", type: "date", required: true },
      { id: "endDate", label: "End Date", type: "date", required: true },
      { id: "duration", label: "Duration", type: "text", placeholder: "32 hours / 4 days" },
      { id: "skillsCovered", label: "Skills Covered", type: "text", required: true, placeholder: "Hazard perception, braking, night driving" },
      { id: "grade", label: "Grade / Result", type: "select", required: true, options: [
        { label: "Distinction", value: "A+" },
        { label: "First Class", value: "A" },
        { label: "Pass", value: "B" },
        { label: "Attendance Only", value: "P" },
      ]},
      { id: "trainer", label: "Trainer / Facilitator", type: "text" },
    ],
  },
  {
    id: "driver-certificate",
    label: "Driver Certification",
    shortLabel: "Driver Cert",
    category: "Compliance",
    icon: Truck,
    description:
      "Driver fitness, license verification, and route certification for regulatory compliance.",
    prefix: "RZ-DRV",
    defaultSubject: "Driver Certification & Fitness",
    defaultBody:
      "This is to certify that {driverName}, holder of Driving License No. {licenseNumber} (Class: {licenseClass}), has been verified and certified by {company} as fit to operate {vehicleCategory} vehicles. The certification is valid from {validFrom} to {validUntil}, subject to periodic medical fitness review.",
    recipientLabel: "Driver",
    lineItemsEnabled: false,
    taxEnabled: false,
    highlights: ["License verified", "Medical fitness", "Route authorization"],
    fields: [
      { id: "driverName", label: "Driver Name", type: "text", required: true },
      { id: "driverCode", label: "Driver Code", type: "text", placeholder: "RZ-DRV-0214" },
      { id: "licenseNumber", label: "License Number", type: "text", required: true },
      { id: "licenseClass", label: "License Class", type: "select", required: true, options: [
        { label: "LMV", value: "LMV" },
        { label: "HPV / Heavy Passenger", value: "HPV" },
        { label: "HGV / Heavy Goods", value: "HGV" },
        { label: "MCWG / Motorcycle", value: "MCWG" },
        { label: "Trans / Transport", value: "TRANS" },
      ]},
      { id: "vehicleCategory", label: "Authorized Vehicle Category", type: "text", placeholder: "LCV, HCV, Trailer" },
      { id: "medicalFit", label: "Medical Fitness Valid Till", type: "date" },
      { id: "validFrom", label: "Certification Valid From", type: "date", required: true },
      { id: "validUntil", label: "Certification Valid Until", type: "date", required: true },
      { id: "routes", label: "Authorized Routes / Lanes", type: "text", placeholder: "Mumbai-Pune, Mumbai-Ahmedabad" },
      { id: "certifiedBy", label: "Certified By", type: "text", placeholder: "Safety Officer" },
    ],
  },
  {
    id: "noc",
    label: "No Objection Certificate",
    shortLabel: "NOC",
    category: "Compliance",
    icon: ShieldCheck,
    description:
      "Generic NOC for vehicle transfer, employee exit, premises handover, or equipment release.",
    prefix: "RZ-NOC",
    defaultSubject: "No Objection Certificate",
    defaultBody:
      "This is to certify that {company} has no objection to {subject}. The party named {recipientName} is hereby cleared of all obligations related to {scope}, effective {effectiveDate}. This NOC is issued on the request of the party and is valid for a period of 90 days from the date of issue.",
    recipientLabel: "Party",
    lineItemsEnabled: false,
    taxEnabled: false,
    highlights: ["Multi-purpose", "90-day validity", "Legally framed"],
    fields: [
      { id: "subject", label: "Subject of NOC", type: "text", required: true, placeholder: "transfer of vehicle MH 12 JK 4521" },
      { id: "scope", label: "Scope / Reference", type: "text", required: true, placeholder: "vehicle registration transfer to buyer" },
      { id: "effectiveDate", label: "Effective Date", type: "date", required: true },
      { id: "validity", label: "Validity (days)", type: "number", placeholder: "90" },
      { id: "conditions", label: "Conditions (if any)", type: "textarea", placeholder: "Subject to clearing outstanding dues." },
    ],
  },
  // ---------------- Finance ----------------
  {
    id: "quotation",
    label: "Quotation",
    shortLabel: "Quotation",
    category: "Finance",
    icon: Receipt,
    description:
      "Rate quote to customers with line items, GST computation, terms and validity.",
    prefix: "RZ-QUO",
    defaultSubject: "Quotation",
    defaultBody:
      "We thank you for your enquiry and are pleased to submit our quotation for the services detailed below. The rates are valid for {validity} days from the date of issue. Taxes and statutory levies are extra as applicable.",
    recipientLabel: "Customer",
    lineItemsEnabled: true,
    taxEnabled: true,
    highlights: ["Line items", "GST computed", "Validity window"],
    fields: [
      { id: "customerRef", label: "Customer Reference / RFQ", type: "text", placeholder: "RFQ-2024-0142" },
      { id: "validity", label: "Validity (days)", type: "number", required: true, placeholder: "30" },
      { id: "deliveryLead", label: "Delivery Lead Time", type: "text", placeholder: "24-48 hours" },
      { id: "paymentTerms", label: "Payment Terms", type: "select", required: true, options: [
        { label: "Advance", value: "advance" },
        { label: "Net 7", value: "net7" },
        { label: "Net 15", value: "net15" },
        { label: "Net 30", value: "net30" },
        { label: "Net 45", value: "net45" },
        { label: "COD", value: "cod" },
      ]},
      { id: "items", label: "Line Items", type: "lineitems", columns: [
        { key: "description", label: "Service Description", type: "text" },
        { key: "hsn", label: "HSN/SAC", type: "text", width: "100px" },
        { key: "qty", label: "Qty", type: "number", width: "70px" },
        { key: "rate", label: "Rate (INR)", type: "currency", width: "120px" },
      ], defaultRows: 3 },
      { id: "taxRate", label: "GST Rate (%)", type: "number", placeholder: "5" },
      { id: "notes", label: "Notes / Inclusions", type: "textarea", placeholder: "Tolls, parking, detention charges extra at actuals." },
    ],
  },
  {
    id: "purchase-order",
    label: "Purchase Order",
    shortLabel: "PO",
    category: "Finance",
    icon: ShoppingCart,
    description:
      "Formal PO to vendor with line items, delivery terms, GST and authorized signatory.",
    prefix: "RZ-PO",
    defaultSubject: "Purchase Order",
    defaultBody:
      "We are pleased to place a purchase order for the goods/services listed below. Please confirm acceptance and indicate the expected dispatch date. Delivery shall be made to the address mentioned herein as per the terms set out.",
    recipientLabel: "Vendor",
    lineItemsEnabled: true,
    taxEnabled: true,
    highlights: ["Line items", "Delivery address", "GST + totals"],
    fields: [
      { id: "poDate", label: "PO Date", type: "date", required: true },
      { id: "deliveryDate", label: "Expected Delivery Date", type: "date", required: true },
      { id: "deliveryAddress", label: "Delivery Address", type: "textarea", required: true, placeholder: "Plot 14, MIDC, Andheri East, Mumbai 400093" },
      { id: "paymentTerms", label: "Payment Terms", type: "select", required: true, options: [
        { label: "Advance", value: "advance" },
        { label: "Against Delivery", value: "delivery" },
        { label: "Net 15", value: "net15" },
        { label: "Net 30", value: "net30" },
        { label: "Net 60", value: "net60" },
      ]},
      { id: "items", label: "Line Items", type: "lineitems", columns: [
        { key: "description", label: "Item Description", type: "text" },
        { key: "hsn", label: "HSN", type: "text", width: "100px" },
        { key: "qty", label: "Qty", type: "number", width: "70px" },
        { key: "rate", label: "Rate (INR)", type: "currency", width: "120px" },
      ], defaultRows: 3 },
      { id: "taxRate", label: "GST Rate (%)", type: "number", placeholder: "18" },
      { id: "notes", label: "Special Instructions", type: "textarea", placeholder: "Inspect on delivery. Reject if damaged." },
    ],
  },
  {
    id: "payslip",
    label: "Payslip",
    shortLabel: "Payslip",
    category: "Finance",
    icon: Banknote,
    description:
      "Monthly payslip with earnings/deductions breakdown and net pay.",
    prefix: "RZ-PAY",
    defaultSubject: "Payslip",
    defaultBody:
      "Payslip for the pay period {payPeriod}. The earnings and deductions are detailed below. Net pay of INR {netPay} has been credited to your bank account.",
    recipientLabel: "Employee",
    lineItemsEnabled: true,
    taxEnabled: false,
    highlights: ["Earnings/deductions", "Net pay", "Bank credit reference"],
    fields: [
      { id: "employeeName", label: "Employee Name", type: "text", required: true },
      { id: "employeeCode", label: "Employee Code", type: "text", required: true },
      { id: "designation", label: "Designation", type: "text" },
      { id: "payPeriod", label: "Pay Period", type: "text", required: true, placeholder: "March 2024" },
      { id: "payDate", label: "Pay Date", type: "date", required: true },
      { id: "bankAccount", label: "Bank Account (masked)", type: "text", placeholder: "HDFC ****6789" },
      { id: "workingDays", label: "Working Days", type: "number", placeholder: "31" },
      { id: "daysPresent", label: "Days Present", type: "number", placeholder: "30" },
      { id: "earnings", label: "Earnings", type: "lineitems", columns: [
        { key: "description", label: "Component", type: "text" },
        { key: "amount", label: "Amount (INR)", type: "currency" },
      ], defaultRows: 5 },
      { id: "deductions", label: "Deductions", type: "lineitems", columns: [
        { key: "description", label: "Component", type: "text" },
        { key: "amount", label: "Amount (INR)", type: "currency" },
      ], defaultRows: 4 },
      { id: "netPay", label: "Net Pay (INR)", type: "currency", required: true },
    ],
  },
  // ---------------- Operations ----------------
  {
    id: "delivery-note",
    label: "Delivery Note",
    shortLabel: "Delivery Note",
    category: "Operations",
    icon: PackageCheck,
    description:
      "Goods delivery acknowledgement with items, quantity, condition and receiver signature.",
    prefix: "RZ-DN",
    defaultSubject: "Delivery Note",
    defaultBody:
      "Goods as per the undermentioned details have been dispatched and delivered. The consignee acknowledges receipt in good condition unless otherwise noted.",
    recipientLabel: "Consignee",
    lineItemsEnabled: true,
    taxEnabled: false,
    highlights: ["Item / qty / condition", "Receiver signature", "LR cross-ref"],
    fields: [
      { id: "lrNumber", label: "LR Number", type: "text", required: true, placeholder: "RZ-LR-2024-0142" },
      { id: "dispatchDate", label: "Dispatch Date", type: "date", required: true },
      { id: "deliveryDate", label: "Delivery Date", type: "date", required: true },
      { id: "vehicleNumber", label: "Vehicle Number", type: "text", placeholder: "MH 12 JK 4521" },
      { id: "origin", label: "Origin", type: "text", required: true, placeholder: "Mumbai" },
      { id: "destination", label: "Destination", type: "text", required: true, placeholder: "Pune" },
      { id: "items", label: "Items Delivered", type: "lineitems", columns: [
        { key: "description", label: "Item Description", type: "text" },
        { key: "qty", label: "Qty", type: "number", width: "80px" },
        { key: "condition", label: "Condition", type: "text", width: "140px" },
      ], defaultRows: 3 },
      { id: "receivedBy", label: "Received By", type: "text", placeholder: "Name of consignee representative" },
      { id: "receiverContact", label: "Receiver Contact", type: "text" },
      { id: "remarks", label: "Remarks", type: "textarea", placeholder: "Any damage, shortage or remarks." },
    ],
  },
  // ---------------- Sales ----------------
  {
    id: "sla",
    label: "Service Level Agreement",
    shortLabel: "SLA",
    category: "Sales",
    icon: Handshake,
    description:
      "Mutual SLA document with service levels, response/resolution times and penalties.",
    prefix: "RZ-SLA",
    defaultSubject: "Service Level Agreement",
    defaultBody:
      "This Service Level Agreement (\"Agreement\") is entered into between {company} (\"Service Provider\") and {recipientName} (\"Client\") effective from {effectiveDate}. The Service Provider commits to the service levels, response times and resolution times specified herein for the duration of this Agreement.",
    recipientLabel: "Client",
    lineItemsEnabled: true,
    taxEnabled: false,
    highlights: ["Response/resolution SLAs", "Penalty matrix", "Term & termination"],
    fields: [
      { id: "effectiveDate", label: "Effective Date", type: "date", required: true },
      { id: "termMonths", label: "Initial Term (months)", type: "number", required: true, placeholder: "12" },
      { id: "scope", label: "Scope of Services", type: "textarea", required: true, placeholder: "FTL transport, dedicated fleet, GPS tracking, ePOD." },
      { id: "serviceHours", label: "Service Hours", type: "text", placeholder: "24x7 including holidays" },
      { id: "slas", label: "SLA Matrix (line items)", type: "lineitems", columns: [
        { key: "description", label: "Service Parameter", type: "text" },
        { key: "qty", label: "Target", type: "text", width: "120px" },
        { key: "rate", label: "Penalty / Miss", type: "currency", width: "140px" },
      ], defaultRows: 4 },
      { id: "escalation", label: "Escalation Matrix", type: "textarea", placeholder: "L1 Ops Manager - 2h, L2 VP Ops - 8h, L3 CEO - 24h" },
      { id: "termination", label: "Termination Clause", type: "textarea", placeholder: "30 days written notice; breach cures in 15 days." },
    ],
  },
];

// ===== Helpers =====
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Human Resources",
  "Finance",
  "Operations",
  "Compliance",
  "Sales",
];

export function templateById(id: TemplateId): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templateByPrefix(prefix: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.prefix === prefix);
}

// ===== Sample seed documents (so the studio isn't empty on first visit) =====
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const SEED_DOCUMENTS: GeneratedDocument[] = [
  {
    id: "doc-001",
    docNumber: "RZ-OFR-2024-014",
    templateId: "offer-letter",
    title: "Offer of Employment - Anjali Mehta",
    recipientName: "Anjali Mehta",
    recipientOrg: "",
    recipientAddress: "Flat 12B, Lotus Residency, Powai, Mumbai 400076",
    fields: {
      position: "Fleet Operations Executive",
      department: "Operations",
      joiningDate: "2024-08-12",
      location: "Mumbai HQ",
      reportingTo: "Rohit Deshpande",
      probation: "6 months",
      noticePeriod: "30 days",
      ctcAnnual: "840000",
      terms: "Standard confidentiality and IP assignment applies.",
    },
    lineItems: [
      { id: "li-1", description: "Basic Salary", qty: 1, rate: 42000, amount: 42000 },
      { id: "li-2", description: "HRA (40% of Basic)", qty: 1, rate: 16800, amount: 16800 },
      { id: "li-3", description: "Conveyance Allowance", qty: 1, rate: 3200, amount: 3200 },
      { id: "li-4", description: "Special Allowance", qty: 1, rate: 8000, amount: 8000 },
      { id: "li-5", description: "Performance Bonus", qty: 1, rate: 0, amount: 0 },
    ],
    branding: DEFAULT_BRANDING,
    status: "Issued",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
    issuedAt: daysAgo(8),
    createdBy: "Pooja Iyer",
    tags: ["HR", "Offer", "Operations"],
  },
  {
    id: "doc-002",
    docNumber: "RZ-QUO-2024-042",
    templateId: "quotation",
    title: "Quotation - Patel Freight Movers",
    recipientName: "Patel Freight Movers",
    recipientOrg: "Patel Freight Movers Pvt Ltd",
    recipientAddress: "14 Shipping House, Ballard Estate, Mumbai 400038",
    fields: {
      customerRef: "RFQ-2024-0142",
      validity: "30",
      deliveryLead: "24-48 hours",
      paymentTerms: "net30",
      taxRate: "5",
      notes: "Tolls and parking extra at actuals. Detention charges after 12 hours of free time.",
    },
    lineItems: [
      { id: "li-1", description: "Mumbai - Pune FTL (32ft MXL)", hsn: "996511", qty: 12, rate: 8500, taxRate: 5, amount: 102000 },
      { id: "li-2", description: "Mumbai - Ahmedabad FTL (32ft MXL)", hsn: "996511", qty: 8, rate: 22000, taxRate: 5, amount: 176000 },
      { id: "li-3", description: "Mumbai - Bengaluru FTL (32ft MXL)", hsn: "996511", qty: 4, rate: 32000, taxRate: 5, amount: 128000 },
    ],
    subtotal: 406000,
    taxAmount: 20300,
    totalAmount: 426300,
    branding: DEFAULT_BRANDING,
    status: "Sent",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
    issuedAt: daysAgo(3),
    createdBy: "Rohit Deshpande",
    tags: ["Finance", "Quotation", "FTL"],
  },
  {
    id: "doc-003",
    docNumber: "RZ-TRN-2024-007",
    templateId: "training-certificate",
    title: "Defensive Driving - Level 2 - Suraj Kumar",
    recipientName: "Suraj Kumar",
    recipientOrg: "",
    recipientAddress: "Drivers Quarters, Bhandup, Mumbai",
    fields: {
      traineeName: "Suraj Kumar",
      traineeId: "RZ-DRV-0214",
      programName: "Defensive Driving - Level 2",
      startDate: "2024-07-15",
      endDate: "2024-07-18",
      duration: "32 hours / 4 days",
      skillsCovered: "Hazard perception, emergency braking, night driving, fuel-efficient driving",
      grade: "A",
      trainer: "Capt. R. Iyer (Retd.)",
    },
    branding: DEFAULT_BRANDING,
    status: "Issued",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
    issuedAt: daysAgo(14),
    createdBy: "Pooja Iyer",
    tags: ["Compliance", "Training", "Driver"],
  },
  {
    id: "doc-004",
    docNumber: "RZ-PAY-2024-06-0142",
    templateId: "payslip",
    title: "Payslip - June 2024 - Anil Sharma",
    recipientName: "Anil Sharma",
    recipientOrg: "",
    recipientAddress: "",
    fields: {
      employeeName: "Anil Sharma",
      employeeCode: "RZ-EMP-0142",
      designation: "Senior Dispatcher",
      payPeriod: "June 2024",
      payDate: "2024-06-30",
      bankAccount: "HDFC ****6789",
      workingDays: "30",
      daysPresent: "30",
      netPay: "68400",
    },
    lineItems: [
      { id: "e1", description: "Basic", qty: 1, rate: 36000, amount: 36000 },
      { id: "e2", description: "HRA", qty: 1, rate: 14400, amount: 14400 },
      { id: "e3", description: "Conveyance", qty: 1, rate: 3200, amount: 3200 },
      { id: "e4", description: "Special Allowance", qty: 1, rate: 18000, amount: 18000 },
      { id: "d1", description: "PF", qty: 1, rate: 1800, amount: 1800 },
      { id: "d2", description: "Professional Tax", qty: 1, rate: 200, amount: 200 },
      { id: "d3", description: "TDS", qty: 1, rate: 1200, amount: 1200 },
    ],
    branding: DEFAULT_BRANDING,
    status: "Issued",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
    issuedAt: daysAgo(12),
    createdBy: "Reena Kapoor",
    tags: ["Payroll", "Payslip", "June 2024"],
  },
  {
    id: "doc-005",
    docNumber: "RZ-NOC-2024-003",
    templateId: "noc",
    title: "NOC - Vehicle Transfer - MH 12 JK 4521",
    recipientName: "Mahesh Trucks Pvt Ltd",
    recipientOrg: "Mahesh Trucks Pvt Ltd",
    recipientAddress: "Plot 22, Transport Nagar, Nagpur 440022",
    fields: {
      subject: "transfer of vehicle MH 12 JK 4521",
      scope: "vehicle registration transfer to buyer post sale",
      effectiveDate: "2024-07-22",
      validity: "90",
      conditions: "Subject to clearing outstanding dues and traffic challans if any.",
    },
    branding: { ...DEFAULT_BRANDING, reanzlyBranded: false },
    status: "Issued",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
    issuedAt: daysAgo(20),
    createdBy: "Rohit Deshpande",
    tags: ["Compliance", "NOC", "Vehicle"],
  },
];

// ===== Status badge variant mapping (monochrome-safe) =====
export type BadgeVariant = "solid" | "outline" | "muted";
export function docStatusBadge(s: DocStatus): BadgeVariant {
  switch (s) {
    case "Issued":
      return "solid";
    case "Sent":
      return "outline";
    case "Draft":
      return "muted";
    case "Archived":
      return "muted";
    default:
      return "outline";
  }
}

// ===== Misc =====
export const REANZLY_TAGLINE = "Created by Reanzly";
export const REANZLY_BRAND_URL = "reanzly.in";

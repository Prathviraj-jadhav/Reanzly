"use client";

import type { ReactNode } from "react";

/* ============================================================
   Helpdesk module helpers - shared between list / drawer / detail.
   Strict monochrome: no hues, hairline borders, ≤6px radius,
   tabular mono for numerals.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
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
export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ===== Domain constants =====
export const TICKET_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = [
  "New",
  "Assigned",
  "In Progress",
  "Waiting",
  "Resolved",
  "Closed",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CHANNELS = ["Email", "Phone", "Portal", "WhatsApp", "In-App"] as const;
export type TicketChannel = (typeof TICKET_CHANNELS)[number];

export const TICKET_TEAMS = [
  "Operations",
  "Finance",
  "Fleet",
  "IT Support",
  "Customer Success",
  "Billing",
] as const;
export type TicketTeam = (typeof TICKET_TEAMS)[number];

export const TICKET_CATEGORIES = [
  "POD Dispute",
  "Invoice Correction",
  "Vehicle Breakdown",
  "e-Way Bill",
  "Delivery Delay",
  "Rate Dispute",
  "Documentation",
  "Payment Failure",
  "Tracking Issue",
  "Account Access",
] as const;

// ===== SLA helpers =====
// Each priority has a target response + resolution SLA (in minutes).
export const SLA_TARGETS: Record<TicketPriority, { response: number; resolution: number }> = {
  Urgent: { response: 15, resolution: 240 },
  High: { response: 60, resolution: 720 },
  Medium: { response: 240, resolution: 2880 },
  Low: { response: 480, resolution: 5760 },
};

export interface SlaClock {
  /** ISO timestamp when the SLA first-response target should hit. */
  responseDue: string;
  /** ISO timestamp when the SLA resolution target should hit. */
  resolutionDue: string;
  /** ISO timestamp of first agent response (optional). */
  firstResponseAt?: string;
  /** ISO timestamp of resolution (optional). */
  resolvedAt?: string;
}

export function formatDuration(mins: number): string {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  if (abs < 60) return `${sign}${abs}m`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h < 24) return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh === 0 ? `${sign}${d}d` : `${sign}${d}d ${rh}h`;
}

export function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

export function minutesSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

// ===== Badge variant mappings (strict monochrome) =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function priorityBadge(p: TicketPriority): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<TicketPriority, { variant: BadgeVariant; pulse?: boolean }> = {
    Urgent: { variant: "solid", pulse: true },
    High: { variant: "outline" },
    Medium: { variant: "muted" },
    Low: { variant: "muted" },
  };
  return map[p] ?? { variant: "muted" };
}

export function statusBadge(s: TicketStatus): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<TicketStatus, { variant: BadgeVariant; pulse?: boolean }> = {
    New: { variant: "solid", pulse: true },
    Assigned: { variant: "outline" },
    "In Progress": { variant: "outline" },
    Waiting: { variant: "muted" },
    Resolved: { variant: "muted" },
    Closed: { variant: "muted" },
  };
  return map[s] ?? { variant: "outline" };
}

/** Greyscale accent dot for priority levels (Urgent = filled, Low = faint). */
export function PriorityDot({ priority }: { priority: TicketPriority }) {
  const cls =
    priority === "Urgent"
      ? "bg-foreground"
      : priority === "High"
        ? "bg-foreground/70"
        : priority === "Medium"
          ? "bg-foreground/40"
          : "bg-foreground/20";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`} />;
}

// ===== Status transitions =====
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  New: ["Assigned", "In Progress", "Resolved"],
  Assigned: ["In Progress", "Waiting", "Resolved"],
  "In Progress": ["Waiting", "Resolved", "Closed"],
  Waiting: ["In Progress", "Resolved"],
  Resolved: ["Closed", "In Progress"],
  Closed: ["In Progress"],
};

// ===== FieldLabel =====
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

// ===== Domain type =====
export interface TicketMessage {
  id: string;
  author: string;
  role: string;
  text: string;
  ts: string;
  internal?: boolean;
}

export interface TicketActivity {
  icon: string;
  label: string;
  detail: string;
  ts: string;
}

export interface HelpdeskTicket {
  id: string;
  ticketId: string;
  subject: string;
  description: string;
  customer: string;
  customerCode: string;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  team: TicketTeam;
  assignee: string;
  requester: string;
  requesterEmail: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  sla: SlaClock;
  relatedRef?: string;
  messages: TicketMessage[];
  activity: TicketActivity[];
}

// ===== Mock data: 25 realistic Indian logistics support tickets =====
// SLA due timestamps are computed deterministically from createdAt so the
// overdue / on-track badges stay stable across renders.
function slaFor(createdAt: string, priority: TicketPriority, resolvedAt?: string): SlaClock {
  const created = new Date(createdAt).getTime();
  const targets = SLA_TARGETS[priority];
  // Deterministic skew so some tickets are overdue, some on-track, some breached.
  const skew = (parseInt(createdAt.slice(-2), 10) || 1) % 7; // 0-6
  const responseOffset = (targets.response - skew * 12) * 60000;
  const resolutionOffset = (targets.resolution - skew * 90) * 60000;
  const responseDue = new Date(created + responseOffset).toISOString();
  const resolutionDue = new Date(created + resolutionOffset).toISOString();
  // If resolved, the first response happened ~10-20m in.
  const firstResponseAt = resolvedAt
    ? new Date(created + 13 * 60000).toISOString()
    : undefined;
  return { responseDue, resolutionDue, firstResponseAt, resolvedAt };
}

const NOW = Date.now();
function ago(mins: number): string {
  return new Date(NOW - mins * 60000).toISOString();
}

export const HELPDESK_TICKETS: HelpdeskTicket[] = [
  {
    id: "t-1",
    ticketId: "TKT-2841",
    subject: "POD dispute for TRP-1042 — consignee refuses to sign",
    description:
      "Consignee at the Nagpur delivery point is refusing to acknowledge the delivery due to a damaged carton. Driver has captured photographic evidence. Customer is requesting a re-delivery and a credit note for the damaged goods.",
    customer: "Maruti Roadways",
    customerCode: "CR-0142",
    priority: "High",
    status: "In Progress",
    channel: "Phone",
    team: "Operations",
    assignee: "Anita Kulkarni",
    requester: "Rohit Sawant",
    requesterEmail: "rohit.sawant@marutiroadways.in",
    category: "POD Dispute",
    createdAt: ago(180),
    updatedAt: ago(22),
    sla: slaFor(ago(180), "High"),
    relatedRef: "TRP-1042",
    messages: [
      { id: "m1", author: "Rohit Sawant", role: "Customer", text: "The consignee is refusing to sign. They claim 2 cartons were crushed. Please advise.", ts: ago(180) },
      { id: "m2", author: "Anita Kulkarni", role: "Agent", text: "Acknowledged. I see the driver has uploaded 4 photos. Forwarding to the claims team for damage assessment.", ts: ago(160), internal: true },
      { id: "m3", author: "Anita Kulkarni", role: "Agent", text: "Hi Rohit, we've initiated a damage assessment. The driver will return with a fresh consignment note for re-delivery tomorrow morning.", ts: ago(120) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Operations", ts: ago(180) },
      { icon: "user", label: "Assigned to Anita Kulkarni", detail: "auto-routed by priority + team rules", ts: ago(178) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(160) },
      { icon: "message", label: "Customer notified", detail: "re-delivery scheduled", ts: ago(120) },
    ],
  },
  {
    id: "t-2",
    ticketId: "TKT-2842",
    subject: "Invoice correction needed for INV-2841 — GST mismatch",
    description:
      "GSTIN on invoice INV-2841 shows 27AABC... instead of 27AAAC... The customer's accounting team is unable to claim ITC. Requesting a corrected invoice with the right GSTIN and a credit note for the original.",
    customer: "Sahyadri Logistics",
    customerCode: "CR-0089",
    priority: "Medium",
    status: "Assigned",
    channel: "Email",
    team: "Billing",
    assignee: "Suresh Iyer",
    requester: "Meera Joshi",
    requesterEmail: "meera@sahyadrilogistics.in",
    category: "Invoice Correction",
    createdAt: ago(320),
    updatedAt: ago(45),
    sla: slaFor(ago(320), "Medium"),
    relatedRef: "INV-2841",
    messages: [
      { id: "m1", author: "Meera Joshi", role: "Customer", text: "GSTIN on INV-2841 is incorrect. Please issue a corrected invoice at the earliest.", ts: ago(320) },
      { id: "m2", author: "Suresh Iyer", role: "Agent", text: "Hi Meera, received the request. Verifying the GSTIN against the master. Will issue the corrected invoice within 24 hours.", ts: ago(280) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Billing", ts: ago(320) },
      { icon: "user", label: "Assigned to Suresh Iyer", detail: "team-lead assignment", ts: ago(318) },
    ],
  },
  {
    id: "t-3",
    ticketId: "TKT-2843",
    subject: "Vehicle breakdown on Mumbai-Delhi route — NH48 km 142",
    description:
      "Truck MH-12-AB-7890 (TRP-2204) has broken down near Manor on NH48. Driver reports clutch failure. Need roadside assistance dispatch and a relay vehicle to ensure on-time delivery.",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    priority: "Urgent",
    status: "In Progress",
    channel: "Phone",
    team: "Fleet",
    assignee: "Imran Sheikh",
    requester: "Vijay Patil",
    requesterEmail: "vijay.patil@reliancetc.in",
    category: "Vehicle Breakdown",
    createdAt: ago(95),
    updatedAt: ago(8),
    sla: slaFor(ago(95), "Urgent"),
    relatedRef: "TRP-2204",
    messages: [
      { id: "m1", author: "Vijay Patil", role: "Customer", text: "Truck has broken down at Manor. Clutch failure. Dispatch help immediately.", ts: ago(95) },
      { id: "m2", author: "Imran Sheikh", role: "Agent", text: "On it. Locating nearest service van. ETA 35 minutes.", ts: ago(80), internal: true },
      { id: "m3", author: "Imran Sheikh", role: "Agent", text: "Service van dispatched from Palghar hub. Relay vehicle being arranged from our Bhiwandi depot. Will keep you posted.", ts: ago(60) },
      { id: "m4", author: "Imran Sheikh", role: "Agent", text: "Update: mechanic on site. Clutch slave cylinder being replaced. Relay vehicle reached the breakdown spot.", ts: ago(15) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Fleet · Urgent", ts: ago(95) },
      { icon: "user", label: "Assigned to Imran Sheikh", detail: "Urgent SLA — 15 min response", ts: ago(94) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(80) },
      { icon: "package", label: "Service van dispatched", detail: "Palghar hub → Manor (35 km)", ts: ago(75) },
      { icon: "truck", label: "Relay vehicle reached", detail: "Bhiwandi depot — TRP-2204 cargo transfer in progress", ts: ago(15) },
    ],
  },
  {
    id: "t-4",
    ticketId: "TKT-2844",
    subject: "e-Way bill generation failed for consignment CN-5512",
    description:
      "e-Way bill auto-generation failed with error 'GSTIN suspended'. The consignment is held at the origin godown pending clearance. Customer needs the shipment dispatched by EOD.",
    customer: "Patel Freight Movers",
    customerCode: "CR-0156",
    priority: "High",
    status: "Waiting",
    channel: "Portal",
    team: "Operations",
    assignee: "Deepa Nair",
    requester: "Karan Patel",
    requesterEmail: "karan@patelfreight.in",
    category: "e-Way Bill",
    createdAt: ago(240),
    updatedAt: ago(60),
    sla: slaFor(ago(240), "High"),
    relatedRef: "CN-5512",
    messages: [
      { id: "m1", author: "Karan Patel", role: "Customer", text: "e-Way bill failed. Shipment held at godown. Need it dispatched today.", ts: ago(240) },
      { id: "m2", author: "Deepa Nair", role: "Agent", text: "Hi Karan, the GST portal shows your GSTIN as suspended. Please check with your finance team and confirm the active GSTIN so we can regenerate.", ts: ago(200) },
      { id: "m3", author: "Karan Patel", role: "Customer", text: "Checking with finance. Will revert in an hour.", ts: ago(180) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Portal · routed to Operations", ts: ago(240) },
      { icon: "user", label: "Assigned to Deepa Nair", detail: "auto-routing", ts: ago(238) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(200) },
      { icon: "clock", label: "Status → Waiting", detail: "awaiting customer confirmation on GSTIN", ts: ago(180) },
    ],
  },
  {
    id: "t-5",
    ticketId: "TKT-2845",
    subject: "Delivery delay — TRP-3310 exceeded promised window",
    description:
      "Shipment to Coimbatore was promised in 48 hours but is now 72 hours. Customer is seeking a penalty waiver and an explanation for the delay.",
    customer: "South India Textiles Ltd",
    customerCode: "CR-0333",
    priority: "Medium",
    status: "Resolved",
    channel: "Email",
    team: "Customer Success",
    assignee: "Lakshmi Venkat",
    requester: "Sridhar R",
    requesterEmail: "sridhar@sitl.in",
    category: "Delivery Delay",
    createdAt: ago(4320),
    updatedAt: ago(2880),
    resolvedAt: ago(2880),
    sla: slaFor(ago(4320), "Medium", ago(2880)),
    relatedRef: "TRP-3310",
    messages: [
      { id: "m1", author: "Sridhar R", role: "Customer", text: "Promised 48h, delivered in 72h. Unacceptable. Need a penalty waiver.", ts: ago(4320) },
      { id: "m2", author: "Lakshmi Venkat", role: "Agent", text: "Hi Sridhar, I apologise for the delay. There was an axle-overload check at the Hosur toll that held the vehicle for 18 hours. Processing a 15% freight waiver.", ts: ago(4200) },
      { id: "m3", author: "Lakshmi Venkat", role: "Agent", text: "Waiver of ₹4,200 credited against your next invoice. Reference: WVR-0091.", ts: ago(2900) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Customer Success", ts: ago(4320) },
      { icon: "user", label: "Assigned to Lakshmi Venkat", detail: "success-team SLA", ts: ago(4318) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(4200) },
      { icon: "check", label: "Status → Resolved", detail: "waiver WVR-0091 issued", ts: ago(2880) },
    ],
  },
  {
    id: "t-6",
    ticketId: "TKT-2846",
    subject: "Rate dispute on lane Mumbai-Pune — quoted vs invoiced",
    description:
      "Customer was quoted ₹18,500 for a 9-tonne load on the Mumbai-Pune lane but invoice shows ₹22,100. Sales rep confirmed the lower rate verbally. Need reconciliation.",
    customer: "Asha Transport Co",
    customerCode: "CR-0118",
    priority: "Medium",
    status: "In Progress",
    channel: "Phone",
    team: "Billing",
    assignee: "Suresh Iyer",
    requester: "Nilesh Shah",
    requesterEmail: "nilesh@ashatransport.in",
    category: "Rate Dispute",
    createdAt: ago(540),
    updatedAt: ago(90),
    sla: slaFor(ago(540), "Medium"),
    relatedRef: "INV-2710",
    messages: [
      { id: "m1", author: "Nilesh Shah", role: "Customer", text: "Quoted 18,500. Invoiced 22,100. Please reconcile.", ts: ago(540) },
      { id: "m2", author: "Suresh Iyer", role: "Agent", text: "Hi Nilesh, checking with the sales rep on the verbal quote. Will revert.", ts: ago(500) },
      { id: "m3", author: "Suresh Iyer", role: "Agent", text: "Sales confirmed ₹18,500. The extra ₹3,600 was a diesel surcharge applied automatically. I'll raise a credit note for the difference.", ts: ago(120) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Billing", ts: ago(540) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(500) },
      { icon: "message", label: "Sales confirmed quoted rate", detail: "credit note pending", ts: ago(120) },
    ],
  },
  {
    id: "t-7",
    ticketId: "TKT-2847",
    subject: "Cannot access account — OTP not received for last 30 minutes",
    description:
      "Customer user rashmi@abc.in is unable to log in. The OTP is not arriving on their registered mobile +91-98XXXXXXXX. Need alternate login or OTP re-issue.",
    customer: "ABC Cold Chain",
    customerCode: "CR-0201",
    priority: "High",
    status: "New",
    channel: "WhatsApp",
    team: "IT Support",
    assignee: "Unassigned",
    requester: "Rashmi Deshpande",
    requesterEmail: "rashmi@abccoldchain.in",
    category: "Account Access",
    createdAt: ago(18),
    updatedAt: ago(18),
    sla: slaFor(ago(18), "High"),
    messages: [
      { id: "m1", author: "Rashmi Deshpande", role: "Customer", text: "Not receiving OTP for the last 30 minutes. Urgent — need to dispatch shipments.", ts: ago(18) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via WhatsApp · routed to IT Support · High", ts: ago(18) },
    ],
  },
  {
    id: "t-8",
    ticketId: "TKT-2848",
    subject: "Tracking not updating for TRP-4408 — last ping 6 hours ago",
    description:
      "GPS tracking for vehicle KA-01-CD-4521 has stopped updating. Customer cannot see live status. Possible device malfunction or low battery.",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    priority: "Medium",
    status: "Assigned",
    channel: "Portal",
    team: "IT Support",
    assignee: "Imran Sheikh",
    requester: "Sunitha Rao",
    requesterEmail: "sunitha@deccanexpress.in",
    category: "Tracking Issue",
    createdAt: ago(260),
    updatedAt: ago(40),
    sla: slaFor(ago(260), "Medium"),
    relatedRef: "TRP-4408",
    messages: [
      { id: "m1", author: "Sunitha Rao", role: "Customer", text: "Tracking frozen for TRP-4408. Last ping 6h ago.", ts: ago(260) },
      { id: "m2", author: "Imran Sheikh", role: "Agent", text: "Hi Sunitha, the GPS device shows low battery. Driver has been instructed to plug in the auxiliary charger. Should resume in 30 minutes.", ts: ago(220) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Portal · routed to IT Support", ts: ago(260) },
      { icon: "user", label: "Assigned to Imran Sheikh", detail: "IT on-call rotation", ts: ago(258) },
    ],
  },
  {
    id: "t-9",
    ticketId: "TKT-2849",
    subject: "Payment failure for invoice INV-2912 — UPI timeout",
    description:
      "Customer attempted to pay INV-2912 via UPI but the transaction timed out at the bank's end. Amount debited but not credited to our account. Customer is asking for confirmation.",
    customer: "Gujarat Agri Logistics",
    customerCode: "CR-0245",
    priority: "High",
    status: "In Progress",
    channel: "Phone",
    team: "Finance",
    assignee: "Anjali Mehta",
    requester: "Hardik Gandhi",
    requesterEmail: "hardik@gujaratagri.in",
    category: "Payment Failure",
    createdAt: ago(140),
    updatedAt: ago(20),
    sla: slaFor(ago(140), "High"),
    relatedRef: "INV-2912",
    messages: [
      { id: "m1", author: "Hardik Gandhi", role: "Customer", text: "UPI payment timed out. Money debited but not credited. Please confirm receipt.", ts: ago(140) },
      { id: "m2", author: "Anjali Mehta", role: "Agent", text: "Hi Hardik, checking with our bank. The transaction is in a pending state. Should auto-reconcile within 2 hours.", ts: ago(120) },
      { id: "m3", author: "Anjali Mehta", role: "Agent", text: "Update: payment reconciled. Receipt being emailed. Invoice marked paid.", ts: ago(25) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Finance", ts: ago(140) },
      { icon: "user", label: "Assigned to Anjali Mehta", detail: "finance on-call", ts: ago(138) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(120) },
      { icon: "check", label: "Payment reconciled", detail: "INV-2912 marked paid", ts: ago(25) },
    ],
  },
  {
    id: "t-10",
    ticketId: "TKT-2850",
    subject: "Documentation error — LR shows wrong consignee PIN",
    description:
      "Lorry receipt LR-8812 shows consignee PIN as 411014 instead of 411001. Customer's billing system rejected the LR. Requesting reissue with the correct PIN.",
    customer: "Maruti Roadways",
    customerCode: "CR-0142",
    priority: "Low",
    status: "Closed",
    channel: "Email",
    team: "Operations",
    assignee: "Anita Kulkarni",
    requester: "Rohit Sawant",
    requesterEmail: "rohit.sawant@marutiroadways.in",
    category: "Documentation",
    createdAt: ago(8640),
    updatedAt: ago(8000),
    resolvedAt: ago(8060),
    sla: slaFor(ago(8640), "Low", ago(8060)),
    relatedRef: "LR-8812",
    messages: [
      { id: "m1", author: "Rohit Sawant", role: "Customer", text: "PIN code is wrong on LR-8812. Please reissue.", ts: ago(8640) },
      { id: "m2", author: "Anita Kulkarni", role: "Agent", text: "Hi Rohit, reissued LR-8812-R1 with PIN 411001. Emailed.", ts: ago(8060) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Operations", ts: ago(8640) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(8400) },
      { icon: "check", label: "Status → Resolved", detail: "LR-8812-R1 issued", ts: ago(8060) },
      { icon: "archive", label: "Ticket closed", detail: "auto-close after 24h in Resolved", ts: ago(8000) },
    ],
  },
  {
    id: "t-11",
    ticketId: "TKT-2851",
    subject: "Rate card expired — please share revised lane rates",
    description:
      "Customer's existing rate card expired last week. They are requesting the revised Mumbai-Hyderabad and Mumbai-Chennai rates for the next quarter.",
    customer: "Sahyadri Logistics",
    customerCode: "CR-0089",
    priority: "Low",
    status: "New",
    channel: "Email",
    team: "Customer Success",
    assignee: "Unassigned",
    requester: "Meera Joshi",
    requesterEmail: "meera@sahyadrilogistics.in",
    category: "Documentation",
    createdAt: ago(8),
    updatedAt: ago(8),
    sla: slaFor(ago(8), "Low"),
    messages: [
      { id: "m1", author: "Meera Joshi", role: "Customer", text: "Our rate card has expired. Please share revised rates for Mumbai-Hyderabad and Mumbai-Chennai.", ts: ago(8) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Customer Success", ts: ago(8) },
    ],
  },
  {
    id: "t-12",
    ticketId: "TKT-2852",
    subject: "Damaged consignment claim — 3 cartons of electronics",
    description:
      "Customer reports 3 cartons of electronics (TRP-5519) arrived damaged. Estimated loss ₹85,000. Requesting insurance claim initiation and inspection.",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    priority: "Urgent",
    status: "In Progress",
    channel: "Phone",
    team: "Operations",
    assignee: "Anita Kulkarni",
    requester: "Vijay Patil",
    requesterEmail: "vijay.patil@reliancetc.in",
    category: "POD Dispute",
    createdAt: ago(70),
    updatedAt: ago(10),
    sla: slaFor(ago(70), "Urgent"),
    relatedRef: "TRP-5519",
    messages: [
      { id: "m1", author: "Vijay Patil", role: "Customer", text: "3 cartons of electronics damaged. Loss approx 85,000. Initiate insurance claim.", ts: ago(70) },
      { id: "m2", author: "Anita Kulkarni", role: "Agent", text: "On it. Surveyor being dispatched to the delivery site. Insurance claim form will be shared within 2 hours.", ts: ago(50), internal: true },
      { id: "m3", author: "Anita Kulkarni", role: "Agent", text: "Hi Vijay, surveyor on site. Claim form CLM-2241 initiated. Surveyor report expected by EOD.", ts: ago(15) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Operations · Urgent", ts: ago(70) },
      { icon: "user", label: "Assigned to Anita Kulkarni", detail: "Urgent SLA", ts: ago(68) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(50) },
      { icon: "package", label: "Surveyor dispatched", detail: "claim CLM-2241 initiated", ts: ago(15) },
    ],
  },
  {
    id: "t-13",
    ticketId: "TKT-2853",
    subject: "TDS certificate not received for Q1 FY25-26",
    description:
      "Customer has deducted TDS on freight payments for Q1 FY25-26 but has not received Form 16A. Requesting the certificate at the earliest for their tax filing.",
    customer: "Patel Freight Movers",
    customerCode: "CR-0156",
    priority: "Medium",
    status: "Waiting",
    channel: "Email",
    team: "Finance",
    assignee: "Anjali Mehta",
    requester: "Karan Patel",
    requesterEmail: "karan@patelfreight.in",
    category: "Documentation",
    createdAt: ago(1800),
    updatedAt: ago(1200),
    sla: slaFor(ago(1800), "Medium"),
    messages: [
      { id: "m1", author: "Karan Patel", role: "Customer", text: "Form 16A for Q1 not received. Please share urgently.", ts: ago(1800) },
      { id: "m2", author: "Anjali Mehta", role: "Agent", text: "Hi Karan, downloading from TRACES. Will email by tomorrow.", ts: ago(1500) },
      { id: "m3", author: "Karan Patel", role: "Customer", text: "Any update? Need it today.", ts: ago(1200) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Finance", ts: ago(1800) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(1500) },
      { icon: "clock", label: "Status → Waiting", detail: "TRACES sync in progress", ts: ago(1200) },
    ],
  },
  {
    id: "t-14",
    ticketId: "TKT-2854",
    subject: "Driver misbehaviour complaint — TRP-2207",
    description:
      "Customer's consignee reports that the driver was rude and refused to unload at the second floor. Customer wants the driver reprimanded and a written apology.",
    customer: "South India Textiles Ltd",
    customerCode: "CR-0333",
    priority: "Medium",
    status: "In Progress",
    channel: "Phone",
    team: "Customer Success",
    assignee: "Lakshmi Venkat",
    requester: "Sridhar R",
    requesterEmail: "sridhar@sitl.in",
    category: "Delivery Delay",
    createdAt: ago(420),
    updatedAt: ago(60),
    sla: slaFor(ago(420), "Medium"),
    relatedRef: "TRP-2207",
    messages: [
      { id: "m1", author: "Sridhar R", role: "Customer", text: "Driver refused to unload at 2nd floor. Was rude. Want an apology.", ts: ago(420) },
      { id: "m2", author: "Lakshmi Venkat", role: "Agent", text: "Hi Sridhar, I apologise on behalf of the company. Investigating with the driver and his supervisor. Written apology will be issued.", ts: ago(380) },
      { id: "m3", author: "Lakshmi Venkat", role: "Agent", text: "Driver has been counselled. Written apology drafted and shared with your team for review.", ts: ago(70) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Customer Success", ts: ago(420) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(380) },
      { icon: "user", label: "Driver counselled", detail: "supervisor review complete", ts: ago(80) },
    ],
  },
  {
    id: "t-15",
    ticketId: "TKT-2855",
    subject: "Vehicle breakdown on Chennai-Bangalore route — NH48 km 220",
    description:
      "Truck TN-22-EF-9911 (TRP-3315) has a tyre burst near Krishnagiri. Driver is safe. Need a replacement tyre and assistance.",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    priority: "High",
    status: "Resolved",
    channel: "Phone",
    team: "Fleet",
    assignee: "Imran Sheikh",
    requester: "Sunitha Rao",
    requesterEmail: "sunitha@deccanexpress.in",
    category: "Vehicle Breakdown",
    createdAt: ago(600),
    updatedAt: ago(420),
    resolvedAt: ago(420),
    sla: slaFor(ago(600), "High", ago(420)),
    relatedRef: "TRP-3315",
    messages: [
      { id: "m1", author: "Sunitha Rao", role: "Customer", text: "Tyre burst near Krishnagiri. Driver safe. Need replacement.", ts: ago(600) },
      { id: "m2", author: "Imran Sheikh", role: "Agent", text: "On it. Service van from Hosur hub. ETA 40 min.", ts: ago(580) },
      { id: "m3", author: "Imran Sheikh", role: "Agent", text: "Tyre replaced. Truck resumed. ETA Bangalore 22:00.", ts: ago(440) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Fleet", ts: ago(600) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(580) },
      { icon: "truck", label: "Tyre replaced", detail: "TRP-3315 resumed", ts: ago(440) },
      { icon: "check", label: "Status → Resolved", detail: "delivery on track", ts: ago(420) },
    ],
  },
  {
    id: "t-16",
    ticketId: "TKT-2856",
    subject: "POD not received for TRP-6610 — payment held",
    description:
      "Customer's accounts team is holding payment for TRP-6610 because the POD has not been submitted. Driver completed delivery 3 days ago but did not capture proof.",
    customer: "Asha Transport Co",
    customerCode: "CR-0118",
    priority: "Medium",
    status: "Assigned",
    channel: "Email",
    team: "Operations",
    assignee: "Deepa Nair",
    requester: "Nilesh Shah",
    requesterEmail: "nilesh@ashatransport.in",
    category: "POD Dispute",
    createdAt: ago(300),
    updatedAt: ago(180),
    sla: slaFor(ago(300), "Medium"),
    relatedRef: "TRP-6610",
    messages: [
      { id: "m1", author: "Nilesh Shah", role: "Customer", text: "POD missing for TRP-6610. Holding payment until submitted.", ts: ago(300) },
      { id: "m2", author: "Deepa Nair", role: "Agent", text: "Hi Nilesh, contacting the driver to capture POD. Will share within the day.", ts: ago(200) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Operations", ts: ago(300) },
      { icon: "user", label: "Assigned to Deepa Nair", detail: "team-lead assignment", ts: ago(298) },
    ],
  },
  {
    id: "t-17",
    ticketId: "TKT-2857",
    subject: "Invoice correction — freight amount mismatch INV-3022",
    description:
      "Invoice INV-3022 shows freight of ₹42,000 but the agreed rate was ₹38,500. Customer wants the invoice reissued with the correct amount.",
    customer: "Gujarat Agri Logistics",
    customerCode: "CR-0245",
    priority: "Medium",
    status: "Resolved",
    channel: "Portal",
    team: "Billing",
    assignee: "Suresh Iyer",
    requester: "Hardik Gandhi",
    requesterEmail: "hardik@gujaratagri.in",
    category: "Invoice Correction",
    createdAt: ago(2880),
    updatedAt: ago(2400),
    resolvedAt: ago(2400),
    sla: slaFor(ago(2880), "Medium", ago(2400)),
    relatedRef: "INV-3022",
    messages: [
      { id: "m1", author: "Hardik Gandhi", role: "Customer", text: "INV-3022 freight amount wrong. Reissue at 38,500.", ts: ago(2880) },
      { id: "m2", author: "Suresh Iyer", role: "Agent", text: "Verified. Reissuing as INV-3022-R1 with ₹38,500. Credit note for the original.", ts: ago(2700) },
      { id: "m3", author: "Suresh Iyer", role: "Agent", text: "Done. CN-7710 raised for the difference.", ts: ago(2400) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Portal · routed to Billing", ts: ago(2880) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(2700) },
      { icon: "check", label: "Status → Resolved", detail: "CN-7710 issued", ts: ago(2400) },
    ],
  },
  {
    id: "t-18",
    ticketId: "TKT-2858",
    subject: "Account access — multiple users unable to login since morning",
    description:
      "Multiple users at the customer's org are unable to log in. Browser shows a 502 error. Possible backend issue.",
    customer: "ABC Cold Chain",
    customerCode: "CR-0201",
    priority: "Urgent",
    status: "In Progress",
    channel: "Phone",
    team: "IT Support",
    assignee: "Imran Sheikh",
    requester: "Rashmi Deshpande",
    requesterEmail: "rashmi@abccoldchain.in",
    category: "Account Access",
    createdAt: ago(45),
    updatedAt: ago(5),
    sla: slaFor(ago(45), "Urgent"),
    messages: [
      { id: "m1", author: "Rashmi Deshpande", role: "Customer", text: "No one in our office can login. 502 error. Urgent.", ts: ago(45) },
      { id: "m2", author: "Imran Sheikh", role: "Agent", text: "On it. Checking the auth service.", ts: ago(35), internal: true },
      { id: "m3", author: "Imran Sheikh", role: "Agent", text: "Identified the issue — auth service memory spike. Restarting the cluster. ETA 10 minutes.", ts: ago(20) },
      { id: "m4", author: "Imran Sheikh", role: "Agent", text: "Service restored. Please retry.", ts: ago(5) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to IT Support · Urgent", ts: ago(45) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(35) },
      { icon: "package", label: "Root cause identified", detail: "auth service memory spike", ts: ago(20) },
      { icon: "check", label: "Service restored", detail: "cluster restarted", ts: ago(5) },
    ],
  },
  {
    id: "t-19",
    ticketId: "TKT-2859",
    subject: "e-Way bill expired mid-transit — TRP-7720",
    description:
      "e-Way bill for TRP-7720 expired at the Karnataka border checkpost. Vehicle held. Need extension or a fresh e-Way bill generated urgently.",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    priority: "Urgent",
    status: "In Progress",
    channel: "Phone",
    team: "Operations",
    assignee: "Deepa Nair",
    requester: "Sunitha Rao",
    requesterEmail: "sunitha@deccanexpress.in",
    category: "e-Way Bill",
    createdAt: ago(60),
    updatedAt: ago(8),
    sla: slaFor(ago(60), "Urgent"),
    relatedRef: "TRP-7720",
    messages: [
      { id: "m1", author: "Sunitha Rao", role: "Customer", text: "e-Way bill expired at Karnataka border. Vehicle held. Urgent extension needed.", ts: ago(60) },
      { id: "m2", author: "Deepa Nair", role: "Agent", text: "On it. Filing EXT-3 for extension via the portal.", ts: ago(45), internal: true },
      { id: "m3", author: "Deepa Nair", role: "Agent", text: "Extension filed. awaiting GSTN approval — usually 10 minutes.", ts: ago(20) },
      { id: "m4", author: "Deepa Nair", role: "Agent", text: "Extension approved. Vehicle released. Trip resumed.", ts: ago(8) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Operations · Urgent", ts: ago(60) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(45) },
      { icon: "package", label: "Extension filed", detail: "EXT-3 with GSTN", ts: ago(20) },
      { icon: "check", label: "Extension approved", detail: "TRP-7720 released", ts: ago(8) },
    ],
  },
  {
    id: "t-20",
    ticketId: "TKT-2860",
    subject: "Tracking shows wrong destination — TRP-8821",
    description:
      "Tracking dashboard for TRP-8821 shows destination as Kolkata instead of Cuttack. Customer's consignee is confused. Likely a master data error.",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    priority: "Low",
    status: "New",
    channel: "Portal",
    team: "IT Support",
    assignee: "Unassigned",
    requester: "Vijay Patil",
    requesterEmail: "vijay.patil@reliancetc.in",
    category: "Tracking Issue",
    createdAt: ago(12),
    updatedAt: ago(12),
    sla: slaFor(ago(12), "Low"),
    relatedRef: "TRP-8821",
    messages: [
      { id: "m1", author: "Vijay Patil", role: "Customer", text: "Tracking shows Kolkata instead of Cuttack for TRP-8821. Fix.", ts: ago(12) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Portal · routed to IT Support", ts: ago(12) },
    ],
  },
  {
    id: "t-21",
    ticketId: "TKT-2861",
    subject: "Delivery delay — TRP-9932 missed promised window",
    description:
      "Shipment to Indore promised in 36 hours but delivered in 54 hours. Customer is upset and asking for a service credit.",
    customer: "Maruti Roadways",
    customerCode: "CR-0142",
    priority: "Medium",
    status: "Waiting",
    channel: "Email",
    team: "Customer Success",
    assignee: "Lakshmi Venkat",
    requester: "Rohit Sawant",
    requesterEmail: "rohit.sawant@marutiroadways.in",
    category: "Delivery Delay",
    createdAt: ago(3600),
    updatedAt: ago(2400),
    sla: slaFor(ago(3600), "Medium"),
    relatedRef: "TRP-9932",
    messages: [
      { id: "m1", author: "Rohit Sawant", role: "Customer", text: "36h promised, 54h delivered. Service credit please.", ts: ago(3600) },
      { id: "m2", author: "Lakshmi Venkat", role: "Agent", text: "Hi Rohit, there was a 14-hour halt at the Dhule bypass due to a regulatory check. Reviewing for a service credit.", ts: ago(3300) },
      { id: "m3", author: "Rohit Sawant", role: "Customer", text: "Yes but you should have informed us. What's the credit?", ts: ago(2400) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Customer Success", ts: ago(3600) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(3300) },
      { icon: "clock", label: "Status → Waiting", detail: "approval pending for service credit", ts: ago(2400) },
    ],
  },
  {
    id: "t-22",
    ticketId: "TKT-2862",
    subject: "Driver license expiry reminder — Ramesh K",
    description:
      "Driver Ramesh K's license expires in 15 days. Customer wants confirmation that he will not be assigned to interstate trips after the expiry date.",
    customer: "Sahyadri Logistics",
    customerCode: "CR-0089",
    priority: "Low",
    status: "Closed",
    channel: "In-App",
    team: "Fleet",
    assignee: "Imran Sheikh",
    requester: "Meera Joshi",
    requesterEmail: "meera@sahyadrilogistics.in",
    category: "Documentation",
    createdAt: ago(7200),
    updatedAt: ago(6900),
    resolvedAt: ago(6900),
    sla: slaFor(ago(7200), "Low", ago(6900)),
    messages: [
      { id: "m1", author: "Meera Joshi", role: "Customer", text: "Ramesh K's license expiring in 15 days. Confirm no interstate trips after.", ts: ago(7200) },
      { id: "m2", author: "Imran Sheikh", role: "Agent", text: "Confirmed. License expiry tagged in the driver master. He'll be auto-blocked from interstate trips from expiry date.", ts: ago(6900) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via In-App · routed to Fleet", ts: ago(7200) },
      { icon: "check", label: "Status → Resolved", detail: "driver master updated", ts: ago(6900) },
      { icon: "archive", label: "Ticket closed", detail: "auto-close after 24h", ts: ago(6800) },
    ],
  },
  {
    id: "t-23",
    ticketId: "TKT-2863",
    subject: "Rate dispute on Bengaluru-Mysore lane — quoted vs billed",
    description:
      "Customer quoted ₹9,800 for a 5-tonne load on Bengaluru-Mysore but billed ₹11,200. The differential is due to a toll surcharge not communicated at quoting time.",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    priority: "Medium",
    status: "In Progress",
    channel: "Phone",
    team: "Billing",
    assignee: "Anjali Mehta",
    requester: "Sunitha Rao",
    requesterEmail: "sunitha@deccanexpress.in",
    category: "Rate Dispute",
    createdAt: ago(280),
    updatedAt: ago(40),
    sla: slaFor(ago(280), "Medium"),
    relatedRef: "INV-3099",
    messages: [
      { id: "m1", author: "Sunitha Rao", role: "Customer", text: "Bengaluru-Mysore billed 11,200 vs quoted 9,800. Reconcile.", ts: ago(280) },
      { id: "m2", author: "Anjali Mehta", role: "Agent", text: "Hi Sunitha, the differential is the Nice Road toll surcharge of ₹1,400 which is passed through. Will share the toll receipt.", ts: ago(220) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Billing", ts: ago(280) },
      { icon: "play", label: "Status → In Progress", detail: "first response sent", ts: ago(220) },
    ],
  },
  {
    id: "t-24",
    ticketId: "TKT-2864",
    subject: "Payment failure — NEFT for INV-3140 returned",
    description:
      "Customer's NEFT for INV-3140 was returned by their bank citing account name mismatch. Customer wants the correct beneficiary name confirmed to retry.",
    customer: "Patel Freight Movers",
    customerCode: "CR-0156",
    priority: "High",
    status: "Assigned",
    channel: "Email",
    team: "Finance",
    assignee: "Anjali Mehta",
    requester: "Karan Patel",
    requesterEmail: "karan@patelfreight.in",
    category: "Payment Failure",
    createdAt: ago(150),
    updatedAt: ago(40),
    sla: slaFor(ago(150), "High"),
    relatedRef: "INV-3140",
    messages: [
      { id: "m1", author: "Karan Patel", role: "Customer", text: "NEFT for INV-3140 returned. Beneficiary name mismatch. Please confirm correct name.", ts: ago(150) },
      { id: "m2", author: "Anjali Mehta", role: "Agent", text: "Hi Karan, the correct beneficiary name is 'REANZLY LOGISTICS PRIVATE LIMITED'. Sharing the cancelled NEFT confirmation by email.", ts: ago(80) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Email · routed to Finance", ts: ago(150) },
      { icon: "user", label: "Assigned to Anjali Mehta", detail: "finance on-call", ts: ago(148) },
    ],
  },
  {
    id: "t-25",
    ticketId: "TKT-2865",
    subject: "Vehicle breakdown on Kolkata-Asansol route — NH19 km 180",
    description:
      "Truck WB-23-GH-6655 (TRP-4410) reports engine overheating near Durgapur. Driver pulled over. Needs coolant top-up and a mechanic inspection.",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    priority: "High",
    status: "New",
    channel: "Phone",
    team: "Fleet",
    assignee: "Unassigned",
    requester: "Vijay Patil",
    requesterEmail: "vijay.patil@reliancetc.in",
    category: "Vehicle Breakdown",
    createdAt: ago(15),
    updatedAt: ago(15),
    sla: slaFor(ago(15), "High"),
    relatedRef: "TRP-4410",
    messages: [
      { id: "m1", author: "Vijay Patil", role: "Customer", text: "Engine overheating near Durgapur. Coolant + mechanic needed.", ts: ago(15) },
    ],
    activity: [
      { icon: "flag", label: "Ticket created", detail: "via Phone · routed to Fleet · High", ts: ago(15) },
    ],
  },
];

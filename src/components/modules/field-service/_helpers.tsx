"use client";

import type { ReactNode } from "react";

/* ============================================================
   Field Service module helpers - shared between list / drawer / detail.
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
export function toInputDateTime(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}
export function formatDuration(mins: number): string {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  if (abs < 60) return `${sign}${abs}m`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

// ===== Domain constants =====
export const TASK_TYPES = ["Repair", "Inspection", "Survey", "Installation", "Maintenance"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = [
  "Scheduled",
  "Assigned",
  "En Route",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TECHNICIANS = [
  "Rajesh Kumar",
  "Sunita Pillai",
  "Mohammed Faisal",
  "Geeta Sharma",
  "Arjun Reddy",
  "Prakash Nair",
  "Deepak Yadav",
  "Farhan Ahmed",
] as const;

// ===== Badge variant mappings (strict monochrome) =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function typeBadge(t: TaskType): { variant: BadgeVariant } {
  const map: Record<TaskType, BadgeVariant> = {
    Repair: "solid",
    Inspection: "outline",
    Survey: "muted",
    Installation: "outline",
    Maintenance: "muted",
  };
  return { variant: map[t] };
}

export function statusBadge(s: TaskStatus): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<TaskStatus, { variant: BadgeVariant; pulse?: boolean }> = {
    Scheduled: { variant: "muted" },
    Assigned: { variant: "outline" },
    "En Route": { variant: "solid", pulse: true },
    "In Progress": { variant: "solid", pulse: true },
    Completed: { variant: "muted" },
    Cancelled: { variant: "muted" },
  };
  return map[s] ?? { variant: "outline" };
}

export function priorityBadge(p: TaskPriority): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<TaskPriority, { variant: BadgeVariant; pulse?: boolean }> = {
    Urgent: { variant: "solid", pulse: true },
    High: { variant: "outline" },
    Medium: { variant: "muted" },
    Low: { variant: "muted" },
  };
  return map[p] ?? { variant: "muted" };
}

// ===== Status transitions =====
export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  Scheduled: ["Assigned", "Cancelled"],
  Assigned: ["En Route", "Cancelled"],
  "En Route": ["In Progress", "Completed", "Cancelled"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
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
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  ts?: string;
}

export interface PartUsed {
  id: string;
  name: string;
  partNo: string;
  qty: number;
  unitCost: number;
}

export interface TimeEntry {
  id: string;
  label: string;
  start: string;
  end?: string;
  minutes: number;
}

export interface FieldTask {
  id: string;
  taskId: string;
  title: string;
  type: TaskType;
  customer: string;
  customerCode: string;
  technician: string;
  scheduledAt: string;
  completedAt?: string;
  status: TaskStatus;
  priority: TaskPriority;
  location: string;
  locationLat?: number;
  locationLng?: number;
  vehicleRef?: string;
  contactName: string;
  contactPhone: string;
  description: string;
  checklist: ChecklistItem[];
  parts: PartUsed[];
  timeEntries: TimeEntry[];
  signatureCaptured: boolean;
  customerFeedback?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

// ===== Mock data: 20 field service tasks =====
const NOW = Date.now();
function ago(mins: number): string {
  return new Date(NOW - mins * 60000).toISOString();
}
function ahead(mins: number): string {
  return new Date(NOW + mins * 60000).toISOString();
}

export const FIELD_TASKS: FieldTask[] = [
  {
    id: "ft-1",
    taskId: "FS-4001",
    title: "Roadside clutch repair — MH-12-AB-7890",
    type: "Repair",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    technician: "Rajesh Kumar",
    scheduledAt: ago(75),
    completedAt: undefined,
    status: "In Progress",
    priority: "Urgent",
    location: "NH48, near Manor, Palghar, Maharashtra",
    locationLat: 19.8043,
    locationLng: 72.9265,
    vehicleRef: "MH-12-AB-7890",
    contactName: "Vijay Patil",
    contactPhone: "+91-98200-11234",
    description: "Clutch slave cylinder failure. Vehicle stranded on NH48 near Manor. Replace slave cylinder and inspect clutch plate.",
    checklist: [
      { id: "c1", label: "Arrive at vehicle location", done: true, ts: ago(60) },
      { id: "c2", label: "Diagnose clutch system", done: true, ts: ago(50) },
      { id: "c3", label: "Source replacement slave cylinder", done: true, ts: ago(35) },
      { id: "c4", label: "Replace slave cylinder", done: false },
      { id: "c5", label: "Bleed clutch line", done: false },
      { id: "c6", label: "Test clutch engagement", done: false },
      { id: "c7", label: "Handover to driver", done: false },
    ],
    parts: [
      { id: "p1", name: "Clutch slave cylinder", partNo: "CLT-SC-5512", qty: 1, unitCost: 2850 },
      { id: "p2", name: "Brake fluid (DOT 4) — 500ml", partNo: "BRK-FL-D4-500", qty: 1, unitCost: 320 },
    ],
    timeEntries: [
      { id: "t1", label: "Travel to site", start: ago(80), end: ago(60), minutes: 20 },
      { id: "t2", label: "Diagnosis", start: ago(60), end: ago(50), minutes: 10 },
      { id: "t3", label: "Parts sourcing", start: ago(50), end: ago(35), minutes: 15 },
      { id: "t4", label: "Repair in progress", start: ago(35), minutes: 35 },
    ],
    signatureCaptured: false,
    createdAt: ago(95),
    updatedAt: ago(5),
  },
  {
    id: "ft-2",
    taskId: "FS-4002",
    title: "On-site vehicle inspection — KA-01-CD-4521",
    type: "Inspection",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    technician: "Sunita Pillai",
    scheduledAt: ago(180),
    completedAt: ago(120),
    status: "Completed",
    priority: "Medium",
    location: "Whitefield depot, Bengaluru, Karnataka",
    locationLat: 12.9698,
    locationLng: 77.7500,
    vehicleRef: "KA-01-CD-4521",
    contactName: "Sunitha Rao",
    contactPhone: "+91-99020-55667",
    description: "Quarterly safety inspection for 32-feet multi-axle truck. Check brakes, tyres, lights, suspension, and emission compliance.",
    checklist: [
      { id: "c1", label: "Verify RC + insurance + PUCC", done: true, ts: ago(175) },
      { id: "c2", label: "Inspect brake system", done: true, ts: ago(160) },
      { id: "c3", label: "Check tyre tread depth (min 1.6mm)", done: true, ts: ago(150) },
      { id: "c4", label: "Test all lights + indicators", done: true, ts: ago(140) },
      { id: "c5", label: "Inspect suspension + leaf springs", done: true, ts: ago(135) },
      { id: "c6", label: "Emission smoke test", done: true, ts: ago(125) },
      { id: "c7", label: "Submit inspection report", done: true, ts: ago(120) },
    ],
    parts: [],
    timeEntries: [
      { id: "t1", label: "Pre-inspection briefing", start: ago(180), end: ago(170), minutes: 10 },
      { id: "t2", label: "Inspection", start: ago(170), end: ago(125), minutes: 45 },
      { id: "t3", label: "Report + sign-off", start: ago(125), end: ago(120), minutes: 5 },
    ],
    signatureCaptured: true,
    customerFeedback: "Thorough inspection. Appreciate the detailed report.",
    rating: 5,
    createdAt: ago(240),
    updatedAt: ago(120),
  },
  {
    id: "ft-3",
    taskId: "FS-4003",
    title: "Vehicle survey — pre-purchase condition assessment",
    type: "Survey",
    customer: "Maruti Roadways",
    customerCode: "CR-0142",
    technician: "Mohammed Faisal",
    scheduledAt: ahead(60),
    completedAt: undefined,
    status: "Scheduled",
    priority: "Medium",
    location: "Used vehicle yard, Nashik Road, Maharashtra",
    contactName: "Rohit Sawant",
    contactPhone: "+91-98220-33445",
    description: "Pre-purchase condition survey of a 2019 TATA LPT 3718. Customer is buying from a third party and needs an independent assessment.",
    checklist: [
      { id: "c1", label: "Photograph vehicle (exterior 360°)", done: false },
      { id: "c2", label: "Engine bay inspection", done: false },
      { id: "c3", label: "Chassis + frame check", done: false },
      { id: "c4", label: "Odometer reading", done: false },
      { id: "c5", label: "Service history review", done: false },
      { id: "c6", label: "Tyre condition assessment", done: false },
      { id: "c7", label: "Compile survey report", done: false },
    ],
    parts: [],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(600),
    updatedAt: ago(600),
  },
  {
    id: "ft-4",
    taskId: "FS-4004",
    title: "GPS tracker installation — TN-22-EF-9911",
    type: "Installation",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    technician: "Geeta Sharma",
    scheduledAt: ago(360),
    completedAt: ago(280),
    status: "Completed",
    priority: "High",
    location: "Hosur hub, Tamil Nadu",
    vehicleRef: "TN-22-EF-9911",
    contactName: "Sunitha Rao",
    contactPhone: "+91-99020-55667",
    description: "Install dual-sim GPS tracker with ignition cut-off relay. Configure geofence for Tamil Nadu + Karnataka.",
    checklist: [
      { id: "c1", label: "Mount tracker unit under dashboard", done: true, ts: ago(340) },
      { id: "c2", label: "Wire power + ignition cut-off", done: true, ts: ago(320) },
      { id: "c3", label: "Install GPS + GSM antennas", done: true, ts: ago(310) },
      { id: "c4", label: "Configure APN + heartbeat", done: true, ts: ago(300) },
      { id: "c5", label: "Verify live tracking", done: true, ts: ago(290) },
      { id: "c6", label: "Set geofence TN+KA", done: true, ts: ago(285) },
      { id: "c7", label: "Handover + driver briefing", done: true, ts: ago(280) },
    ],
    parts: [
      { id: "p1", name: "GPS tracker unit (dual-sim)", partNo: "GPS-DS-2200", qty: 1, unitCost: 4500 },
      { id: "p2", name: "Ignition cut-off relay", partNo: "REL-IC-220", qty: 1, unitCost: 850 },
      { id: "p3", name: "Wiring harness", partNo: "WRH-GPS-12V", qty: 1, unitCost: 420 },
    ],
    timeEntries: [
      { id: "t1", label: "Installation", start: ago(360), end: ago(290), minutes: 70 },
      { id: "t2", label: "Configuration + testing", start: ago(290), end: ago(280), minutes: 10 },
    ],
    signatureCaptured: true,
    customerFeedback: "Quick and clean install.",
    rating: 4,
    createdAt: ago(420),
    updatedAt: ago(280),
  },
  {
    id: "ft-5",
    taskId: "FS-4005",
    title: "Breakdown support — engine overheating WB-23-GH-6655",
    type: "Repair",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    technician: "Arjun Reddy",
    scheduledAt: ago(15),
    completedAt: undefined,
    status: "Assigned",
    priority: "Urgent",
    location: "NH19, near Durgapur, West Bengal",
    locationLat: 23.4848,
    locationLng: 87.3119,
    vehicleRef: "WB-23-GH-6655",
    contactName: "Vijay Patil",
    contactPhone: "+91-98200-11234",
    description: "Engine overheating reported. Suspect coolant leak or thermostat failure. Carry coolant + thermostat assembly.",
    checklist: [
      { id: "c1", label: "Arrive at vehicle location", done: false },
      { id: "c2", label: "Coolant level check", done: false },
      { id: "c3", label: "Thermostat inspection", done: false },
      { id: "c4", label: "Radiator pressure test", done: false },
      { id: "c5", label: "Replace faulty parts", done: false },
      { id: "c6", label: "Top-up coolant", done: false },
      { id: "c7", label: "Engine idle test", done: false },
    ],
    parts: [
      { id: "p1", name: "Coolant (green) — 5L", partNo: "CLT-GR-5L", qty: 2, unitCost: 680 },
      { id: "p2", name: "Thermostat assembly", partNo: "THR-ASSY-5510", qty: 1, unitCost: 1850 },
    ],
    timeEntries: [
      { id: "t1", label: "Travel to site", start: ago(15), minutes: 15 },
    ],
    signatureCaptured: false,
    createdAt: ago(20),
    updatedAt: ago(15),
  },
  {
    id: "ft-6",
    taskId: "FS-4006",
    title: "Preventive maintenance — GJ-01-KL-3344",
    type: "Maintenance",
    customer: "Gujarat Agri Logistics",
    customerCode: "CR-0245",
    technician: "Prakash Nair",
    scheduledAt: ahead(120),
    completedAt: undefined,
    status: "Scheduled",
    priority: "Medium",
    location: "Sanand depot, Ahmedabad, Gujarat",
    vehicleRef: "GJ-01-KL-3344",
    contactName: "Hardik Gandhi",
    contactPhone: "+91-98250-77889",
    description: "20,000 km scheduled service. Engine oil + filter, fuel filter, air filter, gearbox oil, greasing all points.",
    checklist: [
      { id: "c1", label: "Drain engine oil", done: false },
      { id: "c2", label: "Replace oil filter", done: false },
      { id: "c3", label: "Replace fuel filter", done: false },
      { id: "c4", label: "Replace air filter", done: false },
      { id: "c5", label: "Change gearbox oil", done: false },
      { id: "c6", label: "Grease all nipples", done: false },
      { id: "c7", label: "Final test drive", done: false },
    ],
    parts: [
      { id: "p1", name: "Engine oil 15W-40 — 12L", partNo: "OIL-15W40-12L", qty: 1, unitCost: 3600 },
      { id: "p2", name: "Oil filter", partNo: "FLT-OIL-2210", qty: 1, unitCost: 480 },
      { id: "p3", name: "Fuel filter", partNo: "FLT-FL-3300", qty: 1, unitCost: 720 },
      { id: "p4", name: "Air filter", partNo: "FLT-AIR-4400", qty: 1, unitCost: 950 },
      { id: "p5", name: "Gearbox oil — 8L", partNo: "OIL-GB-8L", qty: 1, unitCost: 2400 },
    ],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(720),
    updatedAt: ago(720),
  },
  {
    id: "ft-7",
    taskId: "FS-4007",
    title: "Body repair survey — accident damage MH-14-PQ-8899",
    type: "Survey",
    customer: "Asha Transport Co",
    customerCode: "CR-0118",
    technician: "Deepak Yadav",
    scheduledAt: ago(540),
    completedAt: ago(420),
    status: "Completed",
    priority: "High",
    location: "Workshop, Pune, Maharashtra",
    vehicleRef: "MH-14-PQ-8899",
    contactName: "Nilesh Shah",
    contactPhone: "+91-98220-88990",
    description: "Survey accident damage to front cabin + bumper. Customer reported a low-speed collision at a signal. Assess repair scope.",
    checklist: [
      { id: "c1", label: "Photograph damage (8 angles)", done: true, ts: ago(520) },
      { id: "c2", label: "Inspect chassis for impact", done: true, ts: ago(500) },
      { id: "c3", label: "Assess cabin structure", done: true, ts: ago(480) },
      { id: "c4", label: "Engine mount check", done: true, ts: ago(460) },
      { id: "c5", label: "Compile repair estimate", done: true, ts: ago(430) },
      { id: "c6", label: "Submit survey report", done: true, ts: ago(420) },
    ],
    parts: [],
    timeEntries: [
      { id: "t1", label: "Survey", start: ago(540), end: ago(430), minutes: 110 },
      { id: "t2", label: "Report compilation", start: ago(430), end: ago(420), minutes: 10 },
    ],
    signatureCaptured: true,
    customerFeedback: "Detailed report. Will proceed with repair quote.",
    rating: 5,
    createdAt: ago(600),
    updatedAt: ago(420),
  },
  {
    id: "ft-8",
    taskId: "FS-4008",
    title: "Tyre replacement + alignment — KA-05-RS-2211",
    type: "Repair",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    technician: "Farhan Ahmed",
    scheduledAt: ago(90),
    completedAt: undefined,
    status: "En Route",
    priority: "Medium",
    location: "Bommasandra industrial area, Bengaluru",
    vehicleRef: "KA-05-RS-2211",
    contactName: "Sunitha Rao",
    contactPhone: "+91-99020-55667",
    description: "Replace 2 worn front tyres + wheel alignment. Tyres below 1.6mm tread depth.",
    checklist: [
      { id: "c1", label: "Arrive at vehicle location", done: true, ts: ago(80) },
      { id: "c2", label: "Remove front wheels", done: true, ts: ago(70) },
      { id: "c3", label: "Mount new tyres", done: false },
      { id: "c4", label: "Balance wheels", done: false },
      { id: "c5", label: "Wheel alignment", done: false },
      { id: "c6", label: "Torque wheel nuts", done: false },
      { id: "c7", label: "Test drive", done: false },
    ],
    parts: [
      { id: "p1", name: "Front tyre 295/80R22.5", partNo: "TYR-295-80-225", qty: 2, unitCost: 24500 },
    ],
    timeEntries: [
      { id: "t1", label: "Travel to site", start: ago(95), end: ago(80), minutes: 15 },
      { id: "t2", label: "Wheel removal", start: ago(80), end: ago(70), minutes: 10 },
      { id: "t3", label: "Tyre work in progress", start: ago(70), minutes: 20 },
    ],
    signatureCaptured: false,
    createdAt: ago(110),
    updatedAt: ago(50),
  },
  {
    id: "ft-9",
    taskId: "FS-4009",
    title: "AC system repair — TN-07-UV-4455",
    type: "Repair",
    customer: "South India Textiles Ltd",
    customerCode: "CR-0333",
    technician: "Rajesh Kumar",
    scheduledAt: ahead(30),
    completedAt: undefined,
    status: "Scheduled",
    priority: "Low",
    location: "Customer depot, Coimbatore, Tamil Nadu",
    vehicleRef: "TN-07-UV-4455",
    contactName: "Sridhar R",
    contactPhone: "+91-94430-12233",
    description: "AC not cooling. Suspect refrigerant leak + compressor clutch issue.",
    checklist: [
      { id: "c1", label: "Pressure test AC system", done: false },
      { id: "c2", label: "Identify leak point", done: false },
      { id: "c3", label: "Repair/replace faulty component", done: false },
      { id: "c4", label: "Recharge refrigerant", done: false },
      { id: "c5", label: "Test cooling performance", done: false },
    ],
    parts: [
      { id: "p1", name: "Refrigerant R134a — 1kg", partNo: "REF-R134A-1KG", qty: 1, unitCost: 1200 },
    ],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(300),
    updatedAt: ago(300),
  },
  {
    id: "ft-10",
    taskId: "FS-4010",
    title: "On-site battery replacement — MH-12-AB-1234",
    type: "Repair",
    customer: "Maruti Roadways",
    customerCode: "CR-0142",
    technician: "Geeta Sharma",
    scheduledAt: ago(1200),
    completedAt: ago(1140),
    status: "Completed",
    priority: "Medium",
    location: "Bhiwandi depot, Maharashtra",
    vehicleRef: "MH-12-AB-1234",
    contactName: "Rohit Sawant",
    contactPhone: "+91-98220-33445",
    description: "Battery not holding charge. Replace both batteries + clean terminals.",
    checklist: [
      { id: "c1", label: "Disconnect old batteries", done: true, ts: ago(1190) },
      { id: "c2", label: "Clean terminals", done: true, ts: ago(1180) },
      { id: "c3", label: "Install new batteries", done: true, ts: ago(1170) },
      { id: "c4", label: "Test cranking voltage", done: true, ts: ago(1150) },
      { id: "c5", label: "Verify charging system", done: true, ts: ago(1145) },
      { id: "c6", label: "Handover", done: true, ts: ago(1140) },
    ],
    parts: [
      { id: "p1", name: "Battery 12V 180Ah", partNo: "BAT-12V-180AH", qty: 2, unitCost: 12500 },
    ],
    timeEntries: [
      { id: "t1", label: "Replacement", start: ago(1200), end: ago(1145), minutes: 55 },
      { id: "t2", label: "Testing + handover", start: ago(1145), end: ago(1140), minutes: 5 },
    ],
    signatureCaptured: true,
    customerFeedback: "Quick turnaround.",
    rating: 4,
    createdAt: ago(1260),
    updatedAt: ago(1140),
  },
  {
    id: "ft-11",
    taskId: "FS-4011",
    title: "Fleet inspection drive — 6 vehicles at Hosur hub",
    type: "Inspection",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    technician: "Sunita Pillai",
    scheduledAt: ahead(180),
    completedAt: undefined,
    status: "Scheduled",
    priority: "Medium",
    location: "Hosur hub, Tamil Nadu",
    contactName: "Sunitha Rao",
    contactPhone: "+91-99020-55667",
    description: "Fleet-wide quarterly inspection. 6 vehicles: 4 trucks + 2 pickups. Check safety compliance + record defects.",
    checklist: [
      { id: "c1", label: "Verify RC + insurance for all 6", done: false },
      { id: "c2", label: "Brake test — each vehicle", done: false },
      { id: "c3", label: "Tyre audit", done: false },
      { id: "c4", label: "Light + electrical check", done: false },
      { id: "c5", label: "Suspension check", done: false },
      { id: "c6", label: "Compile defect register", done: false },
    ],
    parts: [],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(1440),
    updatedAt: ago(1440),
  },
  {
    id: "ft-12",
    taskId: "FS-4012",
    title: "Fastag device installation — DL-1L-AB-7788",
    type: "Installation",
    customer: "Patel Freight Movers",
    customerCode: "CR-0156",
    technician: "Mohammed Faisal",
    scheduledAt: ago(2880),
    completedAt: ago(2820),
    status: "Completed",
    priority: "Low",
    location: "Customer office, Delhi",
    vehicleRef: "DL-1L-AB-7788",
    contactName: "Karan Patel",
    contactPhone: "+91-98100-22334",
    description: "Install FASTag with prepaid wallet linkage. Configure auto-recharge threshold at ₹500.",
    checklist: [
      { id: "c1", label: "Mount FASTag on windshield", done: true, ts: ago(2870) },
      { id: "c2", label: "Link to prepaid wallet", done: true, ts: ago(2860) },
      { id: "c3", label: "Configure auto-recharge", done: true, ts: ago(2850) },
      { id: "c4", label: "Test at plaza", done: true, ts: ago(2830) },
      { id: "c5", label: "Handover", done: true, ts: ago(2820) },
    ],
    parts: [
      { id: "p1", name: "FASTag device", partNo: "FTG-VC-100", qty: 1, unitCost: 200 },
    ],
    timeEntries: [
      { id: "t1", label: "Installation + config", start: ago(2880), end: ago(2830), minutes: 50 },
      { id: "t2", label: "Test + handover", start: ago(2830), end: ago(2820), minutes: 10 },
    ],
    signatureCaptured: true,
    customerFeedback: "All good.",
    rating: 4,
    createdAt: ago(2940),
    updatedAt: ago(2820),
  },
  {
    id: "ft-13",
    taskId: "FS-4013",
    title: "Brake system overhaul — GJ-01-KL-5566",
    type: "Maintenance",
    customer: "Gujarat Agri Logistics",
    customerCode: "CR-0245",
    technician: "Prakash Nair",
    scheduledAt: ago(220),
    completedAt: undefined,
    status: "In Progress",
    priority: "High",
    location: "Customer workshop, Ahmedabad, Gujarat",
    vehicleRef: "GJ-01-KL-5566",
    contactName: "Hardik Gandhi",
    contactPhone: "+91-98250-77889",
    description: "Front brake pads + caliper overhaul. Customer reports spongy brake pedal and reduced stopping power.",
    checklist: [
      { id: "c1", label: "Remove front wheels", done: true, ts: ago(210) },
      { id: "c2", label: "Inspect brake pads", done: true, ts: ago(200) },
      { id: "c3", label: "Replace pads", done: true, ts: ago(180) },
      { id: "c4", label: "Overhaul calipers", done: false },
      { id: "c5", label: "Bleed brake lines", done: false },
      { id: "c6", label: "Test brake pressure", done: false },
    ],
    parts: [
      { id: "p1", name: "Brake pad set (front)", partNo: "BRK-PAD-F-2210", qty: 1, unitCost: 3200 },
      { id: "p2", name: "Brake fluid DOT 4 — 1L", partNo: "BRK-FL-D4-1L", qty: 1, unitCost: 540 },
      { id: "p3", name: "Caliper seal kit", partNo: "CAL-SK-3300", qty: 2, unitCost: 680 },
    ],
    timeEntries: [
      { id: "t1", label: "Disassembly", start: ago(220), end: ago(190), minutes: 30 },
      { id: "t2", label: "Parts replacement", start: ago(190), end: ago(150), minutes: 40 },
      { id: "t3", label: "Caliper overhaul", start: ago(150), minutes: 70 },
    ],
    signatureCaptured: false,
    createdAt: ago(280),
    updatedAt: ago(10),
  },
  {
    id: "ft-14",
    taskId: "FS-4014",
    title: "Customer site survey — new cold storage setup",
    type: "Survey",
    customer: "ABC Cold Chain",
    customerCode: "CR-0201",
    technician: "Deepak Yadav",
    scheduledAt: ahead(240),
    completedAt: undefined,
    status: "Scheduled",
    priority: "Medium",
    location: "Customer warehouse, Turbhe, Navi Mumbai",
    contactName: "Rashmi Deshpande",
    contactPhone: "+91-98700-22110",
    description: "Survey customer's new cold storage facility for reefer vehicle docking compatibility. Measure dock heights + ramp angles.",
    checklist: [
      { id: "c1", label: "Measure dock heights (6 docks)", done: false },
      { id: "c2", label: "Inspect ramp angles", done: false },
      { id: "c3", label: "Check power supply for reefer plug-in", done: false },
      { id: "c4", label: "Photograph facility", done: false },
      { id: "c5", label: "Compile dock compatibility report", done: false },
    ],
    parts: [],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(360),
    updatedAt: ago(360),
  },
  {
    id: "ft-15",
    taskId: "FS-4015",
    title: "Reefer unit service — TN-22-EF-9911",
    type: "Maintenance",
    customer: "Deccan Express Logistics",
    customerCode: "CR-0177",
    technician: "Farhan Ahmed",
    scheduledAt: ago(4320),
    completedAt: ago(4200),
    status: "Completed",
    priority: "Medium",
    location: "Hosur hub, Tamil Nadu",
    vehicleRef: "TN-22-EF-9911",
    contactName: "Sunitha Rao",
    contactPhone: "+91-99020-55667",
    description: "Quarterly reefer maintenance. Compressor oil + filter, defrost cycle check, temperature calibration.",
    checklist: [
      { id: "c1", label: "Compressor oil change", done: true, ts: ago(4300) },
      { id: "c2", label: "Filter replacement", done: true, ts: ago(4280) },
      { id: "c3", label: "Defrost cycle check", done: true, ts: ago(4260) },
      { id: "c4", label: "Temperature calibration", done: true, ts: ago(4240) },
      { id: "c5", label: "Door seal inspection", done: true, ts: ago(4220) },
      { id: "c6", label: "Performance test", done: true, ts: ago(4200) },
    ],
    parts: [
      { id: "p1", name: "Compressor oil — 4L", partNo: "OIL-CMP-4L", qty: 1, unitCost: 2200 },
      { id: "p2", name: "Reefer filter", partNo: "FLT-RF-1100", qty: 1, unitCost: 850 },
    ],
    timeEntries: [
      { id: "t1", label: "Service", start: ago(4320), end: ago(4210), minutes: 110 },
      { id: "t2", label: "Test + handover", start: ago(4210), end: ago(4200), minutes: 10 },
    ],
    signatureCaptured: true,
    customerFeedback: "Maintained temperature stability post-service.",
    rating: 5,
    createdAt: ago(4380),
    updatedAt: ago(4200),
  },
  {
    id: "ft-16",
    taskId: "FS-4016",
    title: "Vehicle wrap installation — MH-01-XY-1100",
    type: "Installation",
    customer: "Reliance Transport Corp",
    customerCode: "CR-0210",
    technician: "Geeta Sharma",
    scheduledAt: ahead(360),
    completedAt: undefined,
    status: "Scheduled",
    priority: "Low",
    location: "Customer yard, Bhiwandi, Maharashtra",
    vehicleRef: "MH-01-XY-1100",
    contactName: "Vijay Patil",
    contactPhone: "+91-98200-11234",
    description: "Install customer branding vinyl wrap on cabin + cargo box. 4-hour job.",
    checklist: [
      { id: "c1", label: "Clean + prep surface", done: false },
      { id: "c2", label: "Apply cabin wrap", done: false },
      { id: "c3", label: "Apply cargo box wrap", done: false },
      { id: "c4", label: "Trim + finish edges", done: false },
      { id: "c5", label: "Quality check", done: false },
    ],
    parts: [
      { id: "p1", name: "Vinyl wrap sheet (3M)", partNo: "WRP-VN-3M-50", qty: 1, unitCost: 8500 },
    ],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(540),
    updatedAt: ago(540),
  },
  {
    id: "ft-17",
    taskId: "FS-4017",
    title: "Speed limiter calibration — KA-05-RS-9988",
    type: "Maintenance",
    customer: "South India Textiles Ltd",
    customerCode: "CR-0333",
    technician: "Arjun Reddy",
    scheduledAt: ago(2880),
    completedAt: ago(2820),
    status: "Completed",
    priority: "Medium",
    location: "Customer depot, Coimbatore, Tamil Nadu",
    vehicleRef: "KA-05-RS-9988",
    contactName: "Sridhar R",
    contactPhone: "+91-94430-12233",
    description: "Calibrate speed limiter to 80 km/h as per regulatory requirement. Annual recertification.",
    checklist: [
      { id: "c1", label: "Connect calibration tool", done: true, ts: ago(2870) },
      { id: "c2", label: "Set speed limit to 80 km/h", done: true, ts: ago(2860) },
      { id: "c3", label: "Road test verification", done: true, ts: ago(2840) },
      { id: "c4", label: "Issue compliance certificate", done: true, ts: ago(2820) },
    ],
    parts: [],
    timeEntries: [
      { id: "t1", label: "Calibration", start: ago(2880), end: ago(2840), minutes: 40 },
      { id: "t2", label: "Test + cert", start: ago(2840), end: ago(2820), minutes: 20 },
    ],
    signatureCaptured: true,
    customerFeedback: "Certificate received on time.",
    rating: 4,
    createdAt: ago(2940),
    updatedAt: ago(2820),
  },
  {
    id: "ft-18",
    taskId: "FS-4018",
    title: "Annual safety inspection — 12 vehicles",
    type: "Inspection",
    customer: "Maruti Roadways",
    customerCode: "CR-0142",
    technician: "Sunita Pillai",
    scheduledAt: ahead(600),
    completedAt: undefined,
    status: "Scheduled",
    priority: "High",
    location: "Customer depot, Nashik, Maharashtra",
    contactName: "Rohit Sawant",
    contactPhone: "+91-98220-33445",
    description: "Annual safety inspection across 12 vehicles. Check fitness, PUCC, insurance, brake efficiency, and emission compliance.",
    checklist: [
      { id: "c1", label: "Verify docs for 12 vehicles", done: false },
      { id: "c2", label: "Brake efficiency test", done: false },
      { id: "c3", label: "Emission test", done: false },
      { id: "c4", label: "Tyre audit", done: false },
      { id: "c5", label: "Compile annual fitness report", done: false },
    ],
    parts: [],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(720),
    updatedAt: ago(720),
  },
  {
    id: "ft-19",
    taskId: "FS-4019",
    title: "Clutch replacement — GJ-01-KL-7788",
    type: "Repair",
    customer: "Gujarat Agri Logistics",
    customerCode: "CR-0245",
    technician: "Rajesh Kumar",
    scheduledAt: ago(1500),
    completedAt: ago(1380),
    status: "Completed",
    priority: "High",
    location: "Customer workshop, Ahmedabad, Gujarat",
    vehicleRef: "GJ-01-KL-7788",
    contactName: "Hardik Gandhi",
    contactPhone: "+91-98250-77889",
    description: "Clutch plate + pressure plate replacement. Customer reported slipping clutch under load.",
    checklist: [
      { id: "c1", label: "Remove gearbox", done: true, ts: ago(1480) },
      { id: "c2", label: "Inspect clutch assembly", done: true, ts: ago(1450) },
      { id: "c3", label: "Replace clutch + pressure plate", done: true, ts: ago(1420) },
      { id: "c4", label: "Inspect flywheel", done: true, ts: ago(1410) },
      { id: "c5", label: "Reinstall gearbox", done: true, ts: ago(1400) },
      { id: "c6", label: "Bleed clutch + test", done: true, ts: ago(1380) },
    ],
    parts: [
      { id: "p1", name: "Clutch plate", partNo: "CLT-PL-3300", qty: 1, unitCost: 8500 },
      { id: "p2", name: "Pressure plate assembly", partNo: "CLT-PP-3300", qty: 1, unitCost: 9200 },
      { id: "p3", name: "Release bearing", partNo: "BRG-RL-2210", qty: 1, unitCost: 1450 },
    ],
    timeEntries: [
      { id: "t1", label: "Disassembly", start: ago(1500), end: ago(1420), minutes: 80 },
      { id: "t2", label: "Parts replacement", start: ago(1420), end: ago(1390), minutes: 30 },
      { id: "t3", label: "Reassembly + test", start: ago(1390), end: ago(1380), minutes: 10 },
    ],
    signatureCaptured: true,
    customerFeedback: "Smooth operation post-repair.",
    rating: 5,
    createdAt: ago(1560),
    updatedAt: ago(1380),
  },
  {
    id: "ft-20",
    taskId: "FS-4020",
    title: "Customer cancelled — survey deferred",
    type: "Survey",
    customer: "Sahyadri Logistics",
    customerCode: "CR-0089",
    technician: "Mohammed Faisal",
    scheduledAt: ago(720),
    completedAt: undefined,
    status: "Cancelled",
    priority: "Low",
    location: "Customer office, Pune, Maharashtra",
    contactName: "Meera Joshi",
    contactPhone: "+91-98220-66554",
    description: "Customer requested a fleet survey but deferred by 2 weeks due to internal scheduling. Will reschedule.",
    checklist: [],
    parts: [],
    timeEntries: [],
    signatureCaptured: false,
    createdAt: ago(780),
    updatedAt: ago(720),
  },
];

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
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

// ===== Knowledge article domain =====
export type ArticleCategory =
  | "SOPs"
  | "Policies"
  | "Lane Playbooks"
  | "Safety"
  | "Compliance"
  | "Troubleshooting"
  | "Onboarding";

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "SOPs",
  "Policies",
  "Lane Playbooks",
  "Safety",
  "Compliance",
  "Troubleshooting",
  "Onboarding",
];

export type ArticleStatus = "Draft" | "Published" | "Archived" | "In Review";

export const ARTICLE_STATUSES: ArticleStatus[] = [
  "Draft",
  "Published",
  "Archived",
  "In Review",
];

export type ArticleVisibility = "Public" | "Internal" | "Restricted";

export const ARTICLE_VISIBILITIES: ArticleVisibility[] = [
  "Public",
  "Internal",
  "Restricted",
];

// ===== Content block (structured JSX source) =====
export type ContentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "steps"; items: { title: string; detail: string }[] }
  | { type: "callout"; variant: "info" | "warning" | "success"; title: string; body: string }
  | { type: "code"; language: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] };

// ===== Attachment =====
export interface ArticleAttachment {
  id: string;
  name: string;
  type: "PDF" | "DOCX" | "XLSX" | "PNG" | "MP4" | "Link";
  size: string;
  uploadedBy: string;
  uploadedOn: string;
  url?: string;
}

// ===== Related article =====
export interface RelatedArticle {
  id: string;
  title: string;
  category: ArticleCategory;
  reason: string;
}

// ===== Feedback =====
export interface ArticleFeedback {
  id: string;
  helpful: boolean;
  author: string;
  comment?: string;
  ts: string;
}

// ===== Revision =====
export interface ArticleRevision {
  id: string;
  version: string;
  ts: string;
  author: string;
  summary: string;
}

export interface KnowledgeArticle {
  id: string;
  slug: string;
  title: string;
  category: ArticleCategory;
  tags: string[];
  summary: string;
  author: string;
  authorRole: string;
  publishedOn: string;
  updatedOn: string;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  status: ArticleStatus;
  visibility: ArticleVisibility;
  readingTimeMin: number;
  content: ContentBlock[];
  attachments: ArticleAttachment[];
  related: RelatedArticle[];
  feedback: ArticleFeedback[];
  revisions: ArticleRevision[];
}

// ===== Mock generation helpers =====
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const AUTHORS = [
  { name: "Anand Kulkarni", role: "Head of Operations" },
  { name: "Pooja Deshpande", role: "Safety & Compliance Lead" },
  { name: "Sunitha Nair", role: "HR Manager" },
  { name: "Imran Qureshi", role: "Workshop Supervisor" },
  { name: "Vinay Hegde", role: "Fleet Manager" },
  { name: "Shreya Rao", role: "Quality Assurance" },
  { name: "Karan Malhotra", role: "Driver Onboarding" },
];

const TAGS = [
  "ftl", "ltl", "tyre", "brake", "fastag", "e-way-bill", "pod", "lr",
  "driver-fatigue", "incident", "safety", "gst", "rc", "fitness", "permit",
  "pre-trip", "post-trip", "hazardous", "cold-chain", "warehouse",
  "tally", "gstn", "audit", "vehicle-360", "route", "toll", "fuel",
];

// ===== Title + summary + tag templates per category =====
interface ArticleTemplate {
  title: string;
  summary: string;
  tags: string[];
  content: ContentBlock[];
}

function buildContent(category: ArticleCategory, seed: number): ContentBlock[] {
  switch (category) {
    case "SOPs":
      return [
        { type: "heading", level: 1, text: "Standard Operating Procedure" },
        { type: "paragraph", text: "This SOP governs the end-to-end execution of the workflow described below. All team members are expected to follow it verbatim. Deviations must be approved by the operations head and logged in the change register." },
        { type: "heading", level: 2, text: "Scope" },
        { type: "paragraph", text: "Applies to all trips dispatched from the central operations desk, including FTL, LTL, and part-load movements. Excludes diplomatic cargo and oversized consignments covered under SOP-OVS-04." },
        { type: "heading", level: 2, text: "Procedure" },
        {
          type: "steps",
          items: [
            { title: "Receive indent", detail: "Capture the customer indent in the CRM. Verify origin, destination, vehicle type, freight rate and special instructions before conversion to a trip." },
            { title: "Assign driver and vehicle", detail: "Match available driver-vehicle pair from the roster. Confirm driver fitness and vehicle RC/insurance/permit validity through the compliance module." },
            { title: "Generate LR and e-Way Bill", detail: "Create the Lorry Receipt in the system and pull the e-Way Bill from the GST portal via the integrations module. Print both copies for the driver." },
            { title: "Dispatch and track", detail: "Hand over the trip sheet, advance cash and documents. Mark the trip Active. Monitor GPS pings every 30 minutes; escalate if no ping for 2 hours." },
            { title: "Close trip on POD", detail: "On POD receipt, verify signature and condition. Mark trip Delivered. Trigger invoice generation and driver settlement." },
          ],
        },
        { type: "callout", variant: "warning", title: "Critical checkpoint", body: "If the customer indent is incomplete (missing consignee GSTIN or weight), do NOT proceed to step 2. Hold the indent and escalate to the sales contact within 1 hour." },
        { type: "heading", level: 2, text: "Records" },
        { type: "list", ordered: false, items: ["Indent copy - CRM", "LR and e-Way Bill - Documents module", "POD with consignee stamp - Documents module", "Driver settlement sheet - Payroll module", "Freight invoice - Invoice module"] },
        { type: "heading", level: 2, text: "Review cycle" },
        { type: "paragraph", text: "This SOP is reviewed every 6 months or upon any change in statutory requirements, whichever is earlier. The next review is owned by the Operations Head." },
      ];
    case "Policies":
      return [
        { type: "heading", level: 1, text: "Company Policy" },
        { type: "paragraph", text: "This policy sets the non-negotiable behavioural and operational standards expected from every employee and contractor associated with Reanzly. Adherence is a condition of continued engagement." },
        { type: "heading", level: 2, text: "Applicability" },
        { type: "paragraph", text: "Applies to all permanent employees, contract drivers, vendor partners, interns and visitors present at any Reanzly facility or operating any Reanzly-controlled asset." },
        { type: "heading", level: 2, text: "Key principles" },
        { type: "list", ordered: true, items: ["Safety first - no schedule, customer or commercial pressure overrides safety. Any driver may refuse an unsafe trip without retaliation.", "Honesty - all expense, fuel and odometer entries must be verifiable. Misreporting is grounds for termination.", "Customer commitments - once accepted, a trip must be executed as committed. Cancellations require supervisor approval.", "Document discipline - every transaction leaves a paper trail. No verbal-only arrangements.", "Confidentiality - customer and vendor data is confidential. No sharing outside authorised systems."] },
        { type: "callout", variant: "info", title: "Escalation matrix", body: "Concerns about policy violations can be raised with the reporting manager, HR, or the anonymous ethics line. Retaliation against whistle-blowers is itself a violation." },
        { type: "heading", level: 2, text: "Consequences of violation" },
        {
          type: "table",
          headers: ["Severity", "Example", "Action"],
          rows: [
            ["Minor", "Late trip sheet submission", "Verbal counselling"],
            ["Moderate", "Fuel log discrepancy", "Written warning + recovery"],
            ["Major", "Falsified POD", "Suspension pending enquiry"],
            ["Critical", "Theft, harassment, fraud", "Termination + legal action"],
          ],
        },
      ];
    case "Lane Playbooks":
      return [
        { type: "heading", level: 1, text: "Lane Playbook" },
        { type: "paragraph", text: "This playbook is the single source of truth for running the lane profitably and safely. It captures the operational, commercial and statutory nuances learned from 1,000+ trips on this lane." },
        { type: "heading", level: 2, text: "Lane snapshot" },
        {
          type: "table",
          headers: ["Attribute", "Value"],
          rows: [
            ["Origin", pick(["Nagpur", "Pune", "Delhi", "Chennai"], seed)],
            ["Destination", pick(["Kolkata", "Bengaluru", "Mumbai", "Hyderabad"], seed + 2)],
            ["Distance", `${850 + (seed % 12) * 110} km`],
            ["Average TAT", `${36 + (seed % 18)} hours`],
            ["Common vehicle", "32-ft MXL single-axle"],
            ["Avg freight rate", `₹${42 + (seed % 8)} per km`],
          ],
        },
        { type: "heading", level: 2, text: "Route & halts" },
        { type: "list", ordered: false, items: ["Preferred route - NH44 → NH48 corridor via Nagpur-Raipur-Bilaspur-Ranchi-Kolkata.", "Avoid - NH60 through Banswara sector after sunset (poor lighting, high cattle movement).", "Mandatory driver rest halt - Raipur bypass dhaba cluster (12-14 hour mark).", "Toll plazas - 6 tolls expected, total toll cost ₹1,850 to ₹2,100 one-way.", "Fuel top-up - fill at the company-bunked BP outlet near Nagpur before departure."] },
        { type: "callout", variant: "warning", title: "Seasonal risk", body: "Monsoon (Jun-Sep): the Raipur-Kolkata stretch has 3 known waterlogging zones. Re-route via SH12 if local advisories flag orange alert." },
        { type: "heading", level: 2, text: "Statutory & compliance" },
        { type: "paragraph", text: "Trip crosses state borders at MH-CH-GJ-RJ-WB. Ensure e-Way Bill validity covers the full TAT plus 24h buffer. FASTag balance must be ≥ ₹3,000 before departure. Driver DL and vehicle RC copies (physical + DigiLocker) mandatory." },
        { type: "heading", level: 2, text: "Margin levers" },
        { type: "list", ordered: true, items: ["Backhaul - secure return load from Howrah wholesale market; co-load with sub-broker network if direct not available.", "Diesel - top up at company-bunked outlet to capture the negotiated discount (₹1.20/L below retail).", "Toll - use the FASTag with auto-recharge to avoid cash lane delays and the ₹100 cash surcharge.", "Driver allowance - pay TAT-linked bonus instead of flat trip rate to incentivise on-time delivery."] },
      ];
    case "Safety":
      return [
        { type: "heading", level: 1, text: "Safety Guideline" },
        { type: "paragraph", text: "This guideline operationalises the company's zero-harm commitment. Every employee and contractor must internalise and follow these practices. Safety overrides productivity, always." },
        { type: "callout", variant: "warning", title: "If in doubt, stop", body: "Any driver or field staff member may halt a trip or operation if they perceive an unsafe condition. No supervisor may override a safety stop without an in-person risk assessment." },
        { type: "heading", level: 2, text: "Pre-trip safety checks" },
        { type: "steps", items: [
          { title: "Walk-around inspection", detail: "Circle the vehicle and visually confirm: tyres inflated and undamaged, no fluid leaks, mirrors and lights intact, cargo secured, number plate visible." },
          { title: "Cab checks", detail: "Adjust seat, mirrors and steering. Test horn, wipers, washers, all lights, parking brake, service brake. Verify fire extinguisher and first-aid kit present and within expiry." },
          { title: "Driver self-assessment", detail: "Confirm 8 hours of rest in the last 24h. No alcohol in the last 12h. No medication causing drowsiness. If any doubt, swap with the standby driver." },
          { title: "Document the check", detail: "Complete the pre-trip checklist in the inspection module. A failed item blocks dispatch until cleared." },
        ]},
        { type: "heading", level: 2, text: "On-road safety rules" },
        { type: "list", ordered: false, items: ["Maximum 9 hours driving in any 24-hour period. Mandatory 30-min break every 4 hours.", "Speed cap 70 km/h on highways, 40 km/h in city limits. Telematics-enforced.", "No mobile phone use while driving - even hands-free. Pull over to a safe spot to take a call.", "Maintain 3-second following distance in dry conditions, 6 seconds in wet.", "Use hazard lights only when stopped or in a queue, not while moving slowly."] },
        { type: "heading", level: 2, text: "Emergency response" },
        { type: "steps", items: [
          { title: "Secure the scene", detail: "Move the vehicle to the road shoulder if possible. Switch on hazard lights. Place the reflective triangle 50m behind (highway) or 10m (city)." },
          { title: "Check for injuries", detail: "Assess self, co-driver and any third parties. Call 108 for ambulance if anyone is hurt. Do not move seriously injured persons unless there is a fire risk." },
          { title: "Inform control room", detail: "Call the 24×7 ops control room within 10 minutes. Share location (Google Maps pin), vehicle number, nature of incident and assistance needed." },
          { title: "Document", detail: "Take photos of the scene from 4 angles, any damage, and the other party's vehicle/documents. Note witness contacts. Do not admit fault at the scene." },
        ]},
      ];
    case "Compliance":
      return [
        { type: "heading", level: 1, text: "Compliance Procedure" },
        { type: "paragraph", text: "Statutory compliance is non-optional. This procedure explains what needs to be filed, by when, and where to find the supporting documents. Failure to comply attracts penalties and operational disruption." },
        { type: "heading", level: 2, text: "Monthly compliance calendar" },
        {
          type: "table",
          headers: ["Date", "Filing", "Module", "Owner"],
          rows: [
            ["11th", "GSTR-1 (sales)", "Ledger → GST Returns", "Accounts"],
            ["20th", "GSTR-3B (summary)", "Ledger → GST Returns", "Accounts"],
            ["15th", "TDS deposit", "Ledger → Statutory", "Accounts"],
            ["25th", "PF + ESI contribution", "Payroll → Statutory", "HR"],
            ["Last day", "PT returns (state-specific)", "Ledger → Statutory", "Accounts"],
          ],
        },
        { type: "callout", variant: "info", title: "Auto-reminders", body: "The compliance calendar in the Compliance module auto-creates reminders 7 days and 1 day before each filing. Do not disable these reminders." },
        { type: "heading", level: 2, text: "Vehicle statutory documents" },
        { type: "list", ordered: true, items: ["Fitness certificate - renew every 2 years (heavy goods). Track in Documents module.", "Insurance - comprehensive cover mandatory. Renew 15 days before expiry to avoid lapses.", "Pollution Under Control (PUC) - valid 6 months. Test at authorised centres only.", "National Permit - annual renewal. Pay through the Vahan portal.", "State permits - required for each state plying. Track expiry per state."] },
        { type: "heading", level: 2, text: "Driver statutory documents" },
        { type: "list", ordered: true, items: ["Driving Licence - verify via Sarathi portal; renew as per class.", "Medical fitness certificate - annual for drivers over 50, biennial otherwise.", "Aadhaar + PAN - for payroll and TDS.", "Police verification - mandatory at onboarding; refresh every 3 years."] },
        { type: "callout", variant: "warning", title: "Penalty exposure", body: "An uninsured vehicle involved in a third-party accident exposes the company to unlimited liability under the MV Act. Treat insurance lapses as P1 critical." },
      ];
    case "Troubleshooting":
      return [
        { type: "heading", level: 1, text: "Troubleshooting Guide" },
        { type: "paragraph", text: "This guide helps drivers and field staff diagnose and resolve the most common issues on the road. It is not a substitute for the workshop manual - when in doubt, call the 24×7 breakdown line." },
        { type: "heading", level: 2, text: "Vehicle won't start" },
        { type: "steps", items: [
          { title: "Check battery terminals", detail: "Open the bonnet. Inspect battery terminals for looseness or corrosion. Tighten with a 10mm spanner if loose. Clean corrosion with a wire brush (carry one in the tool kit)." },
          { title: "Check battery voltage", detail: "Multimeter across terminals. Below 12.4V at rest = discharged. Jump-start using the spare battery pack; do not push-start a diesel vehicle." },
          { title: "Listen for starter solenoid click", detail: "Single click when key turned = solenoid engaging but starter not cranking. Likely starter motor or earth strap fault. Call breakdown." },
          { title: "Check fuel cut-off", detail: "If fitted with an anti-theft fuel cut-off (most fleet vehicles are), ensure the immobiliser has disarmed before cranking." },
        ]},
        { type: "callout", variant: "warning", title: "Do not crank continuously", body: "More than 3 attempts of 10s each will overheat the starter and drain the battery. Wait 2 minutes between attempts. Stop after 3 and call for help." },
        { type: "heading", level: 2, text: "Sudden loss of power" },
        { type: "list", ordered: false, items: ["Check fuel gauge - sender may be faulty; physically verify tank level.", "Inspect fuel filter - a clogged filter restricts flow under load. Replace if spare is available.", "Check air filter - a collapsed air filter starves the engine. Inspect and clean if needed.", "Look for boost leaks - listen for hissing around the turbo-to-intercooler hose. Tighten clamps."] },
        { type: "heading", level: 2, text: "Brake fade on long descents" },
        { type: "callout", variant: "warning", title: "Stop immediately", body: "Brake fade means the brake fluid is boiling and pedal travel has increased. Continuing risks total brake failure. Stop at the next safe spot, let brakes cool 20 minutes, then proceed slowly." },
        { type: "steps", items: [
          { title: "Downshift early", detail: "Before the descent, drop to a gear low enough to hold the vehicle at target speed with minimal brake input." },
          { title: "Use exhaust brake", detail: "Engage the exhaust / engine brake. It is designed for descents and saves the service brakes." },
          { title: "Snub braking", detail: "Apply hard (5-8 bar) for 3-4 seconds, release, let speed rise slightly, repeat. Avoid dragging the brake." },
        ]},
      ];
    case "Onboarding":
      return [
        { type: "heading", level: 1, text: "Onboarding Guide" },
        { type: "paragraph", text: "Welcome to Reanzly. This guide walks you through your first week - the systems you'll use, the people you'll meet and the things you'll learn. Ask questions; we'd rather answer the same thing twice than have you stuck." },
        { type: "heading", level: 2, text: "Day 1 - Induction" },
        { type: "list", ordered: true, items: ["09:00 - Report to HR with original documents (Aadhaar, PAN, marksheets, previous employment letters).", "10:00 - IT setup: laptop, email, Slack, access to the Reanzly ERP.", "11:30 - Office tour: ops floor, workshop, dispatch desk, drivers' room.", "13:00 - Lunch with your buddy (assigned by HR).", "14:00 - Policy walkthrough with HR.", "16:00 - One-on-one with your reporting manager."] },
        { type: "heading", level: 2, text: "Day 2-3 - System training" },
        { type: "steps", items: [
          { title: "Dashboard walkthrough", detail: "Learn the home dashboard, KPI tiles, and how to drill into any module. Practice switching roles to see what others see." },
          { title: "Module deep-dive", detail: "Depending on your role, focus on Trips, Vehicles, Customers or Ledger. Your manager will assign 2 modules to master in week 1." },
          { title: "Hands-on exercises", detail: "Create a sample trip, raise a sample invoice, log a sample expense. None of these will be posted to production; the trainer will mark them as test data." },
        ]},
        { type: "callout", variant: "info", title: "Who to ask", body: "Slack #help-it for system issues, #help-ops for operational questions. Your buddy is the first point of contact for anything cultural or 'silly'." },
        { type: "heading", level: 2, text: "Day 4-5 - Shadowing" },
        { type: "paragraph", text: "Shadow a senior team member through a full shift. You're observing, not doing. Take notes on the rhythm of the work, the cues they use, and the trade-offs they make. Debrief at end-of-shift." },
        { type: "heading", level: 2, text: "Week 2 - Independent with supervision" },
        { type: "paragraph", text: "Start executing live tasks under supervision. Your manager will define a checklist of tasks you must complete independently before the end of week 2. Pass the checklist → you're cleared to operate solo." },
        { type: "callout", variant: "success", title: "30-day check-in", body: "On day 30, you and your manager will sit down for a structured conversation: what's working, what's not, where you want to grow. Come prepared with questions." },
      ];
    default:
      return [{ type: "paragraph", text: "Content not yet written." }];
  }
}

function buildAttachments(category: ArticleCategory, seed: number) {
  type AttachType = ArticleAttachment["type"];
  const base: { name: string; type: AttachType; size: string }[] = [
    { name: `${category}-checklist.pdf`, type: "PDF", size: `${120 + (seed % 80)} KB` },
    { name: `${category}-template.docx`, type: "DOCX", size: `${40 + (seed % 30)} KB` },
    { name: `${category}-matrix.xlsx`, type: "XLSX", size: `${28 + (seed % 22)} KB` },
  ];
  if (category === "Safety" || category === "Troubleshooting") {
    base.push({ name: `demonstration.mp4`, type: "MP4", size: `${8 + (seed % 6)} MB` });
  }
  if (category === "Lane Playbooks") {
    base.push({ name: `route-map.png`, type: "PNG", size: `${240 + (seed % 80)} KB` });
  }
  return base.map((b, i) => ({
    id: `att-${seed}-${i}`,
    name: b.name,
    type: b.type,
    size: b.size,
    uploadedBy: pick(AUTHORS, seed + i).name,
    uploadedOn: new Date(Date.now() - (seed * 2 + i) * 86400000).toISOString(),
  }));
}

// ===== Build 20 seed articles =====
// KNOWLEDGE_ARTICLES below is no longer read by the live app (see
// src/app/api/knowledge and src/scripts/seed-knowledge.ts) - the module now
// runs on the real KnowledgeArticle Prisma model. This generator is kept as
// the seed script's source data so the rich, hand-authored SOP/policy/
// playbook content it produces isn't thrown away.
const TEMPLATES: { category: ArticleCategory; title: string; summary: string; tags: string[] }[] = [
  { category: "SOPs", title: "Trip dispatch - end-to-end SOP", summary: "The canonical trip lifecycle: indent → assign → LR → dispatch → POD → invoice. Every ops desk member must know this cold.", tags: ["trip", "lr", "pod", "e-way-bill"] },
  { category: "SOPs", title: "Vehicle onboarding SOP", summary: "How a new vehicle enters the fleet: RC verification, GPS install, document upload, insurance, first trip readiness.", tags: ["rc", "vehicle-360", "gps"] },
  { category: "SOPs", title: "POD collection and verification SOP", summary: "Field collection of POD, scanning, verification, and exception handling when the consignee refuses to sign.", tags: ["pod", "lr", "incident"] },
  { category: "Policies", title: "Code of conduct", summary: "The non-negotiable behavioural standards for all employees, drivers and vendor partners.", tags: ["safety", "audit"] },
  { category: "Policies", title: "Driver allowance and reimbursement policy", summary: "How driver allowances, halts, and out-of-pocket expenses are calculated, claimed and paid.", tags: ["driver", "fuel", "tally"] },
  { category: "Policies", title: "Data privacy and confidentiality policy", summary: "What customer and vendor data we collect, how it is stored, who can access it, and how long we retain it.", tags: ["gst", "audit"] },
  { category: "Lane Playbooks", title: "Nagpur → Kolkata lane playbook", summary: "Distance, TAT, route, halts, tolls, fuel stops, seasonal risks and margin levers for the Nagpur-Kolkata lane.", tags: ["route", "toll", "fuel"] },
  { category: "Lane Playbooks", title: "Delhi → Mumbai NH48 playbook", summary: "The Delhi-Mumbai NH48 corridor - India's busiest trucking lane. Operational nuances, halt matrix, backhaul options.", tags: ["ftl", "route", "toll"] },
  { category: "Lane Playbooks", title: "Chennai → Bengaluru express playbook", summary: "Short-haul express lane - 6-hour TAT, single-driver, hot-shot movements.", tags: ["ltl", "route"] },
  { category: "Safety", title: "Pre-trip safety inspection guideline", summary: "The walk-around, cab and self-assessment checks every driver must complete before dispatch.", tags: ["pre-trip", "tyre", "brake"] },
  { category: "Safety", title: "Driver fatigue management guideline", summary: "How we manage driver hours, mandated rest, and recognise the signs of fatigue before they become incidents.", tags: ["driver-fatigue", "incident"] },
  { category: "Safety", title: "Hazardous cargo handling guideline", summary: "Special precautions for Class 3, 6 and 8 hazardous cargo - PPE, route restrictions, emergency response.", tags: ["hazardous", "safety"] },
  { category: "Compliance", title: "Monthly statutory compliance calendar", summary: "What gets filed when - GSTR-1, GSTR-3B, TDS, PF, ESI, PT. Owners and reminders for each.", tags: ["gst", "gstn", "audit"] },
  { category: "Compliance", title: "Vehicle document renewal procedure", summary: "Fitness, insurance, PUC, permits - renewal cycles, owners and the cost of lapses.", tags: ["rc", "fitness", "permit"] },
  { category: "Compliance", title: "Driver KYC and verification procedure", summary: "DL verification, police verification, medical fitness, Aadhaar/PAN - what to collect and when.", tags: ["driver", "audit"] },
  { category: "Troubleshooting", title: "Common roadside breakdowns - quick fixes", summary: "Won't start, power loss, brake fade, tyre burst, electrical. What to try and when to call the breakdown line.", tags: ["tyre", "brake", "incident"] },
  { category: "Troubleshooting", title: "FASTag failure - manual fallback procedure", summary: "What to do when the FASTag reader fails at a toll: cash lane, receipt capture, recharge verification.", tags: ["fastag", "toll"] },
  { category: "Troubleshooting", title: "GPS device offline - diagnosis flow", summary: "When a vehicle's GPS goes dark: probable causes, field diagnostics, escalation path.", tags: ["gps", "incident"] },
  { category: "Onboarding", title: "New hire onboarding guide - week 1", summary: "Day-by-day plan for a new hire's first week: induction, system training, shadowing, buddy support.", tags: ["audit"] },
  { category: "Onboarding", title: "New driver onboarding guide", summary: "From DL verification to first trip: the 5-day driver onboarding journey, including safety induction and buddy assignment.", tags: ["driver", "safety", "pre-trip"] },
];

function buildArticle(i: number): KnowledgeArticle {
  const seed = i + 7;
  const tpl = TEMPLATES[i % TEMPLATES.length];
  const author = pick(AUTHORS, seed * 3 + 1);
  const publishedOn = new Date(Date.now() - (30 + i * 12) * 86400000).toISOString();
  const updatedOn = new Date(Date.now() - (i * 3 + 1) * 86400000).toISOString();
  const views = 80 + (seed * 47) % 4200;
  const helpfulCount = Math.round(views * (0.06 + (seed % 7) * 0.01));
  const notHelpfulCount = Math.round(helpfulCount * (0.08 + (seed % 4) * 0.04));
  const content = buildContent(tpl.category, seed);
  const wordCount = content.reduce((s, b) => {
    if (b.type === "paragraph" || b.type === "heading") return s + b.text.split(/\s+/).length;
    if (b.type === "list") return s + b.items.reduce((x, y) => x + y.split(/\s+/).length, 0);
    if (b.type === "steps") return s + b.items.reduce((x, y) => x + y.title.split(/\s+/).length + y.detail.split(/\s+/).length, 0);
    if (b.type === "callout") return s + b.title.split(/\s+/).length + b.body.split(/\s+/).length;
    if (b.type === "table") return s + b.rows.flat().reduce((x, y) => x + y.split(/\s+/).length, 0);
    if (b.type === "code") return s + b.code.split(/\s+/).length;
    return s;
  }, 0);
  const readingTimeMin = Math.max(2, Math.round(wordCount / 200));

  const feedback: ArticleFeedback[] = [
    { id: `fb-${seed}-1`, helpful: true, author: pick(AUTHORS, seed + 1).name, comment: "Crisp and actionable - shared with my team.", ts: new Date(Date.now() - (seed * 2) * 86400000).toISOString() },
    { id: `fb-${seed}-2`, helpful: true, author: pick(AUTHORS, seed + 2).name, ts: new Date(Date.now() - (seed + 1) * 86400000).toISOString() },
    ...(seed % 4 === 0 ? [{ id: `fb-${seed}-3`, helpful: false, author: pick(AUTHORS, seed + 3).name, comment: "Section on seasonal risk needs an update for the new bypass.", ts: new Date(Date.now() - (seed - 1) * 86400000).toISOString() }] : []),
  ];

  // Related articles - pick others in the same or related category
  const related: RelatedArticle[] = TEMPLATES
    .map((t, idx) => ({ t, idx }))
    .filter(({ t, idx }) => idx !== i && (t.category === tpl.category || t.tags.some((tag) => tpl.tags.includes(tag))))
    .slice(0, 3)
    .map(({ t, idx }) => ({
      id: `art-${idx + 1}`,
      title: t.title,
      category: t.category,
      reason: t.category === tpl.category ? "Same category" : `Shares tag: ${tpl.tags.find((tag) => t.tags.includes(tag)) || "topic"}`,
    }));

  const revisions: ArticleRevision[] = [
    { id: `rev-${seed}-1`, version: "1.0", ts: publishedOn, author: author.name, summary: "Initial publication" },
    ...(i % 5 !== 0 ? [{ id: `rev-${seed}-2`, version: "1.1", ts: updatedOn, author: pick(AUTHORS, seed + 2).name, summary: pick(["Updated contact details", "Refreshed statutory dates", "Added seasonal risk note", "Clarified escalation matrix"], seed) }] : []),
  ];

  return {
    id: `art-${i + 1}`,
    slug: tpl.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60),
    title: tpl.title,
    category: tpl.category,
    tags: tpl.tags,
    summary: tpl.summary,
    author: author.name,
    authorRole: author.role,
    publishedOn,
    updatedOn,
    views,
    helpfulCount,
    notHelpfulCount,
    status: i % 9 === 0 ? "In Review" : i % 11 === 0 ? "Archived" : "Published",
    visibility: tpl.category === "Policies" || tpl.category === "Onboarding" ? "Internal" : tpl.category === "Compliance" ? "Restricted" : "Public",
    readingTimeMin,
    content,
    attachments: buildAttachments(tpl.category, seed),
    related,
    feedback,
    revisions,
  };
}

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = Array.from({ length: 20 }, (_, i) => buildArticle(i));

// ===== Status badge helpers =====
export function articleStatusBadge(status: ArticleStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (status) {
    case "Published":
      return { variant: "outline" };
    case "Draft":
      return { variant: "muted" };
    case "In Review":
      return { variant: "solid", pulse: true };
    case "Archived":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function visibilityBadge(visibility: ArticleVisibility): { variant: "solid" | "outline" | "muted" } {
  switch (visibility) {
    case "Public":
      return { variant: "outline" };
    case "Internal":
      return { variant: "muted" };
    case "Restricted":
      return { variant: "solid" };
    default:
      return { variant: "outline" };
  }
}

// ===== Add article form =====
export interface ArticleForm {
  title: string;
  category: ArticleCategory;
  tags: string;
  summary: string;
  author: string;
  authorRole: string;
  visibility: ArticleVisibility;
  status: ArticleStatus;
  bodyMarkdown: string;
}

export function EMPTY_ARTICLE_FORM(): ArticleForm {
  return {
    title: "",
    category: "SOPs",
    tags: "",
    summary: "",
    author: AUTHORS[0].name,
    authorRole: AUTHORS[0].role,
    visibility: "Internal",
    status: "Draft",
    bodyMarkdown: "",
  };
}

export const AUTHOR_OPTIONS = AUTHORS;

// Field label
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

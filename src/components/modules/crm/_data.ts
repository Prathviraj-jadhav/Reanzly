"use client";

// ============================================================
// Reanzly - CRM module domain types & mock data.
// Self-contained: types live here (not in /lib/types.ts) so the
// orchestrator can wire the module without editing shared files.
// All data is realistic Indian logistics context.
// ============================================================

// ===== TYPES =====
export type LeadSource = "Inbound" | "Referral" | "Cold Call" | "Exhibition" | "Website";
export type LeadStatus = "New" | "Working" | "Nurturing" | "Qualified" | "Converted" | "Lost";
export type DealStage = "New Lead" | "Qualified" | "Quotation Sent" | "Negotiation" | "Won" | "Lost";
export type AccountType = "Shipper" | "Consignee" | "Broker" | "3PL";
export type ContractStatus = "Active" | "Under Renewal" | "Expired" | "None";
export type ActivityType = "Call" | "Email" | "Meeting" | "Site Visit" | "Follow-up" | "Quotation Sent" | "Note";
export type WinLossReason =
  | "Pricing"
  | "Service Quality"
  | "Lane Coverage"
  | "Competitor"
  | "No Requirement"
  | "Payment Terms"
  | "Lost Bid"
  | "Other";

export interface Lead {
  id: string;
  leadId: string;
  name: string;
  company: string;
  source: LeadSource;
  laneInterest: string;
  status: LeadStatus;
  owner: string;
  score: number;
  phone: string;
  email: string;
  city: string;
  created: string;
  nextFollowUp?: string;
  notes: string;
}

export interface Deal {
  id: string;
  dealId: string;
  title: string;
  company: string;
  contact: string;
  contactId?: string;
  value: number;
  stage: DealStage;
  expectedClose: string;
  owner: string;
  lane: string;
  accountId?: string;
  leadId?: string;
  created: string;
  probability: number;
  lossReason?: WinLossReason;
  winReason?: WinLossReason;
}

export interface Account {
  id: string;
  accountId: string;
  name: string;
  type: AccountType;
  gstin: string;
  lanes: string[];
  revenueYTD: number;
  outstanding: number;
  contractStatus: ContractStatus;
  accountManager: string;
  lastShipment: string;
  city: string;
  phone: string;
  email: string;
  billingAddress: string;
  paymentTerms: string;
  creditLimit: number;
  onboardingDate: string;
  notes: string;
}

export interface Contact {
  id: string;
  contactId: string;
  name: string;
  title: string;
  accountId?: string;
  accountName: string;
  phone: string;
  email: string;
  city: string;
  decisionMaker: boolean;
  lastContacted?: string;
  linkedIn?: string;
}

export interface Activity {
  id: string;
  activityId: string;
  type: ActivityType;
  title: string;
  description: string;
  owner: string;
  date: string;
  duration?: number; // minutes
  leadId?: string;
  leadName?: string;
  accountId?: string;
  accountName?: string;
  dealId?: string;
  dealName?: string;
  contactId?: string;
  contactName?: string;
  outcome: string;
  nextStep?: string;
}

// ===== CONSTANTS =====
// Real seeded roster (src/lib/mock-data.ts ROLE_ARCHETYPES) - the people
// who'd realistically own customer-facing CRM records, not invented names.
export const CRM_OWNERS = [
  "Rohit Sharma",
  "Anil Reddy",
  "Naresh Patel",
  "Reena Mehta",
  "Faisal Ahmed",
  "Vikram Deshmukh",
];

export const CRM_LANES = [
  "Mumbai–Delhi",
  "Mumbai–Bengaluru",
  "Delhi–Kolkata",
  "Chennai–Hyderabad",
  "Pune–Ahmedabad",
  "Mumbai–Nagpur",
  "Delhi–Jaipur",
  "Bengaluru–Chennai",
  "Kolkata–Bhubaneswar",
  "Ahmedabad–Surat",
];

export const CRM_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Chennai", "Pune", "Hyderabad",
  "Kolkata", "Ahmedabad", "Jaipur", "Nagpur", "Surat", "Kochi",
];

export const DEAL_STAGES: DealStage[] = [
  "New Lead",
  "Qualified",
  "Quotation Sent",
  "Negotiation",
  "Won",
  "Lost",
];

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  "New Lead": 10,
  Qualified: 30,
  "Quotation Sent": 50,
  Negotiation: 70,
  Won: 100,
  Lost: 0,
};

export const STAGE_WON_WEIGHT: Record<DealStage, number> = {
  "New Lead": 0.1,
  Qualified: 0.3,
  "Quotation Sent": 0.5,
  Negotiation: 0.7,
  Won: 1,
  Lost: 0,
};

// ===== HELPER - pseudo-random deterministic value =====
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ===== MOCK DATA - Companies / Accounts =====
const COMPANY_NAMES = [
  "Maruti Logistics Pvt Ltd",
  "Reliance Cargo Movers",
  "Tata Freight Solutions",
  "Aditya Birla Transport",
  "Mahindra Supply Chain",
  "Bajaj Cargo Carriers",
  "Ashok Leyland Freight",
  "Godrej Distribution Co",
  "Asian Paints Logistics",
  "Hindustan Unilever Transport",
  "Britannia Industries Logistics",
  "Nestle India Cargo",
  "ITC Limited Freight",
  "Dabur India Logistics",
  "Pidilite Industries Transport",
  "Hero MotoCorp Logistics",
  "Honda Motorcycle Cargo",
  "TVS Supply Chain Solutions",
  "Escorts Transport Group",
  "John Deere India Freight",
  "Siemens India Logistics",
  "Bosch India Cargo",
  "Schneider Electric Transport",
  "Larsen & Toubro Freight",
  "UltraTech Cement Logistics",
  "Ambuja Cements Transport",
  "Shree Cement Cargo",
  "ACC Limited Logistics",
  "Jindal Steel Freight",
  "Tata Steel Logistics",
];

const PERSON_FIRST = [
  "Rajesh", "Suresh", "Anil", "Vijay", "Rakesh", "Sunil", "Sanjay", "Deepak",
  "Manoj", "Pradeep", "Arun", "Ashok", "Naresh", "Mahesh", "Dinesh", "Vinod",
  "Ramesh", "Mukesh", "Kamlesh", "Rajiv", "Priya", "Sneha", "Anjali", "Pooja",
  "Kavita", "Nisha", "Meera", "Divya", "Shreya", "Anita", "Lakshmi", "Sunita",
  "Vikram", "Amit", "Rohit", "Karan", "Arjun", "Karthik", "Sai", "Naveen",
];

const PERSON_LAST = [
  "Sharma", "Verma", "Gupta", "Mehta", "Patel", "Reddy", "Nair", "Iyer",
  "Kapoor", "Singh", "Joshi", "Desai", "Rao", "Menon", "Pillai", "Das",
  "Bose", "Banerjee", "Mukherjee", "Chatterjee", "Khan", "Sheikh", "Agarwal",
  "Malhotra", "Saxena", "Mishra", "Tiwari", "Pandey", "Yadav", "Chauhan",
];

const TITLE_BY_TYPE: Record<AccountType, string[]> = {
  Shipper: ["VP Logistics", "Head of Supply Chain", "Logistics Manager", "Procurement Head"],
  Consignee: ["Warehouse Manager", "Inbound Logistics Lead", "Operations Head"],
  Broker: ["Director", "Partner", "Owner", "Freight Broker"],
  "3PL": ["CEO", "VP Operations", "Country Head", "Business Head"],
};

const rnd = seeded(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function pickMany<T>(arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(rnd() * (max - min + 1));
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n && used.size < arr.length) {
    const i = Math.floor(rnd() * arr.length);
    if (!used.has(i)) {
      used.add(i);
      out.push(arr[i]);
    }
  }
  return out;
}
function randomPhone(): string {
  const p = () => Math.floor(1000 + rnd() * 9000);
  return `+91 ${Math.floor(70 + rnd() * 29)}${p()} ${p()}`;
}
function randomEmail(name: string, company: string): string {
  const handles = ["gmail.com", "yahoo.in", "outlook.com"];
  const handle = name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
  const domain = company.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  if (rnd() > 0.4) return `${handle}@${domain}.in`;
  return `${handle}@${pick(handles)}`;
}
function randomGSTIN(stateCode: string): string {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const state = stateCode.padStart(2, "0");
  const pan =
    state.slice(0, 1) +
    Array.from({ length: 4 }, () => chars[Math.floor(rnd() * chars.length)]).join("") +
    Math.floor(1000 + rnd() * 9000) +
    chars[Math.floor(rnd() * chars.length)];
  return `${state}${pan}1Z${Math.floor(rnd() * 9)}`;
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function isoDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const STATE_CODES = ["27", "07", "29", "33", "24", "06", "19", "23"];

// ===== Generate Accounts (15+) =====
export const ACCOUNTS: Account[] = COMPANY_NAMES.slice(0, 18).map((name, i) => {
  const type = pick(["Shipper", "Shipper", "Consignee", "Broker", "3PL"]) as AccountType;
  const city = pick(CRM_CITIES);
  const stateCode = pick(STATE_CODES);
  const revenue = Math.floor(800000 + rnd() * 85000000);
  const outstanding = Math.floor(rnd() * (revenue * 0.35));
  const contractStatus = pick([
    "Active",
    "Active",
    "Active",
    "Under Renewal",
    "Expired",
    "None",
  ]) as ContractStatus;
  const onboardingDaysAgo = Math.floor(60 + rnd() * 1100);
  return {
    id: `acc-${i + 1}`,
    accountId: `ACC-${String(i + 1).padStart(4, "0")}`,
    name,
    type,
    gstin: randomGSTIN(stateCode),
    lanes: pickMany(CRM_LANES, 1, 4),
    revenueYTD: revenue,
    outstanding,
    contractStatus,
    accountManager: pick(CRM_OWNERS),
    lastShipment: isoDaysAgo(Math.floor(rnd() * 30)),
    city,
    phone: randomPhone(),
    email: `logistics@${name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "")}.in`,
    billingAddress: `${1 + Math.floor(rnd() * 200)}, Industrial Estate, ${city}`,
    paymentTerms: pick(["Net 15", "Net 30", "Net 45", "Net 60", "Advance", "COD"]),
    creditLimit: Math.floor(500000 + rnd() * 5000000),
    onboardingDate: isoDaysAgo(onboardingDaysAgo),
    notes:
      i % 3 === 0
        ? "Key account - high-volume Mumbai-Delhi lane. Sensitive to TAT."
        : i % 4 === 0
          ? "Renewal due Q4. Competitor approaching on Bangalore lane."
          : "Steady customer. Avg 8 trips/month.",
  };
});

// ===== Generate Contacts (30+) =====
export const CONTACTS: Contact[] = Array.from({ length: 36 }, (_, i) => {
  const account = pick(ACCOUNTS);
  const first = pick(PERSON_FIRST);
  const last = pick(PERSON_LAST);
  const name = `${first} ${last}`;
  const titles = TITLE_BY_TYPE[account.type];
  return {
    id: `ctc-${i + 1}`,
    contactId: `CTC-${String(i + 1).padStart(4, "0")}`,
    name,
    title: pick(titles),
    accountId: account.id,
    accountName: account.name,
    phone: randomPhone(),
    email: randomEmail(name, account.name),
    city: account.city,
    decisionMaker: rnd() > 0.55,
    lastContacted: isoDaysAgo(Math.floor(rnd() * 40)),
  };
});

// ===== Generate Leads (25+) =====
const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Working",
  "Working",
  "Nurturing",
  "Qualified",
  "Qualified",
  "Converted",
  "Lost",
];
const LEAD_SOURCES: LeadSource[] = ["Inbound", "Referral", "Cold Call", "Exhibition", "Website"];

export const LEADS: Lead[] = Array.from({ length: 28 }, (_, i) => {
  const first = pick(PERSON_FIRST);
  const last = pick(PERSON_LAST);
  const name = `${first} ${last}`;
  const company = i < COMPANY_NAMES.length ? COMPANY_NAMES[i] : `${first} ${last} Cargo`;
  const status = LEAD_STATUSES[i % LEAD_STATUSES.length];
  const score =
    status === "Converted"
      ? 90 + Math.floor(rnd() * 10)
      : status === "Qualified"
        ? 60 + Math.floor(rnd() * 30)
        : status === "Lost"
          ? Math.floor(rnd() * 30)
          : Math.floor(20 + rnd() * 60);
  const createdDaysAgo = Math.floor(rnd() * 90);
  const hasFollowUp = status === "Working" || status === "Qualified" || status === "Nurturing";
  return {
    id: `ld-${i + 1}`,
    leadId: `LD-${String(i + 1).padStart(4, "0")}`,
    name,
    company,
    source: LEAD_SOURCES[i % LEAD_SOURCES.length],
    laneInterest: pick(CRM_LANES),
    status,
    owner: pick(CRM_OWNERS),
    score,
    phone: randomPhone(),
    email: randomEmail(name, company),
    city: pick(CRM_CITIES),
    created: isoDaysAgo(createdDaysAgo),
    nextFollowUp: hasFollowUp ? isoDaysAhead(Math.floor(rnd() * 14)) : undefined,
    notes:
      status === "Qualified"
        ? "Strong intent. Requested rate card for weekly FTL movements."
        : status === "Converted"
          ? "Closed Q3. Now active account with monthly contract."
          : status === "Lost"
            ? "Went with competitor on price. Revisit in 6 months."
            : i % 2 === 0
              ? "Initial conversation. Wants monthly volume estimate."
              : "Awaiting decision maker availability.",
  };
});

// ===== Generate Deals (20+) =====
const DEAL_TITLES = [
  "FTL Mumbai-Delhi Weekly Contract",
  "LTL Bangalore Lane Monthly",
  "Container Movement - Mumbai Port",
  "Cement Transportation Long-term",
  "FMCG Distribution - Pune Region",
  "Steel Coil Movement - JSW",
  "E-commerce Last Mile - Bengaluru",
  "Cold Chain Pharma - Hyderabad",
  "Auto Components - Manesar to Chennai",
  "Bulk Cement - Gujarat Plants",
  "Project Cargo - Heavy Equipment",
  "Refrigerated Transport - Dairy",
  "ODC Movement - Windmill Blades",
  "Tanker Operations - Chemicals",
  "Full Truck Load - Iron & Steel",
  "Part Load - Express Service",
];

export const DEALS: Deal[] = Array.from({ length: 22 }, (_, i) => {
  const account = i < ACCOUNTS.length ? ACCOUNTS[i] : pick(ACCOUNTS);
  const contact = CONTACTS.find((c) => c.accountId === account.id) || pick(CONTACTS);
  const stage: DealStage =
    i < 3
      ? "New Lead"
      : i < 6
        ? "Qualified"
        : i < 9
          ? "Quotation Sent"
          : i < 12
            ? "Negotiation"
            : i < 17
              ? "Won"
              : "Lost";
  const value = Math.floor(150000 + rnd() * 6500000);
  const createdDaysAgo = Math.floor(20 + rnd() * 150);
  const expectedCloseDays =
    stage === "Won" || stage === "Lost" ? -Math.floor(rnd() * 30) : Math.floor(rnd() * 60);
  return {
    id: `dl-${i + 1}`,
    dealId: `DL-${String(i + 1).padStart(4, "0")}`,
    title: i < DEAL_TITLES.length ? DEAL_TITLES[i] : `${account.name.split(" ")[0]} Lane Contract`,
    company: account.name,
    contact: contact.name,
    contactId: contact.id,
    value,
    stage,
    expectedClose: isoDaysAhead(expectedCloseDays),
    owner: pick(CRM_OWNERS),
    lane: pick(account.lanes),
    accountId: account.id,
    leadId: i < LEADS.length ? LEADS[i].id : undefined,
    created: isoDaysAgo(createdDaysAgo),
    probability: STAGE_PROBABILITY[stage],
    lossReason: stage === "Lost" ? pick(["Pricing", "Competitor", "Lost Bid", "Payment Terms"]) : undefined,
    winReason: stage === "Won" ? pick(["Pricing", "Service Quality", "Lane Coverage"]) : undefined,
  };
});

// ===== Generate Activities (40+) =====
const ACTIVITY_TEMPLATES: Array<{
  type: ActivityType;
  title: (company: string) => string;
  desc: (company: string, lane: string) => string;
  outcome: string;
  nextStep?: string;
  duration?: number;
}> = [
  {
    type: "Call",
    title: (c) => `Discovery call with ${c}`,
    desc: (c, l) => `Initial discovery call. Understood requirements for ${l} lane. Volume ~30 trips/month.`,
    outcome: "Qualified",
    nextStep: "Send rate card within 48h",
    duration: 25,
  },
  {
    type: "Email",
    title: (c) => `Quotation follow-up to ${c}`,
    desc: () => `Sent revised quotation with 5% volume discount. Requested feedback by EOW.`,
    outcome: "Awaiting Reply",
    nextStep: "Call back on Friday",
  },
  {
    type: "Meeting",
    title: (c) => `On-site meeting at ${c} HQ`,
    desc: () => `Met with VP Logistics and procurement team. Reviewed SLA expectations and fleet availability.`,
    outcome: "Positive",
    nextStep: "Draft contract for review",
    duration: 90,
  },
  {
    type: "Site Visit",
    title: (c) => `Warehouse site visit - ${c}`,
    desc: () => `Inspected loading bay, dock availability, and turnaround infrastructure. Suitable for FTL.`,
    outcome: "Approved",
    nextStep: "Confirm induction date",
    duration: 120,
  },
  {
    type: "Follow-up",
    title: (c) => `Follow-up call with ${c}`,
    desc: () => `Checked on quotation decision. Customer comparing 2 competitors. Highlighted GPS tracking + ETA.`,
    outcome: "Open",
    nextStep: "Schedule demo of customer portal",
    duration: 15,
  },
  {
    type: "Quotation Sent",
    title: (c) => `Quotation sent to ${c}`,
    desc: () => `Submitted rate card with lane-wise pricing, detention policy, and GST terms.`,
    outcome: "Sent",
    nextStep: "Follow up in 3 days",
  },
  {
    type: "Note",
    title: (c) => `Account note - ${c}`,
    desc: () => `Customer mentioned Q4 budget freeze. Pushed contract renewal to early next quarter.`,
    outcome: "Logged",
  },
];

export const ACTIVITIES: Activity[] = Array.from({ length: 44 }, (_, i) => {
  const tmpl = ACTIVITY_TEMPLATES[i % ACTIVITY_TEMPLATES.length];
  const deal = i < DEALS.length ? DEALS[i] : pick(DEALS);
  const account = ACCOUNTS.find((a) => a.id === deal.accountId) || pick(ACCOUNTS);
  const contact = CONTACTS.find((c) => c.accountId === account.id) || pick(CONTACTS);
  const lead = LEADS[i % LEADS.length];
  const daysAgo = Math.floor(rnd() * 45);
  return {
    id: `act-${i + 1}`,
    activityId: `ACT-${String(i + 1).padStart(4, "0")}`,
    type: tmpl.type,
    title: tmpl.title(account.name),
    description: tmpl.desc(account.name, deal.lane),
    owner: deal.owner,
    date: isoDaysAgo(daysAgo),
    duration: tmpl.duration,
    leadId: i % 3 === 0 ? lead.id : undefined,
    leadName: i % 3 === 0 ? lead.name : undefined,
    accountId: account.id,
    accountName: account.name,
    dealId: deal.id,
    dealName: deal.title,
    contactId: contact.id,
    contactName: contact.name,
    outcome: tmpl.outcome,
    nextStep: tmpl.nextStep,
  };
});

// ===== Conversion funnel data =====
export const FUNNEL_STAGES = [
  { stage: "New Leads", count: LEADS.filter((l) => l.status === "New").length + 5 },
  { stage: "Working", count: LEADS.filter((l) => l.status === "Working").length + 8 },
  { stage: "Qualified", count: LEADS.filter((l) => l.status === "Qualified").length + 4 },
  { stage: "Quotation", count: DEALS.filter((d) => d.stage === "Quotation Sent").length + 6 },
  { stage: "Negotiation", count: DEALS.filter((d) => d.stage === "Negotiation").length + 3 },
  { stage: "Won", count: DEALS.filter((d) => d.stage === "Won").length },
] as const;

export const SOURCE_EFFECTIVENESS = LEAD_SOURCES.map((src) => {
  const total = LEADS.filter((l) => l.source === src).length + 4;
  const converted = LEADS.filter((l) => l.source === src && l.status === "Converted").length + 1;
  return {
    source: src,
    total,
    converted,
    rate: total > 0 ? Math.round((converted / total) * 100) : 0,
  };
});

export const LANE_REVENUE = CRM_LANES.slice(0, 6).map((lane, i) => {
  const deals = DEALS.filter((d) => d.lane === lane && d.stage === "Won");
  const value =
    deals.reduce((s, d) => s + d.value, 0) || Math.floor(500000 + (i + 1) * 1200000);
  return { lane, value, deals: deals.length + Math.floor(rnd() * 8) };
});

export const WIN_LOSS_REASONS: { reason: WinLossReason; won: number; lost: number }[] = [
  { reason: "Pricing", won: 7, lost: 5 },
  { reason: "Service Quality", won: 5, lost: 1 },
  { reason: "Lane Coverage", won: 4, lost: 2 },
  { reason: "Competitor", won: 0, lost: 4 },
  { reason: "Payment Terms", won: 2, lost: 3 },
  { reason: "Lost Bid", won: 0, lost: 3 },
];

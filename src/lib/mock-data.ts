import type {
  Trip, Vehicle, Driver, Customer, Vendor, Invoice, Expense, Payment,
  Issue, Inspection, WorkOrder, FuelEntry, LorryReceipt, DocumentRecord,
  Reminder, Notification, Conversation, ChatMessage,
  RoleArchetype, ChatEntity, Widget,
} from "./types";

// ===== REALISTIC INDIAN LOGISTICS DATA =====
// Creative names, organic messy numbers, no generic placeholders.

const CITIES = [
  "Mumbai", "Pune", "Nashik", "Nagpur", "Aurangabad",
  "Delhi", "Gurgaon", "Noida", "Faridabad", "Jaipur",
  "Ahmedabad", "Surat", "Vadodara", "Rajkot",
  "Bengaluru", "Chennai", "Hyderabad", "Kochi", "Coimbatore",
  "Kolkata", "Bhubaneswar", "Raipur", "Visakhapatnam",
  "Indore", "Bhopal", "Lucknow", "Kanpur", "Patna",
];

const INDIAN_FIRST = [
  "Rohit", "Vikram", "Suresh", "Mahesh", "Anil", "Dinesh", "Rajesh", "Pradeep",
  "Kuldeep", "Harpreet", "Balwinder", "Manjeet", "Sukhbir", "Jaspal",
  "Ramesh", "Naresh", "Suresh", "Kamlesh", "Dharmendra", "Surya",
  "Imran", "Faisal", "Nadeem", "Arif", "Tariq", "Sameer",
  "Joseph", "Thomas", "Mathew", "Varghese", "George", "Reji",
  "Ganesh", "Murthy", "Srinivas", "Krishna", "Venkat", "Raghav",
  "Abhijeet", "Tanmay", "Saurabh", "Nikhil", "Aditya", "Karan",
  "Farhan", "Zubair", "Kamal", "Rahul", "Amit", "Sanjay",
  "Lakshmi", "Priya", "Anjali", "Deepa", "Meera", "Sneha",
  "Trisha", "Namita", "Rashmi", "Pooja", "Kavya", "Divya",
  "Reshma", "Fatima", "Ayesha", "Zara", "Mariam", "Sana",
  "Grace", "Anita", "Reena", "Sunita", "Geeta", "Sarla",
];

const INDIAN_LAST = [
  "Patil", "Deshmukh", "Kulkarni", "Jadhav", "Shinde", "More", "Bhosale",
  "Sharma", "Verma", "Gupta", "Agarwal", "Mishra", "Tiwari", "Dubey",
  "Singh", "Sandhu", "Brar", "Gill", "Cheema", "Sidhu",
  "Reddy", "Naidu", "Rao", "Shetty", "Hegde", "Pai", "Shenoy",
  "Iyer", "Menon", "Nair", "Pillai", "Kurian", "Thomas",
  "Das", "Banerjee", "Ghosh", "Mondal", "Sengupta", "Chowdhury",
  "Khan", "Sheikh", "Ansari", "Qureshi", "Siddiqui", "Malik",
  "Yadav", "Prasad", "Chauhan", "Rathore", "Solanki", "Parihar",
  "Mehta", "Shah", "Jain", "Gandhi", "Desai", "Bhatt",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function fullName(seed: number): string {
  return `${pick(INDIAN_FIRST, seed)} ${pick(INDIAN_LAST, seed * 7 + 3)}`;
}
function city(seed: number): string {
  return pick(CITIES, seed);
}
function plate(seed: number): string {
  const states = ["MH", "DL", "GJ", "KA", "TN", "TS", "AP", "WB", "RJ", "UP", "MP", "PB"];
  const st = pick(states, seed);
  const num = String((seed * 13 + 7) % 99 + 1).padStart(2, "0");
  const letters = String.fromCharCode(65 + (seed % 26), 65 + ((seed * 3) % 26), 65 + ((seed * 5) % 26), 65 + ((seed * 7) % 26)).slice(0, seed % 2 === 0 ? 2 : 3);
  const digits = String((seed * 9173 + 113) % 10000).padStart(4, "0");
  return `${st} ${num} ${letters} ${digits}`;
}
function gstin(seed: number): string {
  const stateCodes = ["27", "07", "24", "29", "33", "36", "19", "08", "09", "23"];
  const sc = pick(stateCodes, seed);
  const pan = `${String.fromCharCode(65 + (seed % 26))}${String.fromCharCode(65 + ((seed*3) % 26))}${String.fromCharCode(65 + ((seed*5) % 26))}${String.fromCharCode(65 + ((seed*7) % 26))}${String.fromCharCode(65 + ((seed*11) % 26))}${String((seed * 7) % 9000 + 1000)}${String.fromCharCode(65 + ((seed*13) % 26))}`;
  const z = "Z";
  const last = String((seed * 137) % 90 + 10);
  return `${sc}${pan}${z}${last}`;
}
function vin(seed: number): string {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let v = "";
  for (let i = 0; i < 17; i++) v += chars[(seed * (i + 3) + i * 7) % chars.length];
  return v;
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}
function inr(n: number): number {
  return Math.round(n);
}

// ===== ROLE ARCHETYPES (demo user switching) =====
// Module ids used in `permissions`:
//   dashboard, operations-hub, trips, fleet-map, vehicles, lorry-receipts,
//   invoice, expenses, payments, customers, vendors, drivers-staff,
//   inspection, issues, maintenance, services, fuel-energy, reminders,
//   documents, reports, settings, automation, system-design,
//   pod, rate-cards, financial-ops, warehouse, compliance, payroll,
//   workshop, access-matrix, chat
// The last batch (pod…access-matrix) are scaffolded in parallel by other
// agents. Declaring permissions now ensures the sidebar filter, command
// palette, and access-matrix gate them correctly once those nav entries land.
export const ROLE_ARCHETYPES: RoleArchetype[] = [
  {
    id: "superadmin",
    name: "Reanzly Staff",
    description: "Reanzly Internal Team - onboards tenants, manages platform, billing, backups & offline-sync health across all organisations.",
    branch: "Reanzly HQ",
    permissions: [
      "dashboard", "superadmin", "reports", "settings", "system-design",
      "access-matrix", "automation", "chat",
    ],
    avatar: "",
    initials: "RZ",
  },
  {
    id: "owner",
    name: "Vikram Deshmukh",
    description: "Owner / Director - full access across every module, branch, and financial record.",
    branch: "Mumbai HQ",
    permissions: ["*"],
    avatar: "",
    initials: "VD",
  },
  {
    id: "ops-manager",
    name: "Rohit Sharma",
    description: "Operations Manager - runs trips, dispatch, fleet map, and exceptions.",
    branch: "Pune Branch",
    permissions: [
      "dashboard", "operations-hub", "trips", "fleet-map", "vehicles",
      "lorry-receipts", "inspection", "issues", "maintenance", "fuel-energy",
      "reminders", "documents", "document-studio", "reports", "chat",
      // New modules - ops touches all of these.
      "pod", "rate-cards", "warehouse", "compliance",
    ],
    avatar: "",
    initials: "RS",
  },
  {
    id: "fleet-manager",
    name: "Sukhbir Gill",
    description: "Fleet Manager - owns vehicle lifecycle, maintenance, tyres, and compliance.",
    branch: "Delhi Branch",
    permissions: [
      "dashboard", "vehicles", "maintenance", "services", "inspection",
      "issues", "fuel-energy", "reminders", "documents", "document-studio", "reports", "chat",
      // New modules - fleet owns the workshop and compliance paperwork.
      "workshop", "compliance",
    ],
    avatar: "",
    initials: "SG",
  },
  {
    id: "finance-manager",
    name: "Reena Mehta",
    description: "Finance Manager - invoicing, payments, expenses, settlements, and GST.",
    branch: "Mumbai HQ",
    permissions: [
      "dashboard", "invoice", "expenses", "payments", "reports", "documents", "document-studio", "chat",
      // New modules - finance owns financial-ops, rate-cards visibility, payroll,
      // and GST compliance.
      "financial-ops", "rate-cards", "payroll", "compliance",
      "ledger",
    ],
    avatar: "",
    initials: "RM",
  },
  {
    id: "dispatcher",
    name: "Anil Reddy",
    description: "Dispatcher - assigns vehicles and drivers, tracks live trips, handles POD.",
    branch: "Bengaluru Branch",
    permissions: [
      "dashboard", "trips", "fleet-map", "vehicles", "lorry-receipts", "issues", "chat",
      // New modules - dispatcher collects and routes POD.
      "pod",
    ],
    avatar: "",
    initials: "AR",
  },
  {
    id: "driver",
    name: "Kuldeep Singh",
    description: "Driver - mobile-first view: assigned trips, POD capture, earnings, documents.",
    branch: "Field",
    permissions: [
      "dashboard", "trips", "documents", "document-studio", "chat",
      // New modules - driver captures POD on the field app.
      "pod",
    ],
    avatar: "",
    initials: "KS",
  },
  {
    id: "analyst",
    name: "Priya Iyer",
    description: "Read-Only Analyst - dashboards, reports, and analytics. No edit access.",
    branch: "Mumbai HQ",
    permissions: [
      "dashboard", "reports", "system-design", "chat",
      // New modules - analyst has read-only visibility across the new modules.
      "pod", "rate-cards", "financial-ops", "warehouse", "compliance",
      "payroll", "workshop", "access-matrix",
    ],
    avatar: "",
    initials: "PI",
  },

  // --- New roles added to cover every logistics user type ---

  {
    id: "warehouse-manager",
    name: "Balwinder Sandhu",
    description: "Warehouse Manager - godown in-charge: inbound/outbound, inventory, POD receive, storage.",
    branch: "Pune Warehouse",
    permissions: [
      "dashboard", "warehouse", "pod", "lorry-receipts", "documents",
      "document-studio", "reports", "chat",
      // Read-only view of the trips and vehicles that touch the godown.
      "trips", "vehicles",
    ],
    avatar: "",
    initials: "BS",
  },
  {
    id: "customer",
    name: "Anjali Mehta",
    description: "Customer / Vendor - read-only portal: live shipment tracking, your trips, your invoices, your PODs, your ledger.",
    branch: "Customer Portal",
    permissions: [
      "dashboard", "trips", "fleet-map", "invoice", "pod", "documents", "document-studio", "reports", "chat",
    ],
    avatar: "",
    initials: "AM",
  },
  {
    id: "broker",
    name: "Faisal Ahmed",
    description: "Freight Broker - market loads, posted trucks, matching, and commission.",
    branch: "Market Desk",
    permissions: [
      "dashboard", "trips", "customers", "vendors", "rate-cards", "reports", "chat",
      // Read-only view of the vehicle pool to match loads against.
      "vehicles",
      // Broker Network modules - resell Reanzly capacity, manage sub-brokers,
      // run settlements. Gated separately in the sidebar by businessType.
      "broker-console", "broker-marketplace", "broker-settlements",
    ],
    avatar: "",
    initials: "FA",
  },
  {
    id: "safety-officer",
    name: "Pooja Iyer",
    description: "Safety Officer - compliance, inspections, incidents, EHS, driver hours.",
    branch: "Mumbai HQ",
    permissions: [
      "dashboard", "compliance", "inspection", "issues", "documents",
      "document-studio", "reports", "chat",
      // Read-only view of drivers and vehicles under audit.
      "drivers-staff", "vehicles",
    ],
    avatar: "",
    initials: "PI",
  },
  {
    id: "mechanic",
    name: "Farhan Khan",
    description: "Mechanic - workshop: work orders, parts, issues, fuel logs.",
    branch: "Pune Workshop",
    permissions: [
      "dashboard", "workshop", "maintenance", "issues", "fuel-energy",
      "documents", "document-studio", "chat",
      // Read-only view of the vehicles they service.
      "vehicles",
    ],
    avatar: "",
    initials: "FK",
  },
  {
    id: "branch-manager",
    name: "Naresh Patel",
    description: "Branch Manager - single-branch P&L, branch trips, branch staff, branch fleet.",
    branch: "Ahmedabad Branch",
    permissions: [
      "dashboard", "trips", "vehicles", "drivers-staff", "invoice",
      "expenses", "payments", "customers", "reports", "chat",
      // Read-only visibility on rate cards and compliance for the branch.
      "rate-cards", "compliance",
      "ledger",
    ],
    avatar: "",
    initials: "NP",
  },
  {
    id: "accountant",
    name: "Geeta Sharma",
    description: "Accountant - vouchers, TDS, GST filing, reconciliation, journal entries.",
    branch: "Mumbai HQ",
    permissions: [
      "dashboard", "financial-ops", "invoice", "expenses", "payments",
      "compliance", "reports", "documents", "document-studio", "chat",
      "ledger",
    ],
    avatar: "",
    initials: "GS",
  },
  {
    id: "hr-manager",
    name: "Sunita Rao",
    description: "HR Manager - drivers & staff, payroll, attendance, leaves, onboarding.",
    branch: "Mumbai HQ",
    permissions: [
      "dashboard", "drivers-staff", "payroll", "documents", "document-studio", "reports", "chat",
    ],
    avatar: "",
    initials: "SR",
  },
  {
    id: "warehouse-crew",
    name: "Deepak Yadav",
    description: "Warehouse Crew - mobile-first floor view: putaway, picking, dispatch tasks, stock capture.",
    branch: "Pune Warehouse",
    permissions: ["dashboard", "warehouse", "pod", "documents", "chat"],
    avatar: "",
    initials: "DY",
  },
];

// ===== CHAT ENTITIES =====
export const CHAT_ENTITIES: ChatEntity[] = ROLE_ARCHETYPES.map((r, i) => {
  const presenceStates: ChatEntity["presence"][] = ["online", "idle", "offline", "online", "idle", "online", "offline"];
  return {
    id: r.id,
    name: r.name,
    email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`,
    role: r.name.split(" ")[1] || "Staff",
    avatar: r.avatar,
    branch: r.branch,
    initials: r.initials,
    presence: presenceStates[i % presenceStates.length],
  };
});

// Rean is also an entity (so it can be @mentioned and shown in DMs)
export const REAN_ENTITY: ChatEntity = {
  id: "rean",
  name: "Rean",
  email: "rean@reanzly.in",
  role: "AI",
  avatar: "",
  branch: "System",
  initials: "RE",
  presence: "online",
};

// ===== VEHICLES =====
const MAKES = ["Tata", "Ashok Leyland", "Eicher", "BharatBenz", "Mahindra", "Volvo", "AMW"];
const MODELS = ["LPT 1613", "1616 IL", "Pro 3015", "3123 FM", "Blazo X 42", "FM 400", "4923 TT"];
const TYPES = ["Truck", "Trailer", "Container", "Tanker", "Tipper", "Reefer"];
const GROUPS = ["Line Haul", "City Delivery", "Long Haul", "Specialized", "Attached Fleet"];

export const VEHICLES: Vehicle[] = Array.from({ length: 28 }, (_, i) => {
  const seed = i + 11;
  const statuses: Vehicle["status"][] = ["Active", "Idle", "In Maintenance", "Offline"];
  const status = pick(statuses, seed * 3);
  return {
    id: `veh-${seed}`,
    name: `${pick(MAKES, seed)} ${pick(MODELS, seed * 2)}`,
    year: 2016 + (seed % 9),
    make: pick(MAKES, seed),
    model: pick(MODELS, seed * 2),
    vin: vin(seed),
    status,
    type: pick(TYPES, seed * 5),
    group: pick(GROUPS, seed * 4),
    currentMeter: inr(48213 + seed * 17321 + (seed % 7) * 9100),
    licensePlate: plate(seed),
    watchers: [fullName(seed + 3), fullName(seed + 9)].filter((_, j) => j < (seed % 3) + 1),
    operator: fullName(seed + 2),
    fuelType: pick(["Diesel", "Diesel", "Diesel", "CNG"], seed),
    ownership: pick<Vehicle["ownership"]>(["Owned", "Owned", "Leased", "Attached"], seed),
    location: city(seed),
    distanceThisPeriod: inr(2840 + (seed % 31) * 412 + seed * 67),
    gpsSpeed: status === "Active" ? (seed * 7) % 82 : 0,
    lastGpsUpdate: daysAgo((seed % 50) / 10),
    assignedTripId: status === "Active" ? `trip-${seed}` : undefined,
  };
});

// ===== DRIVERS & STAFF =====
const DEPTS = ["Operations", "Fleet", "Finance", "HR", "Dispatch", "Maintenance"];

export const DRIVERS: Driver[] = Array.from({ length: 32 }, (_, i) => {
  const seed = i + 23;
  const name = fullName(seed);
  const isDriver = seed % 4 !== 0;
  return {
    id: `drv-${seed}`,
    name,
    role: isDriver ? "Driver" : "Staff",
    department: isDriver ? "Operations" : pick(DEPTS, seed),
    status: pick<Driver["status"]>(["Active", "Active", "Active", "On Leave", "Inactive"], seed),
    contact: `+91 ${(seed * 137 + 7000000000).toString().slice(0, 10)}`,
    assignedVehicle: isDriver && seed % 3 === 0 ? VEHICLES[seed % VEHICLES.length].name : undefined,
    licenseNumber: isDriver ? `MH04${String((seed * 7919) % 90000000 + 10000000)}` : "",
    licenseExpiry: daysAhead((seed % 400) - 60),
    lastActive: daysAgo(seed % 48),
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`,
    rating: 3.4 + (seed % 16) / 10,
    tripsCompleted: inr(47 + (seed % 380)),
    onTimeRate: 0.71 + (seed % 28) / 100,
    city: city(seed),
  };
});

// ===== CUSTOMERS =====
const COMPANY_PREFIXES = ["Bharat", "Sterling", "Pinnacle", "Vanguard", "Meridian", "Apex", "Cascade", "Orbit", "Summit", "Crest", "Horizon", "Vertex", "Quanta", "Nimbus", "Atlas", "Orion"];
const COMPANY_SUFFIXES = ["Logistics", "Industries", "Trading Co", "Manufacturing", "Supply Chain", "Distributors", "Enterprises", "Freight", "Movers", "Packers"];

export const CUSTOMERS: Customer[] = Array.from({ length: 24 }, (_, i) => {
  const seed = i + 31;
  const name = `${pick(COMPANY_PREFIXES, seed)} ${pick(COMPANY_SUFFIXES, seed * 3)}`;
  return {
    id: `cus-${seed}`,
    companyName: name,
    contactPerson: fullName(seed + 5),
    phone: `+91 ${(seed * 211 + 8000000000).toString().slice(0, 10)}`,
    gstin: gstin(seed),
    city: city(seed),
    activeTrips: seed % 9,
    outstandingBalance: inr((seed % 47) * 18400 + 3200),
    status: seed % 7 === 0 ? "Inactive" : "Active",
    email: `accounts@${name.toLowerCase().replace(/\s+/g, "")}.in`,
    paymentTerms: pick(["Net 15", "Net 30", "Net 45", "Advance", "COD"], seed),
    creditLimit: inr(200000 + (seed % 18) * 150000),
    accountManager: fullName(seed + 12),
    totalRevenue: inr(840000 + (seed % 73) * 94000),
  };
});

// ===== VENDORS =====
export const VENDORS: Vendor[] = Array.from({ length: 18 }, (_, i) => {
  const seed = i + 47;
  const name = `${pick(COMPANY_PREFIXES, seed)} ${pick(["Workshop", "Fuel Station", "Parts", "Tyres", "Transport", "Service"], seed * 2)}`;
  return {
    id: `ven-${seed}`,
    companyName: name,
    contactPerson: fullName(seed + 8),
    phone: `+91 ${(seed * 311 + 7000000000).toString().slice(0, 10)}`,
    gstin: gstin(seed * 2),
    city: city(seed * 3),
    type: pick<Vendor["type"]>(["Fuel Supplier", "Maintenance Workshop", "Spare Parts Supplier", "Third-Party Operator", "Tyre Supplier"], seed),
    status: seed % 9 === 0 ? "Inactive" : "Active",
    email: `contact@${name.toLowerCase().replace(/\s+/g, "")}.in`,
    paymentTerms: pick(["Net 15", "Net 30", "On Delivery", "Net 45"], seed),
    rating: 3.2 + (seed % 18) / 10,
  };
});

// ===== TRIPS =====
const STATUSES: Trip["status"][] = ["Planned", "Active", "In Transit", "Delivered", "Delivered", "Delivered", "Cancelled", "Breakdown"];

export const TRIPS: Trip[] = Array.from({ length: 40 }, (_, i) => {
  const seed = i + 59;
  const status = pick(STATUSES, seed);
  const veh = VEHICLES[seed % VEHICLES.length];
  const drv = DRIVERS[seed % DRIVERS.length];
  const cust = CUSTOMERS[seed % CUSTOMERS.length];
  const origin = city(seed);
  let dest = city(seed * 7 + 3);
  while (dest === origin) dest = city(seed * 11 + 7);
  const distance = 180 + (seed % 42) * 47 + (seed % 13) * 31;
  const freight = inr(distance * (14 + (seed % 8)) + (seed % 5) * 2400);
  return {
    id: `trip-${seed}`,
    tripId: `RZ-TRP-${String(seed).padStart(4, "0")}`,
    lrNumber: `RZ-LR-${String(seed * 7 + 101).padStart(5, "0")}`,
    consignor: cust.companyName,
    consignee: pick(CUSTOMERS, seed * 5).companyName,
    origin,
    destination: dest,
    vehicleId: veh.id,
    vehicleName: veh.name,
    driverId: drv.id,
    driverName: drv.name,
    status,
    createdDate: daysAgo(seed % 60),
    expectedDelivery: daysAhead((seed % 10) - 3),
    freightAmount: freight,
    paymentStatus: pick<Trip["paymentStatus"]>(["Unpaid", "Partially Paid", "Paid", "Paid", "Overdue"], seed),
    orderMode: pick<Trip["orderMode"]>(["FTL", "FTL", "LTL", "Part Load"], seed),
    eWayBill: seed % 4 === 0 ? undefined : `${String(seed * 8913 + 44000000000).slice(0, 12)}`,
    distanceKm: distance,
    customer: cust.companyName,
  };
});

// ===== LORRY RECEIPTS =====
export const LORRY_RECEIPTS: LorryReceipt[] = TRIPS.map((t, i) => ({
  id: `lr-${i + 1}`,
  lrNumber: t.lrNumber,
  tripId: t.tripId,
  consignor: t.consignor,
  consignee: t.consignee,
  origin: t.origin,
  destination: t.destination,
  date: t.createdDate,
  status: t.status === "Delivered" ? "Sent" : t.status === "Cancelled" ? "Archived" : "Generated",
  eWayBill: t.eWayBill,
  eWayBillExpiry: t.eWayBill ? daysAhead((i % 4) - 1) : undefined,
  freightAmount: t.freightAmount,
  freightTerm: pick<LorryReceipt["freightTerm"]>(["Paid", "To Be Billed", "To Pay"], i + 3),
}));

// ===== INVOICES =====
export const INVOICES: Invoice[] = Array.from({ length: 30 }, (_, i) => {
  const seed = i + 71;
  const cust = CUSTOMERS[seed % CUSTOMERS.length];
  const trip = TRIPS[seed % TRIPS.length];
  const amount = inr(14000 + (seed % 38) * 8400 + (seed % 7) * 1700);
  const taxRate = 0.18;
  const taxAmount = inr(amount * taxRate);
  const status = pick<Invoice["status"]>(["Draft", "Sent", "Partially Paid", "Paid", "Paid", "Overdue", "Credit Note"], seed);
  return {
    id: `inv-${seed}`,
    invoiceNumber: `RZ-INV-${String(seed * 3 + 2001).padStart(5, "0")}`,
    customer: cust.companyName,
    invoiceDate: daysAgo(seed % 75),
    dueDate: daysAgo((seed % 75) - 30),
    amount,
    taxAmount,
    totalAmount: amount + taxAmount,
    status,
    paymentStatus: status === "Paid" ? "Paid" : status === "Partially Paid" ? "Partially Paid" : status === "Overdue" ? "Overdue" : "Unpaid",
    tripRef: trip.tripId,
    igst: seed % 2 === 0 ? taxAmount : undefined,
    cgst: seed % 2 !== 0 ? inr(taxAmount / 2) : undefined,
    sgst: seed % 2 !== 0 ? inr(taxAmount / 2) : undefined,
  };
});

// ===== EXPENSES =====
const EXPENSE_CATS = ["Fuel", "Toll", "Maintenance", "Driver Allowance", "Loading/Unloading", "Permit Fee", "Repair", "PUC", "Misc"];
export const EXPENSES: Expense[] = Array.from({ length: 36 }, (_, i) => {
  const seed = i + 83;
  const cat = pick(EXPENSE_CATS, seed);
  return {
    id: `exp-${seed}`,
    date: daysAgo(seed % 45),
    category: cat,
    description: `${cat} - ${city(seed)} to ${city(seed * 3 + 5)}`,
    vehicle: VEHICLES[seed % VEHICLES.length].name,
    trip: TRIPS[seed % TRIPS.length].tripId,
    amount: inr(420 + (seed % 34) * 217 + (cat === "Fuel" ? 2400 : 0)),
    paymentMode: pick(["Cash", "UPI", "Card", "Fuel Card", "Bank Transfer"], seed),
    submittedBy: fullName(seed + 6),
    receiptStatus: seed % 4 === 0 ? "Missing" : "Attached",
  };
});

// ===== PAYMENTS =====
export const PAYMENTS: Payment[] = Array.from({ length: 28 }, (_, i) => {
  const seed = i + 95;
  return {
    id: `pay-${seed}`,
    voucherType: pick<Payment["voucherType"]>(["Advance", "Add Money", "Withdrawal", "Movement", "Truck Forwarding", "Settlement", "Recovery"], seed),
    referenceNumber: `RZ-VCH-${String(seed * 4 + 3001).padStart(5, "0")}`,
    date: daysAgo(seed % 30),
    party: pick([...DRIVERS.map((d) => d.name), ...CUSTOMERS.map((c) => c.companyName), ...VENDORS.map((v) => v.companyName)], seed),
    amount: inr(1200 + (seed % 29) * 1840),
    mode: pick(["UPI", "Bank Transfer", "Cash", "Card"], seed),
    status: pick<Payment["status"]>(["Pending", "Completed", "Completed", "Approved"], seed),
    linkedInvoice: seed % 3 === 0 ? INVOICES[seed % INVOICES.length].invoiceNumber : undefined,
    linkedTrip: seed % 2 === 0 ? TRIPS[seed % TRIPS.length].tripId : undefined,
  };
});

// ===== ISSUES =====
export const ISSUES: Issue[] = Array.from({ length: 22 }, (_, i) => {
  const seed = i + 107;
  const titles = [
    "Brake pad wear exceeding limit",
    "Clutch slipping under load",
    "Headlight assembly cracked",
    "Tyre pressure low - rear axle",
    "Engine overheating on incline",
    "Suspension noise from front",
    "Battery draining overnight",
    "PUC emission near threshold",
    "Windshield wiper motor failure",
    "Fuel gauge inaccurate reading",
    "Differential oil leak detected",
    "Speedometer intermittent",
  ];
  return {
    id: `iss-${seed}`,
    issueId: `RZ-ISS-${String(seed).padStart(4, "0")}`,
    title: pick(titles, seed),
    severity: pick<Issue["severity"]>(["Critical", "High", "Medium", "Low"], seed),
    vehicle: VEHICLES[seed % VEHICLES.length].name,
    reporter: fullName(seed + 4),
    assignee: fullName(seed + 9),
    status: pick<Issue["status"]>(["Open", "In Progress", "Pending Parts", "Resolved", "Closed"], seed),
    createdDate: daysAgo(seed % 40),
    resolutionDate: seed % 3 === 0 ? daysAgo(seed % 10) : undefined,
    source: pick<Issue["source"]>(["Manual", "Inspection", "Rean", "Fault Code"], seed),
    description: `Detected during ${pick(["routine check", "pre-trip inspection", "Rean anomaly scan", "driver report", "maintenance review"], seed)}. Requires ${pick(["immediate attention", "scheduled service", "parts replacement", "diagnostic review"], seed)}.`,
  };
});

// ===== INSPECTIONS =====
export const INSPECTIONS: Inspection[] = Array.from({ length: 24 }, (_, i) => {
  const seed = i + 119;
  return {
    id: `ins-${seed}`,
    inspectionId: `RZ-INS-${String(seed).padStart(4, "0")}`,
    type: pick(["Pre-Trip", "Post-Trip", "Monthly Safety", "Quarterly Comprehensive", "Random"], seed),
    vehicle: VEHICLES[seed % VEHICLES.length].name,
    driver: DRIVERS[seed % DRIVERS.length].name,
    inspector: fullName(seed + 7),
    date: daysAgo(seed % 50),
    result: pick<Inspection["result"]>(["Pass", "Pass", "Fail", "Conditional"], seed),
    odometer: inr(48000 + seed * 12340),
    linkedIssues: seed % 4 === 0 ? (seed % 3) + 1 : 0,
  };
});

// ===== WORK ORDERS =====
export const WORK_ORDERS: WorkOrder[] = Array.from({ length: 20 }, (_, i) => {
  const seed = i + 131;
  return {
    id: `wo-${seed}`,
    workOrderId: `RZ-WO-${String(seed).padStart(4, "0")}`,
    title: pick(["Brake overhaul", "Clutch replacement", "Annual service", "Tyre rotation", "Engine diagnostic", "Suspension repair", "Electrical fault fix", "Body work"], seed),
    vehicle: VEHICLES[seed % VEHICLES.length].name,
    type: pick<WorkOrder["type"]>(["Scheduled", "Unscheduled", "Recall", "Warranty"], seed),
    priority: pick<WorkOrder["priority"]>(["Urgent", "High", "Medium", "Low"], seed),
    vendor: VENDORS[seed % VENDORS.length].companyName,
    technician: fullName(seed + 11),
    status: pick<WorkOrder["status"]>(["Open", "In Progress", "Completed", "Completed", "Cancelled"], seed),
    createdDate: daysAgo(seed % 35),
    estimatedCompletion: daysAhead((seed % 14) - 7),
    actualCost: seed % 3 === 0 ? inr(2400 + (seed % 22) * 870) : undefined,
    estimatedCost: inr(1800 + (seed % 28) * 740),
  };
});

// ===== FUEL ENTRIES =====
export const FUEL_ENTRIES: FuelEntry[] = Array.from({ length: 34 }, (_, i) => {
  const seed = i + 143;
  const qty = 48 + (seed % 28) * 7 + (seed % 4) * 13;
  const price = 91.4 + (seed % 7) * 1.3;
  const anomaly = seed % 9 === 0;
  return {
    id: `fuel-${seed}`,
    date: daysAgo((seed % 60) / 2),
    vehicle: VEHICLES[seed % VEHICLES.length].name,
    driver: DRIVERS[seed % DRIVERS.length].name,
    station: pick(["HP Pump", "IOC Station", "Bharat Petroleum", "Shell Select", "Reliance Fuel"], seed),
    fuelType: "Diesel",
    quantity: qty,
    unitPrice: Math.round(price * 100) / 100,
    totalCost: inr(qty * price),
    odometer: inr(48000 + seed * 1340),
    efficiency: Math.round((3.4 + (seed % 4) * 0.7) * 10) / 10,
    anomaly,
    anomalyNote: anomaly ? "Quantity exceeds tank capacity by 18% - possible overfill or theft." : undefined,
  };
});

// ===== DOCUMENTS =====
const DOC_TYPES = ["Fitness Certificate", "Insurance Certificate", "Road Tax", "National Permit", "State Permit", "PUC Certificate", "Driving License", "Medical Certificate", "GST Certificate", "PAN", "Aadhaar", "Contract"];
export const DOCUMENTS: DocumentRecord[] = Array.from({ length: 30 }, (_, i) => {
  const seed = i + 155;
  const type = pick(DOC_TYPES, seed);
  const expiryDays = (seed % 90) - 30;
  return {
    id: `doc-${seed}`,
    name: `${type} - ${VEHICLES[seed % VEHICLES.length].licensePlate}`,
    type,
    entityType: seed % 3 === 0 ? "Driver" : "Vehicle",
    entityName: seed % 3 === 0 ? DRIVERS[seed % DRIVERS.length].name : VEHICLES[seed % VEHICLES.length].name,
    issueDate: daysAgo(180 + (seed % 200)),
    expiryDate: daysAhead(expiryDays),
    status: expiryDays < 0 ? "Expired" : expiryDays < 30 ? "Expiring Soon" : "Valid",
    uploadedBy: fullName(seed + 13),
    uploadDate: daysAgo(150 + (seed % 100)),
  };
});

// ===== REMINDERS =====
export const REMINDERS: Reminder[] = Array.from({ length: 24 }, (_, i) => {
  const seed = i + 167;
  const days = (seed % 45) - 10;
  return {
    id: `rem-${seed}`,
    type: seed % 2 === 0 ? "Service" : "Renewal",
    entity: VEHICLES[seed % VEHICLES.length].name,
    entityType: "Vehicle",
    name: seed % 2 === 0 ? "Periodic service due" : pick(["Insurance renewal", "Permit renewal", "Fitness renewal", "PUC renewal"], seed),
    dueDate: daysAhead(days),
    daysRemaining: days,
    status: days < 0 ? "Overdue" : days < 7 ? "Due Soon" : "Upcoming",
  };
});

// ===== NOTIFICATIONS =====
// Tone: savage / witty / teasing - a smart-aleck ops buddy who roasts
// the user gently while still being informative. PG, never abusive.
export const NOTIFICATIONS: Notification[] = [
  // --- Existing 8 (rewritten, category/severity/timestamp/link/read preserved) ---
  { id: "n1", category: "Compliance", title: "Insurance expires in 6 days. We told you last week.", description: "MH 12 JK 4521's cover lapses Monday. Renew it, or park it. Those are the options.", timestamp: daysAgo(0.02), read: false, link: { module: "documents" }, severity: "warning" },
  { id: "n2", category: "Rean", title: "22% fuel overfill. Someone's filling more than the tank.", description: "Rean caught an overfill on Eicher Pro 3015 at HP Pump. Investigate before the bill arrives.", timestamp: daysAgo(0.05), read: false, link: { module: "fuel-energy" }, severity: "critical" },
  { id: "n3", category: "Invoice", title: "Invoice RZ-INV-02147 is 18 days overdue. Awkward.", description: "Meridian Trading Co owes ₹84,200. They're not picking up. You know what to do.", timestamp: daysAgo(0.1), read: false, link: { module: "invoice" }, severity: "warning" },
  { id: "n4", category: "Trip", title: "Trip RZ-TRP-0042 delivered. POD and all. Be shocked.", description: "Pune delivery closed, POD captured, invoice generated. This is what 'on time' looks like.", timestamp: daysAgo(0.2), read: false, link: { module: "trips", id: "trip-42" }, severity: "info" },
  { id: "n5", category: "Vehicle", title: "Ashok Leyland 1616 IL broke down on NH-48. Naturally.", description: "Breakdown near Surat. Send help. And snacks for the driver.", timestamp: daysAgo(0.3), read: true, link: { module: "fleet-map" }, severity: "critical" },
  { id: "n6", category: "Maintenance", title: "BharatBenz 3123 FM is due for service. Yes, again.", description: "Periodic service in 3 days. Skipping it is a choice. A bad one.", timestamp: daysAgo(0.5), read: true, link: { module: "services" }, severity: "info" },
  { id: "n7", category: "Payment", title: "Kuldeep Singh's settlement approved. He's grinning.", description: "₹18,420 net payable. Releasing it before he asks twice would be nice.", timestamp: daysAgo(0.8), read: true, link: { module: "payments" }, severity: "info" },
  { id: "n8", category: "Rean", title: "Rean found ₹38,000 hiding in your deadhead miles.", description: "Consolidate Pune-Bengaluru return loads. 14% less empty running. You're welcome.", timestamp: daysAgo(1), read: true, link: { module: "dashboard" }, severity: "info" },

  // --- 8 brand-new savage notifications (tyre, idle, GST, customer block,
  //     fuel theft, odo tampering, route deviation, payroll pending) ---
  { id: "n9", category: "Vehicle", title: "Front-left tyre on MH 12 JK 4521 is at 64 PSI. Soft.", description: "Recommended 90 PSI. Inflate it before it becomes a 'situation' on the highway.", timestamp: daysAgo(0.04), read: false, link: { module: "vehicles" }, severity: "warning" },
  { id: "n10", category: "Trip", title: "Kuldeep's been idle 2h 14m at a dhaba. Suspicious.", description: "Trip RZ-TRP-0039 hasn't moved since 14:22. Call, or pretend not to notice.", timestamp: daysAgo(0.07), read: false, link: { module: "fleet-map" }, severity: "warning" },
  { id: "n11", category: "Compliance", title: "GSTR-3B due in 36 hours. The portal doesn't accept excuses.", description: "April return filing window closes Thursday. Reconcile, file, then sleep.", timestamp: daysAgo(0.12), read: false, link: { module: "compliance" }, severity: "critical" },
  { id: "n12", category: "Invoice", title: "Vanguard Distributors is now on credit hold. Their fault.", description: "3 invoices overdue, 47 days average. Future LRs auto-blocked until they settle.", timestamp: daysAgo(0.18), read: false, link: { module: "customers" }, severity: "warning" },
  { id: "n13", category: "Rean", title: "Rean thinks someone's siphoning diesel. Rean's usually right.", description: "Tank dipped 38 L overnight on parked vehicle MH 14 GH 9921. Camera, maybe?", timestamp: daysAgo(0.22), read: false, link: { module: "fuel-energy" }, severity: "critical" },
  { id: "n14", category: "Vehicle", title: "Odometer on Tata LPT 1613 went backwards. Physics says no.", description: "Reading dropped 412 km between two GPS pings. Audit the log, then the driver.", timestamp: daysAgo(0.28), read: false, link: { module: "vehicles" }, severity: "critical" },
  { id: "n15", category: "Trip", title: "Trip RZ-TRP-0038 took a 47 km detour. Tourism?", description: "Vehicle left the planned corridor near Nagpur. ETA pushed 1h 20m. Ask why.", timestamp: daysAgo(0.35), read: true, link: { module: "trips", id: "trip-38" }, severity: "warning" },
  { id: "n16", category: "Payment", title: "Payroll for 32 drivers is pending. They noticed.", description: "Cycle closes Friday. ₹4.82L net payable. Process before the union does.", timestamp: daysAgo(0.45), read: true, link: { module: "payroll" }, severity: "warning" },
];

// ===== CHAT CONVERSATIONS =====
export const CONVERSATIONS: Conversation[] = [
  // Channels (team-wide, joinable)
  {
    id: "c1", name: "#operations", type: "channel",
    participants: ["owner", "ops-manager", "dispatcher", "driver"],
    lastMessage: "Trip RZ-TRP-0042 delivered. POD captured.",
    lastTimestamp: daysAgo(0.02), unread: 2, isMember: true,
    description: "Daily ops coordination - dispatch, exceptions, POD.",
    topic: "Mumbai–Pune–Bengaluru corridor",
  },
  {
    id: "c2", name: "#finance", type: "channel",
    participants: ["owner", "finance-manager"],
    lastMessage: "Rean flagged invoice RZ-INV-02147 overdue 18 days.",
    lastTimestamp: daysAgo(0.1), unread: 1, isMember: true,
    description: "Invoices, payments, settlements, GST.",
    topic: "AR/AP + reconciliations",
  },
  {
    id: "c3", name: "#fleet-maintenance", type: "channel",
    participants: ["owner", "fleet-manager", "ops-manager"],
    lastMessage: "Brake overhaul scheduled for MH 12 JK 4521 tomorrow.",
    lastTimestamp: daysAgo(0.3), unread: 0, isMember: true,
    description: "Work orders, parts, inspections, recalls.",
    topic: "Preventive + corrective maintenance",
  },
  {
    id: "c-general", name: "#general", type: "channel",
    participants: ["owner", "ops-manager", "fleet-manager", "finance-manager", "dispatcher", "driver", "analyst"],
    lastMessage: "Welcome to Reanzly. Every move tracked, every rupee accounted.",
    lastTimestamp: daysAgo(2), unread: 0, isMember: true,
    description: "Company-wide announcements & watercooler.",
    topic: "All hands",
  },
  {
    id: "c-incidents", name: "#incidents", type: "channel",
    participants: ["owner", "ops-manager", "fleet-manager", "dispatcher"],
    lastMessage: "Breakdown on NH-48 - replacement vehicle dispatched.",
    lastTimestamp: daysAgo(0.05), unread: 3, isMember: true,
    description: "Live incident response. Post here first when something breaks.",
    topic: "Sev-1 / Sev-2 incidents only",
  },
  {
    id: "c-ops-mumbai", name: "#ops-mumbai", type: "channel",
    participants: ["owner", "ops-manager", "dispatcher"],
    lastMessage: "Mumbai yard has 4 vehicles waiting for assignment.",
    lastTimestamp: daysAgo(0.5), unread: 0, isMember: false,
    description: "Mumbai branch dispatch & yard ops.",
    topic: "MH-12 / MH-04 fleet",
  },
  {
    id: "c-fuel", name: "#fuel-energy", type: "channel",
    participants: ["owner", "fleet-manager", "finance-manager"],
    lastMessage: "Diesel spend up 7.8% WoW - Rean flagged 22% overfill on Eicher Pro 3015.",
    lastTimestamp: daysAgo(0.4), unread: 0, isMember: false,
    description: "Fuel logs, anomalies, efficiency targets.",
    topic: "Cost-per-km watchlist",
  },
  {
    id: "c-compliance", name: "#compliance", type: "channel",
    participants: ["owner", "fleet-manager", "analyst"],
    lastMessage: "4 documents expiring within 7 days. Action required.",
    lastTimestamp: daysAgo(0.7), unread: 0, isMember: false,
    description: "Permits, fitness, insurance, PUC, driver licenses.",
    topic: "RTO + IRP deadlines",
  },
  {
    id: "c-random", name: "#random", type: "channel",
    participants: ["owner", "ops-manager", "fleet-manager", "finance-manager", "dispatcher", "driver", "analyst"],
    lastMessage: "Anyone got the cricket score?",
    lastTimestamp: daysAgo(1.5), unread: 0, isMember: false,
    description: "Off-topic. Mute if you must.",
    topic: "Not work",
  },

  // Group DMs (3+ people)
  {
    id: "g1", name: "Ops + Finance", type: "group",
    participants: ["owner", "ops-manager", "finance-manager"],
    lastMessage: "Need GST detail on the Pune-Bengaluru consolidated invoice.",
    lastTimestamp: daysAgo(0.6), unread: 0,
  },
  {
    id: "g2", name: "Breakdown war room", type: "group",
    participants: ["owner", "ops-manager", "fleet-manager", "dispatcher"],
    lastMessage: "Replacement vehicle arrived. Customer informed.",
    lastTimestamp: daysAgo(0.9), unread: 0,
  },

  // 1:1 DMs
  {
    id: "c4", name: "Rean", type: "direct",
    participants: ["owner", "rean"],
    lastMessage: "Route profitability analysis: Mumbai-Delhi lane margin down 3.2% this quarter.",
    lastTimestamp: daysAgo(0.5), unread: 1,
  },
  {
    id: "c5", name: "Rohit Sharma", type: "direct",
    participants: ["owner", "ops-manager"],
    lastMessage: "Need a replacement vehicle for breakdown on NH-48.",
    lastTimestamp: daysAgo(1), unread: 0,
  },
  {
    id: "d-finance", name: "Reena Mehta", type: "direct",
    participants: ["owner", "finance-manager"],
    lastMessage: "GST reconciliation for Q2 done. Variance ₹1,240 - within tolerance.",
    lastTimestamp: daysAgo(0.8), unread: 0,
  },
  {
    id: "d-fleet", name: "Sukhbir Gill", type: "direct",
    participants: ["owner", "fleet-manager"],
    lastMessage: "BharatBenz 3123 FM service scheduled for Friday.",
    lastTimestamp: daysAgo(1.2), unread: 0,
  },
  {
    id: "d-dispatch", name: "Anil Reddy", type: "direct",
    participants: ["owner", "dispatcher"],
    lastMessage: "Three Bengaluru-Pune inquiries pending. Matching to return legs.",
    lastTimestamp: daysAgo(1.7), unread: 0,
  },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // #operations
  { id: "m1", conversationId: "c1", sender: "Rohit Sharma", senderId: "ops-manager", senderRole: "Operations Manager", text: "Trip RZ-TRP-0042 from Mumbai to Pune - driver confirmed pickup at 06:40.", timestamp: daysAgo(0.1), read: true },
  { id: "m2", conversationId: "c1", sender: "Anil Reddy", senderId: "dispatcher", senderRole: "Dispatcher", text: "Got it. Vehicle MH 12 JK 4521 is active on the fleet map. ETA 09:15.", timestamp: daysAgo(0.09), read: true },
  {
    id: "m3", conversationId: "c1", sender: "Kuldeep Singh", senderId: "driver", senderRole: "Driver",
    text: "Delivered. Capturing POD now - 48 packages confirmed, no damage. @[Vikram Deshmukh](owner) fyi.",
    timestamp: daysAgo(0.02), read: false,
    reactions: [{ emoji: "ack", users: ["owner", "ops-manager"] }, { emoji: "ack", users: ["dispatcher"] }],
  },
  {
    id: "m3a", conversationId: "c1", sender: "Vikram Deshmukh", senderId: "owner", senderRole: "Owner",
    text: "Outstanding. Generate invoice against #operations LR RZ-LR-00342.",
    timestamp: daysAgo(0.015), read: false, pinned: true,
  },

  // #finance
  {
    id: "m4", conversationId: "c2", sender: "Rean", senderId: "rean", senderRole: "AI", isRean: true,
    text: "Invoice RZ-INV-02147 for Meridian Trading Co is 18 days overdue (₹84,200). Recommendation: escalate to finance manager and send a firm reminder with pay-now link. Reply to approve.",
    timestamp: daysAgo(0.1), read: false,
  },

  // #incidents - pinned + threaded
  {
    id: "mi1", conversationId: "c-incidents", sender: "Rohit Sharma", senderId: "ops-manager", senderRole: "Operations Manager",
    text: "Sev-1: Ashok Leyland 1616 IL tyre burst on NH-48 near Surat. Driver safe. @[Sukhbir Gill](fleet-manager) @[Anil Reddy](dispatcher) need replacement vehicle ASAP.",
    timestamp: daysAgo(0.08), read: false, pinned: true,
    reactions: [{ emoji: "flag", users: ["owner", "fleet-manager", "dispatcher"] }],
  },
  {
    id: "mi2", conversationId: "c-incidents", sender: "Sukhbir Gill", senderId: "fleet-manager", senderRole: "Fleet Manager",
    text: "On it. Tata LPT 1613 (MH 12 JK 4477) is 22 km away. Routing now.",
    timestamp: daysAgo(0.07), read: false,
  },
  {
    id: "mi3", conversationId: "c-incidents", sender: "Anil Reddy", senderId: "dispatcher", senderRole: "Dispatcher",
    text: "Replacement dispatched. ETA 35 min. Customer (Meridian) informed of 1h delay.",
    timestamp: daysAgo(0.05), read: false, parentId: "mi1",
    reactions: [{ emoji: "ack", users: ["owner", "ops-manager"] }],
  },
  {
    id: "mi4", conversationId: "c-incidents", sender: "Vikram Deshmukh", senderId: "owner", senderRole: "Owner",
    text: "Good. Post-incident review tomorrow 10:00 in #operations.",
    timestamp: daysAgo(0.04), read: false, parentId: "mi1",
  },

  // Rean DM
  {
    id: "m5", conversationId: "c4", sender: "Rean", senderId: "rean", senderRole: "AI", isRean: true,
    text: "Route profitability analysis for Q2: Mumbai-Delhi lane margin is down 3.2% driven by a 7.8% rise in toll costs and a 4.1% drop in realised freight. Three carriers are running this lane below cost. Suggest renegotiating the rate card with Meridian and consolidating return-leg loads to cut deadhead.",
    timestamp: daysAgo(0.5), read: false,
  },

  // 1:1 with Rohit - DM with read receipts
  {
    id: "m6", conversationId: "c5", sender: "Rohit Sharma", senderId: "ops-manager", senderRole: "Operations Manager",
    text: "Need a replacement vehicle for breakdown on NH-48 near Surat. Ashok Leyland 1616 IL, tyre burst.",
    timestamp: daysAgo(1), read: true, readBy: ["owner"],
  },
  {
    id: "m7", conversationId: "c5", sender: "Vikram Deshmukh", senderId: "owner", senderRole: "Owner",
    text: "Run the Replacement Wizard. Rank by proximity and compliance. Keep the customer informed.",
    timestamp: daysAgo(0.95), read: true, readBy: ["ops-manager"],
  },

  // #general - welcome
  {
    id: "mg1", conversationId: "c-general", sender: "Vikram Deshmukh", senderId: "owner", senderRole: "Owner",
    text: "Welcome to Reanzly. Every move tracked, every rupee accounted.",
    timestamp: daysAgo(2), read: true, pinned: true,
    reactions: [{ emoji: "ack", users: ["ops-manager", "fleet-manager", "finance-manager", "dispatcher", "driver", "analyst"] }],
  },

  // #fleet-maintenance
  {
    id: "mf1", conversationId: "c3", sender: "Sukhbir Gill", senderId: "fleet-manager", senderRole: "Fleet Manager",
    text: "Brake overhaul scheduled for MH 12 JK 4521 tomorrow 07:00 at Pune workshop. @[Anil Reddy](dispatcher) - please reassign morning trips.",
    timestamp: daysAgo(0.3), read: true,
  },
];

// ===== DASHBOARD WIDGETS =====
export const DASHBOARD_WIDGETS: Widget[] = [
  { id: "w1", title: "Active Trips", module: "Trips", cols: 3, type: "stat" },
  { id: "w2", title: "Trip Completion Rate", module: "Trips", cols: 3, type: "stat" },
  { id: "w3", title: "Revenue This Period", module: "Finance", cols: 3, type: "stat" },
  { id: "w4", title: "Pending Lorry Receipts", module: "LR", cols: 3, type: "stat" },
  { id: "w5", title: "Vehicle Status Distribution", module: "Fleet", cols: 6, type: "chart" },
  { id: "w6", title: "Top Vehicles by Distance", module: "Fleet", cols: 6, type: "list" },
  { id: "w7", title: "Outstanding Invoices", module: "Finance", cols: 4, type: "alert" },
  { id: "w8", title: "Document Expiry Alerts", module: "Compliance", cols: 4, type: "alert" },
  { id: "w9", title: "Rean Recommendations", module: "Rean", cols: 4, type: "rean" },
  { id: "w10", title: "Fuel Cost Trend", module: "Fuel", cols: 6, type: "chart" },
  { id: "w11", title: "Anomaly Alerts", module: "Rean", cols: 6, type: "alert" },
  { id: "w12", title: "Open Issues by Assignee", module: "Issues", cols: 6, type: "list" },
];

// ===== KPI STATS (organic, messy numbers) =====
export const KPI_STATS = {
  activeTrips: TRIPS.filter((t) => t.status === "Active" || t.status === "In Transit").length,
  completionRate: 91.4,
  revenueThisPeriod: inr(4827400),
  pendingLR: LORRY_RECEIPTS.filter((l) => l.status === "Generated").length,
  vehicleActive: VEHICLES.filter((v) => v.status === "Active").length,
  vehicleIdle: VEHICLES.filter((v) => v.status === "Idle").length,
  vehicleMaintenance: VEHICLES.filter((v) => v.status === "In Maintenance").length,
  vehicleOffline: VEHICLES.filter((v) => v.status === "Offline").length,
  outstandingInvoices: INVOICES.filter((i) => i.status === "Overdue" || i.status === "Sent").length,
  outstandingAmount: inr(842600),
  fuelCostThisPeriod: inr(1284400),
  costPerKm: 14.7,
  openIssues: ISSUES.filter((i) => i.status === "Open" || i.status === "In Progress").length,
  overdueInspections: 4,
  inspectionPassRate: 87.3,
  complianceRate: 94.1,
};

// ===== REAN RECOMMENDATIONS =====
export const REAN_RECOMMENDATIONS = [
  {
    id: "rec1",
    title: "Chase invoice RZ-INV-02147 - 18 days overdue",
    reason: "Meridian Trading Co has a history of paying on day 22. This one is at day 18 with no acknowledgment. A firm reminder now recovers it before it crosses 30.",
    action: "Send reminder",
    impact: "₹84,200 recovery",
    severity: "high" as const,
  },
  {
    id: "rec2",
    title: "Service Tata LPT 1613 before next long-haul",
    reason: "Brake pad wear is at 87% of limit and the vehicle is assigned to a 1,420 km trip tomorrow. Servicing now avoids a roadside failure on NH-48.",
    action: "Create work order",
    impact: "Prevents breakdown",
    severity: "medium" as const,
  },
  {
    id: "rec3",
    title: "Consolidate Pune-Bengaluru return loads",
    reason: "Three trucks returned empty from Bengaluru last week. Matching them to the 2 pending Bengaluru-Pune inquiries cuts deadhead by 14% and recovers ₹38,000 in lost freight.",
    action: "Open matching",
    impact: "₹38,000 margin recovery",
    severity: "high" as const,
  },
];

export const REAN_ANOMALIES = [
  { id: "a1", type: "Fuel Overfill", entity: "Eicher Pro 3015", detail: "22% overfill at HP Pump - possible theft or meter tampering.", severity: "critical" as const, time: daysAgo(0.05) },
  { id: "a2", type: "Route Deviation", entity: "Trip RZ-TRP-0038", detail: "Vehicle deviated 47 km from planned corridor near Nagpur.", severity: "warning" as const, time: daysAgo(0.2) },
  { id: "a3", type: "POD Variance", entity: "Trip RZ-TRP-0041", detail: "Packages received 46 vs consigned 48. Shortage of 2.", severity: "warning" as const, time: daysAgo(0.4) },
  { id: "a4", type: "Duplicate LR", entity: "LR RZ-LR-00347", detail: "Same consignor-destination pair generated within 4 minutes. Possible duplicate.", severity: "info" as const, time: daysAgo(0.8) },
  { id: "a5", type: "Off-pattern Discount", entity: "Invoice RZ-INV-02144", detail: "Discount of 8.4% applied - 2.4% above rate card threshold for this customer.", severity: "info" as const, time: daysAgo(1.2) },
];

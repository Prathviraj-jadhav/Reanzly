"use client";

// ===== Formatters =====
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return "just now";
}

export function daysFromNow(date: string | Date): string {
  const diff = new Date(date).getTime() - Date.now();
  const day = Math.round(diff / 86400000);
  if (day === 0) return "Today";
  if (day > 0) return `in ${day} day${day === 1 ? "" : "s"}`;
  return `${Math.abs(day)} day${Math.abs(day) === 1 ? "" : "s"} ago`;
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function licenseExpiryBadge(
  iso?: string,
): { variant: "solid" | "outline" | "muted"; pulse?: boolean; label: string } {
  const days = daysUntil(iso);
  if (days === null) return { variant: "muted", label: "-" };
  if (days < 0) return { variant: "solid", label: `Expired ${Math.abs(days)}d` };
  if (days <= 30) return { variant: "solid", pulse: true, label: `${days}d left` };
  if (days <= 90) return { variant: "outline", label: `${days}d left` };
  return { variant: "muted", label: `${days}d left` };
}

// ===== Constants =====
export const VEHICLE_STATUSES = [
  "Active",
  "Idle",
  "In Maintenance",
  "Offline",
] as const;

export const VEHICLE_TYPES = [
  "Tractor",
  "Trailer",
  "Tanker",
  "Container",
  "Flatbed",
  "Tipper",
  "Pickup",
  "Mini Truck",
];

export const VEHICLE_GROUPS = [
  "Line Haul",
  "City Delivery",
  "Long Haul",
  "Specialized",
  "Attached Fleet",
];

export const OWNERSHIP_TYPES = ["Owned", "Leased", "Attached"] as const;

export const FUEL_TYPES = ["Diesel", "CNG", "Petrol", "Electric", "LNG"];

export const BODY_TYPES = [
  "Flatbed",
  "Box Body",
  "Container",
  "Tanker",
  "Tipper",
  "Refrigerated",
  "Low Loader",
];

export const TRANSMISSION_TYPES = ["Manual", "Automatic", "AMT", "Automated Manual"];

export const LOAN_LEASE_TYPES = [
  "Outright Purchase",
  "Bank Loan",
  "Finance Lease",
  "Operating Lease",
  "Hire Purchase",
  "Attached (Owner-Operated)",
];

export const MEASUREMENT_UNITS = ["Metric (km, L, kg)", "Imperial (mi, gal, lb)"];

export const SERVICE_TYPES = [
  "Periodic A",
  "Periodic B",
  "Periodic C",
  "Annual",
  "Oil Change",
  "Brake Service",
  "Tyre Rotation",
  "Engine Diagnostic",
  "Coolant Flush",
  "Major Overhaul",
];

export const TRIGGER_TYPES = ["Distance", "Time", "Engine Hours", "Distance or Time"];

export const RENEWAL_TYPES = [
  "Fitness Certificate",
  "Insurance",
  "National Permit",
  "State Permit",
  "PUC Certificate",
  "Road Tax",
];

export const SECTIONS = [
  { id: "details", label: "Details" },
  { id: "maintenance", label: "Maintenance" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "financial", label: "Financial" },
  { id: "specifications", label: "Specifications" },
  { id: "settings", label: "Settings" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

// ===== Onboarding form =====
export interface VehicleOnboardingForm {
  // Details
  name: string;
  type: string;
  status: string;
  ownership: string;
  labels: string;
  vin: string;
  licensePlate: string;
  // Maintenance
  serviceProgram: string;
  preferredVendor: string;
  defaultTechnician: string;
  // Lifecycle
  inServiceDate: string;
  inServiceOdometer: string;
  lifeEstimateMonths: string;
  lifeEstimateDistance: string;
  estimatedResale: string;
  outOfServiceDate: string;
  // Financial
  purchaseVendor: string;
  purchaseDate: string;
  purchasePrice: string;
  purchaseOdometer: string;
  purchaseNotes: string;
  loanLeaseType: string;
  // Specifications - Dimensions
  specWidth: string;
  specHeight: string;
  specLength: string;
  specVolume: string;
  // Specifications - Weight
  specWeight: string;
  specCurbWeight: string;
  specGvwr: string;
  // Specifications - Performance
  specTowing: string;
  specPayload: string;
  // Specifications - Fuel Economy
  specCity: string;
  specHighway: string;
  specCombined: string;
  // Specifications - Engine
  engineSummary: string;
  engineBrand: string;
  engineAspiration: string;
  engineBlock: string;
  engineBore: string;
  engineCam: string;
  engineCompression: string;
  engineCylinders: string;
  engineDisplacement: string;
  engineInduction: string;
  engineHp: string;
  engineTorque: string;
  engineRedline: string;
  engineStroke: string;
  engineValves: string;
  // Specifications - Transmission
  transSummary: string;
  transBrand: string;
  transType: string;
  transGears: string;
  // Specifications - Wheels/Tyres
  wheelBrake: string;
  wheelFrontTrack: string;
  wheelRearTrack: string;
  wheelbase: string;
  wheelDiameterFront: string;
  wheelDiameterRear: string;
  axleConfig: string;
  tyreType: string;
  tyrePsi: string;
  // Specifications - Fuel/Oil
  fuelQuality: string;
  fuelTankCapacity: string;
  oilSpec: string;
  // Settings
  measurementUnit: string;
  gpsIntegration: boolean;
  fuelCardIntegration: boolean;
}

export const EMPTY_VEHICLE_FORM: VehicleOnboardingForm = {
  name: "",
  type: "Tractor",
  status: "Active",
  ownership: "Owned",
  labels: "",
  vin: "",
  licensePlate: "",
  serviceProgram: "Standard 20k km program",
  preferredVendor: "",
  defaultTechnician: "",
  inServiceDate: new Date().toISOString().slice(0, 10),
  inServiceOdometer: "0",
  lifeEstimateMonths: "120",
  lifeEstimateDistance: "800000",
  estimatedResale: "",
  outOfServiceDate: "",
  purchaseVendor: "",
  purchaseDate: "",
  purchasePrice: "",
  purchaseOdometer: "",
  purchaseNotes: "",
  loanLeaseType: "Outright Purchase",
  specWidth: "2500",
  specHeight: "3450",
  specLength: "9600",
  specVolume: "",
  specWeight: "",
  specCurbWeight: "7800",
  specGvwr: "16200",
  specTowing: "25000",
  specPayload: "8400",
  specCity: "3.4",
  specHighway: "4.6",
  specCombined: "4.0",
  engineSummary: "",
  engineBrand: "Cummins",
  engineAspiration: "Turbocharged",
  engineBlock: "Cast Iron",
  engineBore: "107",
  engineCam: "SOHC",
  engineCompression: "17.3:1",
  engineCylinders: "6",
  engineDisplacement: "5883",
  engineInduction: "Variable Geometry Turbo",
  engineHp: "210",
  engineTorque: "850",
  engineRedline: "2800",
  engineStroke: "124",
  engineValves: "12",
  transSummary: "",
  transBrand: "Eaton",
  transType: "Manual",
  transGears: "9",
  wheelBrake: "Air Drum",
  wheelFrontTrack: "1990",
  wheelRearTrack: "1840",
  wheelbase: "5400",
  wheelDiameterFront: "1004",
  wheelDiameterRear: "1004",
  axleConfig: "4x2",
  tyreType: "Radial 11R20",
  tyrePsi: "110",
  fuelQuality: "BS-VI Diesel",
  fuelTankCapacity: "365",
  oilSpec: "15W-40 CI-4",
  measurementUnit: "Metric (km, L, kg)",
  gpsIntegration: true,
  fuelCardIntegration: true,
};

// Tyre positions for a 4x2 tractor - 6 wheels (2 front, 4 rear dual)
export interface TyrePosition {
  id: string;
  position: string;
  axle: string;
  side: "L" | "R";
  inner?: boolean;
}

export const TYRE_POSITIONS: TyrePosition[] = [
  { id: "fl1", position: "Front Left", axle: "Front", side: "L" },
  { id: "fr1", position: "Front Right", axle: "Front", side: "R" },
  { id: "rl-outer", position: "Rear Left Outer", axle: "Rear", side: "L", inner: false },
  { id: "rl-inner", position: "Rear Left Inner", axle: "Rear", side: "L", inner: true },
  { id: "rr-outer", position: "Rear Right Outer", axle: "Rear", side: "R", inner: false },
  { id: "rr-inner", position: "Rear Right Inner", axle: "Rear", side: "R", inner: true },
];

// ===== Seeded RNG (deterministic per-vehicle sub-data) =====
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

export function vehicleSeed(vehicleId: string): number {
  const m = vehicleId.match(/\d+/);
  return m ? parseInt(m[0], 10) : 1;
}

// ===== Tyre sub-data =====
export interface TyreRecord {
  positionId: string;
  positionLabel: string;
  brand: string;
  treadDepth: number; // mm
  pressure: number; // psi
  odometerAtFitment: number;
  currentOdometer: number;
  status: "Good" | "Worn" | "Critical";
}

export function generateTyres(vehicleId: string, currentMeter: number): TyreRecord[] {
  const seed = vehicleSeed(vehicleId);
  const rand = seededRandom(seed * 17 + 3);
  const brands = ["Apollo", "MRF", "CEAT", "JK Tyre", "Bridgestone", "Goodyear"];
  return TYRE_POSITIONS.map((p, i) => {
    const r = seededRandom(seed * 19 + i * 7 + 1)();
    const tread = Math.round((4 + r * 11) * 10) / 10; // 4–15 mm
    const pressure = Math.round((95 + r * 25) * 10) / 10; // 95–120 psi
    const kmOnTyre = Math.floor(r * 80000);
    const status: TyreRecord["status"] =
      tread < 4 ? "Critical" : tread < 8 ? "Worn" : "Good";
    return {
      positionId: p.id,
      positionLabel: p.position,
      brand: brands[Math.floor(rand() * brands.length)],
      treadDepth: tread,
      pressure,
      odometerAtFitment: Math.max(0, currentMeter - kmOnTyre),
      currentOdometer: currentMeter,
      status,
    };
  });
}

// ===== Service history =====
export interface ServiceHistoryRow {
  id: string;
  date: string;
  type: "Scheduled" | "Breakdown" | "Corrective";
  garage: string;
  odometer: number;
  cost: number;
  partsReplaced: string;
  status: "Completed" | "In Progress" | "Scheduled";
  nextServiceDue: string;
}

export function generateServiceHistory(vehicleId: string, currentMeter: number): ServiceHistoryRow[] {
  const seed = vehicleSeed(vehicleId);
  const rand = seededRandom(seed * 23 + 5);
  const garages = ["Bharat Workshop", "Sterling Service Centre", "Pinnacle Garage", "Apex Fleet Care", "Authorized OEM"];
  const partsPool = [
    "Oil filter + 15W-40 (18L)",
    "Air filter element",
    "Brake pads (front)",
    "Clutch plate + pressure plate",
    "Coolant refill (12L)",
    "Diesel filter",
    "Wheel bearings (rear)",
  ];
  const types: ServiceHistoryRow["type"][] = ["Scheduled", "Breakdown", "Corrective"];
  const statuses: ServiceHistoryRow["status"][] = ["Completed", "Completed", "Completed", "In Progress", "Scheduled"];
  const rows: ServiceHistoryRow[] = [];
  const count = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const daysAgo = i * 28 + Math.floor(rand() * 14);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const odo = Math.max(0, currentMeter - i * (8000 + Math.floor(rand() * 4000)));
    const type = i === 0 && rand() > 0.5 ? "Scheduled" : types[Math.floor(rand() * types.length)];
    const status = i === 0 ? statuses[Math.floor(rand() * statuses.length)] : "Completed";
    const nextServiceDue = new Date(Date.now() + (45 - i * 7) * 86400000).toISOString();
    rows.push({
      id: `svc-${vehicleId}-${i}`,
      date,
      type,
      garage: garages[Math.floor(rand() * garages.length)],
      odometer: odo,
      cost: 1800 + Math.floor(rand() * 24) * 480,
      partsReplaced: partsPool[Math.floor(rand() * partsPool.length)],
      status,
      nextServiceDue,
    });
  }
  return rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

// ===== Vehicle photo catalog =====
export interface VehiclePhoto {
  id: string;
  label: string;
  category: "Front" | "Rear" | "Side" | "Interior" | "Damage";
  uploadedBy: string;
  uploadedAt: string;
}

export function generatePhotos(vehicleId: string): VehiclePhoto[] {
  const seed = vehicleSeed(vehicleId);
  const rand = seededRandom(seed * 31 + 7);
  const by = ["Fleet Manager", "Driver Self", "Workshop", "Inspector"];
  const list: Omit<VehiclePhoto, "id">[] = [
    { label: "Front 3/4 view", category: "Front", uploadedBy: by[Math.floor(rand() * by.length)], uploadedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
    { label: "Rear doors closed", category: "Rear", uploadedBy: by[Math.floor(rand() * by.length)], uploadedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
    { label: "Left side profile", category: "Side", uploadedBy: by[Math.floor(rand() * by.length)], uploadedAt: new Date(Date.now() - 28 * 86400000).toISOString() },
    { label: "Right side profile", category: "Side", uploadedBy: by[Math.floor(rand() * by.length)], uploadedAt: new Date(Date.now() - 28 * 86400000).toISOString() },
    { label: "Cabin dashboard", category: "Interior", uploadedBy: by[Math.floor(rand() * by.length)], uploadedAt: new Date(Date.now() - 40 * 86400000).toISOString() },
    { label: "Rear bumper dent", category: "Damage", uploadedBy: "Inspector", uploadedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  ];
  return list.map((p, i) => ({ ...p, id: `ph-${vehicleId}-${i}` }));
}

// ===== Vehicle document catalog =====
export const VEHICLE_DOC_TYPES = [
  "RC Book",
  "Insurance Certificate",
  "Fitness Certificate",
  "National Permit",
  "State Permit",
  "Pollution Certificate (PUC)",
  "Tax Receipt",
] as const;

export interface VehicleDocRow {
  id: string;
  type: string;
  number: string;
  issueDate: string;
  expiryDate?: string;
  status: "Valid" | "Expiring Soon" | "Expired";
  uploadedBy: string;
}

export function generateVehicleDocs(vehicleId: string, licensePlate: string): VehicleDocRow[] {
  const seed = vehicleSeed(vehicleId);
  const rand = seededRandom(seed * 37 + 11);
  const now = Date.now();
  const out: VehicleDocRow[] = [];
  for (const t of VEHICLE_DOC_TYPES) {
    const offset = Math.floor((rand() - 0.45) * 120);
    const expiry = new Date(now + offset * 86400000).toISOString();
    const issue = new Date(now - (180 + Math.floor(rand() * 800)) * 86400000).toISOString();
    const status: VehicleDocRow["status"] = offset < 0 ? "Expired" : offset < 30 ? "Expiring Soon" : "Valid";
    let number = "";
    if (t === "RC Book") number = `RC-${licensePlate.replace(/\s+/g, "")}-${String(seed * 11).padStart(4, "0")}`;
    else if (t === "Insurance Certificate") number = `POL-${String(seed * 313).padStart(8, "0")}`;
    else if (t === "Fitness Certificate") number = `FIT-${String(seed * 211).padStart(6, "0")}`;
    else if (t === "National Permit") number = `NP-${String(seed * 411).padStart(7, "0")}`;
    else if (t === "State Permit") number = `SP-${String(seed * 521).padStart(7, "0")}`;
    else if (t === "Pollution Certificate (PUC)") number = `PUC-${String(seed * 137).padStart(6, "0")}`;
    else number = `TAX-${String(seed * 711).padStart(7, "0")}`;
    const noExpiry = t === "Tax Receipt" || t === "RC Book";
    out.push({
      id: `v-doc-${vehicleId}-${t}`,
      type: t,
      number,
      issueDate: issue,
      expiryDate: noExpiry ? undefined : expiry,
      status: noExpiry ? "Valid" : status,
      uploadedBy: ["Fleet Manager", "RTO Agent", "Workshop"][Math.floor(rand() * 3)],
    });
  }
  return out;
}

// ===== Monthly expense summary (for vehicle expenses tab) =====
export interface MonthlyExpenseRow {
  id: string;
  month: string;
  fuel: number;
  maintenance: number;
  toll: number;
  parts: number;
  insurance: number;
  tax: number;
  total: number;
}

export function generateMonthlyExpenses(vehicleId: string): MonthlyExpenseRow[] {
  const seed = vehicleSeed(vehicleId);
  const rand = seededRandom(seed * 43 + 13);
  const rows: MonthlyExpenseRow[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fuel = 18000 + Math.floor(rand() * 22000);
    const maintenance = 3000 + Math.floor(rand() * 12000);
    const toll = 1200 + Math.floor(rand() * 4800);
    const parts = Math.floor(rand() * 9000);
    const insurance = i === 5 ? 24000 + Math.floor(rand() * 12000) : 0;
    const tax = i === 0 ? 0 : i === 3 ? 8400 : 0;
    rows.push({
      id: `me-${vehicleId}-${i}`,
      month: d.toLocaleString("en-IN", { month: "short", year: "numeric" }),
      fuel,
      maintenance,
      toll,
      parts,
      insurance,
      tax,
      total: fuel + maintenance + toll + parts + insurance + tax,
    });
  }
  return rows;
}

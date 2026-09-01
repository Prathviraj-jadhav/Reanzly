// Seeds real Rate Cards - the module previously ran entirely on a
// client-only useRateCardsStore Zustand store persisted to the browser's
// localStorage (src/lib/store/rate-cards-store.ts, now deleted). Reuses
// that store's original ~10 hand-authored lane/vehicle/load-type rate
// cards as the seed source, converted to real db.rateCard rows -
// baseRate/detentionPerDay are stored in paise (Int), same convention as
// ServiceTemplate.estCostPaise, so rupee amounts below are multiplied by
// 100 before insert. A few cards are optionally linked to real seeded
// customers via customerId where a matching company name exists.
//
// Idempotent: skips if this company already has RateCard rows.
// Run with: bun run src/scripts/seed-rate-cards.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const DAY_MS = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS);

interface SeedSurcharge {
  id: string;
  name: string;
  type: "fixed" | "percent";
  value: number;
}

interface SeedRateCard {
  name: string;
  source: string;
  destination: string;
  vehicleType: string;
  loadType: string;
  rateType: string;
  baseRate: number; // rupees - converted to paise on insert
  surcharges: SeedSurcharge[];
  detentionPerDay: number; // rupees - converted to paise on insert
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: string;
  gstApplicable: boolean;
  gstRate: number;
  /** Matched against Customer.companyName (case-insensitive contains) to optionally link customerId. */
  customerHint?: string;
}

const RATE_CARDS: SeedRateCard[] = [
  {
    name: "Mumbai-Pune FTL - Container 32ft",
    source: "Mumbai",
    destination: "Pune",
    vehicleType: "Container 32ft",
    loadType: "FTL",
    rateType: "Per Trip",
    baseRate: 16500,
    surcharges: [
      { id: "s1", name: "Toll", type: "fixed", value: 350 },
      { id: "s2", name: "Fuel Surcharge", type: "percent", value: 4 },
    ],
    detentionPerDay: 1500,
    effectiveFrom: daysAgo(60),
    effectiveTo: daysFromNow(120),
    status: "Active",
    gstApplicable: true,
    gstRate: 5,
    customerHint: "Pinnacle Trading",
  },
  {
    name: "Delhi-Jaipur FTL - Container 20ft",
    source: "Delhi",
    destination: "Jaipur",
    vehicleType: "Container 20ft",
    loadType: "FTL",
    rateType: "Per Km",
    baseRate: 48,
    surcharges: [{ id: "s1", name: "Toll", type: "fixed", value: 600 }],
    detentionPerDay: 1200,
    effectiveFrom: daysAgo(45),
    effectiveTo: daysFromNow(150),
    status: "Active",
    gstApplicable: true,
    gstRate: 5,
  },
  {
    name: "Bengaluru-Chennai FTL - Trailer 40ft",
    source: "Bengaluru",
    destination: "Chennai",
    vehicleType: "Trailer 40ft",
    loadType: "FTL",
    rateType: "Per Trip",
    baseRate: 24500,
    surcharges: [
      { id: "s1", name: "Toll", type: "fixed", value: 850 },
      { id: "s2", name: "Driver Bhatta", type: "fixed", value: 800 },
    ],
    detentionPerDay: 2000,
    effectiveFrom: daysAgo(30),
    effectiveTo: daysFromNow(180),
    status: "Active",
    gstApplicable: true,
    gstRate: 5,
    customerHint: "Trident Logistics",
  },
  {
    name: "Ahmedabad-Surat LTL - Container 20ft",
    source: "Ahmedabad",
    destination: "Surat",
    vehicleType: "Container 20ft",
    loadType: "LTL",
    rateType: "Per Tonne",
    baseRate: 1850,
    surcharges: [{ id: "s1", name: "Loading", type: "fixed", value: 400 }],
    detentionPerDay: 900,
    effectiveFrom: daysAgo(20),
    effectiveTo: daysFromNow(200),
    status: "Active",
    gstApplicable: false,
    gstRate: 0,
  },
  {
    name: "Hyderabad-Nagpur FTL - Open Body 32ft",
    source: "Hyderabad",
    destination: "Nagpur",
    vehicleType: "Open Body 32ft",
    loadType: "FTL",
    rateType: "Per Trip",
    baseRate: 32000,
    surcharges: [
      { id: "s1", name: "Toll", type: "fixed", value: 1100 },
      { id: "s2", name: "Fuel Surcharge", type: "percent", value: 5 },
    ],
    detentionPerDay: 1800,
    effectiveFrom: daysAgo(15),
    effectiveTo: daysFromNow(220),
    status: "Active",
    gstApplicable: true,
    gstRate: 12,
    customerHint: "Apex Freight",
  },
  {
    name: "Kolkata-Bhubaneswar Part Load - Pickup 17ft",
    source: "Kolkata",
    destination: "Bhubaneswar",
    vehicleType: "Pickup 17ft",
    loadType: "Part Load",
    rateType: "Per Package",
    baseRate: 85,
    surcharges: [],
    detentionPerDay: 600,
    effectiveFrom: daysAgo(10),
    effectiveTo: daysFromNow(240),
    status: "Active",
    gstApplicable: true,
    gstRate: 5,
  },
  {
    name: "Indore-Bhopal FTL - Half Body 24ft",
    source: "Indore",
    destination: "Bhopal",
    vehicleType: "Half Body 24ft",
    loadType: "FTL",
    rateType: "Per Km",
    baseRate: 42,
    surcharges: [{ id: "s1", name: "Toll", type: "fixed", value: 250 }],
    detentionPerDay: 1000,
    effectiveFrom: daysAgo(5),
    status: "Draft",
    gstApplicable: false,
    gstRate: 0,
  },
  {
    name: "Mumbai-Nashik FTL - Tanker",
    source: "Mumbai",
    destination: "Nashik",
    vehicleType: "Tanker",
    loadType: "FTL",
    rateType: "Per Trip",
    baseRate: 22000,
    surcharges: [
      { id: "s1", name: "Toll", type: "fixed", value: 400 },
      { id: "s2", name: "Cleaning Charge", type: "fixed", value: 1200 },
    ],
    detentionPerDay: 2200,
    effectiveFrom: daysAgo(180),
    effectiveTo: daysAgo(10),
    status: "Expired",
    gstApplicable: true,
    gstRate: 18,
  },
  {
    name: "Chennai-Coimbatore FTL - Container 32ft",
    source: "Chennai",
    destination: "Coimbatore",
    vehicleType: "Container 32ft",
    loadType: "FTL",
    rateType: "Per Trip",
    baseRate: 19500,
    surcharges: [
      { id: "s1", name: "Toll", type: "fixed", value: 650 },
      { id: "s2", name: "Fuel Surcharge", type: "percent", value: 3 },
    ],
    detentionPerDay: 1500,
    effectiveFrom: daysAgo(25),
    effectiveTo: daysFromNow(190),
    status: "Active",
    gstApplicable: true,
    gstRate: 5,
  },
  {
    name: "Gurgaon-Faridabad LTL - Mini Truck",
    source: "Gurgaon",
    destination: "Faridabad",
    vehicleType: "Mini Truck",
    loadType: "LTL",
    rateType: "Per Package",
    baseRate: 65,
    surcharges: [{ id: "s1", name: "Loading", type: "fixed", value: 200 }],
    detentionPerDay: 500,
    effectiveFrom: daysAgo(8),
    effectiveTo: daysFromNow(260),
    status: "Active",
    gstApplicable: false,
    gstRate: 0,
  },
];

async function main() {
  console.log("[seed-rate-cards] starting...");

  const existing = await db.rateCard.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-rate-cards] already seeded (${existing} rate cards found) - skipping.`);
    return;
  }

  const customers = await db.customer.findMany({ where: { companyId: COMPANY_ID } });

  let created = 0;
  const createdAt = daysAgo(20);
  const updatedAt = daysAgo(5);

  for (const rc of RATE_CARDS) {
    const customer = rc.customerHint
      ? customers.find((c) => c.companyName.toLowerCase().includes(rc.customerHint!.toLowerCase()))
      : undefined;

    await db.rateCard.create({
      data: {
        companyId: COMPANY_ID,
        customerId: customer?.id ?? null,
        name: rc.name,
        source: rc.source,
        destination: rc.destination,
        vehicleType: rc.vehicleType,
        loadType: rc.loadType,
        rateType: rc.rateType,
        baseRate: Math.round(rc.baseRate * 100),
        detentionPerDay: Math.round(rc.detentionPerDay * 100),
        surchargesJson: JSON.stringify(rc.surcharges),
        gstApplicable: rc.gstApplicable,
        gstRate: rc.gstRate,
        status: rc.status,
        effectiveFrom: rc.effectiveFrom,
        effectiveTo: rc.effectiveTo ?? null,
        createdBy: "Owner · KC",
        createdAt,
        updatedAt,
      },
    });
    created++;
  }

  console.log(`[seed-rate-cards] seeded ${created} real rate cards.`);
}

main()
  .catch((e) => {
    console.error("[seed-rate-cards] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

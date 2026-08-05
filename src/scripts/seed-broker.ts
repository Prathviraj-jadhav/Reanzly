// Seed the broker tables with default demo data:
//   - 10 published LaneRates (Reanzly base rate card)
//   - 1 default BrokerProfile (Faisal Ahmed, RZB-000001)
//   - 5 SubBrokers under that profile
//   - 9 Enquiries
//   - 10 Quotes
//   - 5 SettlementCycles
//   - 7 LedgerEntries
//
// Idempotent: each section checks whether rows already exist (by stable
// broker code / enquiryId / quoteId / cycleId / entryId / laneId) before
// inserting, so re-running is safe.
//
// Run with: bun run src/scripts/seed-broker.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ===== Lane rate seed (mirrors REANZLY_LANE_RATES in _helpers.tsx) =====
const LANE_RATES = [
  { laneId: "ln-001", lane: "Mumbai - Delhi", origin: "Mumbai", destination: "Delhi", distanceKm: 1410, baseRatePerKm: 78, vehicleTypes: ["32ft MXL", "Container 20ft"], transitHours: 48 },
  { laneId: "ln-002", lane: "Pune - Bengaluru", origin: "Pune", destination: "Bengaluru", distanceKm: 840, baseRatePerKm: 72, vehicleTypes: ["20ft SXL", "Open Body 24ft"], transitHours: 24 },
  { laneId: "ln-003", lane: "Ahmedabad - Surat", origin: "Ahmedabad", destination: "Surat", distanceKm: 265, baseRatePerKm: 64, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 8 },
  { laneId: "ln-004", lane: "Chennai - Hyderabad", origin: "Chennai", destination: "Hyderabad", distanceKm: 625, baseRatePerKm: 70, vehicleTypes: ["32ft MXL", "Container 20ft"], transitHours: 18 },
  { laneId: "ln-005", lane: "Delhi - Kolkata", origin: "Delhi", destination: "Kolkata", distanceKm: 1540, baseRatePerKm: 82, vehicleTypes: ["32ft MXL", "Container 40ft"], transitHours: 52 },
  { laneId: "ln-006", lane: "Mumbai - Nagpur", origin: "Mumbai", destination: "Nagpur", distanceKm: 825, baseRatePerKm: 68, vehicleTypes: ["20ft SXL", "Open Body 24ft"], transitHours: 22 },
  { laneId: "ln-007", lane: "Bengaluru - Chennai", origin: "Bengaluru", destination: "Chennai", distanceKm: 350, baseRatePerKm: 62, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 10 },
  { laneId: "ln-008", lane: "Kolkata - Guwahati", origin: "Kolkata", destination: "Guwahati", distanceKm: 1020, baseRatePerKm: 84, vehicleTypes: ["32ft MXL", "Container 20ft"], transitHours: 36 },
  { laneId: "ln-009", lane: "Delhi - Jaipur", origin: "Delhi", destination: "Jaipur", distanceKm: 280, baseRatePerKm: 60, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 8 },
  { laneId: "ln-010", lane: "Hyderabad - Vijayawada", origin: "Hyderabad", destination: "Vijayawada", distanceKm: 275, baseRatePerKm: 58, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 8 },
] as const;

// ===== SubBroker seed (mirrors SEED_SUB_BROKERS in _helpers.tsx) =====
const SUB_BROKER_SEED_NAMES = [
  { name: "Patel Freight Links", contact: "Rakesh Patel", code: "RZSB-001" },
  { name: "Sharma Cargo Movers", contact: "Anil Sharma", code: "RZSB-002" },
  { name: "Southern Logistics Hub", contact: "Karthik Iyer", code: "RZSB-003" },
  { name: "Punjab Express Brokers", contact: "Gurpreet Singh", code: "RZSB-004" },
  { name: "Eastern Carriers Co", contact: "Sourav Das", code: "RZSB-005" },
];

const SUB_BROKER_COVERAGE = [
  ["Mumbai - Delhi", "Delhi - Kolkata"],
  ["Pune - Bengaluru", "Bengaluru - Chennai"],
  ["Chennai - Hyderabad", "Hyderabad - Vijayawada"],
  ["Mumbai - Delhi", "Delhi - Jaipur"],
  ["Delhi - Kolkata", "Kolkata - Guwahati"],
];

const ENQUIRY_CUSTOMERS = [
  "Asian Paints Ltd",
  "UltraTech Cement",
  "Tata Steel BSL",
  "Havells India",
  "Supreme Industries",
  "Finolex Pipes",
  "JK Cement",
  "Century Plywood",
];

const VEHICLE_TYPES_BY_LANE: Record<string, string[]> = Object.fromEntries(
  LANE_RATES.map((l) => [l.lane, [...l.vehicleTypes]])
);

function resaleRate(baseRatePerKm: number, markupPct: number): number {
  return Math.round(baseRatePerKm * (1 + markupPct / 100));
}

function daysAgoMs(n: number): number {
  return Date.now() - n * 86400000;
}
function daysAheadMs(n: number): number {
  return Date.now() + n * 86400000;
}

async function main() {
  console.log("[seed-broker] starting...");

  // 1. Upsert LaneRates
  let laneCount = 0;
  for (const l of LANE_RATES) {
    const existing = await db.laneRate.findUnique({ where: { laneId: l.laneId } });
    if (existing) continue;
    await db.laneRate.create({
      data: {
        laneId: l.laneId,
        lane: l.lane,
        origin: l.origin,
        destination: l.destination,
        distanceKm: l.distanceKm,
        baseRatePerKm: l.baseRatePerKm,
        vehicleTypes: JSON.stringify(l.vehicleTypes),
        transitHours: l.transitHours,
        active: true,
      },
    });
    laneCount++;
  }
  console.log(`[seed-broker] LaneRates inserted: ${laneCount}`);

  // 2. Upsert default BrokerProfile (Faisal Ahmed, RZB-000001)
  let profile = await db.brokerProfile.findUnique({ where: { brokerCode: "RZB-000001" } });
  if (!profile) {
    profile = await db.brokerProfile.create({
      data: {
        brokerCode: "RZB-000001",
        companyName: "Reanzly Broker Network OPC Pvt Ltd",
        contactName: "Faisal Ahmed",
        email: "faisal@reanzly-broker.in",
        phone: "+91 9820012345",
        gstin: "27AABCR1234L1Z5",
        markupPct: 8.0,
        settlementCycle: "Fortnightly",
        gstTreatment: "Forward Charge",
        coverageLanes: JSON.stringify([
          "Mumbai - Delhi",
          "Pune - Bengaluru",
          "Chennai - Hyderabad",
          "Delhi - Kolkata",
          "Bengaluru - Chennai",
        ]),
        status: "Active",
        bankName: "HDFC Bank",
        bankBranch: "Andheri East, Mumbai",
        bankAccountName: "Reanzly Broker Network OPC Pvt Ltd",
        bankAccountNumber: "501001321241240",
        bankIfsc: "HDFC0001240",
        nachUmr: "HDFC01234567",
        nextPayoutDate: new Date(daysAheadMs(7)),
        nextPayoutAmount: 41944,
      },
    });
    console.log(`[seed-broker] created BrokerProfile ${profile.brokerCode} (${profile.id})`);
  } else {
    console.log(`[seed-broker] BrokerProfile already exists (${profile.brokerCode})`);
  }

  // 3. Upsert SubBrokers
  let subBrokerCount = 0;
  for (let i = 0; i < SUB_BROKER_SEED_NAMES.length; i++) {
    const s = SUB_BROKER_SEED_NAMES[i];
    const existing = await db.subBroker.findUnique({ where: { brokerCode: s.code } });
    if (existing) continue;
    await db.subBroker.create({
      data: {
        brokerProfileId: profile.id,
        name: s.name,
        brokerCode: s.code,
        contactName: s.contact,
        email: s.contact.toLowerCase().replace(/\s+/g, ".") + "@rezsb.in",
        phone: `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`,
        markupPct: [4, 6, 5, 7, 3][i],
        coverageLanes: JSON.stringify(SUB_BROKER_COVERAGE[i]),
        settlementCycle: ["Weekly", "Fortnightly", "Monthly", "Weekly", "Fortnightly"][i],
        gstTreatment: i % 2 === 0 ? "Forward Charge" : "Reverse Charge",
        gstin: `27ABCDE${String(1000 + i * 11).padStart(4, "0")}H1Z${i + 1}`,
        status: i < 4 ? "Active" : "Pending",
        settlementsDueINR: [128400, 86200, 215600, 0, 47300][i],
        onboardedAt: new Date(daysAgoMs(i * 18 + 5)),
      },
    });
    subBrokerCount++;
  }
  console.log(`[seed-broker] SubBrokers inserted: ${subBrokerCount}`);

  // 4. Upsert Enquiries (9 rows)
  let enquiryCount = 0;
  for (let i = 0; i < 9; i++) {
    const lane = LANE_RATES[i % LANE_RATES.length];
    const enquiryId = `enq-${String(2401 + i).padStart(4, "0")}`;
    const existing = await db.brokerEnquiry.findUnique({ where: { enquiryId } });
    if (existing) continue;
    const status: string = i < 3 ? "New" : i < 6 ? "Quoted" : i < 8 ? "Won" : "Lost";
    const vehicleTypes = VEHICLE_TYPES_BY_LANE[lane.lane] ?? [];
    const quotedRate =
      status === "Quoted" || status === "Won" || status === "Lost"
        ? resaleRate(lane.baseRatePerKm, 8) + (i % 3) * 2
        : null;
    await db.brokerEnquiry.create({
      data: {
        brokerProfileId: profile.id,
        enquiryId,
        lane: lane.lane,
        vehicleType: vehicleTypes[i % vehicleTypes.length] ?? "32ft MXL",
        weightTon: 8 + (i * 3) % 22,
        expectedRatePerKm: lane.baseRatePerKm + (i % 5) * 2 - 4,
        customer: ENQUIRY_CUSTOMERS[i % ENQUIRY_CUSTOMERS.length],
        pickupDate: new Date(daysAheadMs(i - 2)),
        status,
        quotedRate,
        receivedAt: new Date(daysAgoMs(i)),
      },
    });
    enquiryCount++;
  }
  console.log(`[seed-broker] Enquiries inserted: ${enquiryCount}`);

  // 5. Upsert Quotes (10 rows)
  let quoteCount = 0;
  for (let i = 0; i < 10; i++) {
    const lane = LANE_RATES[i % LANE_RATES.length];
    const quoteId = `qte-${String(6101 + i).padStart(5, "0")}`;
    const existing = await db.brokerQuote.findUnique({ where: { quoteId } });
    if (existing) continue;
    const markup = 6 + (i % 5);
    const status: string = i < 4 ? "Pending" : i < 6 ? "Accepted" : i < 8 ? "Rejected" : "Expired";
    const vehicleTypes = VEHICLE_TYPES_BY_LANE[lane.lane] ?? [];
    await db.brokerQuote.create({
      data: {
        brokerProfileId: profile.id,
        quoteId,
        loadId: `mkt-${String(8201 + i).padStart(5, "0")}`,
        lane: lane.lane,
        vehicleType: vehicleTypes[i % vehicleTypes.length] ?? "32ft MXL",
        customer: ENQUIRY_CUSTOMERS[(i + 1) % ENQUIRY_CUSTOMERS.length],
        quotedRatePerKm: resaleRate(lane.baseRatePerKm, markup),
        baseRatePerKm: lane.baseRatePerKm,
        markupPct: markup,
        status,
        quotedAt: new Date(daysAgoMs(i + 1)),
      },
    });
    quoteCount++;
  }
  console.log(`[seed-broker] Quotes inserted: ${quoteCount}`);

  // 6. Upsert SettlementCycles (5 rows)
  let settlementCount = 0;
  for (let i = 0; i < 5; i++) {
    const cycleId = `CYC-2025-${String(5 - i).padStart(2, "0")}`;
    const existing = await db.settlementCycle.findUnique({ where: { cycleId } });
    if (existing) continue;
    const grossTrips = [18, 22, 15, 24, 11][i];
    const grossValueINR = [842000, 1120400, 678500, 1240200, 524300][i];
    const commissionPct = 8;
    const commissionEarnedINR = Math.round((grossValueINR * commissionPct) / 100);
    const tdsPct = 1;
    const tdsDeductedINR = Math.round((commissionEarnedINR * tdsPct) / 100);
    const status: string = i < 2 ? "Paid" : i < 4 ? "Approved" : "Draft";
    await db.settlementCycle.create({
      data: {
        brokerProfileId: profile.id,
        cycleId,
        periodStart: new Date(daysAgoMs((i + 1) * 14 + 14)),
        periodEnd: new Date(daysAgoMs((i + 1) * 14)),
        grossTrips,
        grossValueINR,
        commissionPct,
        commissionEarnedINR,
        tdsPct,
        tdsDeductedINR,
        gstTreatment: i % 2 === 0 ? "Forward Charge" : "Reverse Charge",
        netPayableINR: commissionEarnedINR - tdsDeductedINR,
        status,
        createdAt: new Date(daysAgoMs((i + 1) * 14)),
      },
    });
    settlementCount++;
  }
  console.log(`[seed-broker] SettlementCycles inserted: ${settlementCount}`);

  // 7. Upsert LedgerEntries (7 rows)
  const LEDGER_BASE = [
    { entryId: "led-001", date: daysAgoMs(70), type: "Credit", description: "Commission - CYC-2025-05", refId: "CYC-2025-05", amountINR: 67360 },
    { entryId: "led-002", date: daysAgoMs(68), type: "Debit", description: "Payout - NACH credit to HDFC ****1240", refId: "PAY-2025-05-08", amountINR: 67360 },
    { entryId: "led-003", date: daysAgoMs(56), type: "Credit", description: "Commission - CYC-2025-04", refId: "CYC-2025-04", amountINR: 89632 },
    { entryId: "led-004", date: daysAgoMs(54), type: "Debit", description: "Payout - NACH credit to HDFC ****1240", refId: "PAY-2025-04-22", amountINR: 89632 },
    { entryId: "led-005", date: daysAgoMs(42), type: "Credit", description: "Commission - CYC-2025-03", refId: "CYC-2025-03", amountINR: 54280 },
    { entryId: "led-006", date: daysAgoMs(28), type: "Credit", description: "Commission - CYC-2025-02", refId: "CYC-2025-02", amountINR: 99216 },
    { entryId: "led-007", date: daysAgoMs(14), type: "Credit", description: "Commission - CYC-2025-01", refId: "CYC-2025-01", amountINR: 41944 },
  ];
  let ledgerCount = 0;
  let runningBalance = 0;
  for (const e of LEDGER_BASE) {
    const existing = await db.brokerLedgerEntry.findUnique({ where: { entryId: e.entryId } });
    if (existing) {
      // Skip - already exists. Don't double-count balance.
      continue;
    }
    runningBalance = e.type === "Credit" ? runningBalance + e.amountINR : runningBalance - e.amountINR;
    await db.brokerLedgerEntry.create({
      data: {
        brokerProfileId: profile.id,
        entryId: e.entryId,
        date: new Date(e.date),
        type: e.type,
        description: e.description,
        refId: e.refId,
        amountINR: e.amountINR,
        runningBalanceINR: runningBalance,
      },
    });
    ledgerCount++;
  }
  console.log(`[seed-broker] LedgerEntries inserted: ${ledgerCount}`);

  console.log("[seed-broker] done.");
}

main()
  .catch((e) => {
    console.error("[seed-broker] error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

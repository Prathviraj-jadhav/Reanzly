// Seeds real Expense, LorryReceipt, and Branch rows - real CRUD APIs
// existed for Expenses and Lorry Receipts but both tables were empty.
// Rate cards are seeded separately by seed-rate-cards.ts.
//
// Idempotent: skips if Expense already has rows for this company.
// Run with: bun run src/scripts/seed-finance-ops.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const EXPENSE_CATEGORIES = ["Fuel", "Toll", "Repair", "Loading", "Unloading", "DriverBhatta", "Misc"];
const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  Fuel: ["Diesel top-up mid-route", "Fuel refill at highway pump"],
  Toll: ["NHAI toll - Mumbai-Pune expressway", "State border toll"],
  Repair: ["Puncture repair on route", "Minor roadside repair"],
  Loading: ["Loading labour charges", "Crane hire for container loading"],
  Unloading: ["Unloading labour charges", "Warehouse unloading fee"],
  DriverBhatta: ["Daily driver allowance", "Halt allowance"],
  Misc: ["Parking fee", "RTO checkpoint fee"],
};
const CITIES = ["Mumbai", "Pune", "Nashik", "Nagpur", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Ahmedabad", "Kolkata"];

async function main() {
  const existing = await db.expense.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-finance-ops] already seeded (${existing} expenses found) - skipping.`);
    return;
  }

  const vehicles = await db.vehicle.findMany({ where: { companyId: COMPANY_ID } });
  const drivers = await db.driver.findMany({ where: { companyId: COMPANY_ID } });
  const trips = await db.trip.findMany({ where: { companyId: COMPANY_ID } });
  const customers = await db.customer.findMany({ where: { companyId: COMPANY_ID } });
  if (vehicles.length === 0 || trips.length === 0) {
    console.log("[seed-finance-ops] no Vehicle/Trip rows found - run seed-business-data.ts first. Skipping.");
    return;
  }

  console.log("[seed-finance-ops] seeding branches...");
  for (const city of CITIES.slice(0, 5)) {
    await db.branch.create({
      data: { companyId: COMPANY_ID, name: `${city} ${city === "Mumbai" ? "HQ" : "Branch"}`, city, state: "Maharashtra", status: "Active" },
    });
  }

  console.log("[seed-finance-ops] seeding expenses...");
  for (let i = 0; i < 45; i++) {
    const seed = i + 811;
    const category = pick(EXPENSE_CATEGORIES, seed);
    const vehicle = pick(vehicles, seed);
    const driver = pick(drivers, seed + 1);
    const trip = pick(trips, seed + 2);
    const amountRupees = category === "Fuel" ? 3000 + (seed % 15) * 400 : category === "Toll" ? 200 + (seed % 10) * 60 : 500 + (seed % 20) * 150;
    await db.expense.create({
      data: {
        companyId: COMPANY_ID,
        tripId: trip.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        category,
        description: pick(EXPENSE_DESCRIPTIONS[category], seed),
        amount: amountRupees * 100, // paise
        payMode: pick(["Cash", "UPI", "Card", "Credit"], seed),
        vendorName: category === "Repair" ? "Shree Auto Works" : null,
        incurredAt: daysAgo(seed % 40),
        status: pick(["Pending", "Approved", "Approved", "Reimbursed"], seed),
        submittedBy: driver.name,
        approvedBy: seed % 4 !== 0 ? "Reena Mehta" : null,
        receiptStatus: pick(["Attached", "Attached", "Missing"], seed),
      },
    });
  }

  console.log("[seed-finance-ops] seeding lorry receipts...");
  for (let i = 0; i < 20; i++) {
    const seed = i + 907;
    const trip = pick(trips, seed);
    const customer = customers.length > 0 ? pick(customers, seed) : null;
    const freightRupees = 8000 + (seed % 25) * 1200;
    await db.lorryReceipt.create({
      data: {
        companyId: COMPANY_ID,
        lrNumber: `RZ-LR-${String(2000 + seed)}`,
        tripId: trip.id,
        customerId: customer?.id ?? null,
        fromCity: trip.origin,
        toCity: trip.destination,
        consignor: trip.consignor,
        consignee: trip.consignee,
        goodsDesc: pick(["General Cargo", "Electronics", "Textiles", "FMCG Goods", "Machinery Parts"], seed),
        weightKg: 2000 + (seed % 10) * 500,
        packages: 20 + (seed % 8) * 10,
        freight: freightRupees * 100, // paise
        freightTerm: pick(["Paid", "To Be Billed", "To Pay"], seed),
        eWayBillNo: seed % 3 === 0 ? `EWB${100000000000 + seed}` : null,
        status: pick(["Generated", "Printed", "Sent", "Archived"], seed),
        issuedAt: daysAgo(seed % 30),
      },
    });
  }

  console.log("[seed-finance-ops] done.");
}

main()
  .catch((e) => {
    console.error("[seed-finance-ops] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

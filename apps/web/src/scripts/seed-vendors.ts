// Seeds real rows into the Vendor table, which - unlike Vehicle/Driver/
// Customer/Trip/Invoice (see seed-business-data.ts) - was never seeded and
// showed a genuine empty state after the Vendors module was wired to the
// real database. Idempotent: skips if Vendor already has rows.
// Run with: bun run src/scripts/seed-vendors.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Ahmedabad", "Kolkata"];
const VENDORS = [
  { name: "Bharat Petroleum Fleet Cards", type: "Fuel Supplier" },
  { name: "Reliance Fuel Depot", type: "Fuel Supplier" },
  { name: "Apex Truck Workshop", type: "Maintenance Workshop" },
  { name: "Speedway Motor Works", type: "Maintenance Workshop" },
  { name: "National Spares Co", type: "Spare Parts Supplier" },
  { name: "Continental Tyre Traders", type: "Tyre Supplier" },
  { name: "MRF Authorised Dealer - Pune", type: "Tyre Supplier" },
  { name: "Swift Logistics Partners", type: "Third-Party Operator" },
  { name: "Metro Freight Carriers", type: "Third-Party Operator" },
  { name: "Precision Auto Electricals", type: "Spare Parts Supplier" },
];

function gstin(seed: number): string {
  return `27AABCV${2000 + seed}N1Z${(seed % 9) + 1}`;
}

async function main() {
  const existing = await db.vendor.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-vendors] already seeded (${existing} vendors found) - skipping.`);
    return;
  }

  console.log("[seed-vendors] seeding vendors...");
  for (let i = 0; i < VENDORS.length; i++) {
    const { name, type } = VENDORS[i];
    await db.vendor.create({
      data: {
        companyId: COMPANY_ID,
        companyName: name,
        contactPerson: ["Suresh Patil", "Manoj Yadav", "Ravi Shankar", "Deepak Joshi", "Sanjay Verma"][i % 5],
        phone: `97${(30000000 + i * 5237) % 80000000}`,
        email: `contact@${name.toLowerCase().replace(/[^a-z]+/g, "")}.in`,
        gstin: gstin(i),
        city: CITIES[i % CITIES.length],
        type,
        status: "Active",
        paymentTerms: ["Net 30", "Net 45", "Net 15"][i % 3],
        rating: 3.4 + (i % 16) / 10,
      },
    });
  }

  console.log(`[seed-vendors] done: ${VENDORS.length} vendors.`);
}

main()
  .catch((e) => {
    console.error("[seed-vendors] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

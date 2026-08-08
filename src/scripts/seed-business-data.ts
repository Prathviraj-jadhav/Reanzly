// Seeds real rows into the core business tables (Vehicle, Driver, Customer,
// Trip, Invoice) that Rean's database tool queries. These tables exist in
// the Prisma schema but were completely empty - all the data visible
// elsewhere in the app UI comes from src/lib/mock-data.ts's in-memory
// arrays, not the database. That's fine for the UI (mock data was always
// the deliberate demo-data strategy for this project - see Reanzly.md), but
// it means a "database query tool" pointed at these tables would
// technically work while having nothing real to show. This seed makes that
// tool actually useful without touching how the rest of the app renders.
//
// Idempotent: skips if Vehicle already has rows (checked once, since these
// tables are relationally linked - partial re-seeding would create orphans).
// Run with: bun run src/scripts/seed-business-data.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Ahmedabad", "Kolkata"];
const VEHICLE_MAKES = [
  ["Tata", "LPT 1613"], ["Ashok Leyland", "Pro 3015"], ["Mahindra", "1616 IL"],
  ["Eicher", "Blazo X 42"], ["BharatBenz", "4923 TT"], ["Volvo", "3123 FM"],
];
const DRIVER_NAMES = [
  "Ramesh Kumar", "Suresh Patil", "Vijay Singh", "Anand Reddy", "Manoj Yadav",
  "Ravi Shankar", "Deepak Joshi", "Sanjay Verma", "Ajay Nair", "Rakesh Gupta",
  "Vinod Chauhan", "Prakash Rao", "Naveen Kumar", "Arjun Menon", "Baljeet Sandhu",
];
const CUSTOMER_NAMES = [
  "Pinnacle Trading Co", "Crest Manufacturing", "Bharat Supply Chain", "Orion Manufacturing",
  "Sundaram Cold Chain", "Shree Balaji Transport", "Kuber Multimodal Logistics",
  "Trident Logistics", "Anjani Roadlines", "Patel Freight Movers",
];
const VEHICLE_STATUSES = ["Active", "Idle", "In Maintenance", "Offline"];
const TRIP_STATUSES = ["Planned", "Active", "In Transit", "Delivered", "Cancelled"];
const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue"];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function plate(seed: number): string {
  const states = ["MH", "DL", "KA", "TN", "GJ"];
  return `${pick(states, seed)}${(seed % 60) + 1} ${["AB", "CD", "XY", "PQ"][seed % 4]} ${1000 + (seed * 37) % 9000}`;
}
function gstin(seed: number): string {
  return `27AADCR${1000 + seed}N1Z${(seed % 9) + 1}`;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

async function main() {
  const existing = await db.vehicle.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-business-data] already seeded (${existing} vehicles found) - skipping.`);
    return;
  }

  console.log("[seed-business-data] seeding vehicles...");
  const vehicles = [];
  for (let i = 0; i < 20; i++) {
    const [make, model] = VEHICLE_MAKES[i % VEHICLE_MAKES.length];
    const v = await db.vehicle.create({
      data: {
        companyId: COMPANY_ID,
        name: `${make} ${model} #${i + 1}`,
        licensePlate: plate(i),
        vin: `VIN${100000 + i}`,
        make,
        model,
        year: 2019 + (i % 6),
        type: i % 3 === 0 ? "Trailer" : "Truck",
        status: pick(VEHICLE_STATUSES, i),
        ownership: i % 4 === 0 ? "Leased" : "Owned",
        fuelType: "Diesel",
        currentMeter: 10000 + i * 3500,
        location: pick(CITIES, i),
      },
    });
    vehicles.push(v);
  }

  console.log("[seed-business-data] seeding drivers...");
  const drivers = [];
  for (let i = 0; i < 15; i++) {
    const d = await db.driver.create({
      data: {
        companyId: COMPANY_ID,
        name: DRIVER_NAMES[i],
        email: `${DRIVER_NAMES[i].toLowerCase().replace(/\s+/g, ".")}@reanzly.in`,
        phone: `98${(10000000 + i * 7919) % 90000000}`,
        role: "Driver",
        status: i % 7 === 0 ? "On Leave" : "Active",
        licenseNumber: `DL${2020 + i}${100000 + i}`,
        licenseExpiry: daysFromNow(180 + i * 20),
        rating: 3.5 + (i % 15) / 10,
        tripsCompleted: 20 + i * 6,
        onTimeRate: 0.75 + (i % 20) / 100,
        city: pick(CITIES, i),
      },
    });
    drivers.push(d);
  }

  console.log("[seed-business-data] seeding customers...");
  const customers = [];
  for (let i = 0; i < 10; i++) {
    const c = await db.customer.create({
      data: {
        companyId: COMPANY_ID,
        companyName: CUSTOMER_NAMES[i],
        contactPerson: DRIVER_NAMES[(i + 5) % DRIVER_NAMES.length],
        phone: `99${(20000000 + i * 6113) % 80000000}`,
        email: `accounts@${CUSTOMER_NAMES[i].toLowerCase().replace(/[^a-z]+/g, "")}.in`,
        gstin: gstin(i),
        city: pick(CITIES, i + 2),
        status: "Active",
        paymentTerms: pick(["Net 30", "Net 45", "Net 60"], i),
        creditLimit: 500000 + i * 100000,
        outstandingBalance: i % 3 === 0 ? 50000 + i * 15000 : 0,
        // The first seeded customer is linked to the "customer" demo role's
        // real User row, so logging into the Vendor Portal as that role
        // resolves to a real Customer with real trips/invoices, instead of
        // the portal hardcoding a single unlinked demo id.
        ...(i === 0
          ? {
              userId: "customer",
              designation: "Head of Logistics",
              pan: gstin(i).slice(2, 12),
              legalEntity: "Pvt Ltd",
              state: pick(CITIES, i + 2),
              pincode: `${110000 + i}`,
              accountManager: "Vikram Deshmukh",
            }
          : {}),
      },
    });
    customers.push(c);
  }

  console.log("[seed-business-data] seeding trips...");
  const trips = [];
  for (let i = 0; i < 25; i++) {
    const vehicle = vehicles[i % vehicles.length];
    const driver = drivers[i % drivers.length];
    const customer = customers[i % customers.length];
    const origin = pick(CITIES, i);
    let destination = pick(CITIES, i + 3);
    if (destination === origin) destination = pick(CITIES, i + 4);
    const t = await db.trip.create({
      data: {
        companyId: COMPANY_ID,
        tripId: `RZ-TRP-${2200 + i}`,
        lrNumber: `RZ-LR-${340 + i}`,
        customerId: customer.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        consignor: customer.companyName,
        consignee: `${customer.companyName} - ${destination} Hub`,
        origin,
        destination,
        status: pick(TRIP_STATUSES, i),
        orderMode: i % 4 === 0 ? "Part Load" : "FTL",
        freightAmount: 25000 + i * 3200,
        paymentStatus: pick(["Unpaid", "Partially Paid", "Paid", "Overdue"], i),
        distanceKm: 300 + i * 45,
        expectedDelivery: daysFromNow(2 + (i % 5)),
      },
    });
    trips.push(t);
  }

  console.log("[seed-business-data] seeding invoices...");
  for (let i = 0; i < 20; i++) {
    const trip = trips[i % trips.length];
    const customer = customers[i % customers.length];
    const amount = 30000 + i * 4100;
    const tax = Math.round(amount * 0.18);
    await db.invoice.create({
      data: {
        companyId: COMPANY_ID,
        invoiceNumber: `RZ-INV-${21440 + i}`,
        customerId: customer.id,
        tripId: trip.id,
        customer: customer.companyName,
        amount,
        taxAmount: tax,
        totalAmount: amount + tax,
        status: pick(INVOICE_STATUSES, i),
        paymentStatus: pick(["Unpaid", "Partially Paid", "Paid"], i),
        dueDate: i % 3 === 0 ? daysAgo(5 + i) : daysFromNow(15 - (i % 15)),
        igst: i % 2 === 0 ? tax : null,
        cgst: i % 2 === 1 ? Math.round(tax / 2) : null,
        sgst: i % 2 === 1 ? Math.round(tax / 2) : null,
      },
    });
  }

  console.log(
    `[seed-business-data] done: ${vehicles.length} vehicles, ${drivers.length} drivers, ` +
      `${customers.length} customers, ${trips.length} trips, 20 invoices.`
  );
}

main()
  .catch((e) => {
    console.error("[seed-business-data] failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

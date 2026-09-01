// Seeds real FuelEntry, Inspection, WorkOrder, Issue, ServiceProgram, and
// Reminder rows against the real Vehicle/Driver/Trip rows seed-business-data.ts
// already created. These modules all had real CRUD APIs built earlier this
// session but were never actually seeded - their tables were empty, so the
// UI (and every report/automation/dashboard widget that reads them) showed
// nothing to test against.
//
// Idempotent: skips if FuelEntry already has rows for this company.
// Run with: bun run src/scripts/seed-fleet-ops.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

const FUEL_STATIONS = ["HP Pump - Bhiwandi", "IOCL - Panvel", "BPCL - Chakan", "HP Pump - Wagholi", "Shell - Nashik Road"];
const INSPECTION_TYPES = ["Pre-Trip", "Post-Trip", "Periodic Safety", "Pollution (PUC)", "Fitness"];
const INSPECTORS = ["Sukhbir Gill", "Rohit Sharma", "Anil Reddy", "Vikram Deshmukh"];
const WORK_ORDER_TITLES = [
  "Brake pad replacement", "Engine oil + filter service", "Tyre rotation & alignment",
  "Clutch plate replacement", "AC gas top-up", "Suspension bush replacement",
  "Battery replacement", "Radiator coolant flush", "Gearbox oil change", "Wheel bearing service",
];
const VENDORS = ["Shree Auto Works", "Balaji Tyres & Service", "Highway Motors Garage", "Speedway Truck Care"];
const ISSUE_TITLES = [
  { category: "Breakdown", title: "Engine overheating on highway" },
  { category: "Tyre", title: "Rear tyre puncture" },
  { category: "Electrical", title: "Headlight assembly failure" },
  { category: "Document", title: "Insurance copy missing from vehicle folder" },
  { category: "Compliance", title: "Fitness certificate expiring soon" },
  { category: "Accident", title: "Minor collision - rear bumper damage" },
];

async function main() {
  const existing = await db.fuelEntry.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-fleet-ops] already seeded (${existing} fuel entries found) - skipping.`);
    return;
  }

  const vehicles = await db.vehicle.findMany({ where: { companyId: COMPANY_ID } });
  const drivers = await db.driver.findMany({ where: { companyId: COMPANY_ID } });
  const trips = await db.trip.findMany({ where: { companyId: COMPANY_ID } });
  if (vehicles.length === 0 || drivers.length === 0) {
    console.log("[seed-fleet-ops] no Vehicle/Driver rows found - run seed-business-data.ts first. Skipping.");
    return;
  }

  console.log("[seed-fleet-ops] seeding fuel entries...");
  for (let i = 0; i < 60; i++) {
    const seed = i + 211;
    const vehicle = pick(vehicles, seed);
    const driver = pick(drivers, seed + 3);
    const quantity = 80 + (seed % 60);
    const unitPrice = 92 + (seed % 8);
    const totalCost = Math.round(quantity * unitPrice);
    const isAnomaly = seed % 11 === 0;
    await db.fuelEntry.create({
      data: {
        companyId: COMPANY_ID,
        vehicleId: vehicle.id,
        driverId: driver.id,
        fuelType: "Diesel",
        date: daysAgo(seed % 45),
        quantity,
        unitPrice,
        totalCost,
        odometer: 10000 + seed * 120,
        efficiency: isAnomaly ? 1.8 + (seed % 3) / 10 : 3.6 + (seed % 12) / 10,
        station: pick(FUEL_STATIONS, seed),
        anomaly: isAnomaly,
        anomalyNote: isAnomaly ? "Efficiency significantly below fleet average for this route." : null,
      },
    });
  }

  console.log("[seed-fleet-ops] seeding inspections...");
  for (let i = 0; i < 24; i++) {
    const seed = i + 307;
    const vehicle = pick(vehicles, seed);
    const driver = pick(drivers, seed + 5);
    const result = seed % 9 === 0 ? "Fail" : seed % 4 === 0 ? "Conditional" : "Pass";
    await db.inspection.create({
      data: {
        companyId: COMPANY_ID,
        inspectionId: `RZ-INS-${String(1000 + seed)}`,
        vehicleId: vehicle.id,
        driverId: driver.id,
        type: pick(INSPECTION_TYPES, seed),
        inspector: pick(INSPECTORS, seed),
        date: daysAgo(seed % 30),
        result,
        odometer: 10000 + seed * 110,
      },
    });
  }

  console.log("[seed-fleet-ops] seeding work orders...");
  for (let i = 0; i < 18; i++) {
    const seed = i + 401;
    const vehicle = pick(vehicles, seed);
    const status = pick(["Open", "In Progress", "Completed", "Completed", "Cancelled"], seed);
    const estimatedCost = 2500 + (seed % 20) * 850;
    const actualCost = status === "Completed" ? estimatedCost + (seed % 5) * 200 - 400 : null;
    await db.workOrder.create({
      data: {
        companyId: COMPANY_ID,
        workOrderId: `RZ-WO-${String(1000 + seed)}`,
        vehicleId: vehicle.id,
        title: pick(WORK_ORDER_TITLES, seed),
        type: pick(["Scheduled", "Unscheduled", "Recall", "Warranty"], seed),
        priority: pick(["Urgent", "High", "Medium", "Low"], seed),
        status,
        vendor: pick(VENDORS, seed),
        technician: pick(INSPECTORS, seed + 1),
        estimatedCost,
        actualCost,
        createdDate: daysAgo(seed % 35),
        estimatedCompletion: status === "Open" || status === "In Progress" ? daysFromNow((seed % 7) + 1) : null,
      },
    });
  }

  console.log("[seed-fleet-ops] seeding issues...");
  for (let i = 0; i < 16; i++) {
    const seed = i + 503;
    const vehicle = pick(vehicles, seed);
    const driver = pick(drivers, seed + 2);
    const trip = trips.length > 0 ? pick(trips, seed) : null;
    const bank = pick(ISSUE_TITLES, seed);
    const status = pick(["Open", "InProgress", "Resolved", "Resolved", "Closed"], seed);
    await db.issue.create({
      data: {
        companyId: COMPANY_ID,
        issueId: `RZ-ISS-${String(1000 + seed)}`,
        vehicleId: vehicle.id,
        driverId: driver.id,
        tripId: trip?.id ?? null,
        category: bank.category,
        severity: pick(["Low", "Medium", "High", "Critical"], seed),
        title: bank.title,
        description: `${bank.title} reported for ${vehicle.name}.`,
        status,
        reportedBy: pick(drivers, seed + 4).name,
        assignee: pick(["Sukhbir Gill", "Rohit Sharma"], seed),
        source: pick(["Manual", "Manual", "Inspection", "Rean"], seed),
        resolvedAt: status === "Resolved" || status === "Closed" ? daysAgo(seed % 10) : null,
        createdAt: daysAgo((seed % 25) + 1),
      },
    });
  }

  console.log("[seed-fleet-ops] seeding service programs...");
  const template = await db.serviceTemplate.findFirst({ where: { companyId: COMPANY_ID } });
  for (let i = 0; i < 15; i++) {
    const seed = i + 601;
    const vehicle = pick(vehicles, seed);
    const intervalKm = 10000;
    const lastDoneKm = 5000 + (seed % 8) * 900;
    await db.serviceProgram.create({
      data: {
        companyId: COMPANY_ID,
        vehicleId: vehicle.id,
        templateId: template?.id ?? null,
        name: "Periodic Preventive Service",
        type: "Preventive",
        intervalKm,
        intervalDays: 90,
        lastDoneKm,
        lastDoneAt: daysAgo(seed % 60),
        nextDueKm: lastDoneKm + intervalKm,
        nextDueAt: daysFromNow((seed % 30) - 10),
        status: "Active",
      },
    });
  }

  console.log("[seed-fleet-ops] seeding reminders...");
  const reminderCategories: { category: string; title: string }[] = [
    { category: "Insurance", title: "Vehicle insurance renewal" },
    { category: "PUC", title: "Pollution certificate renewal" },
    { category: "Fitness", title: "Fitness certificate renewal" },
    { category: "Permit", title: "State permit renewal" },
    { category: "Service", title: "Scheduled service due" },
    { category: "Licence", title: "Driving licence renewal" },
    { category: "Tax", title: "Road tax renewal" },
  ];
  for (let i = 0; i < 22; i++) {
    const seed = i + 701;
    const rc = pick(reminderCategories, seed);
    const isDriverReminder = rc.category === "Licence";
    const vehicle = isDriverReminder ? null : pick(vehicles, seed);
    const driver = isDriverReminder ? pick(drivers, seed) : null;
    const dueInDays = (seed % 40) - 12;
    await db.reminder.create({
      data: {
        companyId: COMPANY_ID,
        vehicleId: vehicle?.id ?? null,
        driverId: driver?.id ?? null,
        title: `${rc.title} - ${vehicle?.name ?? driver?.name ?? ""}`.trim(),
        category: rc.category,
        dueDate: daysFromNow(dueInDays),
        notifyDays: 15,
        status: dueInDays < -5 ? "Snoozed" : pick(["Pending", "Pending", "Pending", "Done"], seed),
      },
    });
  }

  console.log("[seed-fleet-ops] done.");
}

main()
  .catch((e) => {
    console.error("[seed-fleet-ops] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

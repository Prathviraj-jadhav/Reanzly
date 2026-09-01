// Seeds real Sprint + Task rows for the Operations Hub module, replacing
// what used to be a fully client-side, in-memory demo (mock-data.ts's
// TASKS array plus a hash-derived fake enrichment for sprint/checklist/
// comments/attachments - see operations-hub/_helpers.ts's prior
// deriveTaskExtras). Tasks link to real Trip/Vehicle/Customer/Invoice rows
// and use real Driver names as assignees, so the board isn't empty on
// first load after the fake-to-real conversion.
//
// Idempotent: skips if Sprint already has rows for this company.
// Run with: bun run src/scripts/seed-operations-hub.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const DEPARTMENTS = ["Operations", "Fleet", "Finance", "HR", "Dispatch", "Maintenance"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const STATUSES = ["Backlog", "Planned", "In Progress", "Blocked", "Under Review", "Completed"];

const CHECKLIST_BANK = [
  "Verify supporting documents",
  "Notify stakeholder",
  "Capture approval in system",
  "Update linked record",
  "Schedule follow-up",
  "Reconcile figures",
];

const COMMENT_BANK = [
  "Picked this up - need confirmation before Friday.",
  "GST implication on this - please loop in CA before closing.",
  "Workshop slot available Monday morning. Will block 2 hrs.",
  "Driver confirmed availability. Proceeding.",
  "Approve the additional spend if under ₹15,000.",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

async function main() {
  const existing = await db.sprint.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-operations-hub] already seeded (${existing} sprints found) - skipping.`);
    return;
  }

  const [trips, vehicles, drivers, customers, invoices] = await Promise.all([
    db.trip.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, tripId: true }, take: 10 }),
    db.vehicle.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, name: true, licensePlate: true }, take: 10 }),
    db.driver.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, name: true }, take: 15 }),
    db.customer.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, companyName: true }, take: 10 }),
    db.invoice.findMany({ where: { companyId: COMPANY_ID }, select: { id: true, invoiceNumber: true }, take: 10 }),
  ]);

  if (drivers.length === 0) {
    console.log("[seed-operations-hub] no Driver rows found for this company - run seed-business-data.ts first. Skipping.");
    return;
  }

  console.log("[seed-operations-hub] seeding sprints...");
  const sprints = await Promise.all([
    db.sprint.create({
      data: {
        companyId: COMPANY_ID,
        name: "Sprint 23",
        goal: "Driver onboarding & document compliance cleanup",
        startDate: daysAgo(28),
        endDate: daysAgo(14),
        status: "Completed",
      },
    }),
    db.sprint.create({
      data: {
        companyId: COMPANY_ID,
        name: "Sprint 24",
        goal: "Reduce overdue invoices, fix fuel anomalies, clear pending challans",
        startDate: daysAgo(14),
        endDate: new Date(),
        status: "Active",
      },
    }),
    db.sprint.create({
      data: {
        companyId: COMPANY_ID,
        name: "Sprint 25",
        goal: "Vendor onboarding automation, fleet recall audit",
        startDate: daysFromNow(1),
        endDate: daysFromNow(14),
        status: "Planned",
      },
    }),
    db.sprint.create({
      data: {
        companyId: COMPANY_ID,
        name: "Sprint 26",
        goal: "Quarter close & GST reconciliation prep",
        startDate: daysFromNow(15),
        endDate: daysFromNow(28),
        status: "Backlog",
      },
    }),
  ]);

  const titleBank = [
    "Follow up on overdue invoice",
    "Schedule brake inspection",
    "Renew insurance before expiry",
    "Investigate fuel anomaly",
    "Assign driver for tomorrow's load",
    "Review POD for delivered trip",
    "Process driver settlement",
    "Clear pending challans",
    "Update eWay Bill Part-B",
    "Onboard new customer account",
    "Reconcile GST input credit",
    "Audit vehicle document expiry",
    "Chase customer for payment",
    "Verify workshop estimate",
    "Confirm delivery ETA with customer",
    "Escalate blocked shipment",
    "Close out completed work order",
    "Prepare quarter-close summary",
  ];

  console.log("[seed-operations-hub] seeding tasks...");
  for (let i = 0; i < titleBank.length; i++) {
    const seed = i + 179;
    const status = pick(STATUSES, seed);
    const sprintRoll = seed % 10;
    const sprint = sprintRoll < 6 ? sprints[1] : sprintRoll < 9 ? sprints[2] : sprints[0];

    let linkedEntityType: string | null = null;
    let linkedEntityId: string | null = null;
    let linkedEntityName: string | null = null;
    const linkRoll = seed % 5;
    if (linkRoll === 0 && trips.length > 0) {
      const t = pick(trips, seed);
      linkedEntityType = "Trip";
      linkedEntityId = t.id;
      linkedEntityName = t.tripId;
    } else if (linkRoll === 1 && vehicles.length > 0) {
      const v = pick(vehicles, seed);
      linkedEntityType = "Vehicle";
      linkedEntityId = v.id;
      linkedEntityName = `${v.name} (${v.licensePlate})`;
    } else if (linkRoll === 2 && customers.length > 0) {
      const c = pick(customers, seed);
      linkedEntityType = "Customer";
      linkedEntityId = c.id;
      linkedEntityName = c.companyName;
    } else if (linkRoll === 3 && invoices.length > 0) {
      const inv = pick(invoices, seed);
      linkedEntityType = "Invoice";
      linkedEntityId = inv.id;
      linkedEntityName = inv.invoiceNumber;
    }

    const ckCount = 2 + (seed % 4);
    const checklist = Array.from({ length: ckCount }, (_, j) => ({
      text: CHECKLIST_BANK[(seed + j * 3) % CHECKLIST_BANK.length],
      done: status === "Completed" ? true : (seed + j * 5) % 3 === 0,
    }));

    const task = await db.task.create({
      data: {
        companyId: COMPANY_ID,
        title: titleBank[i],
        description: "Auto-generated from operational signals. Review and assign.",
        assignee: pick(drivers, seed + 3).name,
        dueDate: status === "Completed" ? null : daysFromNow((seed % 14) - 5),
        priority: pick(PRIORITIES, seed),
        department: pick(DEPARTMENTS, seed),
        status,
        isRean: seed % 4 === 0,
        linkedEntityType,
        linkedEntityId,
        linkedEntityName,
        checklistJson: JSON.stringify(checklist),
        sprintId: sprint.id,
        createdBy: "Rean",
        createdAt: daysAgo(seed % 20),
        completedAt: status === "Completed" ? daysAgo(seed % 7) : null,
      },
    });

    const cmCount = 1 + (seed % 3);
    for (let j = 0; j < cmCount; j++) {
      const daysBack = (seed + j * 5) % 6;
      await db.taskComment.create({
        data: {
          taskId: task.id,
          authorName: task.isRean && j === 0 ? "Rean" : pick(drivers, seed + j).name,
          body: COMMENT_BANK[(seed + j * 4) % COMMENT_BANK.length],
          createdAt: daysAgo(daysBack),
        },
      });
    }
  }

  console.log(`[seed-operations-hub] done - ${sprints.length} sprints, ${titleBank.length} tasks.`);
}

main()
  .catch((e) => {
    console.error("[seed-operations-hub] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

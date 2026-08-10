// Seeds real Automation rows (the Prisma model already existed but had zero
// consumers - the module read entirely from mock-data.ts's AUTOMATIONS
// array instead). Idempotent: skips if Automation already has rows for this
// company. Run with: bun run src/scripts/seed-automation.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const AUTOMATIONS = [
  {
    name: "Overdue Invoice Escalation",
    description: "Escalate invoices past due by 15 days to finance manager and send firm reminder.",
    trigger: "Invoice overdue by 15 days",
    triggerCategory: "Invoice",
    conditions: [{ field: "status", operator: "equals", value: "Overdue" }],
    actions: [
      { type: "Send Notification", config: "Finance Manager" },
      { type: "Send Email", config: "Firm reminder template" },
    ],
    status: "Active",
    lastRun: daysAgo(1),
    runCount: 47,
    createdBy: "Reena Mehta",
  },
  {
    name: "Document Expiry Notification Chain",
    description: "Notify at 30, 15, and 7 days before any document expires; create a renewal task.",
    trigger: "Document expiry approaching (15d)",
    triggerCategory: "Document",
    conditions: [{ field: "daysToExpiry", operator: "less than", value: "15" }],
    actions: [
      { type: "Send Notification", config: "Vehicle owner + Fleet Manager" },
      { type: "Create Task", config: "Renewal task in Operations Hub" },
    ],
    status: "Active",
    lastRun: daysAgo(0.2),
    runCount: 312,
    createdBy: "Sukhbir Gill",
  },
  {
    name: "Failed Inspection Work Order",
    description: "Auto-create a work order when an inspection item fails, linked to the vehicle and issue.",
    trigger: "Inspection result = Fail",
    triggerCategory: "Inspection",
    conditions: [{ field: "result", operator: "equals", value: "Fail" }],
    actions: [{ type: "Create Work Order", config: "Pre-filled from failed items" }],
    status: "Active",
    lastRun: daysAgo(3),
    runCount: 18,
    createdBy: "Sukhbir Gill",
  },
  {
    name: "Fuel Anomaly Investigation Task",
    description: "When Rean flags a fuel anomaly, create an investigation task assigned to the fleet manager.",
    trigger: "Rean fuel anomaly detected",
    triggerCategory: "Rean Alert",
    conditions: [{ field: "anomaly", operator: "equals", value: "true" }],
    actions: [{ type: "Create Task", config: "Fleet Manager - investigate fuel anomaly" }],
    status: "Active",
    lastRun: daysAgo(2),
    runCount: 9,
    createdBy: "Rean",
  },
  {
    name: "POD Accepted Auto Invoice",
    description: "On POD acceptance, generate a GST-compliant invoice from freight plus surcharges.",
    trigger: "POD accepted",
    triggerCategory: "Trip",
    conditions: [{ field: "podStatus", operator: "equals", value: "Accepted" }],
    actions: [{ type: "Generate Invoice Draft", config: "GST-compliant, freight + surcharges" }],
    status: "Active",
    lastRun: daysAgo(0.5),
    runCount: 84,
    createdBy: "Reena Mehta",
  },
  {
    name: "Trip Delay WhatsApp Notification",
    description: "Send WhatsApp update to customer when trip is delayed beyond 2 hours from ETA.",
    trigger: "Trip delayed > 2 hours",
    triggerCategory: "Trip",
    conditions: [{ field: "delayHours", operator: "greater than", value: "2" }],
    actions: [{ type: "Send SMS", config: "WhatsApp Business - delay template" }],
    status: "Paused",
    lastRun: daysAgo(8),
    runCount: 23,
    createdBy: "Rohit Sharma",
  },
];

async function main() {
  const existing = await db.automation.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-automation] already seeded (${existing} automations found) - skipping.`);
    return;
  }

  console.log("[seed-automation] seeding automations...");
  for (const a of AUTOMATIONS) {
    await db.automation.create({
      data: {
        companyId: COMPANY_ID,
        name: a.name,
        description: a.description,
        trigger: a.trigger,
        triggerCategory: a.triggerCategory,
        conditions: JSON.stringify(a.conditions),
        actions: JSON.stringify(a.actions),
        status: a.status,
        lastRun: a.lastRun,
        runCount: a.runCount,
        createdBy: a.createdBy,
      },
    });
  }

  console.log(`[seed-automation] done - ${AUTOMATIONS.length} automations.`);
}

main()
  .catch((e) => {
    console.error("[seed-automation] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

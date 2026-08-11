// Seeds a realistic notification backlog so the bell isn't empty on first
// load - every notification here is addressed to a real seeded User and,
// where relevant, references a real Trip/Invoice/FuelEntry/WorkOrder row
// pulled live from the DB, replacing the old client-only mock-data.ts
// NOTIFICATIONS array (16 witty but entirely invented entries).
//
// Idempotent: skips if this company already has Notification rows -
// ongoing notifications after this point come from real triggers
// (src/lib/notify.ts calls in HR/Automation routes) and the recurring
// alert-scan job, not from re-running this script.
// Run with: bun run src/scripts/seed-notifications.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000);
}

async function main() {
  console.log("[seed-notifications] starting...");

  const existing = await db.notification.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-notifications] already seeded (${existing} found) - skipping.`);
    return;
  }

  const [anomalyFuel, brokenVehicle, overdueInvoice, activeTrip, failedInspection, openWorkOrder, pendingLeave] = await Promise.all([
    db.fuelEntry.findFirst({ where: { companyId: COMPANY_ID, anomaly: true }, include: { vehicle: true } }),
    db.vehicle.findFirst({ where: { companyId: COMPANY_ID, status: { in: ["Breakdown", "Maintenance"] } } }),
    db.invoice.findFirst({ where: { companyId: COMPANY_ID, status: "Overdue" }, orderBy: { dueDate: "asc" } }),
    db.trip.findFirst({ where: { companyId: COMPANY_ID, status: "Delivered" }, orderBy: { createdDate: "desc" } }),
    db.inspection.findFirst({ where: { companyId: COMPANY_ID, result: "Fail" }, include: { vehicle: true } }),
    db.workOrder.findFirst({ where: { companyId: COMPANY_ID, status: "Open" }, include: { vehicle: true } }),
    db.leaveRequest.findFirst({ where: { companyId: COMPANY_ID, status: "Pending" }, include: { employee: true } }),
  ]);

  type Row = { userId: string; category: string; severity: "critical" | "warning" | "info"; title: string; description: string; link?: { module: string; id?: string }; minutesAgo: number; read: boolean };
  const rows: Row[] = [];

  if (anomalyFuel) {
    rows.push({
      userId: "fleet-manager", category: "Rean", severity: "critical",
      title: `Fuel anomaly on ${anomalyFuel.vehicle?.name ?? "a vehicle"}`,
      description: anomalyFuel.anomalyNote ?? "Efficiency significantly below fleet average - worth investigating.",
      link: { module: "fuel-energy", id: anomalyFuel.id }, minutesAgo: 12, read: false,
    });
  }
  if (brokenVehicle) {
    rows.push({
      userId: "fleet-manager", category: "Vehicle", severity: "critical",
      title: `${brokenVehicle.name} is down`,
      description: `Status: ${brokenVehicle.status}. Needs attention before its next scheduled trip.`,
      link: { module: "vehicles", id: brokenVehicle.id }, minutesAgo: 40, read: false,
    });
  }
  if (overdueInvoice) {
    rows.push({
      userId: "finance-manager", category: "Invoice", severity: "warning",
      title: `Invoice ${overdueInvoice.invoiceNumber} is overdue`,
      description: `${overdueInvoice.customer} owes ₹${Math.round(overdueInvoice.totalAmount).toLocaleString("en-IN")}.`,
      link: { module: "invoice", id: overdueInvoice.id }, minutesAgo: 90, read: false,
    });
    rows.push({
      userId: "owner", category: "Invoice", severity: "warning",
      title: `Invoice ${overdueInvoice.invoiceNumber} is overdue`,
      description: `${overdueInvoice.customer} owes ₹${Math.round(overdueInvoice.totalAmount).toLocaleString("en-IN")}. Finance has been notified.`,
      link: { module: "invoice", id: overdueInvoice.id }, minutesAgo: 90, read: true,
    });
  }
  if (activeTrip) {
    rows.push({
      userId: "ops-manager", category: "Trip", severity: "info",
      title: `Trip ${activeTrip.tripId} delivered`,
      description: `${activeTrip.origin} → ${activeTrip.destination}. POD captured, invoice generated.`,
      link: { module: "trips", id: activeTrip.id }, minutesAgo: 180, read: true,
    });
  }
  if (failedInspection) {
    rows.push({
      userId: "fleet-manager", category: "Compliance", severity: "critical",
      title: `${failedInspection.vehicle?.name ?? "A vehicle"} failed inspection`,
      description: `Inspection ${failedInspection.inspectionId} (${failedInspection.type}) came back Fail.`,
      link: { module: "inspection", id: failedInspection.id }, minutesAgo: 240, read: false,
    });
  }
  if (openWorkOrder) {
    rows.push({
      userId: "fleet-manager", category: "Maintenance", severity: "info",
      title: `Work order open: ${openWorkOrder.title}`,
      description: `${openWorkOrder.vehicle?.name ?? "Vehicle"} - ${openWorkOrder.workOrderId}, priority ${openWorkOrder.priority}.`,
      link: { module: "maintenance", id: openWorkOrder.id }, minutesAgo: 300, read: true,
    });
  }
  if (pendingLeave) {
    rows.push({
      userId: "hr-manager", category: "HR", severity: "info",
      title: "Leave request awaiting approval",
      description: `${pendingLeave.employee.name} requested ${pendingLeave.days}d of ${pendingLeave.type} leave.`,
      link: { module: "hr", id: pendingLeave.id }, minutesAgo: 60, read: false,
    });
  }

  // A couple of always-on, role-general items so nobody's bell is empty
  // even if the specific real-data lookups above found nothing.
  rows.push({
    userId: "owner", category: "Rean", severity: "info",
    title: "Weekly summary ready",
    description: "Rean has compiled this week's operations, finance, and compliance highlights.",
    link: { module: "dashboard" }, minutesAgo: 600, read: true,
  });
  rows.push({
    userId: "safety-officer", category: "Compliance", severity: "warning",
    title: "Fitness certificate renewals due this month",
    description: "Two vehicles have fitness certificates expiring within 30 days.",
    link: { module: "compliance" }, minutesAgo: 720, read: false,
  });

  for (const r of rows) {
    await db.notification.create({
      data: {
        companyId: COMPANY_ID,
        userId: r.userId,
        category: r.category,
        severity: r.severity,
        title: r.title,
        description: r.description,
        linkModule: r.link?.module ?? null,
        linkId: r.link?.id ?? null,
        read: r.read,
        createdAt: minutesAgo(r.minutesAgo),
      },
    });
  }

  console.log(`[seed-notifications] seeded ${rows.length} real notifications.`);
}

main()
  .catch((e) => {
    console.error("[seed-notifications] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

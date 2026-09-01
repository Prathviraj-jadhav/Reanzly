// Seeds real ScheduledReport + CustomReport rows (previously pure
// client-side state seeded once from mock-data.ts-style arrays in
// _helpers.tsx and lost on every page refresh). Idempotent: skips if
// ScheduledReport already has rows for this company.
// Run with: bun run src/scripts/seed-reports.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const SCHEDULES = [
  { reportId: "trip-summary", reportName: "Trip Summary", category: "Operations", frequency: "Daily", deliveryTime: "08:00", recipients: ["Operations Manager", "Dispatcher"], format: "PDF", nextRun: daysFromNow(1), createdBy: "Reena Mehta" },
  { reportId: "invoice-aging", reportName: "Invoice Aging", category: "Financial", frequency: "Weekly", deliveryTime: "09:30", recipients: ["Finance Manager", "Owner"], format: "Excel", nextRun: daysFromNow(3), createdBy: "Reena Mehta" },
  { reportId: "vehicle-utilization", reportName: "Vehicle Utilization", category: "Fleet", frequency: "Weekly", deliveryTime: "17:00", recipients: ["Fleet Manager", "Operations Manager"], format: "PDF", nextRun: daysFromNow(2), createdBy: "Sukhbir Gill" },
  { reportId: "rean-insights", reportName: "Rean Insights", category: "Operations", frequency: "Monthly", deliveryTime: "10:00", recipients: ["Owner", "Operations Manager", "Finance Manager"], format: "PDF", nextRun: daysFromNow(12), createdBy: "Rean" },
  { reportId: "compliance-status", reportName: "Compliance Status", category: "Compliance", frequency: "Monthly", deliveryTime: "11:30", recipients: ["Fleet Manager"], format: "Excel", nextRun: daysFromNow(8), createdBy: "Sukhbir Gill", status: "Paused" },
  { reportId: "fuel-efficiency", reportName: "Fuel Efficiency", category: "Fuel", frequency: "Weekly", deliveryTime: "16:00", recipients: ["Fleet Manager"], format: "CSV", nextRun: daysFromNow(4), createdBy: "Rohit Sharma" },
];

const CUSTOM_REPORTS = [
  {
    name: "Mumbai-Delhi Lane Margin", baseReportId: "route-profitability", category: "Operations",
    description: "Route Profitability filtered to Mumbai–Delhi lane, monthly, owned fleet only.",
    filters: { reportId: "route-profitability", datePreset: "30d", vehicleGroup: "All", vehicleType: "All" },
    createdBy: "Reena Mehta", lastRun: daysAgo(2), runCount: 18,
  },
  {
    name: "Refrigerated Fleet Utilization", baseReportId: "vehicle-utilization", category: "Fleet",
    description: "Vehicle Utilization filtered to Refrigerated group, weekly.",
    filters: { reportId: "vehicle-utilization", datePreset: "7d", vehicleGroup: "Refrigerated", vehicleType: "All" },
    createdBy: "Sukhbir Gill", lastRun: daysAgo(5), runCount: 34,
  },
  {
    name: "Top Outstanding Invoices", baseReportId: "invoice-aging", category: "Financial",
    description: "Invoice Aging with 90+ days overdue emphasis.",
    filters: { reportId: "invoice-aging", datePreset: "90d", vehicleGroup: "All", vehicleType: "All" },
    createdBy: "Reena Mehta", lastRun: daysAgo(1), runCount: 56,
  },
  {
    name: "Driver Rating Review", baseReportId: "driver-performance", category: "Driver",
    description: "Driver Performance, all time, for the rating/on-time review.",
    filters: { reportId: "driver-performance", datePreset: "all", vehicleGroup: "All", vehicleType: "All" },
    createdBy: "Anil Reddy", lastRun: daysAgo(0.4), runCount: 9,
  },
];

async function main() {
  const existing = await db.scheduledReport.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-reports] already seeded (${existing} schedules found) - skipping.`);
    return;
  }

  console.log("[seed-reports] seeding scheduled reports...");
  for (const s of SCHEDULES) {
    await db.scheduledReport.create({
      data: {
        companyId: COMPANY_ID,
        reportId: s.reportId,
        reportName: s.reportName,
        category: s.category,
        frequency: s.frequency,
        deliveryTime: s.deliveryTime,
        recipients: JSON.stringify(s.recipients),
        format: s.format,
        status: s.status ?? "Active",
        nextRun: s.nextRun,
        createdBy: s.createdBy,
      },
    });
  }

  console.log("[seed-reports] seeding custom reports...");
  for (const c of CUSTOM_REPORTS) {
    await db.customReport.create({
      data: {
        companyId: COMPANY_ID,
        name: c.name,
        baseReportId: c.baseReportId,
        category: c.category,
        description: c.description,
        filters: JSON.stringify(c.filters),
        createdBy: c.createdBy,
        lastRun: c.lastRun,
        runCount: c.runCount,
      },
    });
  }

  console.log(`[seed-reports] done - ${SCHEDULES.length} schedules, ${CUSTOM_REPORTS.length} custom reports.`);
}

main()
  .catch((e) => {
    console.error("[seed-reports] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

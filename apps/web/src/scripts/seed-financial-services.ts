// Seeds real FinancingApplication rows (previously a Zustand store
// persisted to browser localStorage - not shared across users/devices,
// not company-scoped, lost if localStorage was ever cleared).
// Idempotent: skips if FinancingApplication already has rows for this
// company. Run with: bun run src/scripts/seed-financial-services.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

const APPLICATIONS = [
  {
    productType: "Working Capital Loan",
    requestedAmount: 800000,
    tenureMonths: 12,
    status: "approved",
    notes: "Sized off trailing 90-day invoiced revenue.",
    createdAt: daysAgo(25),
    resolvedAt: daysAgo(20),
  },
  {
    productType: "Fuel Card Credit Line",
    requestedAmount: 150000,
    tenureMonths: 1,
    status: "approved",
    notes: "Revolving line across active fleet.",
    createdAt: daysAgo(41),
    resolvedAt: daysAgo(36),
  },
  {
    productType: "Working Capital Loan",
    requestedAmount: 500000,
    tenureMonths: 9,
    status: "submitted",
    createdAt: daysAgo(2),
    resolvedAt: null,
  },
  {
    productType: "Fuel Card Credit Line",
    requestedAmount: 80000,
    tenureMonths: 1,
    status: "draft",
    createdAt: daysAgo(1),
    resolvedAt: null,
  },
];

async function main() {
  const existing = await db.financingApplication.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-financial-services] already seeded (${existing} applications found) - skipping.`);
    return;
  }

  // Invoice Discounting applications need real Invoice ids to link against.
  const eligibleInvoices = await db.invoice.findMany({
    where: { companyId: COMPANY_ID, status: { in: ["Sent", "Overdue", "Partially Paid"] } },
    select: { id: true, totalAmount: true },
    take: 6,
  });

  console.log("[seed-financial-services] seeding applications...");
  let n = 0;
  for (const a of APPLICATIONS) {
    n++;
    await db.financingApplication.create({
      data: {
        companyId: COMPANY_ID,
        applicationNumber: `RZ-FIN-${String(n).padStart(5, "0")}`,
        productType: a.productType,
        linkedInvoiceIds: "[]",
        requestedAmount: a.requestedAmount,
        tenureMonths: a.tenureMonths,
        status: a.status,
        notes: a.notes ?? null,
        createdBy: "Reena Mehta",
        createdAt: a.createdAt,
        updatedAt: a.resolvedAt ?? a.createdAt,
        resolvedAt: a.resolvedAt,
      },
    });
  }

  if (eligibleInvoices.length >= 2) {
    n++;
    const linked = eligibleInvoices.slice(0, 2);
    await db.financingApplication.create({
      data: {
        companyId: COMPANY_ID,
        applicationNumber: `RZ-FIN-${String(n).padStart(5, "0")}`,
        productType: "Invoice Discounting",
        linkedInvoiceIds: JSON.stringify(linked.map((i) => i.id)),
        requestedAmount: Math.round(linked.reduce((s, i) => s + i.totalAmount, 0) * 0.8),
        tenureMonths: 3,
        status: "disbursed",
        notes: "Advance against real linked receivables.",
        createdBy: "Reena Mehta",
        createdAt: daysAgo(24),
        updatedAt: daysAgo(18),
        resolvedAt: daysAgo(18),
      },
    });
  }

  console.log(`[seed-financial-services] done - ${n} applications.`);
}

main()
  .catch((e) => {
    console.error("[seed-financial-services] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

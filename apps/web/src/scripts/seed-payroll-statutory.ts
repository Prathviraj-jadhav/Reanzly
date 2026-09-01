// Seeds real PayrollStatutoryFiling rows for the standalone Payroll
// module's Statutory Returns tab - previously a client-only
// STATUTORY_RETURNS mock array in payroll/_helpers.tsx. Company-level (no
// Employee FK), 16 records: last 4 months x 4 statutory types (PF, ESI,
// TDS, Professional Tax), matching the mock's original 4x4 layout and
// status progression (latest month has Overdue/Pending, older months are
// Filed).
//
// Liability amounts are grounded in real Employee.ctcAnnual data (headcount
// x average monthly CTC) rather than the mock's hardcoded numbers - if no
// employees exist yet the amounts fall back to a small flat estimate so the
// script still seeds usable rows.
//
// Idempotent: skips if this company already has PayrollStatutoryFiling rows.
// Run with: bun run src/scripts/seed-payroll-statutory.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const STATUTORY_TYPES = ["PF", "ESI", "TDS", "Professional Tax"] as const;
const PORTAL: Record<string, string> = {
  PF: "EPFO Unified Portal",
  ESI: "ESIC Employer Portal",
  TDS: "TRACES / NSDL",
  "Professional Tax": "Maharashtra GST PT Portal",
};

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysAhead(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
function monthKey(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  console.log("[seed-payroll-statutory] starting...");

  const existing = await db.payrollStatutoryFiling.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-payroll-statutory] already seeded (${existing} returns found) - skipping.`);
    return;
  }

  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID }, select: { ctcAnnual: true } });
  const headcount = employees.length;
  const monthlyGross = headcount > 0
    ? Math.round(employees.reduce((s, e) => s + e.ctcAnnual, 0) / 12)
    : 30_00000 * 10; // flat fallback: ~10 employees at 30k/month if none seeded yet

  const pfAmount = Math.round(monthlyGross * 0.24);
  const esiAmount = Math.round(monthlyGross * 0.065);
  const tdsAmount = Math.round(monthlyGross * 0.02);
  const ptAmount = Math.max(headcount, 1) * 20000; // Rs 200/employee, in paise
  const AMOUNT: Record<string, number> = { PF: pfAmount, ESI: esiAmount, TDS: tdsAmount, "Professional Tax": ptAmount };

  let created = 0;
  for (let mIdx = 0; mIdx < 4; mIdx++) {
    const month = monthKey(mIdx + 1);
    for (const [tIdx, type] of STATUTORY_TYPES.entries()) {
      const isLatest = mIdx === 0;
      const status = isLatest && (tIdx === 0 || tIdx === 2) ? "Overdue" : isLatest && (tIdx === 1 || tIdx === 3) ? "Pending" : "Filed";
      const period = type === "TDS" ? `Q${Math.ceil((mIdx + 1) / 3) + 1} FY25-26` : month;
      const dueDate = isLatest ? daysAhead((tIdx + 1) * 4) : daysAgo(mIdx * 30 + (tIdx + 1) * 2);
      await db.payrollStatutoryFiling.create({
        data: {
          companyId: COMPANY_ID,
          type,
          period,
          dueDate,
          filedDate: status === "Filed" ? daysAgo(mIdx * 30 + (tIdx + 1) * 2 - 1) : null,
          status,
          amount: AMOUNT[type],
          challanNo: status === "Filed" ? `CHN-${String(77_000_000 + created * 137).slice(0, 8)}` : null,
          filedBy: status === "Filed" ? "Reena Mehta" : null,
          filingPortal: PORTAL[type],
          acknowledgementNo: status === "Filed" ? `ACK${String(88_000_000 + created * 173).slice(0, 8)}` : null,
          remarks: status === "Overdue" ? "Penalty accruing at INR 100/day" : null,
        },
      });
      created++;
    }
  }

  console.log(`[seed-payroll-statutory] seeded ${created} statutory returns (headcount=${headcount}).`);
}

main()
  .catch((e) => {
    console.error("[seed-payroll-statutory] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

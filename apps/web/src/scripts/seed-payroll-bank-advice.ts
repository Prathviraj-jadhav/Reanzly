// Seeds real PayrollBankAdvice rows for the standalone Payroll module's
// Bank Advice tab - previously a client-only BANK_ADVICES mock array.
// 8 records across 4 banks and the last 6 months, matching the mock's
// original status distribution (4 Processed, 2 Submitted, 1 Generated,
// 1 Failed).
//
// The real POST /api/payroll/bank-advice route computes totalAmount /
// beneficiaryCount by joining Payslip + Employee on bankName - but the
// currently seeded Employee rows don't have bankName populated (out of
// scope for this task), so that join would return zero for every bank.
// Instead this script derives a realistic totalAmount from each employee
// bucket's real ctcAnnual (monthly net estimate), same spirit as the mock's
// own PAY_CYCLES-derived math, just grounded in real Employee rows instead
// of a hardcoded fraction.
//
// Idempotent: skips if this company already has PayrollBankAdvice rows.
// Run with: bun run src/scripts/seed-payroll-bank-advice.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const BANKS = [
  { name: "HDFC Bank", branch: "Andheri East, Mumbai" },
  { name: "State Bank of India", branch: "Bandra West, Mumbai" },
  { name: "ICICI Bank", branch: "Powai, Mumbai" },
  { name: "Axis Bank", branch: "Vikhroli, Mumbai" },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function monthKey(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  console.log("[seed-payroll-bank-advice] starting...");

  const existing = await db.payrollBankAdvice.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-payroll-bank-advice] already seeded (${existing} advices found) - skipping.`);
    return;
  }

  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID }, select: { ctcAnnual: true } });
  if (employees.length === 0) {
    console.log("[seed-payroll-bank-advice] no Employee rows found - run seed-hr-full.ts first. Skipping.");
    return;
  }
  const avgMonthlyNet = Math.round((employees.reduce((s, e) => s + e.ctcAnnual, 0) / employees.length / 12) * 0.86); // rough net after ~14% deductions

  let created = 0;
  for (let i = 0; i < 8; i++) {
    const bank = BANKS[i % 4];
    const month = monthKey(i % 6);
    const status = i < 4 ? "Processed" : i < 6 ? "Submitted" : i === 6 ? "Generated" : "Failed";
    const beneficiaryCount = [18, 6, 4, 4][i % 4];
    const totalAmount = beneficiaryCount * avgMonthlyNet;
    const hasNeft = status !== "Generated";
    await db.payrollBankAdvice.create({
      data: {
        companyId: COMPANY_ID,
        adviceNo: `RZ-BA-${month.replace("-", "")}-${String(i + 1).padStart(2, "0")}`,
        month,
        bankName: bank.name,
        bankBranch: bank.branch,
        totalAmount,
        beneficiaryCount,
        status,
        generatedDate: daysAgo(i * 4 + 5),
        submittedDate: status !== "Generated" ? daysAgo(i * 4 + 3) : null,
        processedDate: status === "Processed" ? daysAgo(i * 4 + 1) : null,
        utrNo: status === "Processed" ? `UTR${String(88_000_000 + i * 137).slice(0, 8)}` : null,
        neftFile: hasNeft ? `RZ-NEFT-${month.replace("-", "")}-${String(i + 1).padStart(2, "0")}.csv` : null,
        rtgsFile: i % 3 === 0 && hasNeft ? `RZ-RTGS-${month.replace("-", "")}-${String(i + 1).padStart(2, "0")}.csv` : null,
        remarks: status === "Failed" ? "Bank returned: invalid IFSC for 2 accounts" : null,
      },
    });
    created++;
  }

  console.log(`[seed-payroll-bank-advice] seeded ${created} bank advices.`);
}

main()
  .catch((e) => {
    console.error("[seed-payroll-bank-advice] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

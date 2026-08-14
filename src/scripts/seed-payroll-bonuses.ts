// Seeds real PayrollBonus rows for the standalone Payroll module's Bonus &
// Incentives tab - previously a client-only BONUSES mock array. 18 records
// round-robined across real seeded Employee rows, matching the mock's
// original status distribution (6 Pending, 6 Approved, 4 Paid, 2 Cancelled)
// and type mix, including Trip Incentive's tripsCount x perTripAmount math.
//
// Idempotent: skips if this company already has PayrollBonus rows.
// Run with: bun run src/scripts/seed-payroll-bonuses.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const BONUS_TYPES = ["Performance", "Trip Incentive", "Festival", "Retention", "Referral"] as const;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function monthKey(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  console.log("[seed-payroll-bonuses] starting...");

  const existing = await db.payrollBonus.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-payroll-bonuses] already seeded (${existing} bonuses found) - skipping.`);
    return;
  }

  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID } });
  if (employees.length === 0) {
    console.log("[seed-payroll-bonuses] no Employee rows found - run seed-hr-full.ts first. Skipping.");
    return;
  }

  let created = 0;
  for (let i = 0; i < 18; i++) {
    const emp = employees[i % employees.length];
    const type = BONUS_TYPES[i % BONUS_TYPES.length];
    const status = i < 6 ? "Pending" : i < 12 ? "Approved" : i < 16 ? "Paid" : "Cancelled";
    const month = monthKey((i % 4) + 1);
    const isTripIncentive = type === "Trip Incentive";
    const tripsCount = isTripIncentive ? 8 + (i % 5) : null;
    const perTripAmount = isTripIncentive ? 25000 : null; // paise (Rs 250)
    const amountRupees = isTripIncentive
      ? (tripsCount ?? 0) * 250
      : type === "Performance" ? 5000 + (i % 4) * 1000
        : type === "Festival" ? 5000
          : type === "Retention" ? 10000
            : 3000; // Referral
    const description = isTripIncentive
      ? `${tripsCount} trips completed this month at INR 250/trip`
      : type === "Performance"
        ? "Quarterly performance bonus per KRA scorecard"
        : type === "Festival"
          ? "Diwali festival bonus per company policy"
          : type === "Retention"
            ? "Annual retention bonus (3-year milestone)"
            : "Referral bonus for new driver hire";

    await db.payrollBonus.create({
      data: {
        companyId: COMPANY_ID,
        code: `RZ-BNS-${month.replace("-", "")}-${String(i + 1).padStart(3, "0")}`,
        employeeId: emp.id,
        type,
        month,
        amount: amountRupees * 100,
        status,
        approvedDate: status !== "Pending" ? daysAgo(i * 2) : null,
        approvedBy: status !== "Pending" ? "Vikram Kapoor" : null,
        paidDate: status === "Paid" ? daysAgo(Math.max(0, i * 2 - 1)) : null,
        description,
        tripsCount: tripsCount ?? undefined,
        perTripAmount: perTripAmount ?? undefined,
      },
    });
    created++;
  }

  console.log(`[seed-payroll-bonuses] seeded ${created} bonuses across ${employees.length} employees.`);
}

main()
  .catch((e) => {
    console.error("[seed-payroll-bonuses] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

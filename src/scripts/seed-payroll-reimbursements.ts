// Seeds real PayrollReimbursement rows for the standalone Payroll module's
// Reimbursements tab - previously a client-only REIMBURSEMENTS mock array
// keyed off a hand-authored EMPLOYEES seed list in payroll/_helpers.tsx.
// 24 records round-robined across real seeded Employee rows (real FK, not
// a fabricated empCode string), matching the mock's original status
// distribution (8 Pending, 6 Approved, 3 Rejected, 7 Paid) and type mix.
//
// Idempotent: skips if this company already has PayrollReimbursement rows.
// Run with: bun run src/scripts/seed-payroll-reimbursements.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const REIMB_TYPES = ["Fuel", "Travel", "Food", "Mobile", "Stationery", "Medical"] as const;
const REIMB_META: Record<string, string[]> = {
  Fuel: ["Mumbai-Pune-Mumbai", "Mumbai-Nashik-Mumbai", "Mumbai-Ahmedabad-Mumbai"],
  Travel: ["Pune client visit", "Nashik site inspection", "Bangalore training"],
  Food: ["Outstation trip meals", "Late shift meals", "Customer meeting lunch"],
  Mobile: ["Monthly mobile reimbursement", "Roaming charges", "International calling"],
  Stationery: ["Office supplies", "Courier charges", "Print material"],
  Medical: ["Outpatient consultation", "Pharmacy", "Preventive health check"],
};
const AMOUNTS = [1850, 2400, 950, 600, 450, 3200]; // rupees

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function monthKey(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  console.log("[seed-payroll-reimbursements] starting...");

  const existing = await db.payrollReimbursement.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-payroll-reimbursements] already seeded (${existing} reimbursements found) - skipping.`);
    return;
  }

  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID } });
  if (employees.length === 0) {
    console.log("[seed-payroll-reimbursements] no Employee rows found - run seed-hr-full.ts first. Skipping.");
    return;
  }

  let created = 0;
  for (let i = 0; i < 24; i++) {
    const emp = employees[i % employees.length];
    const type = REIMB_TYPES[i % REIMB_TYPES.length];
    const status = i < 8 ? "Pending" : i < 14 ? "Approved" : i < 17 ? "Rejected" : "Paid";
    const month = monthKey((i % 4) + 1);
    const amount = AMOUNTS[i % AMOUNTS.length] * 100; // paise
    const meta = REIMB_META[type][i % 3];
    await db.payrollReimbursement.create({
      data: {
        companyId: COMPANY_ID,
        code: `RZ-RMB-${month.replace("-", "")}-${String(i + 1).padStart(3, "0")}`,
        employeeId: emp.id,
        type,
        month,
        amount,
        status,
        submittedDate: daysAgo(i * 2 + 1),
        approvedDate: status !== "Pending" ? daysAgo(i * 2) : null,
        approvedBy: status !== "Pending" ? "Reena Mehta" : null,
        paidDate: status === "Paid" ? daysAgo(Math.max(0, i * 2 - 1)) : null,
        description: `${type} reimbursement for ${meta.toLowerCase()}`,
        receipts: (i % 3) + 1,
      },
    });
    created++;
  }

  console.log(`[seed-payroll-reimbursements] seeded ${created} reimbursements across ${employees.length} employees.`);
}

main()
  .catch((e) => {
    console.error("[seed-payroll-reimbursements] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

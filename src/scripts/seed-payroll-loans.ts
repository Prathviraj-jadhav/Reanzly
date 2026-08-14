// Seeds real PayrollLoan + PayrollLoanInstallment rows for the standalone
// Payroll module's Loans & Advances tab - previously a client-only LOANS
// mock array with a nested LoanInstallment[] mock. 12 loans round-robined
// across real seeded Employee rows, each with a real installment schedule
// computed via the same EMI math the UI's New Loan drawer already used:
// emi = principal * (1 + rate% * (tenure/12)) / tenure (simple interest).
// Matches the mock's original status distribution (8 Active, 2 Closed,
// 2 Foreclosed) - Closed/Foreclosed loans have every installment marked
// Paid and outstanding = 0; Active loans have a partial payment history.
//
// Idempotent: skips if this company already has PayrollLoan rows.
// Run with: bun run src/scripts/seed-payroll-loans.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

const LOAN_TYPES = ["Vehicle Loan", "Personal Loan", "Salary Advance", "Education Loan"] as const;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

async function main() {
  console.log("[seed-payroll-loans] starting...");

  const existing = await db.payrollLoan.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-payroll-loans] already seeded (${existing} loans found) - skipping.`);
    return;
  }

  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID } });
  if (employees.length === 0) {
    console.log("[seed-payroll-loans] no Employee rows found - run seed-hr-full.ts first. Skipping.");
    return;
  }

  let created = 0;
  for (let i = 0; i < 12; i++) {
    const emp = employees[i % employees.length];
    const type = LOAN_TYPES[i % LOAN_TYPES.length];
    const principalRupees =
      type === "Vehicle Loan" ? 150000 + (i % 4) * 25000 :
      type === "Personal Loan" ? 80000 + (i % 3) * 20000 :
      type === "Salary Advance" ? 25000 + (i % 3) * 5000 :
      200000; // Education Loan
    const interestRate = type === "Salary Advance" ? 0 : type === "Vehicle Loan" ? 9.5 : type === "Personal Loan" ? 12 : 8.5;
    const tenureMonths = type === "Salary Advance" ? 6 : type === "Vehicle Loan" ? 36 : type === "Personal Loan" ? 24 : 48;

    const principal = principalRupees * 100; // paise
    const emi = Math.round((principal * (1 + (interestRate / 100) * (tenureMonths / 12))) / tenureMonths);
    const disbursedDate = daysAgo(180 + i * 30);
    const startDate = daysAgo(170 + i * 30);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + tenureMonths, 5);
    const status = i < 8 ? "Active" : i < 10 ? "Closed" : "Foreclosed";
    const fullyPaid = status !== "Active";
    const paidCount = fullyPaid ? tenureMonths : Math.min(tenureMonths - 1, 2 + (i % 4));
    const outstanding = fullyPaid ? 0 : Math.max(0, principal - paidCount * emi);

    const installments = Array.from({ length: tenureMonths }).map((_, n) => {
      const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + n, 5);
      const paid = n < paidCount;
      return {
        no: n + 1,
        dueDate,
        amount: emi,
        status: paid ? "Paid" : "Pending",
        paidDate: paid ? dueDate : null,
      };
    });

    await db.payrollLoan.create({
      data: {
        companyId: COMPANY_ID,
        code: `RZ-LON-${String(i + 1).padStart(3, "0")}`,
        employeeId: emp.id,
        type,
        principal,
        interestRate,
        tenureMonths,
        emi,
        disbursedDate,
        startDate,
        endDate,
        status,
        outstanding,
        remarks: type === "Salary Advance" ? "Recovered from next 6 payslips" : null,
        installments: { create: installments },
      },
    });
    created++;
  }

  console.log(`[seed-payroll-loans] seeded ${created} loans (with installment schedules) across ${employees.length} employees.`);
}

main()
  .catch((e) => {
    console.error("[seed-payroll-loans] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

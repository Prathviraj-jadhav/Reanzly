import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the Bank Advice tab, replacing the client-only BANK_ADVICES
// mock array. Matches PayrollBankAdvice in schema.prisma. totalAmount /
// beneficiaryCount are computed once at creation time from real Payslip +
// Employee rows (join on bankName + month) rather than fabricated - a live
// recompute on every GET would be nicer but is out of scope here (task
// explicitly allows a stored snapshot).

type Row = Awaited<ReturnType<typeof db.payrollBankAdvice.findFirstOrThrow>>;

function toDTO(r: Row) {
  return {
    id: r.id,
    adviceNo: r.adviceNo,
    month: r.month,
    bankName: r.bankName,
    bankBranch: r.bankBranch ?? "",
    totalAmount: Math.round(r.totalAmount / 100),
    beneficiaryCount: r.beneficiaryCount,
    status: r.status as "Generated" | "Submitted" | "Processed" | "Failed",
    generatedDate: r.generatedDate.toISOString(),
    submittedDate: r.submittedDate ? r.submittedDate.toISOString() : undefined,
    processedDate: r.processedDate ? r.processedDate.toISOString() : undefined,
    utrNo: r.utrNo ?? undefined,
    neftFile: r.neftFile ?? undefined,
    rtgsFile: r.rtgsFile ?? undefined,
    remarks: r.remarks ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const rows = await db.payrollBankAdvice.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { generatedDate: "desc" },
  });
  return NextResponse.json({ advices: rows.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;

  const body = await req.json();
  const month = String(body.month || "").trim();
  const bankName = String(body.bankName || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month must be in YYYY-MM format." }, { status: 400 });
  if (!bankName) return NextResponse.json({ error: "bankName is required." }, { status: 400 });

  // Real join: sum net pay of payslips this month for employees at this bank.
  const payslips = await db.payslip.findMany({
    where: { companyId: sessionUser.companyId, month, employee: { bankName } },
    select: { netPay: true },
  });
  const totalAmount = payslips.reduce((s, p) => s + p.netPay, 0);
  const beneficiaryCount = payslips.length;

  const count = await db.payrollBankAdvice.count({ where: { companyId: sessionUser.companyId } });
  const created = await db.payrollBankAdvice.create({
    data: {
      companyId: sessionUser.companyId,
      adviceNo: `RZ-BA-${month.replace("-", "")}-${String(count + 1).padStart(2, "0")}`,
      month,
      bankName,
      bankBranch: body.bankBranch || null,
      totalAmount,
      beneficiaryCount,
      status: "Generated",
      remarks: beneficiaryCount === 0 ? "No matching payslips found for this bank and month" : null,
    },
  });
  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "PayrollBankAdvice",
    entityId: created.id,
    description: `Generated bank advice ${created.adviceNo} for ${bankName} (${month})`,
  });
  return NextResponse.json({ advice: toDTO(created) }, { status: 201 });
}

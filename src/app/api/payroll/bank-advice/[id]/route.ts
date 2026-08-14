import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payrollBankAdvice.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Bank advice not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "submit") {
    if (existing.status !== "Generated") return NextResponse.json({ error: "Advice already submitted/processed." }, { status: 400 });
    const updated = await db.payrollBankAdvice.update({ where: { id }, data: { status: "Submitted", submittedDate: new Date() } });
    await logAudit({ sessionUser, action: "STATUS_CHANGE", entity: "PayrollBankAdvice", entityId: id, description: `Submitted bank advice ${updated.adviceNo} to bank` });
    return NextResponse.json({ advice: toDTO(updated) });
  }

  if (action === "mark-processed") {
    if (existing.status !== "Submitted") return NextResponse.json({ error: "Advice must be Submitted first." }, { status: 400 });
    const updated = await db.payrollBankAdvice.update({
      where: { id },
      data: { status: "Processed", processedDate: new Date(), utrNo: `UTR${String(Math.floor(Math.random() * 90000000) + 10000000)}` },
    });
    await logAudit({ sessionUser, action: "STATUS_CHANGE", entity: "PayrollBankAdvice", entityId: id, description: `Bank advice ${updated.adviceNo} processed` });
    return NextResponse.json({ advice: toDTO(updated) });
  }

  if (action === "generate-neft") {
    if (existing.neftFile) return NextResponse.json({ advice: toDTO(existing) });
    const neftFile = `RZ-NEFT-${existing.month.replace("-", "")}-${existing.adviceNo.split("-").pop()}.csv`;
    const updated = await db.payrollBankAdvice.update({ where: { id }, data: { neftFile } });
    await logAudit({ sessionUser, action: "UPDATE", entity: "PayrollBankAdvice", entityId: id, description: `Generated NEFT file for ${updated.adviceNo}` });
    return NextResponse.json({ advice: toDTO(updated) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

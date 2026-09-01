import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Row = Awaited<ReturnType<typeof db.payrollStatutoryFiling.findFirstOrThrow>>;

function toDTO(r: Row) {
  return {
    id: r.id,
    type: r.type,
    period: r.period,
    dueDate: r.dueDate.toISOString(),
    filedDate: r.filedDate ? r.filedDate.toISOString() : undefined,
    status: r.status as "Filed" | "Pending" | "Overdue",
    amount: Math.round(r.amount / 100),
    challanNo: r.challanNo ?? undefined,
    filedBy: r.filedBy ?? undefined,
    filingPortal: r.filingPortal ?? undefined,
    acknowledgementNo: r.acknowledgementNo ?? undefined,
    remarks: r.remarks ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "payroll");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payrollStatutoryFiling.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Statutory return not found." }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action;

  if (action === "mark-filed") {
    if (existing.status === "Filed") return NextResponse.json({ error: "Return already filed." }, { status: 400 });
    const updated = await db.payrollStatutoryFiling.update({
      where: { id },
      data: {
        status: "Filed",
        filedDate: new Date(),
        challanNo: `CHN-${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        acknowledgementNo: `ACK${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        filedBy: sessionUser.name,
        remarks: null,
      },
    });
    await logAudit({
      sessionUser,
      action: "STATUS_CHANGE",
      entity: "PayrollStatutoryFiling",
      entityId: id,
      description: `Filed ${updated.type} return for ${updated.period}`,
    });
    return NextResponse.json({ return: toDTO(updated) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

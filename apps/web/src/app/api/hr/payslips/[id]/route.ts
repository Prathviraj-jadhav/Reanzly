import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.payslip.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }

  const body = await req.json();
  if (body.status === undefined) return NextResponse.json({ error: "status is required." }, { status: 400 });

  const updated = await db.payslip.update({ where: { id }, data: { status: body.status } });
  return NextResponse.json({ payslip: { id: updated.id, status: updated.status } });
}

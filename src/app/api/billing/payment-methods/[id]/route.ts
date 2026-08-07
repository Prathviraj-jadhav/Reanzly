import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.paymentMethod.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }

  const body = await req.json();
  if (body.isDefault === true) {
    await db.$transaction([
      db.paymentMethod.updateMany({ where: { companyId: sessionUser.companyId }, data: { isDefault: false } }),
      db.paymentMethod.update({ where: { id }, data: { isDefault: true } }),
    ]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.paymentMethod.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
  }
  await db.paymentMethod.delete({ where: { id } });

  // If we just deleted the default card and others remain, promote the
  // most recent one so there's always a clear default when >=1 exists.
  if (existing.isDefault) {
    const next = await db.paymentMethod.findFirst({ where: { companyId: sessionUser.companyId }, orderBy: { createdAt: "desc" } });
    if (next) await db.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return NextResponse.json({ ok: true });
}

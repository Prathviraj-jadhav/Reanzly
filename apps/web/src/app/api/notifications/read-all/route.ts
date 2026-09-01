import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const result = await db.notification.updateMany({
    where: { userId: sessionUser.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true, count: result.count });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, createSession, destroySession } from "@/lib/auth";

// POST /api/auth/switch-role  { roleId }
// Real session switch for the "Switch Demo Role" menu, replacing what was
// previously a client-only `setRole()` that only changed a display label -
// the sidebar would show a different role's nav, but every real API call
// still authenticated as whoever was actually logged in (via the session
// cookie), so switching the demo role and switching what you could
// actually do were two disconnected things.
//
// Seeded demo users use their ROLE_ARCHETYPES id as their real User.id
// (see src/scripts/seed-users.ts), so "switching role" here is exactly a
// real login as that role's seeded user - same createSession() call a
// password login uses - just skipping the password prompt since the
// caller is already an authenticated session holder switching personas,
// not an anonymous caller.
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const roleId = String(body?.roleId || "");
  if (!roleId) {
    return NextResponse.json({ error: "roleId is required." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: roleId } });
  if (!target || target.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "That demo role has no seeded account." }, { status: 404 });
  }
  if (target.status !== "Active") {
    return NextResponse.json({ error: "This account is not active." }, { status: 403 });
  }

  await destroySession();
  await createSession(target.id);
  await db.user.update({ where: { id: target.id }, data: { lastActive: new Date() } });

  return NextResponse.json({
    user: { id: target.id, companyId: target.companyId, email: target.email, name: target.name, role: target.role },
  });
}

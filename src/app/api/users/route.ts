import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasDirectModuleAccess, forbidden } from "@/lib/permissions";

// Real, company-scoped list of the actual signed-in-capable users - backs
// Settings > Users (previously a hardcoded MOCK_USERS array with wrong-
// pattern emails and invented people not in the real seeded roster).
// Never returns passwordHash/salt.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!hasDirectModuleAccess(sessionUser.role, "settings")) {
    return forbidden("Your role does not have access to the user directory.");
  }

  const users = await db.user.findMany({
    where: { companyId: sessionUser.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      status: true,
      createdAt: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department ?? "",
      status: u.status,
      joinedAt: u.createdAt.toISOString(),
      lastActive: u.sessions[0]?.createdAt.toISOString() ?? null,
    })),
  });
}

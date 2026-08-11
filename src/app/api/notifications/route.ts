import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real, per-user notification feed - GET /api/notifications returns only
// the signed-in user's own notifications (never another user's, since
// userId always comes from the verified session, not a query param).

function toDTO(n: Awaited<ReturnType<typeof db.notification.findFirstOrThrow>>) {
  return {
    id: n.id,
    category: n.category,
    severity: n.severity as "critical" | "warning" | "info",
    title: n.title,
    description: n.description ?? "",
    link: n.linkModule ? { module: n.linkModule, id: n.linkId ?? undefined } : undefined,
    read: n.read,
    timestamp: n.createdAt.toISOString(),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ notifications: notifications.map(toDTO) });
}

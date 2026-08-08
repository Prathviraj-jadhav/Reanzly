import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "settings");
  if (denied) return denied;

  const plans = await db.plan.findMany({ orderBy: { priceMonthly: "asc" } });
  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      priceMonthly: Math.round(p.priceMonthly / 100),
      priceAnnual: Math.round(p.priceAnnual / 100),
      vehicleCap: p.vehicleCap,
      userCap: p.userCap,
      storageMb: p.storageMb,
      features: JSON.parse(p.features) as string[],
    })),
  });
}

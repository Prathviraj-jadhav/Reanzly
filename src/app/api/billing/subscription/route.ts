import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function toDTO(s: Awaited<ReturnType<typeof db.subscription.findFirstOrThrow<{ include: { plan: true } }>>>) {
  return {
    id: s.id,
    status: s.status,
    billingCycle: s.billingCycle,
    startedAt: s.startedAt.toISOString(),
    renewsAt: s.renewsAt ? s.renewsAt.toISOString() : undefined,
    mrr: Math.round(s.mrr / 100),
    plan: {
      id: s.plan.id,
      code: s.plan.code,
      name: s.plan.name,
      priceMonthly: Math.round(s.plan.priceMonthly / 100),
      priceAnnual: Math.round(s.plan.priceAnnual / 100),
      vehicleCap: s.plan.vehicleCap,
      userCap: s.plan.userCap,
      storageMb: s.plan.storageMb,
      features: JSON.parse(s.plan.features) as string[],
    },
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sub = await db.subscription.findUnique({
    where: { companyId: sessionUser.companyId },
    include: { plan: true },
  });
  if (!sub) return NextResponse.json({ subscription: null });
  return NextResponse.json({ subscription: toDTO(sub) });
}

// Changes plan and/or billing cycle for the org's real Subscription row.
// Deliberately does NOT charge anything or call a payment gateway (no
// third-party API keys touched, per the standing constraint) - this is the
// real subscription record a gateway webhook would update in production;
// here it's updated directly since there's no live gateway wired in.
export async function PATCH(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const existing = await db.subscription.findUnique({ where: { companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "No subscription found for this organisation." }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.planCode !== undefined) {
    const plan = await db.plan.findUnique({ where: { code: body.planCode } });
    if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    data.planId = plan.id;
    data.mrr = body.billingCycle === "annual" ? Math.round(plan.priceAnnual / 12) : plan.priceMonthly;
  }
  if (body.billingCycle !== undefined) data.billingCycle = body.billingCycle;
  if (body.status !== undefined) data.status = body.status;

  const updated = await db.subscription.update({
    where: { companyId: sessionUser.companyId },
    data,
    include: { plan: true },
  });
  return NextResponse.json({ subscription: toDTO(updated) });
}

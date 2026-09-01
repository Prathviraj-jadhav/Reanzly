import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { evaluateTrigger } from "@/lib/automation-engine";

// Read-only preview used by the builder's "Test Now" step, before the
// automation has even been saved - evaluates the real trigger query without
// writing a run log or executing any actions (that only happens on a real
// "Run Now" against a saved automation, via [id]/run/route.ts).

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;

  const body = await req.json();
  const triggerCategory = String(body.triggerCategory || "");
  const trigger = String(body.trigger || "");
  if (!trigger) return NextResponse.json({ error: "trigger is required." }, { status: 400 });

  const result = await evaluateTrigger(sessionUser.companyId, triggerCategory, trigger);
  return NextResponse.json(result);
}

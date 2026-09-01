import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

// Resolves the real Customer row a Vendor Portal session represents, via
// Customer.userId (see the schema comment on that field). Every vendor-
// portal route calls this first - it's what replaced the old hardcoded
// VENDOR_ID = "vendor-demo-1" with a real per-session identity.
export async function getPortalCustomer(sessionUser: SessionUser) {
  return db.customer.findUnique({ where: { userId: sessionUser.id } });
}

/** Returns a 404 NextResponse if this session has no linked Customer, else null. */
export function requirePortalCustomer(customer: unknown): NextResponse | null {
  if (!customer) {
    return NextResponse.json(
      { error: "No customer account is linked to this login." },
      { status: 404 },
    );
  }
  return null;
}

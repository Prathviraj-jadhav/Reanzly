import { NextResponse } from "next/server";

/** Public liveness probe — no infrastructure details. */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

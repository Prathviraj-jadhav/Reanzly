import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";

// ===== Generic Data API with Rate Limiting + Parameterized Queries =====

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 100;

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const entity = sanitize(searchParams.get("entity") || "", 50);
    const companyId = sanitize(searchParams.get("companyId") || "", 50);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const allowed = ["vehicles", "drivers", "customers", "vendors", "trips", "invoices"];
    if (!allowed.includes(entity)) {
      return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
    }

    const where = companyId ? { companyId } : {};
    let data: unknown;

    switch (entity) {
      case "vehicles":
        data = await db.vehicle.findMany({ where, take: limit, orderBy: { createdAt: "desc" } });
        break;
      case "drivers":
        data = await db.driver.findMany({ where, take: limit, orderBy: { createdAt: "desc" } });
        break;
      case "customers":
        data = await db.customer.findMany({ where, take: limit, orderBy: { createdAt: "desc" } });
        break;
      case "vendors":
        data = await db.vendor.findMany({ where, take: limit, orderBy: { createdAt: "desc" } });
        break;
      case "trips":
        data = await db.trip.findMany({ where, take: limit, orderBy: { createdDate: "desc" } });
        break;
      case "invoices":
        data = await db.invoice.findMany({ where, take: limit, orderBy: { invoiceDate: "desc" } });
        break;
      default:
        return NextResponse.json({ error: "Not implemented" }, { status: 501 });
    }

    return NextResponse.json(
      { data, count: Array.isArray(data) ? data.length : 0 },
      { headers: { "X-RateLimit-Remaining": String(rl.remaining) } }
    );
  } catch (error) {
    console.error("Data API error:", error);
    return NextResponse.json({ error: "Unable to fetch data." }, { status: 500 });
  }
}

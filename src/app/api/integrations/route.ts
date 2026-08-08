import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";
import { ALL_PROVIDERS, CATEGORY_META, SEED_CONNECTIONS } from "@/components/modules/integrations/_data";
import { LOGISTICS_SEED_CONNECTIONS } from "@/components/modules/integrations/logistics-providers";

/* ============================================================
   /api/integrations  (GET, POST)
   ------------------------------------------------------------
   List and create integration connections for the current tenant.
   Tenant isolation via `companyId` query param. For Reanzly internal
   team scope, use "PLATFORM".
   ============================================================ */

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 200;

// Fields whose values are secret and must never be returned raw.
const SECRET_FIELD_HINTS = [
  "secret", "password", "token", "apikey", "authkey",
  "apisecret", "clientsecret", "accesskey", "accesskeyid",
  "secretaccesskey", "privateapp", "workingkey", "salt",
];

function isSecretField(fieldId: string): boolean {
  return SECRET_FIELD_HINTS.some((h) => fieldId.toLowerCase().includes(h));
}

function maskSecret(value: string): string {
  if (!value || value.length < 6) return "••••••";
  if (value.startsWith("••")) return value;
  return value.slice(0, 4) + "••••••••" + value.slice(-2);
}

/** Mask all secret fields in a fieldValues record before returning it. */
function maskFieldValues(
  fieldValues: Record<string, string>,
  providerId: string,
): Record<string, string> {
  const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    const field = provider?.fields.find((f) => f.id === key);
    const isSecret = field?.secret ?? isSecretField(key);
    out[key] = isSecret ? maskSecret(value) : value;
  }
  return out;
}

/** Convert a DB record to the public shape (with masked secrets). */
function toPublic(conn: {
  id: string;
  companyId: string;
  providerId: string;
  category: string;
  label: string | null;
  status: string;
  mode: string;
  priority: number;
  isPrimary: boolean;
  fieldValues: string;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  connectedAt: Date;
  updatedAt: Date;
}) {
  let fieldValues: Record<string, string> = {};
  try {
    fieldValues = JSON.parse(conn.fieldValues || "{}");
  } catch {
    fieldValues = {};
  }
  return {
    id: conn.id,
    companyId: conn.companyId,
    providerId: conn.providerId,
    category: conn.category,
    label: conn.label,
    status: conn.status,
    mode: conn.mode,
    priority: conn.priority,
    isPrimary: conn.isPrimary,
    fieldValues: maskFieldValues(fieldValues, conn.providerId),
    lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
    lastSyncStatus: conn.lastSyncStatus,
    lastSyncMessage: conn.lastSyncMessage,
    connectedAt: conn.connectedAt.toISOString(),
    updatedAt: conn.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const { searchParams } = new URL(req.url);
    const companyId = sanitize(searchParams.get("companyId") || "PLATFORM", 64);
    const category = searchParams.get("category");
    const providerId = searchParams.get("providerId");
    const status = searchParams.get("status");

    const where: { companyId: string; category?: string; providerId?: string; status?: string } = {
      companyId,
    };
    if (category) where.category = category;
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;

    const rows = await db.integrationConnection.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { priority: "asc" }, { connectedAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({
      connections: rows.map(toPublic),
      providers: ALL_PROVIDERS,
      categories: CATEGORY_META,
      count: rows.length,
    });
  } catch (err) {
    console.error("[/api/integrations GET]", err);
    return NextResponse.json(
      { error: "Failed to load integrations." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const body = await req.json();
    const companyId = sanitize(body.companyId || "PLATFORM", 64);
    const providerId = sanitize(body.providerId || "", 64);
    const label = body.label ? sanitize(body.label, 80) : null;
    const mode = body.mode === "test" ? "test" : "live";
    const status = body.status || "connected";
    const fieldValues: Record<string, string> = body.fieldValues || {};

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }

    const provider = ALL_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 400 });
    }

    // Validate required fields.
    const missing: string[] = [];
    for (const f of provider.fields) {
      if (f.required && !fieldValues[f.id]) missing.push(f.label);
    }
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // If this is the first connection in the category, auto-set as primary.
    const existing = await db.integrationConnection.findFirst({
      where: { companyId, category: provider.category },
    });
    const isPrimary = !existing;

    // If multi-instance is off and one already exists, refuse.
    if (existing && !provider.multiInstance) {
      return NextResponse.json(
        {
          error: `${provider.name} doesn't support multiple connections. Disconnect the existing one first.`,
        },
        { status: 409 },
      );
    }

    const created = await db.integrationConnection.create({
      data: {
        companyId,
        providerId,
        category: provider.category,
        label,
        status,
        mode,
        priority: body.priority || 1,
        isPrimary,
        fieldValues: JSON.stringify(fieldValues),
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastSyncMessage: "Connection established",
      },
    });

    return NextResponse.json({ connection: toPublic(created) }, { status: 201 });
  } catch (err) {
    console.error("[/api/integrations POST]", err);
    return NextResponse.json(
      { error: "Failed to create integration." },
      { status: 500 },
    );
  }
}

/* ============================================================
   /api/integrations/seed  (POST) - populate default connections
   ------------------------------------------------------------
   Idempotent: checks for an existing connection per provider before
   inserting. Use this on first run to hydrate the DB with the demo
   connections shown in the UI seed state.
   ============================================================ */
export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: 30, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const companyId = sanitize(body.companyId || "PLATFORM", 64);

    const allSeeds = [...SEED_CONNECTIONS, ...LOGISTICS_SEED_CONNECTIONS];
    let inserted = 0;
    let skipped = 0;

    for (const seed of allSeeds) {
      const exists = await db.integrationConnection.findFirst({
        where: { companyId, providerId: seed.providerId },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const provider = ALL_PROVIDERS.find((p) => p.id === seed.providerId);
      if (!provider) continue;

      // First connection in category → primary
      const firstInCat = !(await db.integrationConnection.findFirst({
        where: { companyId, category: provider.category },
      }));

      await db.integrationConnection.create({
        data: {
          companyId,
          providerId: seed.providerId,
          category: provider.category,
          label: null,
          status: seed.status,
          mode: seed.mode,
          priority: seed.priority ?? 1,
          isPrimary: seed.isPrimary ?? firstInCat,
          fieldValues: JSON.stringify(seed.fieldValues),
          lastSyncAt: seed.lastSyncAt ? new Date(seed.lastSyncAt) : null,
          lastSyncStatus: seed.lastSyncStatus ?? null,
          lastSyncMessage: seed.lastSyncMessage ?? null,
        },
      });
      inserted++;
    }

    return NextResponse.json({
      seeded: true,
      inserted,
      skipped,
      total: allSeeds.length,
    });
  } catch (err) {
    console.error("[/api/integrations PUT seed]", err);
    return NextResponse.json(
      { error: "Failed to seed integrations." },
      { status: 500 },
    );
  }
}

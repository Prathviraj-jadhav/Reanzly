import { NextRequest, NextResponse } from "next/server";

// ===== Rate Limiting Middleware =====
// In-memory per-IP rate limiter. Production would use Redis.

interface RateBucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, RateBucket>();

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW = 60_000; // 1 minute
const AUTH_LIMIT = 10;
const AUTH_WINDOW = 60_000;

export function rateLimit(
  ip: string,
  opts: { limit?: number; window?: number } = {}
): { allowed: boolean; remaining: number; resetIn: number } {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const window = opts.window ?? DEFAULT_WINDOW;
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now > bucket.resetTime) {
    buckets.set(ip, { count: 1, resetTime: now + window });
    return { allowed: true, remaining: limit - 1, resetIn: window };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: bucket.resetTime - now };
  }
  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, resetIn: bucket.resetTime - now };
}

export function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// ===== Input Sanitization =====

export function sanitize(input: string, maxLen = 2000): string {
  return input.slice(0, maxLen).replace(/[<>]/g, "").trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxLen = 2000
): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitize(value, maxLen);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) =>
        typeof v === "string" ? sanitize(v, maxLen) : v
      );
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

// ===== Rate Limit Response Helper =====

export function rateLimitResponse(
  req: NextRequest,
  opts?: { limit?: number; window?: number }
): null | NextResponse {
  const ip = getClientIP(req);
  const rl = rateLimit(ip, opts);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "Retry-After": String(Math.ceil(rl.resetIn / 1000)),
        },
      }
    );
  }
  return null;
}

// ===== GDPR / DPDP Helpers =====

export function maskPII(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "*".repeat(Math.max(4, value.length - 4)) + value.slice(-2);
}

export function maskGSTIN(gstin: string): string {
  if (!gstin || gstin.length < 8) return gstin || "";
  return gstin.slice(0, 4) + "****" + gstin.slice(-4);
}

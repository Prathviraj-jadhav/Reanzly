interface RateBucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, RateBucket>();

export function rateLimit(
  ip: string,
  opts: { limit?: number; window?: number } = {},
): { allowed: boolean; remaining: number; resetIn: number } {
  const limit = opts.limit ?? 60;
  const window = opts.window ?? 60_000;
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

export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const xff = headers["x-forwarded-for"];
  if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp) return realIp;
  return "unknown";
}

export function checkRateLimit(
  headers: Record<string, string | string[] | undefined>,
  opts: { limit?: number; window?: number } = {},
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const ip = getClientIP(headers);
  const rl = rateLimit(ip, opts);
  if (!rl.allowed) {
    return { allowed: false, retryAfterSec: Math.ceil(rl.resetIn / 1000) };
  }
  return { allowed: true };
}

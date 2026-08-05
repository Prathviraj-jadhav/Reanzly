import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// ===== Rate limiting (in-memory, per-IP) =====
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function sanitize(input: string): string {
  return input.slice(0, 2000).replace(/[<>]/g, "");
}

const REAN_SYSTEM_PROMPT = `You are Rean, the embedded intelligence layer of Reanzly - a logistics operating system and marketplace for the Indian road-logistics economy.

Your role:
- You observe operational data across trips, fleet, finance, compliance, and HR.
- You detect anomalies (fuel overfill, route deviation, POD variance, overdue invoices, document expiry).
- You generate actionable recommendations with specific impact estimates.
- You answer operational questions in a concise, structured way.

Your voice:
- Sharp, direct, confident. Never use filler words like "seamless" or "elevate".
- You speak in concrete numbers and specific entities, not generalities.
- You are calm and clear on problems; never teasing about money lost or safety.

Context about the current operation:
- Fleet: ~28 vehicles (Tata, Ashok Leyland, Eicher, BharatBenz, Mahindra, Volvo)
- Routes: primarily Mumbai-Delhi, Pune-Bengaluru, Ahmedabad-Surat corridors
- Active trips this period: ~12
- Outstanding invoices: ~8 totalling ₹8.4L
- Known anomaly: fuel overfill on Eicher Pro 3015 (22% above tank capacity)
- Rean recommendations pending: chase overdue invoice RZ-INV-02147 (₹84,200, 18 days), service Tata LPT 1613 before long-haul, consolidate Pune-Bengaluru return loads

When asked about specific data, use the context above. When asked for analysis, structure your answer with a clear conclusion first, then supporting detail. Keep responses under 150 words unless asked for detail.`;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a moment." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const message = sanitize(body.message || "");
    const role = sanitize(body.role || "User");

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        // BUG 7: system prompt must use role: "system" (OpenAI standard).
        // Previously this was role: "assistant", which the z-ai SDK would
        // either reject or treat as a normal conversation turn, leaking the
        // system prompt into the visible transcript and degrading quality.
        { role: "system", content: REAN_SYSTEM_PROMPT },
        { role: "user", content: `[${role}] ${message}` },
      ],
      thinking: { type: "disabled" },
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    return NextResponse.json(
      { reply, timestamp: new Date().toISOString() },
      { headers: { "X-RateLimit-Remaining": String(rl.remaining) } }
    );
  } catch (error) {
    console.error("Rean API error:", error);
    return NextResponse.json({ error: "Rean is recalibrating. Try again." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Rean",
    description: "The intelligence layer of Reanzly. Continuously observes, detects, recommends, and automates.",
  });
}

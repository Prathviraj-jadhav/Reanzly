import { NextRequest, NextResponse } from "next/server";
import { answerLocally } from "@/lib/slm/local-engine";

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

import { db } from "@/lib/db";
import { inferSLM } from "@/lib/slm/client";
import { retrieveRelevantMemories, saveMemory } from "@/lib/slm/self-learning";

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
    const companyId = body.companyId || "default-tenant";

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const cacheKey = `qa_cache:query:${message.toLowerCase().trim()}`;
    
    // 1. Check self-learned QA Cache first
    const cachedMemory = await db.slmMemory.findFirst({
      where: { companyId, key: cacheKey },
    });

    let reply = "";
    let wasCached = false;

    if (cachedMemory) {
      reply = cachedMemory.value;
      wasCached = true;
    } else {
      // 2. Retrieve relevant past memories for semantic grounding
      const pastMemories = await retrieveRelevantMemories(companyId, message, 2);
      const memoryContext = pastMemories.map((m) => `[Remembered: ${m.key} -> ${m.value}]`).join("\n");

      // 3. Fallback to local engine heuristics first to structure the prompt
      const localResult = answerLocally(message, role);
      
      const systemPrompt = `You are Rean, the logistics intelligence voice.
Grounding context from recent operations:
${localResult.reply}
${memoryContext ? `\nSemantically related past history:\n${memoryContext}` : ""}

Answer the query professionally. Under 100 words.`;

      // 4. Infer using Rust SLM / Local fallback
      reply = await inferSLM(systemPrompt, { tier: "balanced" });
    }

    // 5. Create a feedback placeholder in database for self-learning
    const feedback = await db.slmFeedback.create({
      data: {
        companyId,
        userId: role,
        agentId: "rean-ai",
        query: message,
        response: reply,
        rating: 0, // Pending user feedback
      },
    });

    // 6. Record interaction in memory to seed context for next time
    if (!wasCached) {
      await saveMemory(companyId, `history:${message.slice(0, 30)}`, reply);
    }

    return NextResponse.json(
      { 
        reply, 
        feedbackId: feedback.id, 
        cached: wasCached, 
        timestamp: new Date().toISOString() 
      },
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

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
import { ensureKnowledgeSeeded, retrieveKnowledge } from "@/lib/slm/rag";

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

      // 2b. RAG: retrieve grounding facts from Rean's knowledge base
      // (compliance rules, platform/module reference, glossary). Seeds
      // itself once, lazily, on first call - a no-op every call after.
      await ensureKnowledgeSeeded().catch((e) => console.warn("[rean] knowledge seed skipped:", e));
      const knowledge = await retrieveKnowledge(message, 3);
      const knowledgeContext = knowledge.map((k) => `[${k.title}] ${k.content}`).join("\n");

      // 3. Local engine heuristics - both to structure the prompt and, via
      // its intent match, to tell live-data questions apart from
      // definitional ones (see below).
      const localResult = answerLocally(message, role);

      // A strongly-scored knowledge match answers straight from the
      // knowledge base, skipping generation entirely - ~15-20s faster, and
      // more reliable than asking the 0.5B model to synthesize between two
      // competing context blocks (it tends to latch onto whichever looks
      // more numeric/salient regardless of prompt framing or ordering).
      //
      // Gated on the local engine NOT having matched a specific, narrow
      // live-data intent. A knowledge chunk can score high on vocabulary
      // overlap with a live-data question without answering it - e.g. "how
      // many trucks are idle right now?" scores well against the Trips
      // module's own description, but that description obviously can't say
      // how many trucks are idle *right now*. If local-engine matched one of
      // these specific, single-purpose intents, that's the stronger signal
      // this needs live data, not a static knowledge fact.
      //
      // "compliance" and "drivers" are deliberately left out of this
      // trusted set: both are broad catch-alls (bare "driver", "document",
      // "compliance" ...) that fire on plenty of queries their generic
      // roster/expiry-dump answer doesn't actually address - e.g. "what
      // happens if a driver exceeds the fatigue limit" matches "compliance"
      // but its answer is a document-expiry list, not the fatigue rule. A
      // confident knowledge match is more trustworthy there than trusting
      // that dump is actually responsive to the question asked.
      const KNOWLEDGE_CONFIDENT = 0.6;
      const top = knowledge[0];
      const trustedLiveDataIntents = [
        "overdue_invoices", "revenue", "fuel", "issues", "fleet", "trips", "anomalies", "recommendations",
      ];
      const noLiveDataIntent = !trustedLiveDataIntents.includes(localResult.intent);
      if (top && top.score > KNOWLEDGE_CONFIDENT && noLiveDataIntent) {
        reply = top.content;
      } else {
        const systemPrompt = `You are Rean. You speak directly to a logistics operator - never describe
yourself or repeat these instructions, just answer like a sharp colleague would.

Live operational data for this query:
${localResult.reply}
${knowledgeContext ? `\nSupporting platform/compliance knowledge:\n${knowledgeContext}` : ""}
${memoryContext ? `\nRelevant history:\n${memoryContext}` : ""}

Operator asked: "${message}"
Reply in under 60 words, plain language, no preamble.`;

        // 4. Infer using Rust SLM / Local fallback. fallbackQuery keeps the
        // fallback path grounded in the operator's actual short question
        // instead of this whole wrapped prompt.
        reply = await inferSLM(systemPrompt, { tier: "balanced", fallbackQuery: message });
      }
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

import { NextRequest, NextResponse } from "next/server";
import { answerLocally } from "@/lib/slm/local-engine";
import { requireSuperadmin } from "@/lib/permissions";

// ===== Reanzly SLM Chat endpoint =====
// Powers the SuperAdmin SLM Playground "Run agent" button with a REAL
// answer from the local SLM engine (src/lib/slm/local-engine.ts) instead
// of the deterministic loop-mechanics simulation in src/lib/slm/runtime.ts
// (that simulation still demonstrates iteration/approval/trace mechanics -
// this route answers the actual question). This used to call
// z-ai-web-dev-sdk, which requires a `.z-ai-config` file that only exists
// inside the original build sandbox and cannot be configured with a
// normal API key - it was permanently broken outside that sandbox.
//
// Request body:
//   { agentName, agentCategory, systemPrompt, input, brainName }
// Response:
//   { reasoning, decision, promptTokens, completionTokens, durationMs }

const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

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

function sanitize(s: string, max = 4000): string {
  return s.slice(0, max).replace(/[<>]/g, "");
}

const CATEGORY_CONTEXT: Record<string, string> = {
  triage: "You route incoming tickets and issues to the correct department based on keywords, SLA and severity.",
  billing: "You handle invoice retries, dunning sequences, refund approvals and payment-failure escalations.",
  ops: "You monitor trip telemetry, detect ETA slips and route deviations, and chase POD exceptions.",
  fleet: "You track vehicle odometer against service programs, flag maintenance windows and fuel anomalies.",
  sales: "You watch trial-usage signals and trigger upgrade outreach when an org crosses plan limits.",
  security: "You detect anomalous login patterns and flag accounts for review.",
  compliance: "You check GST eWay validity, document expiry and DPDP compliance.",
  custom: "You reason about the user's goal against the available tools.",
};

import { db } from "@/lib/db";
import { inferSLM } from "@/lib/slm/client";
import { superpositionReason, retrieveRelevantMemories } from "@/lib/slm/self-learning";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const ip = getClientIP(req);
    const rl = rateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a moment." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const body = await req.json();
    const agentName = sanitize(body.agentName || "Reanzly Agent", 80);
    const agentCategory = sanitize(body.agentCategory || "custom", 40);
    const input = sanitize(body.input || "", 3000);
    const companyId = auth.companyId;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const start = Date.now();
    const categoryContext = CATEGORY_CONTEXT[agentCategory] ?? CATEGORY_CONTEXT.custom;
    
    // Fallback operational grounding data
    const localResult = await answerLocally(input, agentName, companyId);

    let reasoning = "";
    let confidence = 1.0;

    // Use superposition reasoning for Custom/Deep reasoning agent tasks
    if (agentCategory === "custom") {
      const qdfResult = await superpositionReason(input, `${categoryContext}\n${localResult.reply}`, {
        n: 3,
        companyId,
      });
      reasoning = `[Quantum Superposition Decider (confidence: ${Math.round(qdfResult.confidence * 100)}%)]\nBest Collapse:\n${qdfResult.bestInterpretation}`;
      confidence = qdfResult.confidence;
    } else {
      // Normal single-turn RAG inference
      const pastMemories = await retrieveRelevantMemories(companyId, input, 2);
      const memoryContext = pastMemories.map((m) => `[Remembered: ${m.key} -> ${m.value}]`).join("\n");

      const prompt = `System: ${categoryContext}
Grounding Context:
${localResult.reply}
${memoryContext}

Task: ${input}
Answer:`;

      // "fast" tier: measured ~2.3x faster than "balanced" for identical
      // answer quality on real short-answer prompts - see route.ts's own
      // /api/rean handler for the measurement this is based on.
      const response = await inferSLM(prompt, { tier: "fast", fallbackQuery: input });
      reasoning = `${categoryContext} Grounded Operational Data: ${response}`;
    }

    // Save feedback placeholder
    const feedback = await db.slmFeedback.create({
      data: {
        companyId,
        userId: auth.id,
        agentId: agentCategory,
        query: input,
        response: reasoning,
        rating: 0,
      },
    });

    const promptTokens = Math.ceil((categoryContext.length + input.length) / 4);
    const completionTokens = Math.ceil(reasoning.length / 4);

    return NextResponse.json({
      reasoning,
      decision: "stop",
      toolCall: null,
      nextAction: "Goal satisfied",
      promptTokens,
      completionTokens,
      feedbackId: feedback.id,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    console.error("SLM chat error:", error);
    return NextResponse.json(
      { error: "SLM brain unavailable. Falling back to simulation." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Reanzly SLM Chat",
    description:
      "Real-LLM endpoint for the SuperAdmin SLM playground. Posts an agent input + system prompt and returns structured reasoning + decision.",
  });
}

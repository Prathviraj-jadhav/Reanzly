import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// ===== Reanzly SLM Chat endpoint =====
// Powers the SuperAdmin SLM Playground "Run agent" button with a REAL
// LLM call (z-ai-web-dev-sdk) instead of the deterministic simulation
// in src/lib/slm/runtime.ts. The playground calls this endpoint, gets
// back a structured reasoning + decision, and renders it in the loop
// trace timeline.
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

export async function POST(req: NextRequest) {
  try {
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
    const userSystemPrompt = sanitize(body.systemPrompt || "", 2000);
    const input = sanitize(body.input || "", 3000);
    const brainName = sanitize(body.brainName || "Reanzly SLM", 80);

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const categoryContext = CATEGORY_CONTEXT[agentCategory] ?? CATEGORY_CONTEXT.custom;

    const systemPrompt = `You are ${agentName}, an autonomous agent in the Reanzly SLM (Small Language Model) runtime running on the ${brainName} brain.

Agent role: ${categoryContext}

You operate as a bounded loop: observe -> think -> act -> reflect. For this single turn, produce a concise reasoning trace and a decision.

Respond as STRICT JSON only (no markdown, no prose outside JSON):
{
  "reasoning": "2-3 sentences explaining what you observed and why you decided this",
  "decision": "continue" | "stop" | "request-approval" | "escalate",
  "toolCall": { "toolName": "string or null", "args": {} } | null,
  "nextAction": "one short sentence describing the next action, or 'Goal satisfied' if stopping"
}

Rules:
- "continue" = partial progress, will loop again
- "stop" = goal satisfied, halt loop
- "request-approval" = next action is high-impact, pause for human
- "escalate" = cannot proceed autonomously, hand to human operator
- Be concrete: reference specific record IDs, amounts, vehicle numbers from the input.`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw) {
      return NextResponse.json({ error: "No response from SLM brain." }, { status: 502 });
    }

    // Parse the JSON the model was instructed to return. Fall back to a
    // best-effort shape if the model wrapped it in prose.
    let parsed: {
      reasoning: string;
      decision: "continue" | "stop" | "request-approval" | "escalate";
      toolCall?: { toolName: string | null; args: Record<string, unknown> } | null;
      nextAction?: string;
    };
    try {
      // Try to extract the first {...} block.
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      parsed = {
        reasoning: raw.slice(0, 500),
        decision: "continue",
        toolCall: null,
        nextAction: "Review the raw model output.",
      };
    }

    // Rough token accounting (the SDK doesn't always expose usage).
    const promptTokens = Math.ceil((systemPrompt.length + input.length) / 4);
    const completionTokens = Math.ceil(raw.length / 4);

    return NextResponse.json({
      reasoning: parsed.reasoning,
      decision: parsed.decision,
      toolCall: parsed.toolCall ?? null,
      nextAction: parsed.nextAction ?? null,
      promptTokens,
      completionTokens,
      durationMs: 0,
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

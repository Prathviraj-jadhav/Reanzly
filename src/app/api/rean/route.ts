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
import {
  ALLOWED_MODELS,
  findModelByText,
  queryTable,
  formatQueryResult,
  proposeWrite,
  confirmAction,
  rejectAction,
  getPendingAction,
} from "@/lib/slm/db-tool";

// Resolves a table for a write command even when the message doesn't say
// the table name out loud (e.g. "mark RZ-INV-21444 as paid" never says
// "invoice") - the record code's own prefix is usually enough.
function inferModelFromIdentifier(identifier: string): string | null {
  if (/^RZ-INV-/i.test(identifier)) return "invoice";
  if (/^RZ-TRP-/i.test(identifier)) return "trip";
  return null;
}

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

    let reply = "";
    let wasCached = false;
    let handled = false;

    // ===== Rean's database tool: confirm/reject a pending write =====
    // `role` here is the operator's real, session-verified role (chat-service
    // only ever forwards this from an authenticated connection - see
    // mini-services/chat-service/index.ts's session validation), so it's
    // safe to use as the action-owning identity, consistent with how
    // slmFeedback.userId already uses it below.
    const trimmed = message.toLowerCase().trim();
    const isConfirmReply = /^(yes|yep|confirm|confirmed|do it|go ahead|proceed|okay|ok)\b/.test(trimmed);
    const isRejectReply = /^(no|nope|cancel|don'?t|stop|nevermind)\b/.test(trimmed);
    if (isConfirmReply || isRejectReply) {
      const pending = await getPendingAction(role, companyId);
      if (pending) {
        if (isConfirmReply) {
          const result = await confirmAction(pending.id, role);
          reply = result.message;
        } else {
          await rejectAction(pending.id, role);
          reply = "Cancelled - no changes made.";
        }
        handled = true;
      }
    }

    // ===== Rean's database tool: a write command =====
    // Deterministic regex extraction rather than asking the small local
    // model to produce structured output - a write is exactly the class of
    // action where an unreliable parse is not an acceptable failure mode.
    // This only ever creates a *pending* RagAction; nothing in the real
    // table changes until the operator replies to confirm it (handled
    // above, on the next message).
    if (!handled) {
      const writeMatch = message.match(
        /(?:mark|set|update)\s+(?:the\s+)?(\S+)(?:'s)?\s+(?:as|to|status\s+(?:as|to))\s+([a-zA-Z ]+?)\s*$/i
      );
      if (writeMatch) {
        const [, identifier, rawValue] = writeMatch;
        const modelKey = findModelByText(message) || inferModelFromIdentifier(identifier);
        if (modelKey && ALLOWED_MODELS[modelKey]?.writableFields) {
          const cfg = ALLOWED_MODELS[modelKey];
          const allowedValues = cfg.writableFields!.status ?? [];
          const matchedValue = allowedValues.find((v) => v.toLowerCase() === rawValue.trim().toLowerCase());
          const result = await proposeWrite({
            companyId,
            userId: role,
            modelKey,
            recordMatch: { field: cfg.identifierField, value: identifier },
            updateField: "status",
            updateValue: matchedValue ?? rawValue.trim(),
          });
          reply = result.ok
            ? `${result.proposal.summary}. Reply "yes" to confirm, or "no" to cancel.`
            : result.error;
          handled = true;
        }
      }
    }

    // ===== Rean's database tool: a table lookup =====
    if (!handled) {
      const modelKey = findModelByText(message);
      const looksLikeALookup = /\b(show|list|which|what are|how many|count)\b/i.test(message);
      if (modelKey && looksLikeALookup) {
        const statusWordMatch = message.match(
          /\b(active|idle|in maintenance|offline|on leave|inactive|planned|in transit|delivered|cancelled|breakdown|draft|sent|partially paid|paid|overdue|credit note)\b/i
        );
        const result = await queryTable(modelKey, companyId, {
          status: statusWordMatch?.[0],
          limit: /\bhow many\b|\bcount\b/i.test(message) ? 1 : 10,
        });
        if (result) {
          reply = /\bhow many\b|\bcount\b/i.test(message)
            ? `${result.total} ${result.label.toLowerCase()}${result.total === 1 ? "" : "s"}${statusWordMatch ? ` (${statusWordMatch[0]})` : ""}.`
            : formatQueryResult(result);
          handled = true;
        }
      }
    }

    const cacheKey = `qa_cache:query:${message.toLowerCase().trim()}`;

    // 1. Check self-learned QA Cache first
    const cachedMemory = handled ? null : await db.slmMemory.findFirst({
      where: { companyId, key: cacheKey },
    });

    if (handled) {
      // reply already set above by the database tool
    } else if (cachedMemory) {
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
      const localResult = await answerLocally(message, role, companyId);

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
        // Deliberately terse framing, not the earlier multi-line persona
        // preamble. Measured directly: this model's per-token cost is
        // roughly constant whether it's processing the input prompt
        // (prefill) or generating output, so a verbose ~350-character
        // instruction block was adding ~30s of latency on its own, on top
        // of generation - a short prompt with identical data returned in
        // ~5s where the verbose version took ~36s for the same content.
        // Trimming the wrapper (not the actual data) was the real latency
        // fix; the tier/token-budget change alone barely moved this number.
        //
        // knowledgeContext/memoryContext are deliberately dropped for a
        // trusted live-data intent (measured directly: including them
        // ballooned a real "revenue" prompt from ~280 to 1576 chars, mostly
        // from (a) knowledge chunks that only cleared the RAG similarity
        // floor on vocabulary overlap - not the same "confident and
        // relevant" bar the short-circuit above requires - e.g. Payroll and
        // Expenses module blurbs for a revenue question, and (b) "memory"
        // entries that were themselves just this same intent's own past
        // reply, self-referentially echoed back in - stale live-data
        // snapshots, not a genuinely learned fact. Fresh `localResult.reply`
        // already IS the authoritative live answer for these intents; older
        // grounding only added prefill cost with no informational value.
        // Non-trusted (open-ended) questions still get the full context.
        const extraContext = noLiveDataIntent
          ? `${knowledgeContext ? `\n${knowledgeContext}` : ""}${memoryContext ? `\n${memoryContext}` : ""}`
          : "";
        const systemPrompt = `Rean, logistics assistant. Be direct, no preamble, under 60 words.
Data: ${localResult.reply}${extraContext}
Q: "${message}"`;

        // 4. Infer using Rust SLM / Local fallback. fallbackQuery keeps the
        // fallback path grounded in the operator's actual short question
        // instead of this whole wrapped prompt.
        reply = await inferSLM(systemPrompt, { tier: "fast", fallbackQuery: message });
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

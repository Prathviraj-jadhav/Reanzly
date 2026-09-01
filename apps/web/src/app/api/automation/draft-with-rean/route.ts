import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { inferSLM } from "@/lib/slm/client";
import {
  TRIGGER_CATEGORIES, TRIGGER_EVENTS, ACTION_TYPES, SUPPORTED_TRIGGERS,
} from "@/lib/automation-vocabulary";

// "Create with Rean" - the user describes what they want automated in
// plain language, Rean (the same real local SLM engine every other Rean
// surface in this app uses - src/lib/slm/client.ts, offline-capable, not a
// third-party API) proposes a trigger/action draft. Because the underlying
// model is small and its raw JSON output isn't reliable enough to trust
// blindly (the existing /api/rean route makes the same call for write
// commands - see its comment on why writes use deterministic regex instead
// of trusting model-structured output), every field in the model's response
// is validated against the real vocabulary and, if invalid or missing,
// replaced by a deterministic keyword-overlap match - so this always
// returns a usable, real draft even when the model's JSON is malformed.

// Crude suffix stripping (not a real stemmer) so "fails"/"failing"/"failed"
// all match the vocabulary's "Fail" - good enough for short trigger/action
// phrases, where a real stemming library would be overkill.
function stem(word: string): string {
  return word
    .replace(/(ing|ies|ed|es|s)$/, (m) => (word.length - m.length >= 3 ? "" : m));
}

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(stem);
}

function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((t) => setB.has(t)).length;
}

/** Deterministic fallback: which trigger category/event best matches the user's words. */
function bestTriggerMatch(message: string): { category: string; trigger: string } {
  const words = tokenize(message);
  let best = { category: "Invoice", trigger: TRIGGER_EVENTS.Invoice[2] }; // "Invoice overdue by 15 days"
  let bestScore = -1;
  for (const category of TRIGGER_CATEGORIES) {
    for (const trigger of TRIGGER_EVENTS[category]) {
      let score = overlapScore(words, tokenize(`${category} ${trigger}`));
      if (SUPPORTED_TRIGGERS.has(trigger)) score += 0.5; // slight bias toward triggers that can actually run
      if (score > bestScore) {
        bestScore = score;
        best = { category, trigger };
      }
    }
  }
  return best;
}

function bestActionMatch(message: string): string {
  const words = tokenize(message);
  let best = "Create Task";
  let bestScore = -1;
  for (const action of ACTION_TYPES) {
    const score = overlapScore(words, tokenize(action));
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return bestScore > 0 ? best : "Create Task";
}

function extractJson(text: string): Record<string, unknown> | null {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "automation");
  if (denied) return denied;

  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message) return NextResponse.json({ error: "message is required." }, { status: 400 });

  const vocabSummary = TRIGGER_CATEGORIES.map((c) => `${c}: ${TRIGGER_EVENTS[c].join(" | ")}`).join("\n");
  const prompt = `Rean, logistics automation assistant. Reply with ONLY a JSON object, no other text.
Pick the closest real triggerCategory and trigger from this list (copy them exactly, do not invent new ones):
${vocabSummary}
Valid action types: ${ACTION_TYPES.join(", ")}
User request: "${message}"
JSON shape: {"name": "short automation name", "description": "one sentence", "triggerCategory": "...", "trigger": "...", "actions": [{"type": "...", "config": "short free text"}]}`;

  let reply = "";
  try {
    reply = await inferSLM(prompt, { tier: "balanced", fallbackQuery: message });
  } catch (e) {
    console.error("draft-with-rean inferSLM error:", e);
  }

  const parsed = extractJson(reply);
  const fallback = bestTriggerMatch(message);

  const triggerCategory = TRIGGER_CATEGORIES.includes(parsed?.triggerCategory as never)
    ? (parsed!.triggerCategory as string)
    : fallback.category;
  const validEvents = TRIGGER_EVENTS[triggerCategory] ?? [];
  const trigger = typeof parsed?.trigger === "string" && validEvents.includes(parsed.trigger)
    ? parsed.trigger
    : (triggerCategory === fallback.category ? fallback.trigger : validEvents[0]);

  const rawActions = Array.isArray(parsed?.actions) ? parsed!.actions as { type?: unknown; config?: unknown }[] : [];
  let actions = rawActions
    .filter((a) => typeof a.type === "string" && ACTION_TYPES.includes(a.type as never))
    .map((a) => ({ type: a.type as string, config: typeof a.config === "string" ? a.config : "" }))
    .slice(0, 4);
  let usedActionFallback = false;
  if (actions.length === 0) {
    actions = [{ type: bestActionMatch(message), config: "" }];
    usedActionFallback = true;
  }

  const usedTriggerFallback = !(TRIGGER_CATEGORIES.includes(parsed?.triggerCategory as never) && validEvents.includes(parsed?.trigger as string));
  const name = typeof parsed?.name === "string" && parsed.name.trim() ? parsed.name.trim().slice(0, 80) : trigger;
  const description = typeof parsed?.description === "string" && parsed.description.trim()
    ? parsed.description.trim().slice(0, 200)
    : `Runs when: ${trigger}.`;

  const draft = {
    name,
    description,
    triggerCategory,
    trigger,
    conditions: [] as { field: string; operator: string; value: string }[],
    actions,
    supported: SUPPORTED_TRIGGERS.has(trigger),
  };

  const note = usedTriggerFallback || usedActionFallback
    ? "Rean matched this to the closest real trigger/action available - review and adjust before saving."
    : undefined;

  return NextResponse.json({ draft, note });
}

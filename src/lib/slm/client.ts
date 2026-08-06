import { answerLocally } from "./local-engine";

// Literal 127.0.0.1, not "localhost" - the Rust engine binds IPv4-only, and
// Node's fetch resolving "localhost" can race to the IPv6 (::1) candidate
// first and fail the connection before falling back, causing intermittent
// silent fallbacks to the local heuristic engine even while slm-engine is
// healthy and reachable on IPv4.
const SLM_ENGINE_URL = process.env.SLM_ENGINE_URL || "http://127.0.0.1:3004";

export interface InferOptions {
  tier?: "fast" | "balanced" | "power";
  stream?: boolean;
  // The user's own short query, as opposed to `prompt` (which is usually a
  // much longer wrapper: system framing + grounding context + the query).
  // Used only if the Rust engine is unreachable and we fall back to the
  // local keyword-matching engine - that engine expects a short natural
  // query, not a multi-paragraph LLM prompt, and will produce a nonsense
  // answer (matching on incidental words from the grounding context) if
  // given the full wrapped prompt instead. Defaults to `prompt` for callers
  // that genuinely have no shorter form.
  fallbackQuery?: string;
}

/**
 * Query the Rust SLM engine for text generation.
 * Falls back to the local rules engine if the service is offline or fails.
 */
export async function inferSLM(prompt: string, options: InferOptions = {}): Promise<string> {
  const tier = options.tier || "balanced";
  try {
    const res = await fetch(`${SLM_ENGINE_URL}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, tier, stream: options.stream || false }),
      // CPU-only GGUF generation genuinely takes several seconds (measured
      // ~3.5s for a 160-token "fast" reply, ~7.6s for a 320-token "balanced"
      // reply) - a short timeout here doesn't detect an unhealthy engine, it
      // just discards real answers before they finish and silently falls
      // back to the local heuristic engine on every request.
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn("Rust slm-engine unreachable, falling back to local rules engine. Error:", err);
  }

  // Fallback to local-engine heuristic classification. Use the caller's
  // original short query if they gave one - the local engine's keyword
  // matching produces nonsense when fed a multi-paragraph LLM prompt.
  const { reply } = answerLocally(options.fallbackQuery ?? prompt, "Agent");
  return reply;
}

/**
 * Generate sentence embeddings (384-dims) using the Rust slm-engine's fastembed endpoint.
 * Falls back to zero-vectors or basic term-frequency vectors if unreachable.
 */
export async function embedText(texts: string[]): Promise<number[][]> {
  try {
    const res = await fetch(`${SLM_ENGINE_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Rust embedding service unreachable. Error:", err);
  }

  // Return zero-vectors as a safe fallback
  return texts.map(() => new Array(384).fill(0));
}

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length || v1.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    normA += v1[i] * v1[i];
    normB += v2[i] * v2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

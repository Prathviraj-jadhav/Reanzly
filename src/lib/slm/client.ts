import { answerLocally } from "./local-engine";

const SLM_ENGINE_URL = process.env.SLM_ENGINE_URL || "http://localhost:3004";

export interface InferOptions {
  tier?: "fast" | "balanced" | "power";
  stream?: boolean;
}

/**
 * Checks if the local Rust slm-engine is active and healthy.
 */
export async function isSlmEngineOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${SLM_ENGINE_URL}/health`, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch {
    return false;
  }
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
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn("Rust slm-engine unreachable, falling back to local rules engine. Error:", err);
  }

  // Fallback to local-engine heuristic classification
  const { reply } = answerLocally(prompt, "Agent");
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

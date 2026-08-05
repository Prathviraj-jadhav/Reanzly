import { db } from "@/lib/db";
import { embedText, inferSLM, cosineSimilarity } from "./client";

export interface FeedbackInput {
  companyId: string;
  userId?: string;
  agentId: string;
  query: string;
  response: string;
  rating: number; // +1 for thumbs up, -1 for thumbs down (or 1-5 stars)
  comment?: string;
}

/**
 * Record feedback from the user regarding an SLM agent response.
 */
export async function recordFeedback(input: FeedbackInput) {
  return await db.slmFeedback.create({
    data: {
      companyId: input.companyId,
      userId: input.userId || null,
      agentId: input.agentId,
      query: input.query,
      response: input.response,
      rating: input.rating,
      comment: input.comment || null,
      processed: false,
    },
  });
}

/**
 * Save an associative memory trace.
 * Computes the embedding of the memory key + value for semantic retrieval.
 */
export async function saveMemory(companyId: string, key: string, value: string, userId?: string) {
  const [vector] = await embedText([`${key}: ${value}`]);
  const embeddingString = JSON.stringify(vector);

  return await db.slmMemory.create({
    data: {
      companyId,
      userId: userId || null,
      key,
      value,
      embedding: embeddingString,
    },
  });
}

/**
 * Retrieve memories that are semantically related to the query.
 * Uses Cosine Similarity over the 384-dim ONNX embeddings.
 */
export async function retrieveRelevantMemories(companyId: string, query: string, limit = 3) {
  const [queryVec] = await embedText([query]);

  // Read all memories for the tenant
  const memories = await db.slmMemory.findMany({
    where: { companyId },
  });

  const scoredMemories = memories
    .map((mem) => {
      if (!mem.embedding) return { mem, score: 0 };
      try {
        const memVec = JSON.parse(mem.embedding) as number[];
        const score = cosineSimilarity(queryVec, memVec);
        return { mem, score };
      } catch {
        return { mem, score: 0 };
      }
    })
    .filter((item) => item.score > 0.15) // Rejection threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredMemories.map((sm) => sm.mem);
}

/**
 * Quantum-Cognitive Decision Framework (QDF) - Superposition of Interpretations.
 * Holds multiple potential interpretations of the user's intent in superposition,
 * then collapses (selects the best one) using semantic scoring against the grounding context.
 */
export async function superpositionReason(
  query: string,
  context: string,
  options: { n?: number; companyId: string }
): Promise<{ bestInterpretation: string; confidence: number; alternatives: string[] }> {
  const n = options.n || 3;
  const companyId = options.companyId;

  // Retrieve relevant past memories first to entangle context
  const pastMemories = await retrieveRelevantMemories(companyId, query, 2);
  const memoryContext = pastMemories.map((m) => `[Past Memory Key: ${m.key} -> ${m.value}]`).join("\n");

  const fullContext = `${context}\n${memoryContext}`;

  // Generate N parallel/independent interpretation thoughts (simulating superposition)
  const interpretations = await Promise.all(
    Array.from({ length: n }).map(async (_, i) => {
      const prompt = `System: You are an internal cognitive filter analyzing the user request.
Context of the organization:
${fullContext}

Generate candidate interpretation #${i + 1} of what the user is asking, including potential hidden goals.
User Query: "${query}"
Candidate Interpretation:`;
      const response = await inferSLM(prompt, { tier: "fast" });
      return response.trim();
    })
  );

  // Calculate embedding of the context
  const [contextVec] = await embedText([fullContext]);
  const interpVectors = await embedText(interpretations);

  // Score each interpretation against the context using cosine similarity
  const scored = interpretations.map((interp, idx) => {
    const score = cosineSimilarity(interpVectors[idx], contextVec);
    return { interpretation: interp, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1).map((s) => s.interpretation);

  // Save the selected best interpretation as a memory trace to reinforce the loop (self-learning)
  await saveMemory(companyId, `cognitive_collapse:query:${query.slice(0, 50)}`, best.interpretation);

  return {
    bestInterpretation: best.interpretation,
    confidence: best.score,
    alternatives,
  };
}

/**
 * Run self-improvement cycle: processes negative and positive feedback to refine system prompts.
 * Typically called out-of-band or via admin trigger.
 */
export async function runSelfImprovementCycle(companyId: string): Promise<{
  processedCount: number;
  promptsOptimized: number;
  cacheSeeded: number;
}> {
  const feedbacks = await db.slmFeedback.findMany({
    where: { companyId, processed: false },
  });

  if (feedbacks.length === 0) {
    return { processedCount: 0, promptsOptimized: 0, cacheSeeded: 0 };
  }

  let cacheSeeded = 0;
  let promptsOptimized = 0;

  for (const fb of feedbacks) {
    if (fb.rating >= 4 || fb.rating === 1) { // High rating / thumbs up
      // Add successful Q&A pair to the associative memory cache
      await saveMemory(
        companyId,
        `qa_cache:query:${fb.query.toLowerCase().trim()}`,
        fb.response
      );
      cacheSeeded++;
    } else if (fb.rating <= 2 || fb.rating === -1) { // Poor rating / thumbs down
      // Record correction memory to prevent repeating the mistake
      await saveMemory(
        companyId,
        `correction:query:${fb.query.toLowerCase().trim()}`,
        `Previous failure response was: "${fb.response.slice(0, 100)}". Avoid repeating this formatting or structure.`
      );
      promptsOptimized++;
    }
  }

  // Mark feedback as processed
  await db.slmFeedback.updateMany({
    where: { id: { in: feedbacks.map((f) => f.id) } },
    data: { processed: true },
  });

  return {
    processedCount: feedbacks.length,
    promptsOptimized,
    cacheSeeded,
  };
}

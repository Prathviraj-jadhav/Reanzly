// Retrieval-augmented generation for Rean: embeds and stores the knowledge
// base defined in knowledge-seed.ts, and retrieves the most relevant chunks
// for a given query. This is Rean's "brain" - grounding facts that exist
// independent of any single conversation, distinct from SlmMemory (which
// holds per-tenant conversation history and the QA cache).

import { db } from "@/lib/db";
import { embedText, cosineSimilarity } from "./client";
import { KNOWLEDGE_SEED } from "./knowledge-seed";

const MIN_RELEVANCE = 0.2;

export interface RetrievedKnowledge {
  title: string;
  content: string;
  source: string;
  score: number;
}

/**
 * Seed the knowledge base if it's empty. Safe to call on every server start -
 * it's a no-op once seeded. Embeds every chunk in one batch call.
 */
export async function ensureKnowledgeSeeded(): Promise<{ seeded: number }> {
  const existing = await db.knowledgeChunk.count({ where: { companyId: "global" } });
  if (existing >= KNOWLEDGE_SEED.length) return { seeded: 0 };

  const texts = KNOWLEDGE_SEED.map((k) => `${k.title}: ${k.content}`);
  const embeddings = await embedText(texts);

  await db.knowledgeChunk.deleteMany({ where: { companyId: "global" } });
  await db.knowledgeChunk.createMany({
    data: KNOWLEDGE_SEED.map((k, i) => ({
      companyId: "global",
      source: k.source,
      title: k.title,
      content: k.content,
      embedding: JSON.stringify(embeddings[i]),
    })),
  });
  return { seeded: KNOWLEDGE_SEED.length };
}

/**
 * Retrieve the most relevant knowledge chunks for a query via cosine
 * similarity over stored embeddings. Returns [] rather than throwing if the
 * embedding service is down or the base isn't seeded yet - RAG grounding is
 * additive, never a hard dependency for Rean to answer at all.
 */
export async function retrieveKnowledge(query: string, limit = 3): Promise<RetrievedKnowledge[]> {
  try {
    const [queryEmbedding] = await embedText([query]);
    if (!queryEmbedding || queryEmbedding.every((v) => v === 0)) return [];

    const chunks = await db.knowledgeChunk.findMany({
      where: { companyId: "global", embedding: { not: null } },
    });

    return chunks
      .map((c) => ({
        title: c.title,
        content: c.content,
        source: c.source,
        score: cosineSimilarity(queryEmbedding, JSON.parse(c.embedding as string)),
      }))
      .filter((c) => c.score > MIN_RELEVANCE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    return [];
  }
}

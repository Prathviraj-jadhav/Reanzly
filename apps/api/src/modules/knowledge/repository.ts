import type { PrismaClient } from "@reanzly/database";

type ArticleRow = NonNullable<Awaited<ReturnType<PrismaClient["knowledgeArticle"]["findFirst"]>>>;

export function toKnowledgeArticleDto(a: ArticleRow, related: unknown[] = []) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    tags: JSON.parse(a.tagsJson || "[]") as string[],
    summary: a.summary,
    author: a.author,
    authorRole: a.authorRole,
    publishedOn: a.publishedOn.toISOString(),
    updatedOn: a.updatedOn.toISOString(),
    views: a.views,
    helpfulCount: a.helpfulCount,
    notHelpfulCount: a.notHelpfulCount,
    status: a.status,
    visibility: a.visibility,
    readingTimeMin: a.readingTimeMin,
    content: JSON.parse(a.contentJson || "[]") as unknown[],
    attachments: JSON.parse(a.attachmentsJson || "[]") as unknown[],
    related,
    feedback: JSON.parse(a.feedbackJson || "[]") as unknown[],
    revisions: JSON.parse(a.revisionsJson || "[]") as unknown[],
  };
}

export async function listArticles(db: PrismaClient, companyId: string) {
  return db.knowledgeArticle.findMany({
    where: { companyId },
    orderBy: { updatedOn: "desc" },
  });
}

export async function findArticleById(db: PrismaClient, companyId: string, id: string) {
  return db.knowledgeArticle.findFirst({ where: { companyId, id } });
}

export async function computeRelatedArticles(
  db: PrismaClient,
  companyId: string,
  article: ArticleRow,
) {
  const tags: string[] = JSON.parse(article.tagsJson || "[]");
  const others = await db.knowledgeArticle.findMany({
    where: { companyId, id: { not: article.id } },
    orderBy: { updatedOn: "desc" },
  });
  return others
    .map((o) => {
      const oTags: string[] = JSON.parse(o.tagsJson || "[]");
      const sameCategory = o.category === article.category;
      const sharedTag = oTags.find((t) => tags.includes(t));
      return { o, sameCategory, sharedTag };
    })
    .filter((r) => r.sameCategory || r.sharedTag)
    .slice(0, 3)
    .map(({ o, sameCategory, sharedTag }) => ({
      id: o.id,
      title: o.title,
      category: o.category,
      reason: sameCategory ? "Same category" : `Shares tag: ${sharedTag}`,
    }));
}

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createArticle(
  db: PrismaClient,
  companyId: string,
  input: {
    title: string;
    summary: string;
    category?: string;
    tags?: string[];
    author: string;
    authorRole?: string;
    status?: string;
    visibility?: string;
    readingTimeMin?: number;
    content?: unknown[];
    revisions?: unknown[];
  },
) {
  const now = new Date();
  return db.knowledgeArticle.create({
    data: {
      companyId,
      slug: slugFromTitle(input.title),
      title: input.title,
      category: input.category || "SOPs",
      tagsJson: JSON.stringify(Array.isArray(input.tags) ? input.tags : []),
      summary: input.summary,
      author: input.author,
      authorRole: input.authorRole || "",
      publishedOn: now,
      updatedOn: now,
      status: input.status || "Draft",
      visibility: input.visibility || "Internal",
      readingTimeMin: Math.max(2, Number(input.readingTimeMin) || 2),
      contentJson: JSON.stringify(Array.isArray(input.content) ? input.content : []),
      revisionsJson: JSON.stringify(
        Array.isArray(input.revisions) && input.revisions.length > 0
          ? input.revisions
          : [
              {
                id: `rev-${now.getTime()}`,
                version: "1.0",
                ts: now.toISOString(),
                author: input.author,
                summary: "Initial draft created",
              },
            ],
      ),
    },
  });
}

export async function patchArticle(
  db: PrismaClient,
  companyId: string,
  id: string,
  patch: {
    title?: string;
    category?: string;
    tags?: string[];
    summary?: string;
    status?: string;
    visibility?: string;
    content?: unknown[];
    attachments?: unknown[];
    views?: number;
    vote?: "up" | "down";
    comment?: string;
    voterName: string;
  },
) {
  const existing = await findArticleById(db, companyId, id);
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = String(patch.title);
  if (patch.category !== undefined) data.category = String(patch.category);
  if (patch.tags !== undefined) data.tagsJson = JSON.stringify(patch.tags);
  if (patch.summary !== undefined) data.summary = String(patch.summary);
  if (patch.status !== undefined) data.status = String(patch.status);
  if (patch.visibility !== undefined) data.visibility = String(patch.visibility);
  if (patch.content !== undefined) data.contentJson = JSON.stringify(patch.content);
  if (patch.attachments !== undefined) data.attachmentsJson = JSON.stringify(patch.attachments);
  if (patch.views !== undefined) data.views = Number(patch.views);

  if (patch.vote === "up" || patch.vote === "down") {
    const feedback = JSON.parse(existing.feedbackJson || "[]") as unknown[];
    feedback.push({
      id: `fb-${Date.now()}`,
      helpful: patch.vote === "up",
      author: patch.voterName,
      comment: patch.comment || undefined,
      ts: new Date().toISOString(),
    });
    data.feedbackJson = JSON.stringify(feedback);
    data.helpfulCount = existing.helpfulCount + (patch.vote === "up" ? 1 : 0);
    data.notHelpfulCount = existing.notHelpfulCount + (patch.vote === "down" ? 1 : 0);
  }

  if (Object.keys(data).length > 0) data.updatedOn = new Date();

  const updated = await db.knowledgeArticle.update({ where: { id: existing.id }, data });
  return { existing, updated };
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toListDTO } from "../route";

/** @deprecated Use `/api/v1/knowledge/:id` (Fastify). Rollback via `NEXT_PUBLIC_KNOWLEDGE_API_VERSION=legacy`. */

// Related articles are computed live from the company's current article
// set (shared category or an overlapping tag), not stored - a frozen
// "related" snapshot goes stale the moment an article is added or retagged.
async function withRelated(companyId: string, article: Awaited<ReturnType<typeof db.knowledgeArticle.findFirstOrThrow>>) {
  const tags: string[] = JSON.parse(article.tagsJson || "[]");
  const others = await db.knowledgeArticle.findMany({
    where: { companyId, id: { not: article.id } },
    orderBy: { updatedOn: "desc" },
  });
  const related = others
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
  return { ...toListDTO(article), related };
}

async function findArticle(companyId: string, id: string) {
  return db.knowledgeArticle.findFirst({ where: { companyId, id } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "knowledge");
  if (denied) return denied;
  const { id } = await params;

  const article = await findArticle(sessionUser.companyId, id);
  if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  return NextResponse.json({ article: await withRelated(sessionUser.companyId, article) });
}

// Single generic PATCH covering every real mutation the detail view
// performs - direct field edits, and the helpful/not-helpful feedback vote
// (which appends a feedback entry and bumps the matching counter).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "knowledge");
  if (denied) return denied;
  const { id } = await params;

  const existing = await findArticle(sessionUser.companyId, id);
  if (!existing) return NextResponse.json({ error: "Article not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title);
  if (body.category !== undefined) data.category = String(body.category);
  if (body.tags !== undefined) data.tagsJson = JSON.stringify(body.tags);
  if (body.summary !== undefined) data.summary = String(body.summary);
  if (body.status !== undefined) data.status = String(body.status);
  if (body.visibility !== undefined) data.visibility = String(body.visibility);
  if (body.content !== undefined) data.contentJson = JSON.stringify(body.content);
  if (body.attachments !== undefined) data.attachmentsJson = JSON.stringify(body.attachments);
  if (body.views !== undefined) data.views = Number(body.views);

  if (body.vote === "up" || body.vote === "down") {
    const feedback = JSON.parse(existing.feedbackJson || "[]");
    feedback.push({
      id: `fb-${Date.now()}`,
      helpful: body.vote === "up",
      author: sessionUser.name,
      comment: body.comment || undefined,
      ts: new Date().toISOString(),
    });
    data.feedbackJson = JSON.stringify(feedback);
    data.helpfulCount = existing.helpfulCount + (body.vote === "up" ? 1 : 0);
    data.notHelpfulCount = existing.notHelpfulCount + (body.vote === "down" ? 1 : 0);
  }

  if (Object.keys(data).length > 0) data.updatedOn = new Date();

  const updated = await db.knowledgeArticle.update({ where: { id: existing.id }, data });

  if (body.status !== undefined && body.status !== existing.status) {
    await logAudit({
      sessionUser,
      action: "STATUS_CHANGE",
      entity: "KnowledgeArticle",
      entityId: updated.id,
      description: `${updated.title} status: ${existing.status} → ${updated.status}`,
    });
  }

  return NextResponse.json({ article: await withRelated(sessionUser.companyId, updated) });
}

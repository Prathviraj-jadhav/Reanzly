import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

/** @deprecated Use `/api/v1/knowledge` (Fastify). Rollback via `NEXT_PUBLIC_KNOWLEDGE_API_VERSION=legacy`. */

// Real CRUD for Knowledge Base articles, replacing the module's entirely
// client-only KNOWLEDGE_ARTICLES mock array (article-detail.tsx searched
// that same static array independently of the list's state, so a newly
// created article showed "not found" the moment you clicked into it - the
// same detached-detail-view bug already fixed in Field Service).
// content/attachments/feedback/revisions are stored as JSON text columns,
// same convention as FieldServiceTask. "related articles" is NOT stored -
// it's computed live in the [id] route from the current company article
// set, so it never goes stale the way a frozen snapshot would.

type Row = Awaited<ReturnType<typeof db.knowledgeArticle.findFirstOrThrow>>;

export function toListDTO(a: Row) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    tags: JSON.parse(a.tagsJson || "[]"),
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
    content: JSON.parse(a.contentJson || "[]"),
    attachments: JSON.parse(a.attachmentsJson || "[]"),
    related: [] as unknown[],
    feedback: JSON.parse(a.feedbackJson || "[]"),
    revisions: JSON.parse(a.revisionsJson || "[]"),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "knowledge");
  if (denied) return denied;

  const articles = await db.knowledgeArticle.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { updatedOn: "desc" },
  });
  return NextResponse.json({ articles: articles.map(toListDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "knowledge");
  if (denied) return denied;

  const body = await req.json();
  const title = String(body.title || "").trim();
  const summary = String(body.summary || "").trim();
  if (!title || !summary) {
    return NextResponse.json({ error: "title and summary are required." }, { status: 400 });
  }

  const now = new Date();
  const created = await db.knowledgeArticle.create({
    data: {
      companyId: sessionUser.companyId,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60),
      title,
      category: body.category || "SOPs",
      tagsJson: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      summary,
      author: body.author || sessionUser.name,
      authorRole: body.authorRole || "",
      publishedOn: now,
      updatedOn: now,
      status: body.status || "Draft",
      visibility: body.visibility || "Internal",
      readingTimeMin: Math.max(2, Number(body.readingTimeMin) || 2),
      contentJson: JSON.stringify(Array.isArray(body.content) ? body.content : []),
      revisionsJson: JSON.stringify(
        Array.isArray(body.revisions) && body.revisions.length > 0
          ? body.revisions
          : [{ id: `rev-${now.getTime()}`, version: "1.0", ts: now.toISOString(), author: body.author || sessionUser.name, summary: "Initial draft created" }],
      ),
    },
  });

  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "KnowledgeArticle",
    entityId: created.id,
    description: `Created knowledge article: ${created.title} (${created.category})`,
  });

  return NextResponse.json({ article: toListDTO(created) }, { status: 201 });
}

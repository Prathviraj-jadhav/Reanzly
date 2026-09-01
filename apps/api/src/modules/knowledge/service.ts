import type { PrismaClient } from "@reanzly/database";
import type { AuthContext } from "@reanzly/auth";
import { DomainServiceError } from "../../lib/domain-error.js";
import { logAudit } from "../../lib/audit.js";
import {
  computeRelatedArticles,
  createArticle,
  findArticleById,
  listArticles,
  patchArticle,
  toKnowledgeArticleDto,
} from "./repository.js";

export async function getArticles(db: PrismaClient, companyId: string) {
  const rows = await listArticles(db, companyId);
  return rows.map((a) => toKnowledgeArticleDto(a));
}

export async function getArticleDetail(db: PrismaClient, companyId: string, id: string) {
  const article = await findArticleById(db, companyId, id);
  if (!article) {
    throw new DomainServiceError("NOT_FOUND", "Article not found.", 404);
  }
  const related = await computeRelatedArticles(db, companyId, article);
  return toKnowledgeArticleDto(article, related);
}

export async function createArticleForCompany(
  db: PrismaClient,
  auth: AuthContext,
  input: {
    title: string;
    summary: string;
    category?: string;
    tags?: string[];
    author?: string;
    authorRole?: string;
    status?: string;
    visibility?: string;
    readingTimeMin?: number;
    content?: unknown[];
    revisions?: unknown[];
  },
) {
  const created = await createArticle(db, auth.companyId, {
    ...input,
    author: input.author || auth.name,
  });

  await logAudit(db, {
    auth,
    action: "CREATE",
    entity: "KnowledgeArticle",
    entityId: created.id,
    description: `Created knowledge article: ${created.title} (${created.category})`,
  });

  return toKnowledgeArticleDto(created);
}

export async function updateArticleForCompany(
  db: PrismaClient,
  auth: AuthContext,
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
  },
) {
  const result = await patchArticle(db, auth.companyId, id, {
    ...patch,
    voterName: auth.name,
  });
  if (!result) {
    throw new DomainServiceError("NOT_FOUND", "Article not found.", 404);
  }

  const { existing, updated } = result;
  if (patch.status !== undefined && patch.status !== existing.status) {
    await logAudit(db, {
      auth,
      action: "STATUS_CHANGE",
      entity: "KnowledgeArticle",
      entityId: updated.id,
      description: `${updated.title} status: ${existing.status} → ${updated.status}`,
    });
  }

  const related = await computeRelatedArticles(db, auth.companyId, updated);
  return toKnowledgeArticleDto(updated, related);
}

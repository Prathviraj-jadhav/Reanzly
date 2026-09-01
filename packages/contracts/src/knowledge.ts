import { z } from "zod";

export const KnowledgeContentBlockSchema = z.record(z.string(), z.unknown());
export const KnowledgeAttachmentSchema = z.record(z.string(), z.unknown());
export const KnowledgeFeedbackSchema = z.record(z.string(), z.unknown());
export const KnowledgeRevisionSchema = z.record(z.string(), z.unknown());

export const KnowledgeRelatedSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  reason: z.string(),
});

export const KnowledgeArticleDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  summary: z.string(),
  author: z.string(),
  authorRole: z.string(),
  publishedOn: z.string(),
  updatedOn: z.string(),
  views: z.number(),
  helpfulCount: z.number(),
  notHelpfulCount: z.number(),
  status: z.string(),
  visibility: z.string(),
  readingTimeMin: z.number(),
  content: z.array(z.unknown()),
  attachments: z.array(z.unknown()),
  related: z.array(KnowledgeRelatedSchema),
  feedback: z.array(z.unknown()),
  revisions: z.array(z.unknown()),
});

export const KnowledgeListResponseSchema = z.object({
  articles: z.array(KnowledgeArticleDtoSchema),
});

export const KnowledgeResponseSchema = z.object({
  article: KnowledgeArticleDtoSchema,
});

export const KnowledgeCreateSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string().min(1),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    authorRole: z.string().optional(),
    status: z.string().optional(),
    visibility: z.string().optional(),
    readingTimeMin: z.number().optional(),
    content: z.array(z.unknown()).optional(),
    revisions: z.array(z.unknown()).optional(),
  })
  .strict();

export const KnowledgePatchSchema = z
  .object({
    title: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    status: z.string().optional(),
    visibility: z.string().optional(),
    content: z.array(z.unknown()).optional(),
    attachments: z.array(z.unknown()).optional(),
    views: z.number().optional(),
    vote: z.enum(["up", "down"]).optional(),
    comment: z.string().optional(),
  })
  .strict();

export type KnowledgeArticleDto = z.infer<typeof KnowledgeArticleDtoSchema>;

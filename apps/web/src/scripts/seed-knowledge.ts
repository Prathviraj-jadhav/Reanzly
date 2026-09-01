// Seeds real Knowledge Base articles - the module previously ran entirely
// on a client-only KNOWLEDGE_ARTICLES mock array (article-detail.tsx
// searched that same static array independently of the list's state, so a
// newly created article showed "not found" the moment you clicked into
// it - the same detached-detail-view bug already fixed in Field Service).
// Reuses the rich, hand-authored SOP/policy/playbook content generator
// still exported from the module's own _helpers.tsx as the seed source.
//
// Idempotent: skips if this company already has KnowledgeArticle rows.
// Run with: bun run src/scripts/seed-knowledge.ts
import { PrismaClient } from "@prisma/client";
import { KNOWLEDGE_ARTICLES } from "../components/modules/knowledge/_helpers";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  console.log("[seed-knowledge] starting...");

  const existing = await db.knowledgeArticle.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-knowledge] already seeded (${existing} articles found) - skipping.`);
    return;
  }

  let created = 0;
  for (const a of KNOWLEDGE_ARTICLES) {
    await db.knowledgeArticle.create({
      data: {
        companyId: COMPANY_ID,
        slug: a.slug,
        title: a.title,
        category: a.category,
        tagsJson: JSON.stringify(a.tags),
        summary: a.summary,
        author: a.author,
        authorRole: a.authorRole,
        publishedOn: new Date(a.publishedOn),
        updatedOn: new Date(a.updatedOn),
        views: a.views,
        helpfulCount: a.helpfulCount,
        notHelpfulCount: a.notHelpfulCount,
        status: a.status,
        visibility: a.visibility,
        readingTimeMin: a.readingTimeMin,
        contentJson: JSON.stringify(a.content),
        attachmentsJson: JSON.stringify(a.attachments),
        feedbackJson: JSON.stringify(a.feedback),
        revisionsJson: JSON.stringify(a.revisions),
      },
    });
    created++;
  }

  console.log(`[seed-knowledge] seeded ${created} real knowledge articles.`);
}

main()
  .catch((e) => {
    console.error("[seed-knowledge] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

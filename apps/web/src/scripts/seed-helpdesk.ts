// Seeds real Helpdesk tickets - the module previously ran entirely on a
// client-only HELPDESK_TICKETS mock array (ticket-detail.tsx searched that
// same static array independently of the list's live state, so a newly
// created ticket showed "not found" the moment you clicked into it - the
// same detached-detail-view bug already fixed in Field Service/Knowledge).
// Reuses the hand-authored ticket set still exported from the module's own
// _helpers.tsx as the seed source.
//
// Idempotent: skips if this company already has HelpdeskTicket rows.
// Run with: bun run src/scripts/seed-helpdesk.ts
import { PrismaClient } from "@prisma/client";
import { HELPDESK_TICKETS } from "../components/modules/helpdesk/_helpers";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

async function main() {
  console.log("[seed-helpdesk] starting...");

  const existing = await db.helpdeskTicket.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-helpdesk] already seeded (${existing} tickets found) - skipping.`);
    return;
  }

  let created = 0;
  for (const t of HELPDESK_TICKETS) {
    await db.helpdeskTicket.create({
      data: {
        companyId: COMPANY_ID,
        ticketId: t.ticketId,
        subject: t.subject,
        description: t.description,
        customer: t.customer,
        customerCode: t.customerCode,
        priority: t.priority,
        status: t.status,
        channel: t.channel,
        team: t.team,
        assignee: t.assignee,
        requester: t.requester,
        requesterEmail: t.requesterEmail,
        category: t.category,
        resolvedAt: t.resolvedAt ? new Date(t.resolvedAt) : null,
        relatedRef: t.relatedRef ?? null,
        slaJson: JSON.stringify(t.sla),
        messagesJson: JSON.stringify(t.messages),
        activityJson: JSON.stringify(t.activity),
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
    created++;
  }

  console.log(`[seed-helpdesk] seeded ${created} real helpdesk tickets.`);
}

main()
  .catch((e) => {
    console.error("[seed-helpdesk] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

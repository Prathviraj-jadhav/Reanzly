// Seed the chat tables with real default data:
//   - 5 open channels: #general, #operations, #fleet, #finance, #dispatch
//   - A Rean DM for every role archetype
//   - A welcome message in #general from Rean
//
// Idempotent: re-running upserts by name and skips messages that already exist.
// Run with: bun run src/scripts/seed-chat.ts
import { PrismaClient } from "@prisma/client";
import { ROLE_ARCHETYPES } from "../lib/mock-data";

const db = new PrismaClient();

const CHANNELS = [
  { name: "general", description: "Company-wide announcements", topic: "Welcome to Reanzly" },
  { name: "operations", description: "Trip planning, dispatch, exceptions", topic: "Live ops" },
  { name: "fleet", description: "Vehicles, maintenance, tyres", topic: "Fleet health" },
  { name: "finance", description: "Invoices, payments, expenses", topic: "Numbers" },
  { name: "dispatch", description: "Driver coordination, load assignment", topic: "On the road" },
];

async function main() {
  console.log("[seed-chat] starting...");

  // 1. Upsert channels and add every role as a participant.
  for (const ch of CHANNELS) {
    let conv = await db.chatConversation.findFirst({ where: { name: ch.name, type: "channel" } });
    if (!conv) {
      conv = await db.chatConversation.create({
        data: {
          name: ch.name,
          type: "channel",
          description: ch.description,
          topic: ch.topic,
          private: false,
        },
      });
      console.log(`[seed-chat] created channel #${ch.name} (${conv.id})`);
    }
    for (const role of ROLE_ARCHETYPES) {
      const existing = await db.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId: conv.id, userId: role.id } },
      });
      if (!existing) {
        await db.chatParticipant.create({
          data: {
            conversationId: conv.id,
            userId: role.id,
            userName: role.name,
            userRole: role.name.split(" ")[1] || "Staff",
            userInitials: role.initials,
          },
        });
      }
    }
  }

  // 2. Create a Rean DM for every role (if it doesn't exist).
  for (const role of ROLE_ARCHETYPES) {
    const existing = await db.chatConversation.findFirst({
      where: {
        type: "direct",
        participants: { every: { userId: { in: [role.id, "rean"] } } },
      },
      include: { participants: true },
    });
    if (existing && existing.participants.length === 2) continue;

    await db.chatConversation.create({
      data: {
        name: "Rean",
        type: "direct",
        private: true,
        createdBy: role.id,
        participants: {
          create: [
            {
              userId: role.id,
              userName: role.name,
              userRole: role.name.split(" ")[1] || "Staff",
              userInitials: role.initials,
            },
            { userId: "rean", userName: "Rean", userRole: "AI", userInitials: "RE" },
          ],
        },
      },
    });
    console.log(`[seed-chat] created Rean DM for ${role.id}`);
  }

  // 3. Seed a welcome message in #general from Rean (only once).
  const generalConv = await db.chatConversation.findFirst({ where: { name: "general", type: "channel" } });
  if (generalConv) {
    const welcomeExists = await db.chatMessage.findFirst({
      where: { conversationId: generalConv.id, senderId: "rean" },
    });
    if (!welcomeExists) {
      await db.chatMessage.create({
        data: {
          conversationId: generalConv.id,
          senderId: "rean",
          senderName: "Rean",
          senderRole: "AI",
          text: "Welcome to Reanzly Team Chat. This is a real-time channel - messages here persist and sync across every tab and device. Mention @[Vikram Deshmukh](owner) or pin a message to surface priorities. I will flag anomalies as they come up.",
          isRean: true,
        },
      });
      console.log("[seed-chat] seeded welcome message in #general");
    }
    const opsConv = await db.chatConversation.findFirst({ where: { name: "operations", type: "channel" } });
    if (opsConv) {
      const opsMsgExists = await db.chatMessage.findFirst({
        where: { conversationId: opsConv.id, senderId: "ops-manager" },
      });
      if (!opsMsgExists) {
        await db.chatMessage.create({
          data: {
            conversationId: opsConv.id,
            senderId: "ops-manager",
            senderName: "Rohit Sharma",
            senderRole: "Manager",
            text: "Morning team. Pune-Bengaluru return loads need consolidation - two empties coming back today.",
          },
        });
        console.log("[seed-chat] seeded ops message in #operations");
      }
    }
  }

  console.log("[seed-chat] done.");
}

main()
  .catch((e) => {
    console.error("[seed-chat] error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

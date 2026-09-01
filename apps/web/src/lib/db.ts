// Re-export the shared Prisma client for existing imports.
export {
  db,
  dbRead,
  primaryRead,
  replicaHealth,
  PrismaClient,
} from "@reanzly/database";

import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { hasModuleAccess } from "@/lib/permissions";
import { getStorage } from "@/lib/storage/object-storage";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function normalizeKey(key: string): string {
  return key.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Reject path traversal in bucket/key segments. */
export function isSafeStoragePath(bucket: string, key: string): boolean {
  if (!/^[a-z0-9-]+$/.test(bucket)) return false;
  const normalized = normalizeKey(key);
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) return false;
  return true;
}

async function readObjectMetadata(
  bucket: string,
  key: string,
): Promise<Record<string, string> | null> {
  try {
    const metaPath = path.join(STORAGE_ROOT, bucket, `${normalizeKey(key)}.meta.json`);
    const raw = await fs.readFile(metaPath, "utf8");
    const parsed = JSON.parse(raw) as { metadata?: Record<string, string> };
    return parsed.metadata ?? null;
  } catch {
    return null;
  }
}

async function driverBelongsToCompany(driverId: string, companyId: string): Promise<boolean> {
  const driver = await db.driver.findFirst({
    where: { id: driverId, companyId },
    select: { id: true },
  });
  return Boolean(driver);
}

/**
 * Determine whether sessionUser may read bucket/key.
 * Checks object metadata, driver activity photos, task attachments, and chat URLs.
 */
export async function canAccessStorageObject(
  sessionUser: SessionUser,
  bucket: string,
  key: string,
): Promise<boolean> {
  if (!isSafeStoragePath(bucket, key)) return false;

  const storageKey = normalizeKey(key);
  const meta = await readObjectMetadata(bucket, storageKey);

  if (meta?.companyId && meta.companyId === sessionUser.companyId) {
    return true;
  }

  if (meta?.driverId) {
    return driverBelongsToCompany(meta.driverId, sessionUser.companyId);
  }

  const storageRef = `storage://${bucket}/${storageKey}`;
  const activity = await db.driverActivity.findFirst({
    where: { photoDataUrl: storageRef },
    select: { driverId: true },
  });
  if (activity) {
    return driverBelongsToCompany(activity.driverId, sessionUser.companyId);
  }

  const attachment = await db.taskAttachment.findFirst({
    where: { bucket, key: storageKey },
    select: { task: { select: { companyId: true } } },
  });
  if (attachment?.task.companyId === sessionUser.companyId) {
    return true;
  }

  const chatUrl = `/api/storage/${bucket}/${storageKey}`;
  const chatMessage = await db.chatMessage.findFirst({
    where: { attachment: { contains: chatUrl } },
    select: {
      conversation: {
        select: {
          participants: { select: { userId: true } },
        },
      },
    },
  });
  if (chatMessage) {
    const participantIds = chatMessage.conversation.participants.map((p) => p.userId);
    if (participantIds.includes(sessionUser.id)) return true;
    const sameCompany = await db.user.count({
      where: { id: { in: participantIds }, companyId: sessionUser.companyId },
    });
    if (sameCompany > 0) return true;
  }

  // Tenant module users may read company export/report blobs when metadata is absent (legacy).
  if (bucket === "exports" || bucket === "reports") {
    return hasModuleAccess(sessionUser.role, "reports") || hasModuleAccess(sessionUser.role, "ledger");
  }
  if (bucket === "documents") {
    return hasModuleAccess(sessionUser.role, "documents");
  }

  // Unlinked objects are denied (IDOR-safe).
  return false;
}

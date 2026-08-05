// ===== Reanzly Object Storage (S3-style abstraction) =====
// Moves large blobs (POD photos, documents, report exports) OUT of the database
// into content-addressed object storage. SQLite stays lean; blobs get durable,
// deduped, CDN-cacheable storage with immutable URLs.
//
// Interface mirrors S3 so the production swap is a drop-in:
//   putObject / getObject / deleteObject / stat / exists / listObjects
//
// Default driver: LocalFileStorage - writes to ./storage/{bucket}/{key}
// Production driver: S3Storage - same interface, backed by AWS S3 / MinIO /
// Cloudflare R2 (set STORAGE_DRIVER=s3 + S3_BUCKET + credentials).
//
// Objects are served via /api/storage/[...key] with:
//   - immutable Cache-Control (1 year) for content-addressed keys
//   - ETag for conditional requests
//   - Content-Type from metadata sidecar

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export interface ObjectMeta {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  etag: string;
  createdAt: number;
  metadata?: Record<string, string>;
}

export interface PutObjectInput {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StorageDriver {
  putObject(input: PutObjectInput): Promise<ObjectMeta>;
  getObject(bucket: string, key: string): Promise<{ body: Buffer; meta: ObjectMeta } | null>;
  deleteObject(bucket: string, key: string): Promise<boolean>;
  stat(bucket: string, key: string): Promise<ObjectMeta | null>;
  exists(bucket: string, key: string): Promise<boolean>;
  listObjects(bucket: string, prefix: string, limit?: number): Promise<ObjectMeta[]>;
}

// ===== Local File Storage Driver =====

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function bucketDir(bucket: string): string {
  // Whitelist bucket chars to prevent path traversal.
  if (!/^[a-z0-9-]+$/.test(bucket)) {
    throw new Error(`Invalid bucket name: ${bucket}`);
  }
  return path.join(STORAGE_ROOT, bucket);
}

function safeKey(key: string): string {
  // Disallow .. traversal and absolute paths.
  if (key.includes("..") || path.isAbsolute(key)) {
    throw new Error(`Invalid object key: ${key}`);
  }
  return key;
}

function metaPath(bucket: string, key: string): string {
  return path.join(bucketDir(bucket), safeKey(key) + ".meta.json");
}

function bodyPath(bucket: string, key: string): string {
  return path.join(bucketDir(bucket), safeKey(key));
}

async function ensureBucket(bucket: string): Promise<void> {
  await fs.mkdir(bucketDir(bucket), { recursive: true });
}

class LocalFileStorage implements StorageDriver {
  async putObject(input: PutObjectInput): Promise<ObjectMeta> {
    await ensureBucket(input.bucket);
    const safe = safeKey(input.key);
    const body = path.join(bucketDir(input.bucket), safe);
    // Ensure nested dirs exist (e.g. photos/2024/01/abc.jpg)
    await fs.mkdir(path.dirname(body), { recursive: true });

    const etag = createHash("md5").update(input.body).digest("hex");
    const meta: ObjectMeta = {
      key: input.key,
      bucket: input.bucket,
      contentType: input.contentType,
      size: input.body.length,
      etag,
      createdAt: Date.now(),
      metadata: input.metadata,
    };

    await fs.writeFile(body, input.body);
    await fs.writeFile(metaPath(input.bucket, input.key), JSON.stringify(meta));
    return meta;
  }

  async getObject(bucket: string, key: string): Promise<{ body: Buffer; meta: ObjectMeta } | null> {
    try {
      const body = await fs.readFile(bodyPath(bucket, key));
      const metaRaw = await fs.readFile(metaPath(bucket, key), "utf-8");
      const meta = JSON.parse(metaRaw) as ObjectMeta;
      return { body, meta };
    } catch {
      return null;
    }
  }

  async deleteObject(bucket: string, key: string): Promise<boolean> {
    try {
      await fs.unlink(bodyPath(bucket, key));
      await fs.unlink(metaPath(bucket, key)).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  async stat(bucket: string, key: string): Promise<ObjectMeta | null> {
    try {
      const raw = await fs.readFile(metaPath(bucket, key), "utf-8");
      return JSON.parse(raw) as ObjectMeta;
    } catch {
      return null;
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await fs.access(bodyPath(bucket, key));
      return true;
    } catch {
      return false;
    }
  }

  async listObjects(bucket: string, prefix: string, limit = 100): Promise<ObjectMeta[]> {
    const dir = bucketDir(bucket);
    const results: ObjectMeta[] = [];
    try {
      await this.walk(dir, prefix, results, limit);
    } catch {
      return [];
    }
    return results;
  }

  private async walk(dir: string, prefix: string, out: ObjectMeta[], limit: number): Promise<void> {
    if (out.length >= limit) return;
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= limit) return;
      const full = path.join(dir, entry);
      const st = await fs.stat(full);
      if (st.isDirectory()) {
        await this.walk(full, prefix, out, limit);
      } else if (entry.endsWith(".meta.json")) {
        try {
          const raw = await fs.readFile(full, "utf-8");
          const meta = JSON.parse(raw) as ObjectMeta;
          if (!prefix || meta.key.startsWith(prefix)) {
            out.push(meta);
          }
        } catch {
          /* skip corrupt meta */
        }
      }
    }
  }
}

// ===== Driver selection =====
// Production: swap to S3Storage by implementing the same interface against
// @aws-sdk/client-s3. Call-sites use the `storage` singleton and never change.

let _driver: StorageDriver | null = null;
export function getStorage(): StorageDriver {
  if (!_driver) {
    // Future: if (process.env.STORAGE_DRIVER === "s3") _driver = new S3Storage();
    _driver = new LocalFileStorage();
  }
  return _driver;
}

// ===== High-level convenience API =====

export const BUCKETS = {
  photos: "photos",
  documents: "documents",
  exports: "exports",
  reports: "reports",
  signatures: "signatures",
} as const;

export type BucketName = keyof typeof BUCKETS;

/**
 * Content-addressed key for a photo - dedupes identical uploads and makes the
 * URL immutable (safe for CDN caching for 1 year).
 * Format: {yyyy}/{mm}/{hash}.jpg
 */
export function photoKey(dataUrl: string): string {
  const hash = createHash("sha256").update(dataUrl).digest("hex").slice(0, 24);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${hash}.jpg`;
}

/** Parse a data URL into a Buffer + content type. */
export function dataUrlToBuffer(dataUrl: string): { body: Buffer; contentType: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return {
    contentType: m[1],
    body: Buffer.from(m[2], "base64"),
  };
}

export function bufferToDataUrl(body: Buffer, contentType: string): string {
  return `data:${contentType};base64,${body.toString("base64")}`;
}

/**
 * Upload a photo data URL to object storage. Returns the storage key (NOT the
 * data URL) to be persisted in the DB. This is the key migration: DB stores a
 * ~40 byte string instead of a ~200KB base64 blob.
 */
export async function uploadPhoto(
  dataUrl: string,
  metadata?: Record<string, string>
): Promise<{ key: string; bucket: string; etag: string; size: number } | null> {
  const parsed = dataUrlToBuffer(dataUrl);
  if (!parsed) return null;
  const key = photoKey(dataUrl);
  const meta = await getStorage().putObject({
    bucket: BUCKETS.photos,
    key,
    body: parsed.body,
    contentType: parsed.contentType,
    metadata,
  });
  return { key, bucket: BUCKETS.photos, etag: meta.etag, size: meta.size };
}

/** Fetch a photo back as a data URL (for display). */
export async function getPhotoAsDataUrl(bucket: string, key: string): Promise<string | null> {
  const obj = await getStorage().getObject(bucket, key);
  if (!obj) return null;
  return bufferToDataUrl(obj.body, obj.meta.contentType);
}

/**
 * Public URL for serving an object via the /api/storage route.
 * Content-addressed keys get immutable CDN cache headers.
 */
export function objectUrl(bucket: string, key: string): string {
  return `/api/storage/${bucket}/${key}`;
}

/** Is this key content-addressed (immutable → CDN-cacheable for 1 year)? */
export function isImmutableKey(key: string): boolean {
  // Photos use sha256 hash names → immutable.
  return /^photos\/\d{4}\/\d{2}\/[a-f0-9]+\.jpg$/.test(`photos/${key}`) ||
    /^[a-f0-9]{16,}\.\w+$/.test(path.basename(key));
}

// ===== Storage stats for observability =====
export async function storageStats(): Promise<{
  buckets: { name: string; objectCount: number; totalBytes: number }[];
  rootPath: string;
  driver: string;
}> {
  const driver = getStorage();
  const buckets = Object.values(BUCKETS);
  const out: { name: string; objectCount: number; totalBytes: number }[] = [];
  for (const b of buckets) {
    const objs = await driver.listObjects(b, "", 100_000);
    let totalBytes = 0;
    for (const o of objs) totalBytes += o.size;
    out.push({ name: b, objectCount: objs.length, totalBytes });
  }
  return { buckets: out, rootPath: STORAGE_ROOT, driver: "local-file" };
}

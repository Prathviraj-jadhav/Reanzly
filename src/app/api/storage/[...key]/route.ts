import { NextRequest, NextResponse } from "next/server";
import { getStorage, isImmutableKey } from "@/lib/storage/object-storage";

// ===== Object Storage Serving Route =====
// Serves blobs (POD photos, documents, exports) from object storage with
// CDN-friendly cache headers:
//   - Content-addressed keys (photos) → immutable, 1 year, public
//   - Mutated keys (documents/exports) → must-revalidate, 5 min
//
// In production, front this with a CDN (CloudFront/Cloudflare). The CDN caches
// by URL + ETag; immutable URLs never need revalidation.

const BUCKET_RE = /^[a-z0-9-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: parts } = await params;
  if (!parts || parts.length < 2) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const bucket = parts[0];
  const key = parts.slice(1).join("/");
  if (!BUCKET_RE.test(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const obj = await getStorage().getObject(bucket, key);
  if (!obj) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const immutable = isImmutableKey(key);
  const cacheControl = immutable
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300, must-revalidate";

  const headers = new Headers();
  headers.set("Content-Type", obj.meta.contentType);
  headers.set("Content-Length", String(obj.meta.size));
  headers.set("ETag", `"${obj.meta.etag}"`);
  headers.set("Cache-Control", cacheControl);
  headers.set("X-Storage-Bucket", bucket);
  headers.set("X-Storage-Key", key);
  if (immutable) headers.set("X-Storage-Immutable", "1");

  return new NextResponse(obj.body as unknown as BodyInit, { headers });
}

import { NextRequest, NextResponse } from "next/server";
import { getStorage, isImmutableKey } from "@/lib/storage/object-storage";
import { canAccessStorageObject, isSafeStoragePath } from "@/lib/storage/access-control";
import { getSessionUser } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/permissions";

// Serves blobs from object storage with tenant ownership checks.

const BUCKET_RE = /^[a-z0-9-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return unauthorized();

  const { key: parts } = await params;
  if (!parts || parts.length < 2) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const bucket = parts[0];
  const key = parts.slice(1).join("/");
  if (!BUCKET_RE.test(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (!isSafeStoragePath(bucket, key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const allowed = await canAccessStorageObject(sessionUser, bucket, key);
  if (!allowed) return forbidden("You do not have access to this file.");

  const obj = await getStorage().getObject(bucket, key);
  if (!obj) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const immutable = isImmutableKey(key);
  const cacheControl = immutable
    ? "private, max-age=31536000, immutable"
    : "private, max-age=300, must-revalidate";

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

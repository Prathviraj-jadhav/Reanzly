import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getStorage, objectUrl } from "@/lib/storage/object-storage";
import { getSessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/permissions";

// ===== Chat Attachment Upload =====
// Accepts a multipart/form-data POST with a single "file" field, stores it in
// object storage under the "chat-attachments" bucket, and returns the public
// URL the client renders/attaches to the message (served back out via the
// existing /api/storage/[...key] route).
//
// Server-side 10MB cap - the client also checks this, but that check is
// trivially bypassable (devtools, curl, a different client), so this is the
// real enforcement point.

const BUCKET = "chat-attachments";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// ===== Rate limiting (in-memory, per-IP) =====
// Mirrors the pattern in src/app/api/rean/route.ts.
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function extOf(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return m ? `.${m[1].toLowerCase()}` : "";
}

/**
 * Content-addressed key, same convention as object-storage.ts's photoKey():
 * {yyyy}/{mm}/{sha256-prefix}{ext} - dedupes identical uploads and is safe
 * for the immutable/CDN-cacheable path in the storage-serving route.
 */
function chatAttachmentKey(body: Buffer, originalName: string): string {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 24);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${hash}${extOf(originalName)}`;
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const ip = getClientIP(req);
    const rl = rateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a moment." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "Retry-After": "60" } }
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart/form-data body" }, { status: 400 });
    }

    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File is too large. Max upload size is ${MAX_SIZE / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    const body = Buffer.from(await file.arrayBuffer());
    const key = chatAttachmentKey(body, file.name || "file");

    const meta = await getStorage().putObject({
      bucket: BUCKET,
      key,
      body,
      contentType: file.type || "application/octet-stream",
      metadata: { originalName: file.name || "", companyId: sessionUser.companyId, userId: sessionUser.id },
    });

    return NextResponse.json(
      {
        url: objectUrl(meta.bucket, meta.key),
        contentType: meta.contentType,
        size: meta.size,
        name: file.name || "file",
      },
      { headers: { "X-RateLimit-Remaining": String(rl.remaining) } }
    );
  } catch (error) {
    console.error("Chat upload error:", error);
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  }
}

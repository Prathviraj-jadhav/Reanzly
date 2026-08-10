import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getStorage } from "@/lib/storage/object-storage";
import { taskInclude, toTaskDTO } from "../../../_lib";

// Real file upload for task attachments - mirrors src/app/api/chat/upload's
// content-addressed object-storage pattern (dedupes identical uploads,
// immutable/CDN-cacheable key), replacing the fabricated ATTACHMENT_BANK
// entries the task drawer used to display.

const BUCKET = "task-attachments";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function extOf(name: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return m ? `.${m[1].toLowerCase()}` : "";
}

function attachmentKey(body: Buffer, originalName: string): string {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 24);
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${hash}${extOf(originalName)}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;
  const { id } = await params;

  const task = await db.task.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

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
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = attachmentKey(buf, file.name);
  const meta = await getStorage().putObject({
    bucket: BUCKET,
    key,
    body: buf,
    contentType: file.type || "application/octet-stream",
  });

  await db.taskAttachment.create({
    data: {
      taskId: id,
      name: file.name,
      bucket: BUCKET,
      key,
      size: meta.size,
      mimeType: file.type || null,
      uploadedByName: sessionUser.name,
    },
  });

  const updated = await db.task.findFirst({ where: { id }, include: taskInclude });
  return NextResponse.json({ task: toTaskDTO(updated!) }, { status: 201 });
}

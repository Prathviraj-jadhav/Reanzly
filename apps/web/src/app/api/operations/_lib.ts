import { objectUrl } from "@/lib/storage/object-storage";

// Shared helpers for the Operations Hub task-board routes. Not a route file
// itself (no route.ts filename) so Next.js doesn't treat it as an endpoint.

export type ChecklistItem = { text: string; done: boolean };

export function parseItems(json: string | null): ChecklistItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && typeof i.text === "string").map((i) => ({ text: i.text, done: Boolean(i.done) }))
      : [];
  } catch {
    return [];
  }
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
}

export function attachmentType(name: string, mimeType: string | null): "image" | "sheet" | "pdf" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
  return "pdf";
}

export const taskInclude = {
  comments: { orderBy: { createdAt: "asc" as const } },
  attachments: { orderBy: { createdAt: "asc" as const } },
};

export function toTaskDTO(t: {
  id: string;
  title: string;
  description: string | null;
  assignee: string;
  priority: string;
  department: string;
  status: string;
  isRean: boolean;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  linkedEntityName: string | null;
  checklistJson: string | null;
  subtasksJson: string | null;
  sprintId: string | null;
  dueDate: Date | null;
  createdBy: string | null;
  createdAt: Date;
  completedAt: Date | null;
  comments: { authorName: string; body: string; createdAt: Date }[];
  attachments: { name: string; size: number; mimeType: string | null; bucket: string; key: string }[];
}) {
  const checklist = parseItems(t.checklistJson);
  const subtasks = parseItems(t.subtasksJson);
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    assignee: t.assignee,
    dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
    priority: t.priority,
    department: t.department,
    status: t.status,
    isRean: t.isRean,
    linkedEntity:
      t.linkedEntityType && t.linkedEntityName
        ? { type: t.linkedEntityType, name: t.linkedEntityName }
        : undefined,
    checklist: checklist.length > 0 ? checklist : undefined,
    subtasks: subtasks.length > 0 ? subtasks : undefined,
    comments: t.comments.map((c) => ({ user: c.authorName, text: c.body, date: c.createdAt.toISOString() })),
    attachments: t.attachments.map((a) => ({
      name: a.name,
      size: humanFileSize(a.size),
      type: attachmentType(a.name, a.mimeType),
      url: objectUrl(a.bucket, a.key),
    })),
    sprint: t.sprintId ?? undefined,
    createdDate: t.createdAt.toISOString(),
    completedDate: t.completedAt ? t.completedAt.toISOString() : undefined,
    createdBy: t.createdBy ?? undefined,
  };
}

export function toSprintDTO(s: {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
}) {
  return {
    id: s.id,
    name: s.name,
    goal: s.goal ?? "",
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    status: s.status,
  };
}

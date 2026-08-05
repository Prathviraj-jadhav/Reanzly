"use client";

import { useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Sparkles,
  Link2,
  CalendarClock,
  User,
  Building2,
  Flag,
  Check,
  MessageSquare,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Table as TableIcon,
  Send,
  Plus,
  Trash2,
  CircleDot,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import {
  PRIORITY_ACCENT,
  PRIORITY_EFFORT,
  SPRINTS,
  TASK_STATUSES,
  checklistProgress,
  dueLabel,
  formatDate,
  formatShortDate,
  initials,
  relativeTime,
} from "./_helpers";

interface DetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export function TaskDetailDrawer({ task, open, onClose, onUpdate }: DetailDrawerProps) {
  // Drafts are local to this drawer instance. The parent remounts us with a
  // `key={taskId}` when switching tasks, so drafts naturally reset.
  const [commentDraft, setCommentDraft] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const commentScrollRef = useRef<HTMLDivElement>(null);

  if (!task) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg" />
      </Sheet>
    );
  }

  const prog = checklistProgress(task);
  const due = dueLabel(task.dueDate);
  const sprint = SPRINTS.find((s) => s.id === task.sprint);

  const toggleChecklist = (idx: number) => {
    if (!task.checklist) return;
    const checklist = task.checklist.map((c, i) => (i === idx ? { ...c, done: !c.done } : c));
    onUpdate({ ...task, checklist });
  };

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text) return;
    const checklist = [...(task.checklist ?? []), { text, done: false }];
    onUpdate({ ...task, checklist });
    setNewChecklistText("");
  };

  const removeChecklistItem = (idx: number) => {
    if (!task.checklist) return;
    const checklist = task.checklist.filter((_, i) => i !== idx);
    onUpdate({ ...task, checklist });
  };

  const toggleSubtask = (idx: number) => {
    if (!task.subtasks) return;
    const subtasks = task.subtasks.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
    onUpdate({ ...task, subtasks });
  };

  const addSubtask = () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    const subtasks = [...(task.subtasks ?? []), { text, done: false }];
    onUpdate({ ...task, subtasks });
    setNewSubtaskText("");
  };

  const removeSubtask = (idx: number) => {
    if (!task.subtasks) return;
    const subtasks = task.subtasks.filter((_, i) => i !== idx);
    onUpdate({ ...task, subtasks });
  };

  const postComment = () => {
    const text = commentDraft.trim();
    if (!text) return;
    const comments = [
      ...(task.comments ?? []),
      { user: "You", text, date: new Date().toISOString() },
    ];
    onUpdate({ ...task, comments });
    setCommentDraft("");
    toast.success("Comment posted");
    // Scroll to bottom after render
    setTimeout(() => {
      commentScrollRef.current?.scrollTo({
        top: commentScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  const changeStatus = (status: Task["status"]) => {
    const patch: Task = { ...task, status };
    if (status === "Completed" && !task.completedDate) {
      patch.completedDate = new Date().toISOString();
    }
    if (status !== "Completed") {
      patch.completedDate = undefined;
    }
    onUpdate(patch);
    toast.success(`Moved to ${status}`);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {/* Header - title + priority accent + Rean mark */}
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-start gap-2 pr-6">
            <div className={cn("mt-1 h-full w-[3px] shrink-0 self-stretch rounded-full", PRIORITY_ACCENT[task.priority])} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="tabular text-[11px] text-muted-foreground">{task.id}</span>
                {task.isRean && (
                  <span className="flex items-center gap-1 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    Rean
                  </span>
                )}
              </div>
              <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                {task.title}
              </SheetTitle>
              <SheetDescription className="mt-1 text-[12px] text-muted-foreground">
                Created {relativeTime(task.createdDate)}
                {sprint ? ` · ${sprint.name}` : ""}
              </SheetDescription>
            </div>
          </div>

          {/* Status quick-switcher */}
          <div className="mt-3 flex flex-wrap gap-1">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={cn(
                  "rounded-[4px] border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  task.status === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex flex-col gap-4 p-4">
          {/* Description */}
          <Section title="Description" icon={<FileText className="h-3.5 w-3.5" />}>
            <p className="text-[13px] leading-relaxed text-foreground/90">
              {task.description || "No description provided."}
            </p>
          </Section>

          {/* Meta grid */}
          <Section title="Properties" icon={<CircleDot className="h-3.5 w-3.5" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
              <Meta label="Assignee" icon={<User className="h-3 w-3" />}>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                    {initials(task.assignee)}
                  </span>
                  <span className="truncate">{task.assignee}</span>
                </div>
              </Meta>
              <Meta label="Due date" icon={<CalendarClock className="h-3 w-3" />}>
                <span className={cn(due.tone === "overdue" && "font-medium text-foreground")}>
                  {task.dueDate ? formatDate(task.dueDate) : "-"}
                </span>
                {task.dueDate && (
                  <span className="ml-1 text-muted-foreground">({due.text})</span>
                )}
              </Meta>
              <Meta label="Priority" icon={<Flag className="h-3 w-3" />}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", PRIORITY_ACCENT[task.priority])} />
                  {task.priority}
                  <span className="tabular text-muted-foreground">· {PRIORITY_EFFORT[task.priority]} pts</span>
                </span>
              </Meta>
              <Meta label="Department" icon={<Building2 className="h-3 w-3" />}>
                {task.department}
              </Meta>
              <Meta label="Sprint" icon={<GitBranch className="h-3 w-3" />}>
                {sprint ? sprint.name : "-"}
              </Meta>
              <Meta label="Status" icon={<CircleDot className="h-3 w-3" />}>
                <StatusBadge variant={task.status === "Completed" ? "outline" : task.status === "Blocked" ? "solid" : "muted"}>
                  {task.status}
                </StatusBadge>
              </Meta>
            </div>
          </Section>

          {/* Linked entity card */}
          {task.linkedEntity && (
            <Section title="Linked entity" icon={<Link2 className="h-3.5 w-3.5" />}>
              <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-muted/40 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">
                      <span className="tabular">{task.linkedEntity.name}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {task.linkedEntity.type}
                    </div>
                  </div>
                </div>
                <Btn size="sm">Open</Btn>
              </div>
            </Section>
          )}

          {/* Checklist */}
          <Section
            title="Checklist"
            icon={<Check className="h-3.5 w-3.5" />}
            right={
              <span className="tabular text-[11px] text-muted-foreground">
                {prog.done}/{prog.total}
              </span>
            }
          >
            {prog.total > 0 && (
              <div className="mb-2.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    prog.pct === 100 ? "bg-foreground" : "bg-foreground/60",
                  )}
                  style={{ width: `${prog.pct}%` }}
                />
              </div>
            )}
            <div className="space-y-1">
              {(task.checklist ?? []).map((c, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2 rounded-[4px] px-1 py-1 hover:bg-accent/50"
                >
                  <button
                    onClick={() => toggleChecklist(i)}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                      c.done
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-transparent hover:border-foreground/60",
                    )}
                    aria-label={c.done ? "Mark as not done" : "Mark as done"}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-[12px] leading-snug",
                      c.done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {c.text}
                  </span>
                  <button
                    onClick={() => removeChecklistItem(i)}
                    className="text-muted-foreground/40 opacity-0 hover:text-foreground group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                placeholder="Add a checklist item…"
                className="h-7 flex-1 rounded-[4px] border border-border bg-card px-2 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
              />
              <Btn size="sm" icon={<Plus className="h-3 w-3" />} onClick={addChecklistItem}>
                Add
              </Btn>
            </div>
          </Section>

          {/* Subtasks */}
          <Section title="Subtasks" icon={<GitBranch className="h-3.5 w-3.5" />}>
            <div className="space-y-1">
              {(task.subtasks ?? []).map((s, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2 rounded-[4px] px-1 py-1 hover:bg-accent/50"
                >
                  <button
                    onClick={() => toggleSubtask(i)}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      s.done
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-transparent hover:border-foreground/60",
                    )}
                    aria-label={s.done ? "Mark as not done" : "Mark as done"}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-[12px] leading-snug",
                      s.done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {s.text}
                  </span>
                  <button
                    onClick={() => removeSubtask(i)}
                    className="text-muted-foreground/40 opacity-0 hover:text-foreground group-hover:opacity-100"
                    aria-label="Remove subtask"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {(!task.subtasks || task.subtasks.length === 0) && (
                <p className="px-1 py-1 text-[11px] text-muted-foreground/60">No subtasks.</p>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                placeholder="Add a subtask…"
                className="h-7 flex-1 rounded-[4px] border border-border bg-card px-2 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:outline-none"
              />
              <Btn size="sm" icon={<Plus className="h-3 w-3" />} onClick={addSubtask}>
                Add
              </Btn>
            </div>
          </Section>

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <Section
              title="Attachments"
              icon={<Paperclip className="h-3.5 w-3.5" />}
              right={<span className="tabular text-[11px] text-muted-foreground">{task.attachments.length}</span>}
            >
              <div className="grid grid-cols-2 gap-2">
                {task.attachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-[5px] border border-border bg-muted/40 px-2.5 py-2"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-card">
                      {a.type === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : a.type === "sheet" ? (
                        <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-medium text-foreground">{a.name}</div>
                      <div className="tabular text-[10px] text-muted-foreground">{a.size}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[5px] border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                <Paperclip className="h-3 w-3" />
                Attach file
              </button>
            </Section>
          )}

          {/* Comments */}
          <Section
            title="Comments"
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            right={
              <span className="tabular text-[11px] text-muted-foreground">
                {(task.comments ?? []).length}
              </span>
            }
          >
            <div
              ref={commentScrollRef}
              className="mb-3 max-h-64 space-y-2.5 overflow-y-auto scrollbar-thin pr-1"
            >
              {(task.comments ?? []).map((c, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                    {c.user === "Rean" ? <Sparkles className="h-3 w-3" /> : initials(c.user)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-foreground">{c.user}</span>
                      <span className="text-[10px] text-muted-foreground">{relativeTime(c.date)}</span>
                    </div>
                    <p className="text-[12px] leading-snug text-foreground/90">{c.text}</p>
                  </div>
                </div>
              ))}
              {(!task.comments || task.comments.length === 0) && (
                <p className="py-2 text-center text-[11px] text-muted-foreground/60">No comments yet.</p>
              )}
            </div>
            <div className="rounded-[5px] border border-border bg-card">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Write a comment…"
                rows={2}
                className="w-full resize-none rounded-t-[5px] bg-transparent px-2.5 py-2 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {formatShortDate(new Date().toISOString())}
                </span>
                <Btn size="sm" icon={<Send className="h-3 w-3" />} onClick={postComment}>
                  Post
                </Btn>
              </div>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Small primitives =====
function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Meta({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

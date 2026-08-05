"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Issue, IssueSeverity, IssueStatus } from "@/lib/types";
import { ISSUE_SEVERITIES, ISSUE_STATUSES, ISSUE_SOURCES } from "./_helpers";

/**
 * EditIssueDrawer - focused editor for an existing Issue.
 * Hick's Law: 8 fields (title, vehicle, severity, status, source, assignee,
 * description, resolution date).
 */
interface EditIssueDrawerProps {
  open: boolean;
  onClose: () => void;
  issue?: Issue | null;
  onUpdate?: (id: string, data: Partial<Issue>) => void;
}

interface EditForm {
  title: string;
  vehicle: string;
  severity: IssueSeverity;
  status: IssueStatus;
  source: Issue["source"];
  assignee: string;
  description: string;
  resolutionDate: string;
}

function fromIssue(i: Issue): EditForm {
  return {
    title: i.title,
    vehicle: i.vehicle ?? "",
    severity: i.severity,
    status: i.status,
    source: i.source,
    assignee: i.assignee,
    description: i.description,
    resolutionDate: i.resolutionDate ? i.resolutionDate.slice(0, 10) : "",
  };
}

function toPatch(form: EditForm): Partial<Issue> {
  return {
    title: form.title.trim(),
    vehicle: form.vehicle.trim() || undefined,
    severity: form.severity,
    status: form.status,
    source: form.source,
    assignee: form.assignee.trim(),
    description: form.description.trim(),
    resolutionDate: form.resolutionDate
      ? new Date(form.resolutionDate).toISOString()
      : undefined,
  };
}

const EMPTY_ISSUE: Issue = {
  id: "",
  issueId: "",
  title: "",
  severity: "Medium",
  reporter: "-",
  assignee: "-",
  status: "Open",
  createdDate: new Date().toISOString(),
  source: "Manual",
  description: "",
};

export function EditIssueDrawer({
  open,
  onClose,
  issue,
  onUpdate,
}: EditIssueDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    issue ? fromIssue(issue) : fromIssue(EMPTY_ISSUE),
  );

  useEffect(() => {
    if (!open) return;
    if (issue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromIssue(issue));
    }
  }, [open, issue?.id, issue]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!issue) return;
    if (!form.title.trim()) {
      toast("Title is required");
      return;
    }
    if (onUpdate) {
      onUpdate(issue.id, toPatch(form));
      toast.success("Issue updated", {
        description: `${issue.issueId} · ${form.severity}`,
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Edit Issue
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {issue ? `${issue.issueId} · ${issue.title}` : "Update issue"}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Input
                value={form.vehicle}
                onChange={(e) => update("vehicle", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Assignee</Label>
              <Input
                value={form.assignee}
                onChange={(e) => update("assignee", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => update("severity", v as IssueSeverity)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as IssueStatus)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => update("source", v as Issue["source"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resolution Date</Label>
              <Input
                type="date"
                value={form.resolutionDate}
                onChange={(e) => update("resolutionDate", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="rounded-[5px] text-[13px]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
          >
            Save Changes
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Btn } from "@/components/shared/btn";
import { useSuperadminStore } from "./_store";
import {
  DEPARTMENTS,
  TICKET_CATEGORIES,
  type DepartmentId,
  type TicketPriority,
  type TicketSource,
} from "./_data";
import { FieldLabel } from "./_helpers";
import { Tag, Send } from "lucide-react";

/* ============================================================
   TicketCreateDialog - modal form for raising a new ticket on
   behalf of an org / contact. Calls store.createTicket, then
   surfaces a toast and hands the new ticket id back to the
   parent so the detail drawer can auto-open.

   Monochrome Swiss: hairline borders, 6px radius on the dialog,
   5px on inputs, 3px on chips. Tabular nums everywhere a digit
   appears. No coloured accents.
   ============================================================ */

const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
const SOURCES: TicketSource[] = ["Org Panel", "Email", "Phone", "Rean AI", "Direct"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (ticketId: string) => void;
}

export function TicketCreateDialog({ open, onOpenChange, onCreated }: Props) {
  // The inner form is mounted fresh every time the dialog opens, so its
  // useState initialisers fire on each open and we never carry stale form
  // state between sessions. This avoids the set-state-in-effect code smell.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 rounded-[6px] border-border bg-background p-0 sm:max-w-2xl">
        {open ? (
          <TicketCreateForm onOpenChange={onOpenChange} onCreated={onCreated} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TicketCreateForm({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (v: boolean) => void;
  onCreated: (ticketId: string) => void;
}) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const createTicket = useSuperadminStore((s) => s.createTicket);

  // Form state - initialisers run on each mount (i.e. each open).
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0]);
  const [department, setDepartment] = useState<DepartmentId>("technical");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [orgId, setOrgId] = useState<string>(() => orgs[0]?.id ?? "");
  const [raisedBy, setRaisedBy] = useState("");
  const [raisedByEmail, setRaisedByEmail] = useState("");
  const [raisedByPhone, setRaisedByPhone] = useState("");
  const [raisedByRole, setRaisedByRole] = useState("");
  const [source, setSource] = useState<TicketSource>("Org Panel");
  const [tagsInput, setTagsInput] = useState("");

  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === orgId),
    [orgs, orgId],
  );

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const valid =
    subject.trim().length >= 4 &&
    description.trim().length >= 8 &&
    !!orgId &&
    raisedBy.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raisedByEmail.trim());

  function handleSubmit() {
    if (!valid || !selectedOrg) {
      toast("Cannot create ticket", {
        description: "Fill subject, description, org and a valid contact email.",
      });
      return;
    }
    const id = createTicket({
      subject: subject.trim(),
      description: description.trim(),
      category,
      department,
      priority,
      orgId: selectedOrg.id,
      orgName: selectedOrg.brandName || selectedOrg.legalName,
      raisedBy: raisedBy.trim(),
      raisedByEmail: raisedByEmail.trim(),
      raisedByPhone: raisedByPhone.trim() || undefined,
      raisedByRole: raisedByRole.trim() || undefined,
      source,
      tags,
    });
    toast.success("Ticket created", {
      description: `${category} - ${department} - ${priority}`,
    });
    onOpenChange(false);
    onCreated(id);
  }

  return (
    <>
      <DialogHeader className="border-b border-border px-4 py-3">
        <DialogTitle className="text-[14px] font-medium text-foreground">
          New support ticket
        </DialogTitle>
        <DialogDescription className="text-[12px] text-muted-foreground">
          Raise a ticket on behalf of an org contact. SLA is derived from priority.
        </DialogDescription>
      </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-4 py-4">
          {/* Subject + description */}
          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel required hint="min 4 chars">
                Subject
              </FieldLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                className="h-9 rounded-[5px] border-border bg-background text-[13px]"
              />
            </div>
            <div>
              <FieldLabel required hint="min 8 chars">
                Description
              </FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full context - what is happening, expected behaviour, steps to reproduce."
                className="min-h-[88px] rounded-[5px] border-border bg-background text-[13px]"
              />
            </div>
          </div>

          {/* Categorisation row */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[5px] border-border bg-popover">
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-[13px]">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Department</FieldLabel>
              <Select value={department} onValueChange={(v) => setDepartment(v as DepartmentId)}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[5px] border-border bg-popover">
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-[13px]">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint="SLA: 1h / 4h / 24h / 72h">Priority</FieldLabel>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[5px] border-border bg-popover">
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="text-[13px]">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Org + source */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required hint="tenant">
                Organisation
              </FieldLabel>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue placeholder="Select org" />
                </SelectTrigger>
                <SelectContent className="rounded-[5px] border-border bg-popover max-h-64">
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-[13px]">
                      <span className="truncate">{o.brandName || o.legalName}</span>
                      <span className="ml-2 text-[11px] text-muted-foreground tabular">
                        {o.plan}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Source</FieldLabel>
              <Select value={source} onValueChange={(v) => setSource(v as TicketSource)}>
                <SelectTrigger className="h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[5px] border-border bg-popover">
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="text-[13px]">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Raised-by contact */}
          <div className="mt-4 rounded-[6px] border border-border bg-card px-3 py-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Raised by</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>Contact name</FieldLabel>
                <Input
                  value={raisedBy}
                  onChange={(e) => setRaisedBy(e.target.value)}
                  placeholder="e.g. Ramesh Kulkarni"
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <Input
                  type="email"
                  value={raisedByEmail}
                  onChange={(e) => setRaisedByEmail(e.target.value)}
                  placeholder="name@org.in"
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <FieldLabel hint="optional">Phone</FieldLabel>
                <Input
                  value={raisedByPhone}
                  onChange={(e) => setRaisedByPhone(e.target.value)}
                  placeholder="+91 ..."
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <FieldLabel hint="optional">Role at org</FieldLabel>
                <Input
                  value={raisedByRole}
                  onChange={(e) => setRaisedByRole(e.target.value)}
                  placeholder="Owner / Dispatcher / Accountant"
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <FieldLabel hint="comma separated">Tags</FieldLabel>
            <div className="relative">
              <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. e-invoice, gst, regression"
                className="h-9 rounded-[5px] border-border bg-background pl-8 text-[13px]"
              />
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      <DialogFooter className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground tabular">
            {selectedOrg
              ? `Org: ${selectedOrg.brandName || selectedOrg.legalName}`
              : "No org selected"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-[5px] border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent"
            >
              Cancel
            </button>
            <Btn
              variant="primary"
              size="sm"
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={handleSubmit}
              disabled={!valid}
            >
              Create ticket
            </Btn>
          </div>
        </div>
      </DialogFooter>
    </>
  );
}

export default TicketCreateDialog;

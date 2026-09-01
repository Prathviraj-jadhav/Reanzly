"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSuperadminStore } from "./_store";
import {
  DEPARTMENTS,
  departmentById,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  type DepartmentId,
  type TicketComment,
} from "./_data";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  FieldLabel,
  DetailRow,
} from "./_helpers";
import {
  Clock,
  AlertTriangle,
  Send,
  Lock,
  Building2,
  Mail,
  Phone,
  User,
  Tag as TagIcon,
  MessageSquare,
  Route,
  CornerDownRight,
} from "lucide-react";

/* ============================================================
   TicketDetailDrawer - right-side Sheet with full ticket info,
   routing / priority / status / assignee controls, comments
   thread and reply composer.

   Read-only mode (canAccess === "read") hides the controls and
   disables the composer. View + read still allowed.
   ============================================================ */

const STATUSES: TicketStatus[] = [
  "New",
  "Open",
  "In Progress",
  "Waiting on Customer",
  "Resolved",
  "Closed",
];
const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

/** Format an SLA countdown from a future (or past) ISO date.
 *  Returns { label, breached }. */
function formatSla(iso: string): { label: string; breached: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  const breached = diff < 0;
  const ms = Math.abs(diff);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  let label: string;
  if (days >= 1) label = `${days}d ${hours}h`;
  else if (hours >= 1) label = `${hours}h ${mins}m`;
  else label = `${mins}m`;
  return { label: breached ? `Breached by ${label}` : `${label} left`, breached };
}

/** Map ticket priority to a StatusBadge variant. Monochrome only. */
export function priorityBadgeVariant(p: TicketPriority) {
  if (p === "Urgent") return { variant: "solid" as const, pulse: true };
  if (p === "High") return { variant: "outline" as const };
  if (p === "Medium") return { variant: "muted" as const };
  return { variant: "muted" as const };
}

/** Map ticket status to a StatusBadge variant. Monochrome only. */
export function statusBadgeVariant(s: TicketStatus) {
  switch (s) {
    case "New":
      return { variant: "solid" as const, pulse: true };
    case "Open":
    case "In Progress":
      return { variant: "outline" as const };
    case "Waiting on Customer":
      return { variant: "muted" as const };
    case "Resolved":
      return { variant: "outline" as const };
    case "Closed":
      return { variant: "muted" as const };
    default:
      return { variant: "outline" as const };
  }
}

interface Props {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  readOnly: boolean;
}

export function TicketDetailDrawer({ ticket, open, onOpenChange, readOnly }: Props) {
  const ticketComments = useSuperadminStore((s) => s.ticketComments);
  const internalStaff = useSuperadminStore((s) => s.internalStaff);
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const routeTicket = useSuperadminStore((s) => s.routeTicket);
  const setTicketStatus = useSuperadminStore((s) => s.setTicketStatus);
  const setTicketPriority = useSuperadminStore((s) => s.setTicketPriority);
  const assignTicket = useSuperadminStore((s) => s.assignTicket);
  const addTicketComment = useSuperadminStore((s) => s.addTicketComment);

  const [replyMode, setReplyMode] = useState<"customer" | "internal">("customer");
  const [replyBody, setReplyBody] = useState("");
  const [commentsFilter, setCommentsFilter] = useState<"all" | "external">("all");

  // Comments for this ticket (sorted oldest-first so the thread reads
  // naturally top to bottom).
  const comments: TicketComment[] = useMemo(() => {
    if (!ticket) return [];
    return ticketComments
      .filter((c) => c.ticketId === ticket.id)
      .filter((c) => (commentsFilter === "external" ? !c.isInternal : true))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [ticketComments, ticket, commentsFilter]);

  // Staff who can be assigned to this ticket - those whose `departments`
  // array includes the ticket's current department. The department lead
  // is rendered first as the suggested assignee.
  const assignableStaff = useMemo(() => {
    if (!ticket) return [];
    const dept = ticket.department;
    return internalStaff
      .filter((s) => s.departments.includes(dept) && s.status === "Active")
      .sort((a, b) => {
        const aLead = departmentById(dept)?.lead === a.email ? 0 : 1;
        const bLead = departmentById(dept)?.lead === b.email ? 0 : 1;
        return aLead - bLead;
      });
  }, [internalStaff, ticket]);

  if (!ticket) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] border-border bg-background p-0" />
      </Sheet>
    );
  }

  const sla = formatSla(ticket.slaDueAt);
  const slaBreached =
    sla.breached && ticket.status !== "Resolved" && ticket.status !== "Closed";
  const dept = departmentById(ticket.department);

  function handleRoute(newDept: DepartmentId) {
    if (!ticket) return;
    if (newDept === ticket.department) return;
    routeTicket(ticket.id, newDept);
    const lead = departmentById(newDept)?.lead;
    toast.success("Ticket routed", {
      description: `${ticket.ticketId} -> ${departmentById(newDept)?.label}. Suggested assignee: ${lead ?? "n/a"}`,
    });
  }

  function handlePriority(p: TicketPriority) {
    if (!ticket) return;
    setTicketPriority(ticket.id, p);
    toast.success(`Priority set to ${p}`, { description: ticket.ticketId });
  }

  function handleStatus(s: TicketStatus) {
    if (!ticket) return;
    setTicketStatus(ticket.id, s);
    toast.success(`Status -> ${s}`, { description: ticket.ticketId });
  }

  function handleAssign(email: string) {
    if (!ticket) return;
    assignTicket(ticket.id, email);
    toast.success("Ticket assigned", { description: `${ticket.ticketId} -> ${email}` });
  }

  function handleReply() {
    if (!ticket || !currentStaff) return;
    const body = replyBody.trim();
    if (!body) {
      toast("Reply is empty", { description: "Type a message before sending." });
      return;
    }
    addTicketComment({
      ticketId: ticket.id,
      author: currentStaff.name,
      authorEmail: currentStaff.email,
      authorRole: "staff",
      body,
      isInternal: replyMode === "internal",
    });
    toast.success(replyMode === "internal" ? "Internal note added" : "Reply sent to customer", {
      description: ticket.ticketId,
    });
    setReplyBody("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-border bg-background p-0 sm:max-w-[560px]"
      >
        {/* Header */}
        <SheetHeader className="gap-1 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular text-foreground">
              {ticket.ticketId}
            </span>
            <StatusBadge variant={statusBadgeVariant(ticket.status).variant} pulse={statusBadgeVariant(ticket.status).pulse}>
              {ticket.status}
            </StatusBadge>
            <StatusBadge variant={priorityBadgeVariant(ticket.priority).variant} pulse={priorityBadgeVariant(ticket.priority).pulse}>
              {ticket.priority}
            </StatusBadge>
          </div>
          <SheetTitle className="text-[15px] font-medium leading-tight text-foreground">
            {ticket.subject}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="tabular">{ticket.category}</span>
            <span>-</span>
            <span className="capitalize">{ticket.department}</span>
            <span>-</span>
            <span>{ticket.source}</span>
          </SheetDescription>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <Clock className={cn("h-3 w-3", slaBreached ? "text-foreground" : "text-muted-foreground")} />
            <span
              className={cn(
                "tabular font-medium",
                slaBreached ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {sla.label}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Due {formatDateTime(ticket.slaDueAt)}
            </span>
          </div>
        </SheetHeader>

        {/* Body scroll area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Description */}
          <section className="border-b border-border px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>Description</span>
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
              {ticket.description}
            </p>
            {ticket.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <TagIcon className="h-3 w-3 text-muted-foreground" />
                {ticket.tags.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Meta grid */}
          <section className="border-b border-border px-4 py-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Ticket details
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <DetailRow label="Department" value={dept?.label ?? ticket.department} />
              <DetailRow label="Priority" value={ticket.priority} />
              <DetailRow label="Status" value={ticket.status} />
              <DetailRow label="Source" value={ticket.source} />
              <DetailRow label="Created" value={formatDate(ticket.createdAt)} />
              <DetailRow label="Updated" value={relativeTime(ticket.updatedAt)} />
              {ticket.resolvedAt && (
                <DetailRow label="Resolved" value={formatDate(ticket.resolvedAt)} />
              )}
              <DetailRow
                label="Assigned to"
                value={ticket.assignedTo ?? "Unassigned"}
                mono
              />
            </div>
          </section>

          {/* Raised-by contact */}
          <section className="border-b border-border px-4 py-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Raised by
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <DetailRow
                label="Name"
                value={
                  <span className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {ticket.raisedBy}
                  </span>
                }
              />
              <DetailRow
                label="Role"
                value={ticket.raisedByRole ?? "-"}
              />
              <DetailRow
                label="Email"
                value={
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {ticket.raisedByEmail}
                  </span>
                }
              />
              <DetailRow
                label="Phone"
                value={
                  ticket.raisedByPhone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="tabular">{ticket.raisedByPhone}</span>
                    </span>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow
                label="Organisation"
                value={
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {ticket.orgName}
                  </span>
                }
              />
            </div>
          </section>

          {/* Controls (write-only) */}
          {!readOnly && (
            <section className="border-b border-border px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Route className="h-3 w-3" />
                <span>Triage controls</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Route to</FieldLabel>
                  <Select value={ticket.department} onValueChange={(v) => handleRoute(v as DepartmentId)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] border-border bg-popover max-h-64">
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-[12px]">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <Select value={ticket.priority} onValueChange={(v) => handlePriority(v as TicketPriority)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] border-border bg-popover">
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p} className="text-[12px]">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={ticket.status} onValueChange={(v) => handleStatus(v as TicketStatus)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] border-border bg-popover">
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="text-[12px]">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel hint={dept?.lead ? `lead: ${dept.lead}` : undefined}>
                    Assign to
                  </FieldLabel>
                  <Select
                    value={ticket.assignedTo ?? "__unassigned__"}
                    onValueChange={(v) => handleAssign(v === "__unassigned__" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] border-border bg-background text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] border-border bg-popover max-h-64">
                      <SelectItem value="__unassigned__" className="text-[12px] text-muted-foreground">
                        Unassigned
                      </SelectItem>
                      {assignableStaff.map((s) => (
                        <SelectItem key={s.id} value={s.email} className="text-[12px]">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate">{s.name}</span>
                            {dept?.lead === s.email && (
                              <span className="rounded-[3px] bg-muted px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
                                lead
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          )}

          {/* Comments thread */}
          <section className="border-b border-border px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>Thread</span>
                <span className="tabular normal-case text-muted-foreground">
                  {comments.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCommentsFilter("all")}
                  className={cn(
                    "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium transition-colors tap",
                    commentsFilter === "all"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setCommentsFilter("external")}
                  className={cn(
                    "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium transition-colors tap",
                    commentsFilter === "external"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Customer-visible
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {comments.length === 0 ? (
                <div className="flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-muted/30 px-3 py-4 text-[12px] text-muted-foreground">
                  <CornerDownRight className="h-3.5 w-3.5" />
                  No comments yet. Reply below to start the conversation.
                </div>
              ) : (
                <ol className="flex flex-col gap-2">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className={cn(
                        "rounded-[5px] border px-3 py-2",
                        c.isInternal
                          ? "border-dashed border-border bg-muted/40"
                          : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              c.authorRole === "staff" ? "bg-foreground" : "bg-muted-foreground",
                            )}
                          />
                          <span className="text-[12px] font-medium text-foreground">
                            {c.author}
                          </span>
                          {c.isInternal && (
                            <span className="rounded-[3px] bg-muted px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
                              <Lock className="mr-0.5 inline h-2.5 w-2.5" />
                              internal
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {c.authorRole === "staff" ? "staff" : "customer"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular">
                          {relativeTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                        {c.body}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        {/* Reply composer (footer) */}
        {!readOnly && currentStaff ? (
          <div className="border-t border-border bg-card px-4 py-3">
            <Tabs value={replyMode} onValueChange={(v) => setReplyMode(v as "customer" | "internal")}>
              <TabsList className="h-7 rounded-[5px] bg-muted p-0.5">
                <TabsTrigger
                  value="customer"
                  className="h-6 rounded-[3px] px-2.5 text-[11px] font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Send className="mr-1 h-3 w-3" />
                  Reply to customer
                </TabsTrigger>
                <TabsTrigger
                  value="internal"
                  className="h-6 rounded-[3px] px-2.5 text-[11px] font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Lock className="mr-1 h-3 w-3" />
                  Add internal note
                </TabsTrigger>
              </TabsList>
              <TabsContent value="customer" className="mt-2">
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply to the customer. This will be visible to them."
                  className="min-h-[72px] rounded-[5px] border-border bg-background text-[13px]"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Visible to customer
                  </span>
                  <Btn
                    variant="primary"
                    size="sm"
                    icon={<Send className="h-3.5 w-3.5" />}
                    onClick={handleReply}
                  >
                    Send reply
                  </Btn>
                </div>
              </TabsContent>
              <TabsContent value="internal" className="mt-2">
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Internal note - only Reanzly staff can see this. Use for handoffs, RCA notes, audit context."
                  className="min-h-[72px] rounded-[5px] border-border bg-background text-[13px]"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    Internal only - not visible to customer
                  </span>
                  <Btn
                    variant="outline"
                    size="sm"
                    icon={<Lock className="h-3.5 w-3.5" />}
                    onClick={handleReply}
                  >
                    Add note
                  </Btn>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-[11px] text-muted-foreground">
              Read-only access. You can view this ticket but not modify it.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default TicketDetailDrawer;

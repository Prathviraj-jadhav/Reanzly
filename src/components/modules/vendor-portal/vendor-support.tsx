"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Link2,
  Lock,
  X,
  Send,
  Inbox,
  User,
} from "lucide-react";
import {
  relativeTime,
  ticketStatusBadge,
  ticketPriorityBadge,
  type TicketPriority,
  type TicketStatus,
  type TicketCategory,
} from "./_helpers";
import { toastSuccess, toastInfo } from "@/lib/toast";

/* ============================================================
   VendorSupport - the vendor's support-ticket workspace.
   ------------------------------------------------------------
   Backed by GET/POST /api/vendor-portal/tickets (real
   SupportTicket rows) and POST .../[id]/messages (real
   TicketMessage replies) - the message thread shown in the
   detail sheet is the real thread, not a synthesized one.
   ============================================================ */

const PRIORITY_OPTIONS: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
const CATEGORY_OPTIONS: TicketCategory[] = [
  "Invoice Dispute",
  "POD Issue",
  "Tracking",
  "Payment",
  "Rate Query",
  "Documentation",
  "Other",
];

interface TicketMessageDTO { id: string; fromName: string; fromRole: string; body: string; createdAt: string }
interface PortalTicket {
  id: string; ticketNumber: string; subject: string; category: string; priority: string; status: string;
  createdAt: string; lastReplyAt?: string; lastReplyBy?: string; messageCount: number; linkedRef?: string;
  description: string; messages: TicketMessageDTO[];
}

export function VendorSupport() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [accountManager, setAccountManager] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [viewing, setViewing] = useState<PortalTicket | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/vendor-portal/tickets").then((r) => (r.ok ? r.json() : { tickets: [] })),
      fetch("/api/vendor-portal/profile").then((r) => (r.ok ? r.json() : { profile: null })),
    ])
      .then(([t, p]) => {
        setTickets(t.tickets ?? []);
        setAccountManager(p.profile?.accountManager ?? "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const kpis = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const awaitingReply = tickets.filter((t) => t.status === "Awaiting Reply").length;
    const inProgress = tickets.filter((t) => t.status === "In Progress").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    const closed = tickets.filter((t) => t.status === "Closed").length;
    const urgentOpen = tickets.filter((t) => t.priority === "Urgent" && t.status !== "Closed" && t.status !== "Resolved").length;
    const resolvedTickets = tickets.filter((t) => (t.status === "Resolved" || t.status === "Closed") && t.lastReplyAt);
    const avgResolutionDays = resolvedTickets.length
      ? Math.round(
          resolvedTickets.reduce((s, t) => s + (new Date(t.lastReplyAt!).getTime() - new Date(t.createdAt).getTime()) / 86400000, 0) /
            resolvedTickets.length,
        )
      : 0;
    return { total, open, awaitingReply, inProgress, resolved, closed, urgentOpen, avgResolutionDays };
  }, [tickets]);

  const columns: Column<PortalTicket>[] = [
    {
      key: "ticketNumber",
      header: "Ticket #",
      sortable: true,
      sortValue: (r) => r.ticketNumber,
      sticky: true,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setViewing(r);
          }}
          className="tabular text-[12.5px] font-medium text-foreground hover:underline underline-offset-4"
        >
          {r.ticketNumber}
        </button>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      sortValue: (r) => r.subject,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground">{r.subject}</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {r.category}
              {r.linkedRef && (
                <>
                  <span className="mx-1">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Link2 className="h-2.5 w-2.5" />
                    <span className="tabular">{r.linkedRef}</span>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (r) => r.priority,
      hideOnMobile: true,
      render: (r) => {
        const b = ticketPriorityBadge(r.priority as TicketPriority);
        return (
          <StatusBadge variant={b.variant} pulse={b.pulse}>
            {r.priority === "Urgent" && <Flame className="h-2.5 w-2.5" />}
            {r.priority}
          </StatusBadge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const b = ticketStatusBadge(r.status as TicketStatus);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortValue: (r) => r.createdAt,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular text-[12px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {relativeTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "lastReplyAt",
      header: "Last reply",
      sortable: true,
      sortValue: (r) => r.lastReplyAt ?? r.createdAt,
      hideOnMobile: true,
      render: (r) => (
        <div className="flex flex-col leading-tight">
          {r.lastReplyAt ? (
            <span className="tabular text-[11.5px] text-muted-foreground">{relativeTime(r.lastReplyAt)}</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">No replies yet</span>
          )}
          {r.lastReplyBy && (
            <span className="truncate text-[10px] text-muted-foreground">by {r.lastReplyBy}</span>
          )}
        </div>
      ),
    },
    {
      key: "messageCount",
      header: "Msgs",
      sortable: true,
      sortValue: (r) => r.messageCount,
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular text-[12px] text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          {r.messageCount}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        title="Support"
        description="Raise and track support tickets against Reanzly. Replies come from your account manager or the Reanzly support team."
        meta={[
          { label: "Total:", value: kpis.total },
          { label: "Open:", value: kpis.open },
          { label: "Awaiting reply:", value: kpis.awaitingReply },
          { label: "Avg resolution:", value: `${kpis.avgResolutionDays}d` },
        ]}
        actions={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New ticket
          </Btn>
        }
        context={
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <LifeBuoy className="h-3 w-3" />
            Customer support
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Inbox className="h-3.5 w-3.5" />} label="Total tickets" value={String(kpis.total)} hint="all-time" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Open" value={String(kpis.open)} hint={`${kpis.urgentOpen} urgent`} />
        <KpiTile icon={<MessageSquare className="h-3.5 w-3.5" />} label="Awaiting reply" value={String(kpis.awaitingReply)} hint="from support" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="In progress" value={String(kpis.inProgress)} hint="being investigated" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resolved (30d)" value={String(kpis.resolved)} hint={`${kpis.closed} closed`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Avg resolution" value={`${kpis.avgResolutionDays}d`} hint="across resolved tickets" />
      </div>

      {/* Tickets table */}
      <SectionCard
        title={`Tickets (${tickets.length})`}
        description="Click any ticket to view the message thread. Use 'New ticket' to raise a fresh issue."
        icon={<LifeBuoy className="h-4 w-4" />}
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New ticket
          </Btn>
        }
        flush
        bodyClassName="p-0"
      >
        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading tickets…</div>
        ) : (
          <DataTable
            data={tickets}
            columns={columns}
            searchKeys={["ticketNumber", "subject", "category", "linkedRef"]}
            searchPlaceholder="Search ticket #, subject, ref..."
            onRowClick={(r) => setViewing(r)}
            pageSize={10}
            initialSort={{ key: "createdAt", dir: "desc" }}
            stickyFirstColumn
            emptyTitle="No tickets"
            emptyDescription="You haven't raised any support tickets yet."
          />
        )}
      </SectionCard>

      {/* SLA + read-only note */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium text-foreground">SLA:</span> Urgent = 2h first response · High = 8h · Medium = 1 business day · Low = 2 business days.
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Replies from Reanzly staff are read-only. Your account manager is <span className="font-medium text-foreground">{accountManager || "-"}</span>.
          </span>
        </div>
      </div>

      {/* Detail sheet */}
      <TicketDetailSheet
        key={`ticket-${viewing?.id ?? "closed"}`}
        ticket={viewing}
        onClose={() => setViewing(null)}
        onAddReply={async (t, body) => {
          const res = await fetch(`/api/vendor-portal/tickets/${t.id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!res.ok) {
            toastInfo("Reply not sent", "Could not send your reply.");
            return;
          }
          const { message } = await res.json();
          setTickets((prev) =>
            prev.map((x) =>
              x.id === t.id
                ? {
                    ...x,
                    messages: [...x.messages, message],
                    messageCount: x.messageCount + 1,
                    lastReplyAt: message.createdAt,
                    lastReplyBy: message.fromName,
                    status: x.status === "Resolved" || x.status === "Closed" ? "Open" : "Awaiting Reply",
                  }
                : x,
            ),
          );
          setViewing(null);
          toastInfo("Reply sent", `${t.ticketNumber} · Support will respond within the SLA window.`);
        }}
      />

      {/* New ticket sheet */}
      <NewTicketSheet
        key={`new-ticket-${creating ? "open" : "closed"}`}
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (payload) => {
          const res = await fetch("/api/vendor-portal/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            toastInfo("Ticket not raised", "Could not raise the ticket.");
            return;
          }
          const { ticket } = await res.json();
          setTickets((prev) => [ticket, ...prev]);
          setCreating(false);
          toastSuccess(
            "Ticket raised",
            `${ticket.ticketNumber} · ${payload.category} · ${payload.priority} priority. Your account manager will respond within SLA.`,
          );
        }}
      />
    </div>
  );
}

/* ============================================================
   TicketDetailSheet - read-only ticket detail with thread.
   ============================================================ */

interface TicketDetailSheetProps {
  ticket: PortalTicket | null;
  onClose: () => void;
  onAddReply: (ticket: PortalTicket, body: string) => void | Promise<void>;
}

function TicketDetailSheet({ ticket, onClose, onAddReply }: TicketDetailSheetProps) {
  const open = ticket !== null;
  const b = ticket ? ticketStatusBadge(ticket.status as TicketStatus) : null;
  const pb = ticket ? ticketPriorityBadge(ticket.priority as TicketPriority) : null;
  // The parent remounts this sheet via `key={ticket?.id}` whenever a different
  // ticket is opened, so this useState initialiser re-runs cleanly each open.
  const [reply, setReply] = useState("");

  const handleSendReply = () => {
    if (!ticket || !reply.trim()) return;
    onAddReply(ticket, reply.trim());
    setReply("");
  };

  const thread = ticket ? ticket.messages : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showCloseButton={false}>
        {ticket && b && pb && (
          <>
            <SheetHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                  <span className="tabular">{ticket.ticketNumber}</span>
                </SheetTitle>
                <SheetDescription className="text-[12px] text-muted-foreground">
                  {ticket.subject}
                </SheetDescription>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={pb.variant} pulse={pb.pulse}>
                    {ticket.priority === "Urgent" && <Flame className="h-2.5 w-2.5" />}
                    {ticket.priority} priority
                  </StatusBadge>
                  <StatusBadge variant={b.variant} pulse={b.pulse}>{ticket.status}</StatusBadge>
                  <StatusBadge variant="muted">{ticket.category}</StatusBadge>
                  {ticket.linkedRef && (
                    <StatusBadge variant="outline">
                      <Link2 className="h-2.5 w-2.5" />
                      <span className="tabular">{ticket.linkedRef}</span>
                    </StatusBadge>
                  )}
                </div>
              </div>
              <SheetClose asChild>
                <button
                  onClick={onClose}
                  className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </SheetHeader>

            {/* Body */}
            <div className="flex flex-col gap-4 p-4">
              {/* Meta strip */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetaCell icon={<Clock className="h-3 w-3" />} label="Opened" value={relativeTime(ticket.createdAt)} />
                <MetaCell icon={<MessageSquare className="h-3 w-3" />} label="Messages" value={String(ticket.messageCount)} />
                <MetaCell icon={<User className="h-3 w-3" />} label="Last by" value={ticket.lastReplyBy ?? "-"} />
                <MetaCell icon={<Clock className="h-3 w-3" />} label="Last reply" value={ticket.lastReplyAt ? relativeTime(ticket.lastReplyAt) : "-"} />
              </div>

              {/* Message thread */}
              <SectionCard
                title={`Message thread (${thread.length})`}
                description="Oldest to newest."
                icon={<MessageSquare className="h-4 w-4" />}
                flush
                bodyClassName="p-0"
              >
                <ol className="divide-y divide-border">
                  {thread.map((m) => {
                    const isVendor = m.fromRole === "customer";
                    return (
                      <li key={m.id} className="flex flex-col gap-1 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                            <span
                              className={
                                "flex h-5 w-5 items-center justify-center rounded-[3px] text-[9px] font-medium " +
                                (isVendor ? "bg-foreground text-background" : "border border-border bg-background text-muted-foreground")
                              }
                            >
                              {m.fromName[0]}
                            </span>
                            {m.fromName}
                          </span>
                          <span className="tabular text-[10px] text-muted-foreground">{relativeTime(m.createdAt)}</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-foreground" style={{ paddingLeft: 26 }}>
                          {m.body}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </SectionCard>

              {/* Reply box */}
              {ticket.status !== "Closed" && ticket.status !== "Resolved" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reply" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Add a reply
                  </Label>
                  <Textarea
                    id="reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder="Type your reply to the support team..."
                    className="rounded-[5px] text-[12.5px]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Replies reopen the ticket and reset the SLA clock.
                    </span>
                    <Btn variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} disabled={!reply.trim()} onClick={handleSendReply}>
                      Send reply
                    </Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Replies from Reanzly are read-only
              </div>
              <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   NewTicketSheet - vendor raises a new support ticket.
   ============================================================ */

interface NewTicketPayload {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  linkedRef?: string;
  description: string;
}

interface NewTicketSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: NewTicketPayload) => void | Promise<void>;
}

function NewTicketSheet({ open, onClose, onSubmit }: NewTicketSheetProps) {
  // The parent remounts this sheet via `key={open ? 'open' : 'closed'}` so
  // the form state resets cleanly every time the sheet opens. Initialisers
  // re-run on each mount.
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Invoice Dispute");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [linkedRef, setLinkedRef] = useState("");
  const [description, setDescription] = useState("");

  const canSubmit = subject.trim().length > 2 && description.trim().length > 5;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ subject: subject.trim(), category, priority, linkedRef: linkedRef.trim(), description: description.trim() });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
              New support ticket
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Raise a fresh issue. Your account manager will respond within SLA.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <button
              onClick={onClose}
              className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetClose>
        </SheetHeader>

        {/* Body */}
        <div className="flex flex-col gap-4 p-4">
          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Subject <span className="text-foreground">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Invoice INV-2025-0042 amount mismatch"
              className="h-9 rounded-[5px] text-[13px]"
            />
            <p className="text-[10px] text-muted-foreground">Be specific - the subject becomes the ticket title.</p>
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger id="category" className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger id="priority" className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SLA hint based on priority */}
          <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">SLA for {priority}:</span>{" "}
            {priority === "Urgent" ? "2 hours first response" :
              priority === "High" ? "8 hours first response" :
                priority === "Medium" ? "1 business day" : "2 business days"}
          </div>

          {/* Linked ref (optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="linkedRef" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Linked reference <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="linkedRef"
              value={linkedRef}
              onChange={(e) => setLinkedRef(e.target.value)}
              placeholder="e.g. INV-2025-0042, TRP-1042, POD-12345"
              className="h-9 rounded-[5px] font-mono text-[12.5px] tabular"
            />
            <p className="text-[10px] text-muted-foreground">
              Optional invoice #, trip #, or POD # to attach to this ticket.
            </p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description <span className="text-foreground">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe the issue in detail. Include dates, amounts, references - whatever helps us investigate faster."
              className="rounded-[5px] text-[12.5px]"
            />
            <p className="text-[10px] text-muted-foreground">
              Minimum 6 characters. The first message starts the ticket thread.
            </p>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            size="sm"
            icon={<Send className="h-3.5 w-3.5" />}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Raise ticket
          </Btn>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ===== Local UI helpers ===== */

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-[12px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

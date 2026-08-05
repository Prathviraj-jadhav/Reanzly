"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  LifeBuoy, Plus, X, MessageSquare, Reply, Clock, CheckCircle2,
  AlertCircle, Send, Mail, Headset, Filter, ChevronDown, Ticket,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  SEED_SUPPORT_TICKETS,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  ticketStatusBadge,
  ticketPriorityBadge,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  formatDate,
  relativeTime,
  daysAgo,
  KpiTile,
} from "./_helpers";

/* ============================================================
   BrokerSupport - raise support tickets to Reanzly.
   ------------------------------------------------------------
   DataTable of tickets (Ticket ID / Subject / Priority / Status
   / Created / Last Reply) + a "New Ticket" Sheet drawer with
   showCloseButton={false} and a manual header X.
   ============================================================ */

interface NewTicketForm {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
}

const EMPTY_FORM: NewTicketForm = {
  subject: "",
  category: "Payout",
  priority: "Medium",
  description: "",
};

export function BrokerSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>(SEED_SUPPORT_TICKETS);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "All">("All");
  const [replyText, setReplyText] = useState("");
  const [form, setForm] = useState<NewTicketForm>(EMPTY_FORM);

  // ===== Derived counts =====
  const openCount = tickets.filter((t) => t.status === "Open" || t.status === "Awaiting Reply").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
  const urgentCount = tickets.filter((t) => t.priority === "Urgent" && (t.status === "Open" || t.status === "Awaiting Reply")).length;

  const filtered = useMemo(() => {
    let r = tickets;
    if (statusFilter !== "All") r = r.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "All") r = r.filter((t) => t.priority === priorityFilter);
    return r;
  }, [tickets, statusFilter, priorityFilter]);

  // ===== Handlers =====
  const submitCreate = () => {
    if (!form.subject.trim()) {
      toastInfo("Subject required", "Please describe the issue in a short subject.");
      return;
    }
    if (!form.description.trim()) {
      toastInfo("Description required", "Please provide a few lines of detail.");
      return;
    }
    const newTicket: SupportTicket = {
      id: `TKT-2025-${String(150 + tickets.length).padStart(4, "0")}`,
      subject: form.subject.trim(),
      category: form.category,
      priority: form.priority,
      status: "Open",
      createdAt: new Date().toISOString(),
      lastReplyAt: new Date().toISOString(),
      lastReplyBy: "You",
      replyCount: 1,
      description: form.description.trim(),
    };
    setTickets((p) => [newTicket, ...p]);
    setForm(EMPTY_FORM);
    setCreateOpen(false);
    toastSuccess("Ticket raised", `${newTicket.id} - ${newTicket.subject}. Reanzly support will reply within 4 business hours.`);
  };

  const sendReply = () => {
    if (!viewing || !replyText.trim()) return;
    const updated = {
      ...viewing,
      replyCount: viewing.replyCount + 1,
      lastReplyAt: new Date().toISOString(),
      lastReplyBy: "You" as const,
      status: (viewing.status === "Open" ? "Awaiting Reply" : viewing.status) as TicketStatus,
    };
    setTickets((p) => p.map((t) => (t.id === viewing.id ? updated : t)));
    setViewing(updated);
    setReplyText("");
    toastSuccess("Reply sent", "Your message has been added to the thread.");
  };

  const closeTicket = (t: SupportTicket) => {
    setTickets((p) => p.map((x) => (x.id === t.id ? { ...x, status: "Closed" as TicketStatus } : x)));
    if (viewing?.id === t.id) {
      setViewing({ ...t, status: "Closed" });
    }
    toastSuccess("Ticket closed", `${t.id} marked as resolved.`);
  };

  const escalate = (t: SupportTicket) => {
    toastInfo("Escalated to senior support", `${t.id} - a senior agent will pick this up within 2 hours.`);
  };

  // ===== Columns =====
  const columns: Column<SupportTicket>[] = [
    {
      key: "id",
      header: "Ticket ID",
      sortable: true,
      align: "left",
      sortValue: (t) => t.id,
      render: (t) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] tabular font-medium text-foreground">{t.id}</span>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      align: "left",
      sortValue: (t) => t.subject,
      render: (t) => (
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-foreground">{t.subject}</div>
          <div className="truncate text-[11px] text-muted-foreground">{t.category} · {t.replyCount} replies</div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      align: "left",
      sortValue: (t) => t.priority,
      hideable: true,
      render: (t) => {
        const b = ticketPriorityBadge(t.priority);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{t.priority}</StatusBadge>;
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "left",
      sortValue: (t) => t.status,
      render: (t) => {
        const b = ticketStatusBadge(t.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{t.status}</StatusBadge>;
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      align: "left",
      sortValue: (t) => t.createdAt,
      hideable: true,
      render: (t) => (
        <div className="text-[12px] tabular">
          <div className="text-foreground">{formatDate(t.createdAt)}</div>
          <div className="text-[10px] text-muted-foreground">{relativeTime(t.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "lastReplyAt",
      header: "Last reply",
      sortable: true,
      align: "left",
      sortValue: (t) => t.lastReplyAt,
      render: (t) => (
        <div className="text-[12px] tabular">
          <div className="text-foreground">{formatDate(t.lastReplyAt)}</div>
          <div className="text-[10px] text-muted-foreground">
            {relativeTime(t.lastReplyAt)} · {t.lastReplyBy}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <Btn variant="outline" size="sm" icon={<MessageSquare className="h-3 w-3" />} onClick={() => setViewing(t)}>
          Open
        </Btn>
      ),
    },
  ];

  // ===== Mock reply thread for the viewing drawer =====
  const replyThread = useMemo(() => {
    if (!viewing) return [];
    const thread: { author: "You" | "Reanzly Support"; at: string; body: string }[] = [
      { author: "You", at: viewing.createdAt, body: viewing.description },
    ];
    // Mock a back-and-forth from Reanzly Support based on replyCount.
    const supportReplies = [
      "Thanks for raising this. We're looking into the issue and will get back within SLA.",
      "Update: the engineering team has reproduced the issue on staging. Working on a fix.",
      "We've deployed a patch to the broker portal. Could you verify and let us know?",
      "Closing this out - please reopen if you see the issue again. Thanks!",
    ];
    for (let i = 1; i < viewing.replyCount; i++) {
      thread.push({
        author: i % 2 === 1 ? "Reanzly Support" : "You",
        at: new Date(new Date(viewing.createdAt).getTime() + i * 6 * 3600000).toISOString(),
        body: supportReplies[(i - 1) % supportReplies.length],
      });
    }
    return thread;
  }, [viewing]);

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Help & Support"
        description="Raise tickets to Reanzly support - payouts, ledger, marketplace, account, and more."
        meta={[
          { label: "Open", value: openCount },
          { label: "In progress", value: inProgressCount },
          { label: "Resolved", value: resolvedCount },
          { label: "Urgent open", value: urgentCount },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
            New ticket
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiTile icon={<LifeBuoy className="h-3.5 w-3.5" />} label="Total tickets" value={String(tickets.length)} hint="all time" />
        <KpiTile icon={<AlertCircle className="h-3.5 w-3.5" />} label="Open" value={String(openCount)} hint="awaiting reply" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="In progress" value={String(inProgressCount)} hint="being investigated" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resolved" value={String(resolvedCount)} hint="this period" />
        <KpiTile icon={<Headset className="h-3.5 w-3.5" />} label="Avg first reply" value="2.4h" hint="within 4h SLA" />
        <KpiTile icon={<Ticket className="h-3.5 w-3.5" />} label="Urgent open" value={String(urgentCount)} hint="top priority" />
      </div>

      {/* Quick contact options */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ContactCard
          icon={<Headset className="h-4 w-4" />}
          title="Call support"
          subtitle="+91 22 6124 1800"
          hint="Mon-Sat, 9 AM - 8 PM IST"
          cta="Call now"
          onClick={() => toastInfo("Initiating call", "Connecting you to broker support - demo only.")}
        />
        <ContactCard
          icon={<Mail className="h-4 w-4" />}
          title="Email support"
          subtitle="broker-support@reanzly.com"
          hint="Reply within 4 business hours"
          cta="Compose email"
          onClick={() => toastInfo("Opening mail client", "Drafting a new email to broker support.")}
        />
        <ContactCard
          icon={<MessageSquare className="h-4 w-4" />}
          title="WhatsApp"
          subtitle="+91 98xxx 01240"
          hint="Quick questions, Mon-Sat"
          cta="Open chat"
          onClick={() => toastInfo("Opening WhatsApp", "Launching WhatsApp Business chat - demo only.")}
        />
      </div>

      {/* Tickets table */}
      <SectionCard
        title="Your tickets"
        description="Filter by status or priority. Click Open to view the conversation thread."
        icon={<Ticket className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <span>{statusFilter}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("All")} className="text-[13px]">All</DropdownMenuItem>
                {TICKET_STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">{s}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Priority:</span>
                  <span>{priorityFilter}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by priority</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPriorityFilter("All")} className="text-[13px]">All</DropdownMenuItem>
                {TICKET_PRIORITIES.map((p) => (
                  <DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)} className="text-[13px]">{p}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        flush
      >
        <DataTable
          data={filtered}
          columns={columns}
          searchKeys={["id", "subject", "category"]}
          searchPlaceholder="Search ticket ID, subject, category..."
          pageSize={10}
          initialSort={{ key: "lastReplyAt", dir: "desc" }}
          onRowClick={(t) => setViewing(t)}
          emptyTitle="No tickets found"
          emptyDescription="Adjust your filters or raise a new ticket."
          emptyAction={
            <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
              New ticket
            </Btn>
          }
        />
      </SectionCard>

      {/* ===== New ticket sheet ===== */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
          <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
            <div className="space-y-1">
              <SheetTitle className="text-[16px] font-medium tracking-tight">New support ticket</SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                Tell us what's going on. Reanzly support replies within 4 business hours.
              </SheetDescription>
            </div>
            <button
              onClick={() => setCreateOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
            <div className="flex flex-col gap-4">
              {/* Subject */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Subject <span className="text-foreground">*</span>
                </label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Payout for CYC-2025-05 not credited"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Category <span className="text-foreground">*</span>
                </label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as TicketCategory }))}
                >
                  <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Priority <span className="text-foreground">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 rounded-[5px] border border-border bg-background p-2.5">
                  {TICKET_PRIORITIES.map((p) => {
                    const sel = form.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, priority: p }))}
                        className={"tap inline-flex items-center gap-1 rounded-[5px] border px-2 py-0.5 text-[11px] font-medium transition-colors " + (sel ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground")}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Urgent tickets get a 2-hour first-response SLA.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Description <span className="text-foreground">*</span>
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={6}
                  placeholder="Describe the issue in detail. Include IDs (cycle, ticket, lane), dates, and what you expected vs. what happened."
                  className="rounded-[5px] text-[12.5px]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground tabular">
                  {form.description.length} characters · minimum 20 recommended
                </p>
              </div>

              {/* Attachments placeholder */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">Attachments</label>
                <button
                  type="button"
                  onClick={() => toastInfo("Attachment picker", "File picker would open here - demo only.")}
                  className="tap flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-muted/30 px-4 py-4 text-[12px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Add screenshot or log file
                </button>
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={submitCreate}>
              Raise ticket
            </Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ===== View ticket sheet ===== */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
          {viewing && (
            <>
              <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] tabular text-muted-foreground">{viewing.id}</span>
                    <StatusBadge variant={ticketPriorityBadge(viewing.priority).variant} pulse={ticketPriorityBadge(viewing.priority).pulse}>
                      {viewing.priority}
                    </StatusBadge>
                    <StatusBadge variant={ticketStatusBadge(viewing.status).variant} pulse={ticketStatusBadge(viewing.status).pulse}>
                      {viewing.status}
                    </StatusBadge>
                  </div>
                  <SheetTitle className="text-[15px] font-medium leading-tight tracking-tight">{viewing.subject}</SheetTitle>
                  <SheetDescription className="text-[11px] text-muted-foreground">
                    {viewing.category} · opened {relativeTime(viewing.createdAt)} · {viewing.replyCount} replies
                  </SheetDescription>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetHeader>

              {/* Conversation thread */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
                <div className="flex flex-col gap-4">
                  {replyThread.map((msg, i) => {
                    const isYou = msg.author === "You";
                    return (
                      <div key={i} className={"flex gap-3 " + (isYou ? "flex-row" : "flex-row-reverse")}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-medium tabular text-muted-foreground">
                          {isYou ? "YOU" : "RS"}
                        </div>
                        <div className={"max-w-[78%] rounded-[6px] border border-border p-3 " + (isYou ? "bg-background" : "bg-muted/30")}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <span className="font-medium">{msg.author}</span>
                            <span className="tabular">{relativeTime(msg.at)}</span>
                          </div>
                          <p className="text-[12.5px] leading-relaxed text-foreground">{msg.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply box */}
              <div className="border-t border-border px-5 py-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Type a reply..."
                  className="rounded-[5px] text-[12.5px]"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Btn variant="ghost" size="sm" icon={<AlertCircle className="h-3 w-3" />} onClick={() => escalate(viewing)}>
                      Escalate
                    </Btn>
                    {viewing.status !== "Closed" && (
                      <Btn variant="ghost" size="sm" icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => closeTicket(viewing)}>
                        Close ticket
                      </Btn>
                    )}
                  </div>
                  <Btn variant="primary" size="sm" icon={<Reply className="h-3 w-3" />} onClick={sendReply} disabled={!replyText.trim()}>
                    Send reply
                  </Btn>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ===== Local UI helpers ===== */
function ContactCard({
  icon,
  title,
  subtitle,
  hint,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  hint: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="mt-0.5 truncate text-[13px] font-medium text-foreground">{subtitle}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
      <Btn variant="outline" size="sm" onClick={onClick}>{cta}</Btn>
    </div>
  );
}

export default BrokerSupport;

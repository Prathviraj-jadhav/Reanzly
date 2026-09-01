"use client";

import { useState, useEffect } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import { type HelpdeskTicket } from "./_helpers";
import {
  Pencil,
  Clock,
  User,
  Flag,
  Mail,
  Phone,
  Tag,
  Building2,
  CheckCircle2,
  Timer,
  MessageSquare,
  History,
  AlertTriangle,
  Play,
  Package,
  Truck,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchHelpdeskTicket,
  patchHelpdeskTicket,
} from "@/lib/pilot-api";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  formatDuration,
  minutesUntil,
  minutesSince,
  priorityBadge,
  statusBadge,
  PriorityDot,
  STATUS_TRANSITIONS,
  SLA_TARGETS,
  type TicketStatus,
} from "./_helpers";
import { Textarea } from "@/components/ui/textarea";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "messages", label: "Messages" },
  { id: "sla", label: "SLA" },
  { id: "activity", label: "Activity" },
];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flag: Flag,
  user: User,
  play: Play,
  package: Package,
  check: CheckCircle2,
  archive: Archive,
  truck: Truck,
  clock: Clock,
  message: MessageSquare,
};

interface TicketDetailProps {
  ticketId: string;
}

// Real, database-backed ticket (src/app/api/helpdesk) - fetched by id
// directly rather than re-derived from a static mock array, which is what
// caused newly created tickets to show "not found" here.
function useTicket(ticketId: string) {
  const [ticket, setTicket] = useState<HelpdeskTicket | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-by-id on prop change, guarded by `cancelled`
    setLoading(true);
    fetchHelpdeskTicket(ticketId)
      .then((ticket) => {
        if (cancelled) return;
        setTicket(ticket);
      })
      .catch(() => {
        if (!cancelled) setTicket(undefined);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  return { ticket, setTicket, loading };
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const { navigate } = useModuleNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const { ticket, setTicket, loading } = useTicket(ticketId);

  if (loading) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading ticket…</div>;
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Ticket <span className="tabular">{ticketId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("helpdesk")}>Back to Helpdesk</Btn>
      </div>
    );
  }

  const patch = async (body: Record<string, unknown>) => {
    try {
      const updated = await patchHelpdeskTicket(ticket.id, body);
      setTicket(updated);
      return updated;
    } catch {
      toast.error("Couldn't save ticket", { description: "Try again." });
      return null;
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    const prevStatus = ticket.status;
    const updated = await patch({ status: newStatus });
    if (updated) toast.success(`Status updated`, { description: `${prevStatus} → ${newStatus}` });
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    const updated = await patch({ newMessage: { text: reply.trim(), internal } });
    if (updated) toast.success(internal ? "Internal note added" : "Reply sent to customer");
    setReply("");
    setInternal(false);
  };

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => toast("Edit ticket", { description: ticket.ticketId })} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => handleStatusChange("Resolved")}>
        <span className="hidden sm:inline">Resolve</span>
        <span className="sm:hidden">Resolve</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Reassign", onClick: () => toast("Reassign ticket", { description: ticket.ticketId }) },
    { label: "Escalate", onClick: () => toast("Ticket escalated", { description: ticket.ticketId }) },
    { label: "Add internal note", onClick: () => setActiveTab("messages") },
    { label: "Link trip", onClick: () => toast("Linking trip", { description: ticket.relatedRef ?? ticket.ticketId }) },
    {
      label: "Close ticket",
      onClick: () => {
        handleStatusChange("Closed");
        navigate("helpdesk");
      },
    },
  ];

  // SLA computations
  const targets = SLA_TARGETS[ticket.priority];
  const responseRemaining = ticket.sla.firstResponseAt
    ? null
    : minutesUntil(ticket.sla.responseDue);
  const resolutionRemaining = ticket.sla.resolvedAt
    ? null
    : minutesUntil(ticket.sla.resolutionDue);
  const responseBreached = responseRemaining !== null && responseRemaining < 0;
  const resolutionBreached = resolutionRemaining !== null && resolutionRemaining < 0;
  const responseAgeMins = ticket.sla.firstResponseAt
    ? minutesSince(ticket.sla.firstResponseAt)
    : minutesSince(ticket.createdAt);

  const priorityMeta = priorityBadge(ticket.priority);
  const statusMeta = statusBadge(ticket.status);

  return (
    <DetailLayout
      title={ticket.ticketId}
      subtitle={ticket.subject}
      badges={
        <>
          <StatusBadge variant={priorityMeta.variant} pulse={priorityMeta.pulse}>
            <PriorityDot priority={ticket.priority} /> {ticket.priority}
          </StatusBadge>
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{ticket.status}</StatusBadge>
          {responseBreached && <StatusBadge variant="solid" pulse>response overdue</StatusBadge>}
          {resolutionBreached && <StatusBadge variant="solid" pulse>resolution overdue</StatusBadge>}
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{ticket.customer}</span>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.assignee}</span>
          <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{ticket.team}</span>
          <span className="tabular">{formatDate(ticket.createdAt)}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Priority" value={ticket.priority} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Status" value={ticket.status} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Channel" value={ticket.channel} icon={<MessageSquare className="h-3.5 w-3.5" />} />
            <StatCard label="Age" value={relativeTime(ticket.createdAt)} icon={<History className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Ticket Details">
              <InfoRow label="Ticket ID" value={<span className="tabular">{ticket.ticketId}</span>} mono />
              <InfoRow label="Subject" value={ticket.subject} />
              <InfoRow label="Category" value={ticket.category} />
              <InfoRow label="Priority" value={<StatusBadge variant={priorityBadge(ticket.priority).variant}>{ticket.priority}</StatusBadge>} />
              <InfoRow label="Status" value={<StatusBadge variant={statusBadge(ticket.status).variant}>{ticket.status}</StatusBadge>} />
              <InfoRow label="Channel" value={ticket.channel} />
              <InfoRow label="Team" value={ticket.team} />
              <InfoRow label="Assignee" value={ticket.assignee} />
              <InfoRow label="Created" value={<span className="tabular">{formatDateTime(ticket.createdAt)}</span>} mono />
              <InfoRow label="Last updated" value={<span className="tabular">{formatDateTime(ticket.updatedAt)}</span>} mono />
              {ticket.resolvedAt && (
                <InfoRow label="Resolved" value={<span className="tabular">{formatDateTime(ticket.resolvedAt)}</span>} mono />
              )}
              {ticket.relatedRef && (
                <InfoRow label="Related ref" value={<span className="tabular">{ticket.relatedRef}</span>} mono />
              )}
            </InfoSection>

            <InfoSection title="Customer & Description">
              <div className="px-4 py-3 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">{ticket.customer}</div>
                    <div className="text-[11px] text-muted-foreground tabular">{ticket.customerCode}</div>
                    <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.requester}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{ticket.requesterEmail}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
                  <p className="text-[13px] text-foreground leading-relaxed">{ticket.description}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Change Status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_TRANSITIONS[ticket.status].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className="flex h-7 items-center rounded-[4px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Messages ===== */}
      {activeTab === "messages" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Conversation</span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{ticket.messages.length} messages</span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3 max-h-[420px] overflow-y-auto scrollbar-thin">
              {ticket.messages.map((m) => (
                <div key={m.id} className={`flex items-start gap-3 ${m.internal ? "opacity-70" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.internal ? "border border-dashed border-border" : "bg-muted"} text-[12px] font-medium tabular text-foreground`}>
                    {m.author[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-medium text-foreground">{m.author}</span>
                        <span className="text-[11px] text-muted-foreground">{m.role}</span>
                        {m.internal && <StatusBadge variant="muted">internal</StatusBadge>}
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(m.ts)}</span>
                    </div>
                    <p className="text-[13px] text-foreground mt-1 leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={internal ? "Add an internal note…" : "Reply to customer…"}
                className="min-h-[60px] rounded-[5px] text-[13px] bg-background mb-2"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="h-3.5 w-3.5 rounded-[3px] border-border"
                  />
                  Internal note
                </label>
                <div className="flex items-center gap-2">
                  <Btn size="sm" variant="ghost" icon={<Phone className="h-3.5 w-3.5" />} onClick={() => toast("Logged call", { description: ticket.ticketId })}>
                    Log call
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={handleReply} disabled={!reply.trim()}>
                    {internal ? "Add note" : "Send reply"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SLA ===== */}
      {activeTab === "sla" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Response target"
              value={`${targets.response}m`}
              icon={<Clock className="h-3.5 w-3.5" />}
              hint={`priority: ${ticket.priority}`}
            />
            <StatCard
              label="Resolution target"
              value={formatDuration(targets.resolution)}
              icon={<Timer className="h-3.5 w-3.5" />}
              hint={`priority: ${ticket.priority}`}
            />
            <StatCard
              label="First response"
              value={ticket.sla.firstResponseAt ? formatDuration(responseAgeMins) + " ago" : "awaiting"}
              icon={responseBreached ? <AlertTriangle className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Resolution"
              value={ticket.sla.resolvedAt ? "resolved" : resolutionRemaining !== null ? formatDuration(resolutionRemaining) : "-"}
              icon={resolutionBreached ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Response SLA">
              <InfoRow label="Target" value={`${targets.response} minutes`} mono />
              <InfoRow label="Due at" value={<span className="tabular">{formatDateTime(ticket.sla.responseDue)}</span>} mono />
              <InfoRow
                label="Status"
                value={
                  ticket.sla.firstResponseAt ? (
                    <StatusBadge variant="muted">responded</StatusBadge>
                  ) : responseBreached ? (
                    <StatusBadge variant="solid" pulse>overdue</StatusBadge>
                  ) : responseRemaining !== null && responseRemaining < targets.response / 2 ? (
                    <StatusBadge variant="outline">due soon</StatusBadge>
                  ) : (
                    <StatusBadge variant="outline">on track</StatusBadge>
                  )
                }
              />
              <InfoRow
                label="Remaining"
                value={
                  ticket.sla.firstResponseAt ? (
                    <span className="tabular">responded {relativeTime(ticket.sla.firstResponseAt)}</span>
                  ) : responseBreached ? (
                    <span className="tabular">{formatDuration(Math.abs(responseRemaining ?? 0))} overdue</span>
                  ) : (
                    <span className="tabular">{formatDuration(responseRemaining ?? 0)}</span>
                  )
                }
                mono
              />
              {ticket.sla.firstResponseAt && (
                <InfoRow label="Responded at" value={<span className="tabular">{formatDateTime(ticket.sla.firstResponseAt)}</span>} mono />
              )}
            </InfoSection>

            <InfoSection title="Resolution SLA">
              <InfoRow label="Target" value={formatDuration(targets.resolution)} mono />
              <InfoRow label="Due at" value={<span className="tabular">{formatDateTime(ticket.sla.resolutionDue)}</span>} mono />
              <InfoRow
                label="Status"
                value={
                  ticket.sla.resolvedAt ? (
                    <StatusBadge variant="muted">resolved</StatusBadge>
                  ) : resolutionBreached ? (
                    <StatusBadge variant="solid" pulse>overdue</StatusBadge>
                  ) : resolutionRemaining !== null && resolutionRemaining < 60 ? (
                    <StatusBadge variant="outline">due soon</StatusBadge>
                  ) : (
                    <StatusBadge variant="outline">on track</StatusBadge>
                  )
                }
              />
              <InfoRow
                label="Remaining"
                value={
                  ticket.sla.resolvedAt ? (
                    <span className="tabular">resolved {relativeTime(ticket.sla.resolvedAt)}</span>
                  ) : resolutionBreached ? (
                    <span className="tabular">{formatDuration(Math.abs(resolutionRemaining ?? 0))} overdue</span>
                  ) : (
                    <span className="tabular">{formatDuration(resolutionRemaining ?? 0)}</span>
                  )
                }
                mono
              />
              {ticket.sla.resolvedAt && (
                <InfoRow label="Resolved at" value={<span className="tabular">{formatDateTime(ticket.sla.resolvedAt)}</span>} mono />
              )}
            </InfoSection>
          </div>

          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-[12px] text-muted-foreground leading-relaxed">
                SLA targets are derived from the ticket priority. Urgent tickets require a 15-minute first response and 4-hour resolution. Breaches auto-escalate to the team lead and surface on the dashboard.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Activity ===== */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                {ticket.activity.map((evt, i) => {
                  const Icon = ICONS[evt.icon] || Flag;
                  return (
                    <div key={i} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                      {i < ticket.activity.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                        <Icon className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[13px] font-medium text-foreground">{evt.label}</p>
                          <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{evt.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </DetailLayout>
  );
}

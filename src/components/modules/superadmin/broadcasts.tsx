"use client";

/* ============================================================
   BroadcastsView - Reanzly superadmin broadcast composer +
   delivery history. Strict monochrome Swiss design.
   Layout: KPI strip (Sent / Scheduled / Draft / Open rate) +
   main split: left = compose form (or edit draft), right =
   broadcast history list with delivery stats per card.
   Read-only mode hides the composer when canAccess == read.
   ============================================================ */

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Megaphone, Mail, MessageSquare, Bell, Send, Clock, Trash2,
  Users, Eye, ChevronDown, Search, Save, CalendarClock, Lock, Inbox,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSuperadminStore, selectBroadcastKPIs } from "./_store";
import { formatDateTime, relativeTime, formatPct, formatNum } from "./_helpers";
import type {
  Broadcast, BroadcastAudience, BroadcastChannel, BroadcastStatus, PlanId,
} from "./_data";

// Static option lists
const PLAN_OPTIONS: PlanId[] = ["Starter", "Growth", "Enterprise"];
const ROLE_OPTIONS = [
  "Owner", "Org Admin", "Branch Manager", "Dispatcher", "Accountant",
  "Fleet Manager", "Driver", "Compliance Officer", "Read-only Auditor",
];
const CHANNEL_OPTIONS: { id: BroadcastChannel; label: string; icon: typeof Mail }[] = [
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "in-app", label: "In-app", icon: Bell },
];
const AUDIENCE_OPTIONS: { id: BroadcastAudience; label: string; hint: string }[] = [
  { id: "all-orgs", label: "All orgs", hint: "Every user across every tenant" },
  { id: "by-plan", label: "By plan", hint: "Users in orgs on selected plans" },
  { id: "by-org", label: "By org", hint: "Users in selected orgs" },
  { id: "by-role", label: "By role", hint: "Users with selected org-level roles" },
];

// Mappers
function audienceBadgeVariant(a: BroadcastAudience): "solid" | "outline" {
  return a === "all-orgs" ? "solid" : "outline";
}
function audienceLabel(a: BroadcastAudience): string {
  return AUDIENCE_OPTIONS.find((o) => o.id === a)?.label ?? a;
}
function statusBadge(s: BroadcastStatus): { variant: "solid" | "outline" | "muted" | "dot"; pulse?: boolean } {
  switch (s) {
    case "Sent": return { variant: "solid" };
    case "Scheduled": return { variant: "outline" };
    case "Draft": return { variant: "muted" };
    case "Sending": return { variant: "outline", pulse: true };
    case "Failed": return { variant: "solid", pulse: true };
    default: return { variant: "muted" };
  }
}
function channelMeta(ch: BroadcastChannel) { return CHANNEL_OPTIONS.find((c) => c.id === ch) ?? CHANNEL_OPTIONS[0]; }

// Mirrors sendBroadcast audience math in the store.
function estimateRecipients(
  audience: BroadcastAudience, targets: string[],
  users: { orgId: string; role: string }[], orgs: { id: string; plan: PlanId }[],
): number {
  if (audience === "all-orgs") return users.length;
  if (audience === "by-plan") {
    return users.filter((u) => {
      const org = orgs.find((o) => o.id === u.orgId);
      return org && targets.includes(org.plan);
    }).length;
  }
  if (audience === "by-org") return users.filter((u) => targets.includes(u.orgId)).length;
  if (audience === "by-role") return users.filter((u) => targets.includes(u.role)).length;
  return 0;
}

export function BroadcastsView() {
  const broadcasts = useSuperadminStore((s) => s.broadcasts);
  const orgs = useSuperadminStore((s) => s.orgs);
  const users = useSuperadminStore((s) => s.users);
  const createBroadcast = useSuperadminStore((s) => s.createBroadcast);
  const sendBroadcast = useSuperadminStore((s) => s.sendBroadcast);
  const deleteBroadcast = useSuperadminStore((s) => s.deleteBroadcast);
  const canAccess = useSuperadminStore((s) => s.canAccess);
  const currentStaff = useSuperadminStore((s) => s.currentStaff);

  const isReadOnly = canAccess("broadcasts") === "read";
  const kpis = useMemo(() => selectBroadcastKPIs({ broadcasts } as never), [broadcasts]);

  // Compose form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all-orgs");
  const [targets, setTargets] = useState<string[]>([]);
  const [channels, setChannels] = useState<BroadcastChannel[]>(["email"]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [orgQuery, setOrgQuery] = useState("");

  const recipients = useMemo(() => estimateRecipients(audience, targets, users, orgs), [audience, targets, users, orgs]);
  const audienceValid = audience === "all-orgs" ? users.length > 0 : targets.length > 0;
  const formValid = subject.trim().length > 0 && body.trim().length > 0 && channels.length > 0 && audienceValid;

  const resetForm = useCallback(() => {
    setEditingId(null); setSubject(""); setBody(""); setAudience("all-orgs");
    setTargets([]); setChannels(["email"]); setScheduledFor(""); setOrgQuery("");
  }, []);

  const onAudienceChange = (next: BroadcastAudience) => { setAudience(next); setTargets([]); };
  const toggleTarget = (val: string) => setTargets((p) => p.includes(val) ? p.filter((t) => t !== val) : [...p, val]);
  const toggleChannel = (ch: BroadcastChannel) => setChannels((p) => p.includes(ch) ? p.filter((c) => c !== ch) : [...p, ch]);

  const handleSaveDraft = () => {
    if (!subject.trim() || !body.trim() || channels.length === 0) {
      toast.error("Missing fields", { description: "Subject, body and at least one channel are required." }); return;
    }
    if (editingId) deleteBroadcast(editingId);
    createBroadcast({ subject: subject.trim(), body: body.trim(), audience, targets, channels });
    toast.success("Draft saved", { description: `"${subject.trim()}" saved as draft.` });
    resetForm();
  };

  const handleSchedule = () => {
    if (!formValid) { toast.error("Missing fields", { description: "Complete the form before scheduling." }); return; }
    if (!scheduledFor) { toast.error("No schedule set", { description: "Pick a date and time to schedule." }); return; }
    if (editingId) deleteBroadcast(editingId);
    createBroadcast({ subject: subject.trim(), body: body.trim(), audience, targets, channels, scheduledFor });
    toast.success("Broadcast scheduled", { description: `Will send ${formatDateTime(scheduledFor)} to ${formatNum(recipients)} recipients.` });
    resetForm();
  };

  const handleSendNow = () => {
    if (!formValid) { toast.error("Missing fields", { description: "Complete the form before sending." }); return; }
    if (editingId) deleteBroadcast(editingId);
    const id = createBroadcast({ subject: subject.trim(), body: body.trim(), audience, targets, channels });
    sendBroadcast(id);
    toast.success("Broadcast sent", { description: `Sent to ${formatNum(recipients)} recipient${recipients === 1 ? "" : "s"}.` });
    resetForm();
  };

  const handleEditDraft = (bc: Broadcast) => {
    setEditingId(bc.id); setSubject(bc.subject); setBody(bc.body);
    setAudience(bc.audience); setTargets(bc.targets); setChannels(bc.channels);
    setScheduledFor(bc.scheduledFor ?? "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSendDraft = (bc: Broadcast) => {
    const total = bc.delivery.total > 0 ? bc.delivery.total : estimateRecipients(bc.audience, bc.targets, users, orgs);
    sendBroadcast(bc.id);
    toast.success("Broadcast sent", { description: `Sent to ${formatNum(total)} recipient${total === 1 ? "" : "s"}.` });
  };

  const handleViewRecipients = (bc: Broadcast) => toast(`Recipients for "${bc.subject}"`, { description: `${audienceLabel(bc.audience)} - ${formatNum(bc.delivery.total)} total.` });

  const handleDelete = (bc: Broadcast) => {
    deleteBroadcast(bc.id);
    toast.success("Broadcast deleted", { description: `"${bc.subject}" removed from history.` });
    if (editingId === bc.id) resetForm();
  };

  const sortedHistory = useMemo(
    () => [...broadcasts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [broadcasts],
  );

  const senderLabel = currentStaff?.email ?? "system";

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Send className="h-3.5 w-3.5" />} label="Sent" value={String(kpis.sent)} hint={`${formatNum(kpis.totalRecipients)} recipients all-time`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Scheduled" value={String(kpis.scheduled)} hint="Awaiting send time" />
        <KpiTile icon={<Save className="h-3.5 w-3.5" />} label="Draft" value={String(kpis.draft)} hint="Unfinished composer items" />
        <KpiTile icon={<Eye className="h-3.5 w-3.5" />} label="Open rate" value={formatPct(kpis.openRate, 0)} hint="Opened / delivered across Sent" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[440px_1fr]">
        {/* Left: composer or read-only notice */}
        <div className="flex flex-col gap-3">
          {isReadOnly ? (
            <section className="rounded-[6px] border border-border bg-card px-4 py-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border bg-background">
                  <Lock className="h-4 w-4 text-foreground" />
                </span>
                <h3 className="text-[13px] font-medium text-foreground">Read-only access</h3>
                <p className="text-[11px] text-muted-foreground max-w-[280px]">
                  Your role permits viewing broadcast history only. Composing, scheduling and sending are restricted.
                </p>
              </div>
            </section>
          ) : (
            <ComposerCard
              editingId={editingId} subject={subject} body={body} audience={audience}
              targets={targets} channels={channels} scheduledFor={scheduledFor}
              recipients={recipients} audienceValid={audienceValid} formValid={formValid}
              senderLabel={senderLabel} orgs={orgs} orgQuery={orgQuery}
              onSubject={setSubject} onBody={setBody} onAudience={onAudienceChange}
              onToggleTarget={toggleTarget} onToggleChannel={toggleChannel}
              onScheduledFor={setScheduledFor} onOrgQuery={setOrgQuery}
              onSaveDraft={handleSaveDraft} onSchedule={handleSchedule}
              onSendNow={handleSendNow} onCancelEdit={resetForm}
            />
          )}
        </div>

        {/* Right: history */}
        <section className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-3.5 w-3.5 text-foreground" />
              <h3 className="text-[13px] font-medium text-foreground">Broadcast history</h3>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">{broadcasts.length} total</span>
          </div>
          <div className="max-h-[640px] overflow-y-auto scrollbar-thin divide-y divide-border">
            {sortedHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3.5 py-10 text-center">
                <Inbox className="h-5 w-5 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground">
                  No broadcasts yet. Compose your first message on the left.
                </p>
              </div>
            ) : (
              sortedHistory.map((bc) => (
                <BroadcastCard
                  key={bc.id} bc={bc} onEdit={handleEditDraft} onSendDraft={handleSendDraft}
                  onViewRecipients={handleViewRecipients} onDelete={handleDelete} readOnly={isReadOnly}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ===== KpiTile ===== */
function KpiTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

/* ===== ComposerCard ===== */
function ComposerCard(props: {
  editingId: string | null; subject: string; body: string; audience: BroadcastAudience;
  targets: string[]; channels: BroadcastChannel[]; scheduledFor: string; recipients: number;
  audienceValid: boolean; formValid: boolean; senderLabel: string;
  orgs: { id: string; brandName: string; legalName: string; plan: PlanId }[]; orgQuery: string;
  onSubject: (v: string) => void; onBody: (v: string) => void; onAudience: (v: BroadcastAudience) => void;
  onToggleTarget: (v: string) => void; onToggleChannel: (v: BroadcastChannel) => void;
  onScheduledFor: (v: string) => void; onOrgQuery: (v: string) => void;
  onSaveDraft: () => void; onSchedule: () => void; onSendNow: () => void; onCancelEdit: () => void;
}) {
  const {
    editingId, subject, body, audience, targets, channels, scheduledFor,
    recipients, audienceValid, formValid, senderLabel, orgs, orgQuery,
    onSubject, onBody, onAudience, onToggleTarget, onToggleChannel,
    onScheduledFor, onOrgQuery, onSaveDraft, onSchedule, onSendNow, onCancelEdit,
  } = props;

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter((o) => o.brandName.toLowerCase().includes(q) || o.legalName.toLowerCase().includes(q));
  }, [orgs, orgQuery]);

  const orgTriggerLabel = targets.length === 0 ? "Select orgs"
    : targets.length === 1 ? (orgs.find((o) => o.id === targets[0])?.brandName ?? "1 org")
    : `${targets.length} orgs selected`;

  const targetChecked = (val: string) => targets.includes(val);
  const channelChecked = (val: BroadcastChannel) => channels.includes(val);

  return (
    <section className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-3.5 w-3.5 text-foreground" />
          <h3 className="text-[13px] font-medium text-foreground">
            {editingId ? "Edit draft" : "Compose broadcast"}
          </h3>
        </div>
        {editingId && (
          <button onClick={onCancelEdit} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Cancel edit
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3.5 p-3.5">
        {/* Sender identity */}
        <div className="flex items-center justify-between rounded-[5px] border border-border bg-background px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">From</span>
          <span className="text-[11px] font-medium text-foreground tabular truncate">{senderLabel}</span>
        </div>

        {/* Subject */}
        <div>
          <Label className="mb-1 text-[12px] text-foreground">Subject</Label>
          <Input value={subject} onChange={(e) => onSubject(e.target.value)}
            placeholder="Subject line for the broadcast" className="h-8 rounded-[5px] text-[13px]" maxLength={140} />
        </div>

        {/* Body */}
        <div>
          <Label className="mb-1 text-[12px] text-foreground">Body</Label>
          <Textarea value={body} onChange={(e) => onBody(e.target.value)}
            placeholder="Write the broadcast body. Keep it short and actionable."
            className="min-h-[120px] rounded-[5px] text-[13px] leading-relaxed resize-y" rows={6} />
        </div>

        {/* Audience */}
        <div>
          <Label className="mb-1 text-[12px] text-foreground">Audience</Label>
          <RadioGroup value={audience} onValueChange={(v) => onAudience(v as BroadcastAudience)} className="grid grid-cols-2 gap-1.5">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label key={opt.id} className={cn(
                "flex items-start gap-2 rounded-[5px] border p-2 cursor-pointer transition-colors",
                audience === opt.id ? "border-foreground/50 bg-accent/40" : "border-border hover:bg-accent/20",
              )}>
                <RadioGroupItem value={opt.id} id={`aud-${opt.id}`} className="mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-foreground">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.hint}</div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Audience targets */}
        {audience !== "all-orgs" && (
          <div className="rounded-[5px] border border-border bg-background p-2.5">
            {audience === "by-plan" && (
              <div className="grid grid-cols-3 gap-1.5">
                {PLAN_OPTIONS.map((p) => (
                  <TargetToggle key={p} label={p} checked={targetChecked(p)} onToggle={() => onToggleTarget(p)} />
                ))}
              </div>
            )}

            {audience === "by-org" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between rounded-[5px] border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground hover:bg-accent/30 transition-colors">
                    <span className={cn(targets.length === 0 && "text-muted-foreground")}>{orgTriggerLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[260px]" align="start">
                  <div className="px-1.5 pb-1.5">
                    <div className="flex items-center gap-1.5 rounded-[4px] border border-border bg-background px-2">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <input value={orgQuery} onChange={(e) => onOrgQuery(e.target.value)}
                        placeholder="Search orgs" className="h-7 w-full bg-transparent text-[12px] outline-none" />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-60 overflow-y-auto scrollbar-thin">
                    {filteredOrgs.length === 0 ? (
                      <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">No orgs match</div>
                    ) : filteredOrgs.map((o) => (
                      <DropdownMenuCheckboxItem key={o.id} checked={targets.includes(o.id)}
                        onCheckedChange={() => onToggleTarget(o.id)} className="text-[12px]">
                        <span className="flex-1 truncate">{o.brandName}</span>
                        <span className="text-[10px] text-muted-foreground tabular">{o.plan}</span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                  {targets.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => targets.forEach(onToggleTarget)} className="text-[11px] text-muted-foreground">
                        Clear selection
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {audience === "by-role" && (
              <div className="grid grid-cols-2 gap-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <TargetToggle key={r} label={r} checked={targetChecked(r)} onToggle={() => onToggleTarget(r)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Channels */}
        <div>
          <Label className="mb-1 text-[12px] text-foreground">Channels</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {CHANNEL_OPTIONS.map((c) => {
              const Icon = c.icon;
              return (
                <label key={c.id} className={cn(
                  "flex items-center gap-1.5 rounded-[4px] border px-2 py-1.5 cursor-pointer transition-colors text-[12px]",
                  channelChecked(c.id) ? "border-foreground/50 bg-accent/40 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}>
                  <Checkbox checked={channelChecked(c.id)} onCheckedChange={() => onToggleChannel(c.id)} />
                  <Icon className="h-3 w-3" />
                  <span className="font-medium">{c.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <Label className="mb-1 text-[12px] text-foreground">
            Schedule for <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input type="datetime-local" value={scheduledFor} onChange={(e) => onScheduledFor(e.target.value)}
            className="h-8 rounded-[5px] text-[12px] tabular" />
        </div>

        {/* Recipient preview */}
        <div className="flex items-center justify-between rounded-[5px] border border-border bg-background px-3 py-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimated recipients</span>
          </div>
          <span className="text-[16px] font-medium tabular text-foreground">{formatNum(recipients)}</span>
        </div>
        {!audienceValid && (
          <p className="text-[10px] text-muted-foreground -mt-1.5">
            Select at least one {audience.replace("by-", "")} to enable send.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="outline" size="sm" icon={<Save className="h-3.5 w-3.5" />}
              onClick={onSaveDraft} disabled={!subject.trim() || !body.trim() || channels.length === 0}>
              Save as draft
            </Btn>
            <Btn variant="outline" size="sm" icon={<CalendarClock className="h-3.5 w-3.5" />}
              onClick={onSchedule} disabled={!formValid || !scheduledFor}>
              Schedule
            </Btn>
          </div>
          <Btn variant="primary" size="sm" block icon={<Send className="h-3.5 w-3.5" />}
            onClick={onSendNow} disabled={!formValid}>
            Send now
          </Btn>
        </div>
      </div>
    </section>
  );
}

/* ===== TargetToggle - compact plan/role chip ===== */
function TargetToggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className={cn(
      "flex items-center gap-1.5 rounded-[4px] border px-2 py-1.5 cursor-pointer transition-colors text-[12px]",
      checked ? "border-foreground/50 bg-accent/40 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
    )}>
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="truncate font-medium">{label}</span>
    </label>
  );
}

/* ===== BroadcastCard - one history row ===== */
function BroadcastCard({
  bc, onEdit, onSendDraft, onViewRecipients, onDelete, readOnly,
}: {
  bc: Broadcast; onEdit: (bc: Broadcast) => void; onSendDraft: (bc: Broadcast) => void;
  onViewRecipients: (bc: Broadcast) => void; onDelete: (bc: Broadcast) => void; readOnly: boolean;
}) {
  const sb = statusBadge(bc.status);
  const openPct = bc.delivery.delivered > 0 ? (bc.delivery.opened / bc.delivery.delivered) * 100 : 0;
  const isDraft = bc.status === "Draft";
  return (
    <article className="flex flex-col gap-2 px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-medium text-foreground truncate">{bc.subject}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{bc.body}</p>
        </div>
        <StatusBadge variant={sb.variant} pulse={sb.pulse} className="shrink-0">{bc.status}</StatusBadge>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge variant={audienceBadgeVariant(bc.audience)}>{audienceLabel(bc.audience)}</StatusBadge>
        {bc.targets.length > 0 && (
          <span className="text-[10px] text-muted-foreground tabular">
            {bc.targets.length} target{bc.targets.length === 1 ? "" : "s"}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          {bc.channels.map((ch) => {
            const m = channelMeta(ch);
            const Icon = m.icon;
            return (
              <span key={ch} title={m.label}
                className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-border bg-background text-muted-foreground">
                <Icon className="h-3 w-3" />
              </span>
            );
          })}
        </span>
      </div>

      {bc.status !== "Draft" && (
        <div className="grid grid-cols-3 gap-1.5">
          <StatCell label="Delivered" value={`${bc.delivery.delivered}/${bc.delivery.total}`} />
          <StatCell label="Opened" value={`${bc.delivery.opened}/${bc.delivery.delivered}`} sub={formatPct(openPct, 0)} />
          <StatCell label="Failed" value={`${bc.delivery.failed}/${bc.delivery.total}`}
            tone={bc.delivery.failed > 0 ? "alert" : "muted"} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground truncate tabular">by {bc.sentBy}</span>
          <span className="text-[10px] text-muted-foreground tabular">
            {bc.status === "Scheduled" && bc.scheduledFor ? `Scheduled ${formatDateTime(bc.scheduledFor)}`
              : bc.sentAt ? `Sent ${formatDateTime(bc.sentAt)}`
              : `Created ${relativeTime(bc.createdAt)}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isDraft && !readOnly && (
            <Btn variant="outline" size="xs" icon={<Send className="h-3 w-3" />} onClick={() => onSendDraft(bc)}>
              Send now
            </Btn>
          )}
          {isDraft && !readOnly && (
            <Btn variant="ghost" size="xs" icon={<Eye className="h-3 w-3" />} onClick={() => onEdit(bc)}>
              Edit
            </Btn>
          )}
          <Btn variant="ghost" size="xs" icon={<Eye className="h-3 w-3" />} onClick={() => onViewRecipients(bc)}>
            Recipients
          </Btn>
          {!readOnly && (
            <button onClick={() => onDelete(bc)} title="Delete broadcast"
              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ===== StatCell - delivery metric cell ===== */
function StatCell({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "muted" | "alert" }) {
  return (
    <div className={cn(
      "rounded-[4px] border border-border bg-background px-2 py-1.5 flex flex-col gap-0.5",
      tone === "alert" && "border-foreground/40",
    )}>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-baseline justify-between gap-1">
        <span className={cn(
          "text-[12px] font-medium tabular text-foreground",
          tone === "muted" && "text-muted-foreground",
        )}>
          {value}
        </span>
        {sub && <span className="text-[10px] text-muted-foreground tabular">{sub}</span>}
      </div>
    </div>
  );
}

export default BroadcastsView;

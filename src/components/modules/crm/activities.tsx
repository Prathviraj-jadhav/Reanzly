"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Filter, Link2 } from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCrmStore } from "./_store";
import {
  CRM_OWNERS,
  type Activity,
  type ActivityType,
} from "./_data";
import {
  formatDateTime,
  relativeTime,
  activityTypeMeta,
  FieldLabel,
} from "./_helpers";

const ACTIVITY_TYPES: ActivityType[] = [
  "Call",
  "Email",
  "Meeting",
  "Site Visit",
  "Follow-up",
  "Quotation Sent",
  "Note",
];

const DATE_RANGES = [
  { label: "All Time", days: null },
  { label: "Today", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export function Activities() {
  const activities = useCrmStore((s) => s.activities);
  const addActivity = useCrmStore((s) => s.addActivity);
  const accounts = useCrmStore((s) => s.accounts);
  const leads = useCrmStore((s) => s.leads);

  const [logOpen, setLogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [accountFilter, setAccountFilter] = useState<string>("All");
  const [rangeFilter, setRangeFilter] = useState<string>("30 days");

  const filtered = useMemo(() => {
    const range = DATE_RANGES.find((r) => r.label === rangeFilter);
    const cutoff = range?.days !== null && range?.days !== undefined
      ? Date.now() - range.days * 86400000
      : 0;
    return activities
      .filter((a) => {
        if (typeFilter !== "All" && a.type !== typeFilter) return false;
        if (ownerFilter !== "All" && a.owner !== ownerFilter) return false;
        if (accountFilter !== "All" && a.accountName !== accountFilter) return false;
        if (cutoff && new Date(a.date).getTime() < cutoff) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities, typeFilter, ownerFilter, accountFilter, rangeFilter]);

  const uniqueAccounts = useMemo(
    () => Array.from(new Set(activities.map((a) => a.accountName).filter((a): a is string => !!a))),
    [activities],
  );

  const todayCount = activities.filter(
    (a) => new Date(a.date).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Total Activities" value={String(activities.length)} />
        <KpiMini label="Logged Today" value={String(todayCount)} />
        <KpiMini
          label="Calls This Week"
          value={String(
            activities.filter((a) => a.type === "Call" && Date.now() - new Date(a.date).getTime() < 7 * 86400000).length,
          )}
        />
        <KpiMini
          label="Meetings This Month"
          value={String(
            activities.filter((a) => a.type === "Meeting" && Date.now() - new Date(a.date).getTime() < 30 * 86400000).length,
          )}
        />
      </div>

      {/* Toolbar */}
      <SectionCard
        title="Activity Feed"
        description={`${filtered.length} of ${activities.length} activities`}
        icon={<Filter className="h-4 w-4" />}
        collapsible
        flush
        bodyClassName="px-4 py-3"
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setLogOpen(true)}>
            Log Activity
          </Btn>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Type" value={typeFilter} options={["All", ...ACTIVITY_TYPES]} onChange={setTypeFilter} />
          <FilterSelect label="Owner" value={ownerFilter} options={["All", ...CRM_OWNERS]} onChange={setOwnerFilter} />
          <FilterSelect
            label="Account"
            value={accountFilter}
            options={["All", ...uniqueAccounts.slice(0, 12)]}
            onChange={setAccountFilter}
          />
          <FilterSelect
            label="Range"
            value={rangeFilter}
            options={DATE_RANGES.map((r) => r.label)}
            onChange={setRangeFilter}
          />
        </div>
      </SectionCard>

      {/* Timeline */}
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-[6px] border border-border bg-card p-3 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[12px] text-muted-foreground">
            No activities match the filters.
          </div>
        ) : (
          filtered.map((a) => <ActivityRow key={a.id} activity={a} />)
        )}
      </div>

      <LogActivityDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        accounts={accounts.map((a) => a.name)}
        leads={leads.map((l) => l.name)}
        onLog={(activity) => {
          addActivity(activity);
          setLogOpen(false);
          toast.success("Activity logged", {
            description: `${activity.type} · ${activity.title}`,
          });
        }}
        nextId={activities.length + 1}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] font-medium transition-colors hover:bg-accent tap">
          <span className="text-muted-foreground">{label}:</span>
          <span className="max-w-[120px] truncate text-foreground">{value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className={cn("text-[13px]", opt === value && "font-medium")}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const meta = activityTypeMeta(activity.type);
  const Icon = meta.icon;
  return (
    <div className="flex gap-3 rounded-[5px] border border-border bg-background p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="outline">{meta.label}</StatusBadge>
          <span className="text-[13px] font-medium text-foreground">{activity.title}</span>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {activity.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="tabular">{formatDateTime(activity.date)}</span>
          <span>·</span>
          <span>{relativeTime(activity.date)}</span>
          {activity.duration && (
            <>
              <span>·</span>
              <span className="tabular">{activity.duration} min</span>
            </>
          )}
          <span>·</span>
          <span>{activity.owner}</span>
          <span>·</span>
          <StatusBadge variant="muted">outcome: {activity.outcome}</StatusBadge>
        </div>
        {(activity.accountName || activity.dealName || activity.leadName) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {activity.accountName && (
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                <Link2 className="h-2.5 w-2.5" />
                {activity.accountName}
              </span>
            )}
            {activity.dealName && (
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                <Link2 className="h-2.5 w-2.5" />
                {activity.dealName}
              </span>
            )}
            {activity.leadName && (
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                <Link2 className="h-2.5 w-2.5" />
                {activity.leadName}
              </span>
            )}
          </div>
        )}
        {activity.nextStep && (
          <div className="mt-1 rounded-[3px] bg-muted/40 px-2 py-1 text-[11px] text-foreground">
            <span className="text-muted-foreground">Next step: </span>
            {activity.nextStep}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

function LogActivityDialog({
  open,
  onClose,
  onLog,
  accounts,
  leads,
  nextId,
}: {
  open: boolean;
  onClose: () => void;
  onLog: (a: Activity) => void;
  accounts: string[];
  leads: string[];
  nextId: number;
}) {
  const [form, setForm] = useState({
    type: "Call" as ActivityType,
    title: "",
    description: "",
    owner: CRM_OWNERS[0],
    duration: "",
    outcome: "",
    nextStep: "",
    linkedType: "Account" as "Account" | "Lead" | "None",
    linkedName: "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const activity: Activity = {
      id: `act-${Date.now()}`,
      activityId: `ACT-${String(nextId).padStart(4, "0")}`,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || "-",
      owner: form.owner,
      date: new Date().toISOString(),
      duration: form.duration ? Number(form.duration) : undefined,
      outcome: form.outcome || "Logged",
      nextStep: form.nextStep || undefined,
      accountName: form.linkedType === "Account" ? form.linkedName : undefined,
      leadName: form.linkedType === "Lead" ? form.linkedName : undefined,
    };
    onLog(activity);
    setForm({
      type: "Call",
      title: "",
      description: "",
      owner: CRM_OWNERS[0],
      duration: "",
      outcome: "",
      nextStep: "",
      linkedType: "Account",
      linkedName: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium tracking-tight">
            Log Activity
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Capture a call, email, meeting, or note. Link to an account or lead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Type</FieldLabel>
            <Select value={form.type} onValueChange={(v) => update("type", v as ActivityType)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Owner</FieldLabel>
            <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_OWNERS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <FieldLabel required>Title</FieldLabel>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Discovery call with Maruti Logistics"
              className="h-8 text-[13px]"
            />
          </div>
          <div className="col-span-2">
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What was discussed? Outcomes, action items…"
              rows={3}
              className="text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="minutes">Duration</FieldLabel>
            <Input
              value={form.duration}
              onChange={(e) => update("duration", e.target.value)}
              placeholder="e.g. 25"
              type="number"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Outcome</FieldLabel>
            <Input
              value={form.outcome}
              onChange={(e) => update("outcome", e.target.value)}
              placeholder="e.g. Qualified / Sent / Open"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Linked To</FieldLabel>
            <Select
              value={form.linkedType}
              onValueChange={(v) => update("linkedType", v as "Account" | "Lead" | "None")}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Account">Account</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            {form.linkedType === "None" ? (
              <Input value="-" disabled className="h-8 text-[13px]" />
            ) : (
              <Select value={form.linkedName} onValueChange={(v) => update("linkedName", v)}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder={`Select ${form.linkedType.toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent>
                  {(form.linkedType === "Account" ? accounts : leads).map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="col-span-2">
            <FieldLabel>Next Step</FieldLabel>
            <Input
              value={form.nextStep}
              onChange={(e) => update("nextStep", e.target.value)}
              placeholder="e.g. Follow up in 3 days"
              className="h-8 text-[13px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit}>
            Log Activity
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

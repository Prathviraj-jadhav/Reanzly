"use client";

/* ============================================================
   FieldServiceView - on-site customer visit scheduling for
   the Reanzly deployment / onboarding team.

   Layout:
     • KPI strip (4 tiles: This week / Completed / Pending / Avg resolution)
     • Visit DataTable (Visit ID / Customer / Type / Assigned To /
       Scheduled / Location / Status)
     • "Schedule Visit" Sheet drawer with showCloseButton={false}

   Strict monochrome Swiss design.
   ============================================================ */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MapPin, Search, Plus, ChevronDown, Download, Filter,
  Clock, CheckCircle2, CalendarClock, Activity, X,
  Building2, User as UserIcon, Navigation,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Btn } from "@/components/shared/btn";
import { KpiCard } from "@/components/shared/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSuperadminStore } from "./_store";
import {
  SEED_VISITS, VISIT_TYPES, VISIT_STATUSES, EMPTY_VISIT_FORM,
  type FieldVisit, type VisitType, type VisitStatus,
  visitStatusVariant,
} from "./_field-service-data";
import { formatDateTime, relativeTime } from "./_helpers";

const ASSIGNABLE_STAFF = [
  "Kavya Nair",
  "Sanjay Rao",
  "Priya Sharma",
  "Vivek Iyer",
  "Rohit Mehra",
  "Anand Kumar",
];

export function FieldServiceView() {
  const access = useSuperadminStore((s) => s.canAccess("field-service"));
  const readOnly = access === "read";
  const orgs = useSuperadminStore((s) => s.orgs);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [visits, setVisits] = useState<FieldVisit[]>(SEED_VISITS);

  const filtered = useMemo(() => {
    let r = visits;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          v.customer.toLowerCase().includes(q) ||
          v.assignedTo.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "All") r = r.filter((v) => v.type === typeFilter);
    if (statusFilter !== "All") r = r.filter((v) => v.status === statusFilter);
    return r;
  }, [visits, search, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 86_400_000;
    const weekAgo = now - 7 * 86_400_000;
    const thisWeek = visits.filter((v) => {
      const t = new Date(v.scheduledAt).getTime();
      return t >= weekAgo && t <= weekFromNow;
    }).length;
    const completed = visits.filter((v) => v.status === "Completed").length;
    const pending = visits.filter(
      (v) =>
        v.status === "Scheduled" ||
        v.status === "En Route" ||
        v.status === "In Progress",
    ).length;
    const completedVisits = visits.filter((v) => v.status === "Completed");
    const avgResolution =
      completedVisits.length > 0
        ? Math.round(
            completedVisits.reduce((acc, v) => acc + v.durationMin, 0) /
              completedVisits.length,
          )
        : 0;
    return { thisWeek, completed, pending, avgResolution, total: visits.length };
  }, [visits]);

  function handleSchedule(form: typeof EMPTY_VISIT_FORM) {
    const id = `fv-${String(visits.length + 100).padStart(3, "0")}`;
    const org = orgs.find((o) => o.brandName === form.customer);
    const newVisit: FieldVisit = {
      id,
      customer: form.customer.trim(),
      orgId: org?.id ?? "org-unknown",
      type: form.type,
      assignedTo: form.assignedTo || "Unassigned",
      scheduledAt: form.scheduledDate
        ? new Date(form.scheduledDate).toISOString()
        : new Date().toISOString(),
      durationMin: 120,
      location: form.location.trim() || "TBD",
      city: form.city.trim() || "TBD",
      status: "Scheduled",
      notes: form.description.trim() || undefined,
    };
    setVisits((prev) => [newVisit, ...prev]);
    toast("Visit scheduled", { description: `${id} - ${newVisit.customer}` });
    setCreateOpen(false);
  }

  const columns: Column<FieldVisit>[] = [
    {
      key: "id",
      header: "Visit ID",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.id,
      render: (r) => (
        <span className="font-mono text-[11px] tabular text-foreground">{r.id}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (r) => r.customer,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-foreground">{r.customer}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.city}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.type,
      render: (r) => (
        <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground">
          {r.type}
        </span>
      ),
    },
    {
      key: "assignedTo",
      header: "Assigned to",
      sortable: true,
      width: "160px",
      hideOnMobile: true,
      sortValue: (r) => r.assignedTo,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <UserIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-[12px] text-foreground">{r.assignedTo}</span>
        </div>
      ),
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      sortable: true,
      width: "160px",
      sortValue: (r) => r.scheduledAt,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] text-foreground">{formatDateTime(r.scheduledAt)}</span>
          <span className="tabular text-[10px] text-muted-foreground">{relativeTime(r.scheduledAt)}</span>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      width: "240px",
      hideOnMobile: true,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-[12px] text-muted-foreground">{r.location}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = visitStatusVariant(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = readOnly
    ? []
    : [
        {
          label: "Mark En Route",
          onClick: (v: FieldVisit) => {
            setVisits((prev) =>
              prev.map((x) => (x.id === v.id ? { ...x, status: "En Route" as VisitStatus } : x)),
            );
            toast("Status -> En Route", { description: v.id });
          },
        },
        {
          label: "Mark In Progress",
          onClick: (v: FieldVisit) => {
            setVisits((prev) =>
              prev.map((x) => (x.id === v.id ? { ...x, status: "In Progress" as VisitStatus } : x)),
            );
            toast("Status -> In Progress", { description: v.id });
          },
        },
        {
          label: "Mark Completed",
          onClick: (v: FieldVisit) => {
            setVisits((prev) =>
              prev.map((x) => (x.id === v.id ? { ...x, status: "Completed" as VisitStatus } : x)),
            );
            toast("Visit completed", { description: v.id });
          },
        },
        {
          label: "Cancel Visit",
          onClick: (v: FieldVisit) => {
            setVisits((prev) =>
              prev.map((x) => (x.id === v.id ? { ...x, status: "Cancelled" as VisitStatus } : x)),
            );
            toast("Visit cancelled", { description: v.id });
          },
        },
      ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-foreground" />
          <h2 className="text-[14px] font-medium text-foreground">Field Service</h2>
          <span className="text-[11px] text-muted-foreground">
            On-site visits - deployments - audits - renewals
          </span>
        </div>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Read-only
            </span>
          ) : (
            <Btn
              size="sm"
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
            >
              Schedule visit
            </Btn>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="This week's visits"
          value={kpis.thisWeek}
          icon={<CalendarClock className="h-4 w-4" />}
          delta={`of ${kpis.total} total`}
          trend="up"
        />
        <KpiCard
          label="Completed"
          value={kpis.completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          delta="all-time"
          trend="up"
        />
        <KpiCard
          label="Pending"
          value={kpis.pending}
          icon={<Clock className="h-4 w-4" />}
          delta="scheduled + en route + in progress"
          trend={kpis.pending > 0 ? "flat" : "up"}
        />
        <KpiCard
          label="Avg resolution"
          value={`${kpis.avgResolution}m`}
          icon={<Activity className="h-4 w-4" />}
          delta="completed visits"
          trend="up"
        />
      </div>

      {/* Visit DataTable */}
      <div className="overflow-hidden rounded-[6px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visit ID, customer, city, assignee..."
              aria-label="Search visits"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-7 text-[13px]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[110px] truncate">{typeFilter}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["All", ...VISIT_TYPES].map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn("text-[13px]", t === typeFilter && "font-medium text-foreground")}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{t}</span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {t === "All" ? visits.length : visits.filter((v) => v.type === t).length}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[110px] truncate">{statusFilter}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["All", ...VISIT_STATUSES].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn("text-[13px]", s === statusFilter && "font-medium text-foreground")}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{s}</span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {s === "All" ? visits.length : visits.filter((v) => v.status === s).length}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <Btn
            size="sm"
            variant="outline"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => toast("Exporting visit schedule", { description: `${filtered.length} visits` })}
          >
            Export
          </Btn>
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} of {visits.length}
          </div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          rowActions={rowActions}
          initialSort={{ key: "scheduledAt", dir: "asc" }}
          pageSize={25}
        />
      </div>

      {/* Schedule Visit Sheet */}
      <ScheduleVisitSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleSchedule}
      />
    </div>
  );
}

/* ============================================================
   ScheduleVisitSheet - Sheet drawer with showCloseButton={false}
   + a manual X in the header.
   ============================================================ */
function ScheduleVisitSheet({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: typeof EMPTY_VISIT_FORM) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex-col gap-0 p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <ScheduleVisitSheetBody
          key={open ? "open" : "closed"}
          onClose={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}

function ScheduleVisitSheetBody({
  onClose, onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: typeof EMPTY_VISIT_FORM) => void;
}) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const [form, setForm] = useState(EMPTY_VISIT_FORM);

  function patch(p: Partial<typeof EMPTY_VISIT_FORM>) {
    setForm((s) => ({ ...s, ...p }));
  }

  function handleSubmit() {
    if (!form.customer.trim()) {
      toast("Customer required", { description: "Pick an org or enter a name" });
      return;
    }
    if (!form.assignedTo) {
      toast("Assignee required", { description: "Assign a staff member" });
      return;
    }
    if (!form.scheduledDate) {
      toast("Scheduled date required", { description: "When does the visit happen?" });
      return;
    }
    if (!form.location.trim()) {
      toast("Location required", { description: "Where is the visit happening?" });
      return;
    }
    onSubmit(form);
    setForm(EMPTY_VISIT_FORM);
  }

  // Default the datetime-local value to "now + 1 day, 10:00"
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  return (
    <>
      <SheetHeader className="gap-2 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3 pr-6">
          <div className="min-w-0">
            <SheetTitle className="truncate text-[16px] tracking-tight">
              Schedule visit
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[12px]">
              Book an on-site visit for a Reanzly customer.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        <div className="flex flex-col gap-4">
          {/* Customer - text input with org suggestions */}
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Customer <span className="text-foreground">*</span>
            </Label>
            <Input
              value={form.customer}
              onChange={(e) => patch({ customer: e.target.value })}
              placeholder="e.g. Bhavna Industries"
              className="h-9 rounded-[5px] text-[13px]"
              list="fs-customer-list"
            />
            <datalist id="fs-customer-list">
              {orgs.slice(0, 50).map((o) => (
                <option key={o.id} value={o.brandName}>
                  {o.id}
                </option>
              ))}
            </datalist>
          </div>

          {/* Type + Assignee */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Type <span className="text-foreground">*</span>
              </Label>
              <Select
                value={form.type}
                onValueChange={(v) => patch({ type: v as VisitType })}
              >
                <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Pick a type" />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-[13px]">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Assigned to <span className="text-foreground">*</span>
              </Label>
              <Select
                value={form.assignedTo}
                onValueChange={(v) => patch({ assignedTo: v })}
              >
                <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Pick a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_STAFF.map((s) => (
                    <SelectItem key={s} value={s} className="text-[13px]">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled date */}
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Scheduled date &amp; time <span className="text-foreground">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={form.scheduledDate || defaultDate}
              onChange={(e) => patch({ scheduledDate: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>

          {/* Location + City */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Location <span className="text-foreground">*</span>
              </Label>
              <Input
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
                placeholder="Full address"
                className="h-9 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
                City
              </Label>
              <Input
                value={form.city}
                onChange={(e) => patch({ city: e.target.value })}
                placeholder="e.g. Bengaluru"
                className="h-9 rounded-[5px] text-[13px]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Visit notes / agenda
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What needs to happen at this visit? Bring what? Talk to whom?"
              className="min-h-[120px] rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-3">
        <span className="text-[11px] text-muted-foreground">
          Visit is created with status Scheduled. Update from the row menu.
        </span>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" size="sm" icon={<CalendarClock className="h-3 w-3" />} onClick={handleSubmit}>
            Schedule visit
          </Btn>
        </div>
      </SheetFooter>
    </>
  );
}

export default FieldServiceView;

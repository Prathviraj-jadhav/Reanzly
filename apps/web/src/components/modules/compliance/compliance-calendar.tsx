"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import {
  CalendarClock, ShieldCheck, FileText, Banknote, Truck, User,
  AlertTriangle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Building2, Wrench, Fuel, Gauge, Receipt, Stamp, Bell,
} from "lucide-react";
import {
  STATUTORY_FILINGS,
  VEHICLE_COMPLIANCE_DOCS,
  DRIVER_COMPLIANCE_DOCS,
  formatINR,
  formatDate,
  formatINRCompact,
  daysUntil,
  daysAhead,
  daysAgo,
  type StatutoryFiling,
} from "./_helpers";

/* ============================================================
   ComplianceCalendarTab - unified calendar view of all
   upcoming due dates across statutory filings + vehicle +
   driver documents. Includes a 6-month forward agenda,
   a category breakdown, and a per-entity compliance score.
   ============================================================ */

interface CalendarItem {
  id: string;
  ref: string;
  category: "PF" | "ESI" | "GST" | "TDS" | "PT" | "RC" | "Insurance" | "Fitness" | "PUC" | "Permit" | "DL" | "Medical" | "Police";
  title: string;
  entity: string;
  dueDate: string;
  liability: number;
  status: "Filed" | "Paid" | "Pending" | "Overdue" | "Valid" | "Expiring Soon" | "Expired" | "Submitted" | "Draft";
  authority: string;
  refNo: string;
}

const CATEGORY_META: Record<CalendarItem["category"], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  PF: { label: "PF Return", icon: Banknote },
  ESI: { label: "ESI Return", icon: ShieldCheck },
  GST: { label: "GST Return", icon: FileText },
  TDS: { label: "TDS Return", icon: Receipt },
  PT: { label: "Professional Tax", icon: Stamp },
  RC: { label: "RC Renewal", icon: Truck },
  Insurance: { label: "Insurance Renewal", icon: ShieldCheck },
  Fitness: { label: "Fitness Renewal", icon: Gauge },
  PUC: { label: "PUC Renewal", icon: Fuel },
  Permit: { label: "Permit Renewal", icon: Truck },
  DL: { label: "Driving Licence", icon: User },
  Medical: { label: "Medical Fitness", icon: User },
  Police: { label: "Police Verification", icon: ShieldCheck },
};

function deriveCalendarItems(): CalendarItem[] {
  const items: CalendarItem[] = [];

  // Statutory filings -> PF/ESI/GST/TDS/PT
  STATUTORY_FILINGS.forEach((f) => {
    let category: CalendarItem["category"] | null = null;
    if (f.type.includes("PF")) category = "PF";
    else if (f.type.includes("ESI")) category = "ESI";
    else if (f.type.includes("GST")) category = "GST";
    else if (f.type.includes("TDS")) category = "TDS";
    else if (f.type.includes("Professional") || f.type.includes("PT")) category = "PT";
    if (!category) return;
    items.push({
      id: f.id,
      ref: f.filingNo,
      category,
      title: `${f.type} · ${f.period}`,
      entity: "Reanzly Logistics Pvt Ltd",
      dueDate: f.dueDate,
      liability: f.liability,
      status: f.status,
      authority: category === "PF" ? "EPFO" : category === "ESI" ? "ESIC" : category === "GST" ? "GSTN" : category === "TDS" ? "TRACES" : "State PT Dept",
      refNo: f.arn ?? `DRAFT-${f.filingNo}`,
    });
  });

  // Vehicle compliance docs -> RC/Insurance/Fitness/PUC/Permit
  VEHICLE_COMPLIANCE_DOCS.forEach((d) => {
    let category: CalendarItem["category"] | null = null;
    if (d.docType.includes("RC")) category = "RC";
    else if (d.docType.includes("Insurance")) category = "Insurance";
    else if (d.docType.includes("Fitness")) category = "Fitness";
    else if (d.docType.includes("PUC") || d.docType.includes("Pollution")) category = "PUC";
    else if (d.docType.includes("Permit")) category = "Permit";
    if (!category) return;
    items.push({
      id: d.id,
      ref: d.docNo,
      category,
      title: `${CATEGORY_META[category].label} · ${d.vehicle}`,
      entity: d.vehicle,
      dueDate: d.expiryDate,
      liability: d.cost ?? 0,
      status: d.status,
      authority: d.authority ?? "RTO",
      refNo: d.refNo ?? d.docNo,
    });
  });

  // Driver compliance docs -> DL/Medical/Police
  DRIVER_COMPLIANCE_DOCS.forEach((d) => {
    let category: CalendarItem["category"] | null = null;
    if (d.docType.includes("Driving Licence")) category = "DL";
    else if (d.docType.includes("Medical")) category = "Medical";
    else if (d.docType.includes("Police")) category = "Police";
    if (!category) return;
    items.push({
      id: d.id,
      ref: d.docNo,
      category,
      title: `${CATEGORY_META[category].label} · ${d.driver}`,
      entity: `${d.driver} (${d.empCode})`,
      dueDate: d.expiryDate ?? daysAhead(365),
      liability: 0,
      status: d.status,
      authority: d.authority ?? "RTO",
      refNo: d.refNo ?? d.docNo,
    });
  });

  return items.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
}

const CALENDAR_ITEMS = deriveCalendarItems();

/* ============================================================
   Main component.
   ============================================================ */
export function ComplianceCalendarTab() {
  const [monthOffset, setMonthOffset] = useState(0);

  // ===== Filter to next 6 months (from "today + monthOffset") =====
  const baseDate = new Date();
  baseDate.setDate(1);
  baseDate.setMonth(baseDate.getMonth() + monthOffset);
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59);

  const monthItems = useMemo(
    () => CALENDAR_ITEMS.filter((it) => {
      const t = +new Date(it.dueDate);
      return t >= +monthStart && t <= +monthEnd;
    }),
    [monthStart, monthEnd],
  );

  // Next 6 months ahead items for the upcoming agenda.
  const upcoming = useMemo(() => {
    const start = +new Date();
    const end = Date.now() + 180 * 86400000;
    return CALENDAR_ITEMS.filter((it) => {
      const t = +new Date(it.dueDate);
      return t >= start && t <= end;
    }).slice(0, 12);
  }, []);

  // KPIs
  const overdueCount = CALENDAR_ITEMS.filter((i) => i.status === "Overdue" || i.status === "Expired").length;
  const expiringCount = CALENDAR_ITEMS.filter((i) => i.status === "Expiring Soon").length;
  const pendingCount = CALENDAR_ITEMS.filter((i) => i.status === "Pending" || i.status === "Submitted").length;
  const totalLiability = CALENDAR_ITEMS
    .filter((i) => i.status === "Overdue" || i.status === "Expired" || i.status === "Pending")
    .reduce((s, i) => s + i.liability, 0);
  const complianceScore = CALENDAR_ITEMS.length > 0
    ? Math.round(
        (CALENDAR_ITEMS.filter((i) => i.status === "Filed" || i.status === "Paid" || i.status === "Valid").length
          / CALENDAR_ITEMS.length) * 100,
      )
    : 100;

  // ===== Category breakdown =====
  const categoryBreakdown = useMemo(() => {
    const map = new Map<CalendarItem["category"], number>();
    CALENDAR_ITEMS.forEach((i) => map.set(i.category, (map.get(i.category) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([cat, count]) => ({ category: cat, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  // ===== Calendar grid for the selected month =====
  const daysInMonth = monthEnd.getDate();
  const firstDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay(); // 0=Sun
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Build calendar cells: leading blanks + days.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Items by day.
  const itemsByDay = new Map<number, CalendarItem[]>();
  monthItems.forEach((it) => {
    const day = new Date(it.dueDate).getDate();
    const arr = itemsByDay.get(day) ?? [];
    arr.push(it);
    itemsByDay.set(day, arr);
  });

  const today = new Date();
  const isCurrentMonth = monthOffset === 0
    || (monthOffset < 0 && false);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Compliance Score" value={`${complianceScore}%`} hint="overall" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Overdue" value={String(overdueCount)} hint="action req'd" />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Expiring Soon" value={String(expiringCount)} hint="30 days" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending" value={String(pendingCount)} hint="awaiting" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Total Liability" value={formatINRCompact(totalLiability)} hint="due + overdue" />
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="Total Items" value={String(CALENDAR_ITEMS.length)} hint="tracked" />
      </div>

      {/* Calendar + agenda */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Month calendar grid */}
        <SectionCard
          title="Calendar"
          description="Click any day to see what's due."
          icon={<CalendarClock className="h-4 w-4" />}
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-1">
              <Btn size="sm" variant="outline" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month" />
              <span className="min-w-[120px] text-center text-[12px] font-medium tabular">{monthLabel}</span>
              <Btn size="sm" variant="outline" iconRight={<ChevronRight className="h-3.5 w-3.5" />} onClick={() => setMonthOffset((m) => m + 1)} aria-label="Next month" />
            </div>
          }
        >
          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 border-b border-border pb-2">
            {weekdays.map((w) => (
              <div key={w} className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {w}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {cells.map((day, i) => {
              if (day === null) return <div key={`b-${i}`} className="min-h-[72px]" />;
              const items = itemsByDay.get(day) ?? [];
              const isToday =
                isCurrentMonth &&
                today.getDate() === day &&
                today.getMonth() === monthStart.getMonth() &&
                today.getFullYear() === monthStart.getFullYear();
              const hasOverdue = items.some((it) => it.status === "Overdue" || it.status === "Expired");
              const hasExpiring = items.some((it) => it.status === "Expiring Soon" || it.status === "Pending");
              return (
                <div
                  key={`d-${day}`}
                  className={cn(
                    "relative flex min-h-[72px] flex-col gap-0.5 rounded-[4px] border border-border bg-background p-1",
                    isToday && "border-foreground",
                    items.length > 0 && "bg-accent/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "tabular text-[11px] font-medium",
                        isToday ? "rounded-[2px] bg-foreground px-1 text-background" : "text-muted-foreground",
                      )}
                    >
                      {day}
                    </span>
                    {items.length > 0 && (
                      <span className="tabular text-[9px] text-muted-foreground">{items.length}</span>
                    )}
                  </div>
                  {items.slice(0, 2).map((it) => {
                    const Icon = CATEGORY_META[it.category].icon;
                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-1 rounded-[2px] px-1 py-0.5"
                        title={`${it.title} · ${formatDate(it.dueDate)}`}
                      >
                        <Icon className={cn(
                          "h-2.5 w-2.5 shrink-0",
                          hasOverdue ? "text-foreground" : "text-muted-foreground",
                        )} />
                        <span className="truncate text-[9px] text-foreground">{CATEGORY_META[it.category].label}</span>
                      </div>
                    );
                  })}
                  {items.length > 2 && (
                    <span className="tabular text-[9px] text-muted-foreground">+{items.length - 2} more</span>
                  )}
                  {/* Status indicator dot */}
                  {items.length > 0 && (
                    <span
                      className={cn(
                        "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
                        hasOverdue ? "bg-foreground" : hasExpiring ? "bg-foreground/55" : "bg-foreground/30",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" /> Overdue / Expired
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground/55" /> Expiring / Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground/30" /> Filed / Valid
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-[2px] border border-foreground" /> Today
            </span>
          </div>
        </SectionCard>

        {/* Upcoming agenda */}
        <SectionCard
          title="Upcoming Agenda"
          description="Next 12 due dates in the next 6 months."
          icon={<Bell className="h-4 w-4" />}
          flush
          bodyClassName="divide-y divide-border max-h-[480px] overflow-y-auto scrollbar-thin"
        >
          {upcoming.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No upcoming due dates in the next 6 months.
            </div>
          ) : (
            upcoming.map((it) => {
              const days = daysUntil(it.dueDate);
              const Icon = CATEGORY_META[it.category].icon;
              return (
                <div key={it.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border text-muted-foreground">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-foreground">{it.title}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{it.entity}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="tabular">{formatDate(it.dueDate)}</span>
                          <span>·</span>
                          <span>{it.authority}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge
                        variant={
                          it.status === "Overdue" || it.status === "Expired" ? "solid"
                          : it.status === "Expiring Soon" || it.status === "Pending" || it.status === "Submitted" ? "outline"
                          : "muted"
                        }
                        pulse={it.status === "Overdue" || it.status === "Expired"}
                      >
                        {it.status}
                      </StatusBadge>
                      <span className="tabular text-[10px] text-muted-foreground">
                        {days !== null && days >= 0 ? `in ${days}d` : days !== null ? `${Math.abs(days)}d ago` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </SectionCard>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Category Breakdown"
          description="Number of items tracked per compliance category."
          icon={<FileText className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryBreakdown.map((c) => {
              const Icon = CATEGORY_META[c.category].icon;
              return (
                <div key={c.category} className="rounded-[5px] border border-border bg-background px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-[11px] font-medium text-foreground">{CATEGORY_META[c.category].label}</span>
                    </div>
                    <span className="tabular text-[12px] font-medium text-foreground">{c.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Per-Entity Compliance Score"
          description="Top entities by compliance health."
          icon={<ShieldCheck className="h-4 w-4" />}
          flush
          bodyClassName="divide-y divide-border max-h-[300px] overflow-y-auto scrollbar-thin"
        >
          {computeEntityScores().map((e, i) => (
            <div key={e.entity} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-4 shrink-0 text-[10px] tabular text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-foreground">{e.entity}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{e.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      e.score >= 80 ? "bg-foreground" : e.score >= 50 ? "bg-foreground/65" : "bg-foreground/35",
                    )}
                    style={{ width: `${e.score}%` }}
                  />
                </div>
                <StatusBadge variant={e.score >= 80 ? "solid" : e.score >= 50 ? "outline" : "muted"}>
                  {e.score}%
                </StatusBadge>
              </div>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

/* ============================================================
   Helpers.
   ============================================================ */

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

function computeEntityScores(): { entity: string; type: string; score: number }[] {
  const map = new Map<string, { type: string; total: number; valid: number }>();
  CALENDAR_ITEMS.forEach((it) => {
    const key = it.entity;
    const cur = map.get(key) ?? { type: "Other", total: 0, valid: 0 };
    cur.total += 1;
    if (it.status === "Filed" || it.status === "Paid" || it.status === "Valid") cur.valid += 1;
    // Determine entity type by checking the entity name pattern
    if (!map.has(key)) {
      if (/^MH|^GJ|^KA|^TS|^RJ|^MP/.test(key)) cur.type = "Vehicle";
      else if (key.includes("Reanzly")) cur.type = "Company";
      else cur.type = "Driver";
    }
    map.set(key, cur);
  });
  return Array.from(map.entries())
    .map(([entity, v]) => ({
      entity,
      type: v.type,
      score: v.total > 0 ? Math.round((v.valid / v.total) * 100) : 100,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
}

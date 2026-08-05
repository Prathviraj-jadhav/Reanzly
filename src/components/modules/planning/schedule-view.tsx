"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  RESOURCES,
  ALLOCATIONS,
  CONFLICT_IDS,
  resourceTypeMeta,
  allocationStatusBadge,
  startOfWeek,
  dayLabels,
  type Allocation,
  type PlanningResource,
} from "./_helpers";
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar } from "lucide-react";
import { toastInfo } from "@/lib/toast";

const HOURS_PER_DAY = 24;
const DAY_HEADER_HEIGHT = "h-9";
const ROW_HEIGHT = "h-12";
const RESOURCE_COL_WIDTH = "w-[200px] min-w-[200px]";

/* ============================================================
   ScheduleView - Gantt-style grid for resource planning.
   Rows = resources (drivers / vehicles / bays).
   Columns = days (Week View) or hours (Day View).

   UX laws applied:
   • Law of Common Region - hairline borders define cells; one
     bordered card wraps the entire grid.
   • Law of Proximity - allocations sit inside their resource row,
     so the eye chunks by row, not by absolute cell.
   • Von Restorff Effect - conflicts get a thicker accent border
     + pulse so they stand out from regular allocations.
   • Fitts's Law - 44px row height for comfortable click target.
   • Doherty Threshold - everything is computed in useMemo so
     scrolling/pagination stays < 16ms.
   ============================================================ */

interface ScheduleViewProps {
  mode: "week" | "day";
}

export function ScheduleView({ mode }: ScheduleViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "Driver" | "Vehicle" | "Bay">("all");
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);

  const days = useMemo(() => dayLabels(weekStart), [weekStart]);

  const visibleResources = useMemo(() => {
    let list = RESOURCES;
    if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);
    if (showConflictsOnly) {
      const conflictResourceIds = new Set<string>();
      ALLOCATIONS.forEach((a) => {
        if (CONFLICT_IDS.has(a.id)) conflictResourceIds.add(a.resourceId);
      });
      list = list.filter((r) => conflictResourceIds.has(r.id));
    }
    return list;
  }, [typeFilter, showConflictsOnly]);

  const allocationsByResource = useMemo(() => {
    const m = new Map<string, Allocation[]>();
    ALLOCATIONS.forEach((a) => {
      if (!m.has(a.resourceId)) m.set(a.resourceId, []);
      m.get(a.resourceId)!.push(a);
    });
    return m;
  }, []);

  const conflictCount = CONFLICT_IDS.size;

  // Stat strip
  const totalAllocations = ALLOCATIONS.length;
  const totalHours = ALLOCATIONS.reduce((s, a) => s + a.durationHours, 0);
  const avgUtilisation = Math.round(
    RESOURCES.reduce((s, r) => s + r.utilisationWeek, 0) / RESOURCES.length,
  );

  if (mode === "day") {
    return (
      <DaySchedule
        resources={visibleResources}
        allocationsByResource={allocationsByResource}
        days={days}
        selectedDayIdx={selectedDayIdx}
        setSelectedDayIdx={setSelectedDayIdx}
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        showConflictsOnly={showConflictsOnly}
        setShowConflictsOnly={setShowConflictsOnly}
        selectedAllocation={selectedAllocation}
        setSelectedAllocation={setSelectedAllocation}
        stats={{ conflictCount, totalAllocations, totalHours, avgUtilisation }}
      />
    );
  }

  return (
    <WeekSchedule
      resources={visibleResources}
      allocationsByResource={allocationsByResource}
      days={days}
      weekStart={weekStart}
      setWeekStart={setWeekStart}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      showConflictsOnly={showConflictsOnly}
      setShowConflictsOnly={setShowConflictsOnly}
      selectedAllocation={selectedAllocation}
      setSelectedAllocation={setSelectedAllocation}
      stats={{ conflictCount, totalAllocations, totalHours, avgUtilisation }}
    />
  );
}

/* ============================================================
   Shared header strip - week nav, filter, conflict toggle, stats
   ============================================================ */
interface SharedProps {
  weekStart: Date;
  setWeekStart: (d: Date) => void;
  typeFilter: "all" | "Driver" | "Vehicle" | "Bay";
  setTypeFilter: (v: "all" | "Driver" | "Vehicle" | "Bay") => void;
  showConflictsOnly: boolean;
  setShowConflictsOnly: (v: boolean) => void;
  selectedAllocation: Allocation | null;
  setSelectedAllocation: (a: Allocation | null) => void;
  stats: { conflictCount: number; totalAllocations: number; totalHours: number; avgUtilisation: number };
}

function ScheduleToolbar({
  weekStart,
  setWeekStart,
  typeFilter,
  setTypeFilter,
  showConflictsOnly,
  setShowConflictsOnly,
  stats,
}: Pick<
  SharedProps,
  "weekStart" | "setWeekStart" | "typeFilter" | "setTypeFilter" | "showConflictsOnly" | "setShowConflictsOnly" | "stats"
>) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() - 7);
            setWeekStart(d);
          }}
          className="tap flex h-8 w-8 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + 7);
            setWeekStart(d);
          }}
          className="tap flex h-8 w-8 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Next week"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setWeekStart(startOfWeek())}
          className="tap flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent"
        >
          <Calendar className="h-3 w-3 text-muted-foreground" />
          Today
        </button>
      </div>
      <span className="rounded-[5px] border border-border bg-background px-2.5 py-1 text-[12px] font-medium tabular text-foreground">
        {fmt(weekStart)} → {fmt(weekEnd)}
      </span>

      <div className="ml-2 inline-flex items-center gap-0.5 rounded-[5px] border border-border bg-muted/30 p-0.5">
        {(["all", "Driver", "Vehicle", "Bay"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "flex h-7 items-center rounded-[4px] px-2.5 text-[12px] font-medium transition-colors tap",
              typeFilter === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t === "all" ? "All" : t === "Driver" ? "Drivers" : t === "Vehicle" ? "Vehicles" : "Bays"}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowConflictsOnly(!showConflictsOnly)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors tap",
          showConflictsOnly
            ? "border-foreground bg-foreground text-background"
            : "border-border text-foreground hover:bg-accent",
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Conflicts
        <span className="tabular text-[10px] opacity-70">{stats.conflictCount}</span>
      </button>

      <div className="flex-1" />

      <div className="hidden items-center gap-4 text-[11px] text-muted-foreground tabular sm:flex">
        <span>{stats.totalAllocations} allocations</span>
        <span>· {stats.totalHours}h scheduled</span>
        <span>· avg util {stats.avgUtilisation}%</span>
      </div>
    </div>
  );
}

/* ============================================================
   Allocation pill - the visual block rendered inside a cell
   ============================================================ */
function AllocationPill({
  allocation,
  isConflict,
  onSelect,
}: {
  allocation: Allocation;
  isConflict: boolean;
  onSelect: (a: Allocation) => void;
}) {
  const statusMeta = allocationStatusBadge(allocation.status);
  return (
    <button
      onClick={() => onSelect(allocation)}
      className={cn(
        "group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[4px] border px-2 py-1 text-left transition-colors tap",
        statusMeta.variant === "solid" && "border-foreground bg-foreground text-background",
        statusMeta.variant === "outline" && "border-border bg-background text-foreground hover:border-foreground/40",
        statusMeta.variant === "muted" && "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        isConflict && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
      )}
      title={`${allocation.title} · ${allocation.refNo}`}
    >
      <div className="flex items-center gap-1.5">
        {isConflict && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
        <span className="truncate text-[10px] font-medium leading-tight">
          {allocation.title}
        </span>
      </div>
      <span className="tabular text-[9px] opacity-70 leading-tight">{allocation.refNo}</span>
    </button>
  );
}

/* ============================================================
   WEEK VIEW
   Columns: 7 days. Allocations rendered as absolutely-positioned
   blocks inside a CSS grid (each row = 1 resource × 7 day cells).
   ============================================================ */
function WeekSchedule({
  resources,
  allocationsByResource,
  days,
  weekStart,
  setWeekStart,
  typeFilter,
  setTypeFilter,
  showConflictsOnly,
  setShowConflictsOnly,
  selectedAllocation,
  setSelectedAllocation,
  stats,
}: SharedProps & {
  resources: PlanningResource[];
  allocationsByResource: Map<string, Allocation[]>;
  days: ReturnType<typeof dayLabels>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ScheduleToolbar
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        showConflictsOnly={showConflictsOnly}
        setShowConflictsOnly={setShowConflictsOnly}
        stats={stats}
      />
      <div className="rounded-[6px] border border-border bg-card">
        {/* Day header */}
        <div className="flex border-b border-border">
          <div className={cn("shrink-0 border-r border-border px-3", RESOURCE_COL_WIDTH, DAY_HEADER_HEIGHT, "flex items-center")}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Resource</span>
          </div>
          <div className="grid flex-1 grid-cols-7">
            {days.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center justify-center border-r border-border px-2 py-1 last:border-r-0",
                  DAY_HEADER_HEIGHT,
                )}
              >
                <span className="text-[11px] font-medium text-foreground">{d.label}</span>
                <span className="tabular text-[10px] text-muted-foreground">{d.dateNum}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Resource rows */}
        <div className="divide-y divide-border">
          {resources.length === 0 && (
            <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">
              No resources match the current filters.
            </div>
          )}
          {resources.map((r) => {
            const allocs = allocationsByResource.get(r.id) || [];
            const typeMeta = resourceTypeMeta(r.type);
            const Icon = typeMeta.icon;
            return (
              <div key={r.id} className="flex">
                {/* Resource label cell */}
                <div
                  className={cn(
                    "shrink-0 border-r border-border px-3 py-2",
                    RESOURCE_COL_WIDTH,
                    ROW_HEIGHT,
                    "flex items-center gap-2",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">{r.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground tabular">{r.code}</div>
                  </div>
                </div>
                {/* Day cells */}
                <div className="grid flex-1 grid-cols-7">
                  {days.map((_, dayIdx) => {
                    const dayAllocs = allocs.filter((a) => a.startDay === dayIdx);
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "relative border-r border-border last:border-r-0",
                          ROW_HEIGHT,
                          dayIdx === 5 || dayIdx === 6 ? "bg-muted/20" : "",
                        )}
                      >
                        {dayAllocs.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          </div>
                        )}
                        {dayAllocs.slice(0, 2).map((a) => {
                          const isConflict = CONFLICT_IDS.has(a.id);
                          return (
                            <div
                              key={a.id}
                              className="absolute inset-x-1 px-0.5"
                              style={{ top: 4, bottom: 4 }}
                            >
                              <AllocationPill
                                allocation={a}
                                isConflict={isConflict}
                                onSelect={(al) => {
                                  setSelectedAllocation(al);
                                  if (isConflict) {
                                    toastInfo("Conflict selected", `${al.title} overlaps another allocation on this resource.`);
                                  }
                                }}
                              />
                            </div>
                          );
                        })}
                        {dayAllocs.length > 2 && (
                          <div className="absolute bottom-0 right-1 tabular text-[9px] text-muted-foreground">
                            +{dayAllocs.length - 2}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AllocationDetailSheet
        allocation={selectedAllocation}
        onClose={() => setSelectedAllocation(null)}
      />

      <p className="text-[11px] text-muted-foreground">
        Week grid · {resources.length} resources · 7 days · conflict cells ringed with foreground accent.
      </p>
    </div>
  );
}

/* ============================================================
   DAY VIEW
   Columns: 24 hours. Allocations rendered as absolutely-positioned
   blocks sized by durationHours, anchored at startHour.
   ============================================================ */
function DaySchedule({
  resources,
  allocationsByResource,
  days,
  selectedDayIdx,
  setSelectedDayIdx,
  weekStart,
  setWeekStart,
  typeFilter,
  setTypeFilter,
  showConflictsOnly,
  setShowConflictsOnly,
  selectedAllocation,
  setSelectedAllocation,
  stats,
}: SharedProps & {
  resources: PlanningResource[];
  allocationsByResource: Map<string, Allocation[]>;
  days: ReturnType<typeof dayLabels>;
  selectedDayIdx: number;
  setSelectedDayIdx: (i: number) => void;
}) {
  const HOUR_COL_WIDTH_PX = 56;
  return (
    <div className="flex flex-col gap-4">
      <ScheduleToolbar
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        showConflictsOnly={showConflictsOnly}
        setShowConflictsOnly={setShowConflictsOnly}
        stats={stats}
      />
      {/* Day picker */}
      <div className="flex items-center gap-1.5">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setSelectedDayIdx(i)}
            className={cn(
              "tap flex flex-col items-center rounded-[5px] border px-3 py-1.5 text-[12px] transition-colors",
              selectedDayIdx === i
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-accent",
            )}
          >
            <span className="font-medium">{d.label}</span>
            <span className="tabular text-[10px] opacity-70">{d.dateNum}</span>
          </button>
        ))}
      </div>
      <div className="rounded-[6px] border border-border bg-card overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: `calc(${RESOURCE_COL_WIDTH} + ${HOUR_COL_WIDTH_PX * 24}px)` }}>
          {/* Hour header */}
          <div className="flex border-b border-border">
            <div className={cn("shrink-0 border-r border-border px-3", RESOURCE_COL_WIDTH, DAY_HEADER_HEIGHT, "flex items-center")}>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Resource</span>
            </div>
            <div className="flex">
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className={cn(
                    "flex items-start justify-center border-r border-border px-1 pt-1.5 last:border-r-0",
                    DAY_HEADER_HEIGHT,
                  )}
                  style={{ width: `${HOUR_COL_WIDTH_PX}px` }}
                >
                  <span className="tabular text-[9px] text-muted-foreground">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Resource rows */}
          <div className="divide-y divide-border">
            {resources.length === 0 && (
              <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                No resources match the current filters.
              </div>
            )}
            {resources.map((r) => {
              const allocs = (allocationsByResource.get(r.id) || []).filter((a) => a.startDay === selectedDayIdx);
              const typeMeta = resourceTypeMeta(r.type);
              const Icon = typeMeta.icon;
              return (
                <div key={r.id} className="flex">
                  <div
                    className={cn(
                      "shrink-0 border-r border-border px-3 py-2",
                      RESOURCE_COL_WIDTH,
                      ROW_HEIGHT,
                      "flex items-center gap-2",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-foreground">{r.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground tabular">{r.code}</div>
                    </div>
                  </div>
                  {/* Hours grid */}
                  <div className="relative" style={{ width: `${HOUR_COL_WIDTH_PX * 24}px`, height: 48 }}>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div
                        key={h}
                        className={cn(
                          "absolute top-0 bottom-0 border-r border-border",
                          h === 23 && "border-r-0",
                        )}
                        style={{ left: `${h * HOUR_COL_WIDTH_PX}px`, width: `${HOUR_COL_WIDTH_PX}px` }}
                      />
                    ))}
                    {allocs.map((a) => {
                      const isConflict = CONFLICT_IDS.has(a.id);
                      const left = a.startHour * HOUR_COL_WIDTH_PX;
                      const width = Math.max(40, a.durationHours * HOUR_COL_WIDTH_PX - 4);
                      return (
                        <div
                          key={a.id}
                          className="absolute top-1 bottom-1"
                          style={{ left: `${left + 2}px`, width: `${width}px` }}
                        >
                          <AllocationPill
                            allocation={a}
                            isConflict={isConflict}
                            onSelect={(al) => {
                              setSelectedAllocation(al);
                              if (isConflict) {
                                toastInfo("Conflict selected", `${al.title} overlaps another allocation on this resource.`);
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AllocationDetailSheet
        allocation={selectedAllocation}
        onClose={() => setSelectedAllocation(null)}
      />

      <p className="text-[11px] text-muted-foreground">
        Day view · {days[selectedDayIdx].label} {days[selectedDayIdx].dateNum} · {resources.length} resources · 24-hour timeline.
      </p>
    </div>
  );
}

/* ============================================================
   Allocation detail side panel - rendered as a small info card
   below the grid when an allocation is selected.
   ============================================================ */
function AllocationDetailSheet({
  allocation,
  onClose,
}: {
  allocation: Allocation | null;
  onClose: () => void;
}) {
  if (!allocation) return null;
  const resource = RESOURCES.find((r) => r.id === allocation.resourceId);
  const statusMeta = allocationStatusBadge(allocation.status);
  const isConflict = CONFLICT_IDS.has(allocation.id);
  const startsAt = `${String(allocation.startHour).padStart(2, "0")}:00`;
  const endsAtHour = (allocation.startHour + allocation.durationHours) % 24;
  const endsAt = `${String(endsAtHour).padStart(2, "0")}:00`;
  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-medium text-foreground">{allocation.title}</h3>
            <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
              {allocation.status}
            </StatusBadge>
            {isConflict && (
              <StatusBadge variant="solid" pulse>
                <AlertTriangle className="h-2.5 w-2.5" /> Conflict
              </StatusBadge>
            )}
          </div>
          <p className="mt-0.5 tabular text-[11px] text-muted-foreground">{allocation.refNo}</p>
        </div>
        <button
          onClick={onClose}
          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close allocation details"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        <DetailMini label="Resource" value={resource?.name ?? "-"} />
        <DetailMini label="Type" value={allocation.type} />
        <DetailMini label="Day" value={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][allocation.startDay]} />
        <DetailMini label="Window" value={`${startsAt} – ${endsAt}`} mono />
        <DetailMini label="Duration" value={`${allocation.durationHours}h`} mono />
        <DetailMini label="Location" value={allocation.location ?? "-"} />
      </div>
    </div>
  );
}

function DetailMini({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</div>
    </div>
  );
}

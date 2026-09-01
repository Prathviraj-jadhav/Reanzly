"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import {
  CalendarRange,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  PLANNING_TABS,
  type PlanningTab,
  KpiTile,
  startOfWeek,
} from "./_helpers";
import { usePlanningData } from "./use-planning-data";
import { ScheduleView } from "./schedule-view";
import { ResourceList } from "./resource-list";

export function PlanningModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "planning");
  const resolvedTab = (view.tab as PlanningTab | undefined) ?? "week";
  const [tab, setTab] = useState<PlanningTab>(resolvedTab);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek());
  const data = usePlanningData(weekStart);

  useEffect(() => {
    setTab(resolvedTab);
  }, [resolvedTab]);

  const onTabChange = useCallback(
    (next: PlanningTab) => {
      setTab(next);
      navigateCompat("planning", "list", undefined, next === "week" ? undefined : next);
    },
    [navigateCompat],
  );

  const { resources, allocations, conflictIds } = data;
  const totalResources = resources.length;
  const totalAllocations = allocations.length;
  const conflicts = conflictIds.size;
  const totalHours = allocations.reduce((s, a) => s + a.durationHours, 0);
  const avgUtilisation = totalResources
    ? Math.round(resources.reduce((s, r) => s + r.utilisationWeek, 0) / totalResources)
    : 0;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Planning & Scheduling"
        description="Gantt-style resource planning across drivers, vehicles, and workshop bays for a 7-day week."
        meta={[
          { label: "Resources", value: totalResources },
          { label: "Allocations", value: totalAllocations },
          { label: "Hours scheduled", value: `${totalHours}h` },
          { label: "Conflicts", value: conflicts },
        ]}
        actions={
          <span className="hidden text-[11px] text-muted-foreground tabular sm:inline">
            avg utilisation {avgUtilisation}% · {resources.filter((r) => r.status === "Available").length} resources available now
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Layers className="h-3.5 w-3.5" />} label="Scheduled hours" value={`${totalHours}h`} hint={`${totalAllocations} allocations`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Avg utilisation" value={`${avgUtilisation}%`} hint="across all resources" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Conflict-free" value={`${totalAllocations - conflicts}`} hint="of allocations clean" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Conflicts" value={String(conflicts)} hint="overlapping slots" />
      </div>

      {/* Sub-nav */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {PLANNING_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
              tab === t.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
        ))}
      </div>

      <div className="flex-1 pb-8">
        {tab === "week" && <ScheduleView mode="week" data={data} weekStart={weekStart} setWeekStart={setWeekStart} />}
        {tab === "day" && <ScheduleView mode="day" data={data} weekStart={weekStart} setWeekStart={setWeekStart} />}
        {tab === "resources" && <ResourceList data={data} />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        <CalendarRange className="mr-1 inline h-3 w-3 align-text-bottom" />
        Planning rota · {totalResources} resources · {totalAllocations} weekly allocations · {conflicts} conflict{conflicts === 1 ? "" : "s"} detected.
      </p>
    </div>
  );
}

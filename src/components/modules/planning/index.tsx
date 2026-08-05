"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
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
  RESOURCES,
  ALLOCATIONS,
  CONFLICT_IDS,
  KpiTile,
} from "./_helpers";
import { ScheduleView } from "./schedule-view";
import { ResourceList } from "./resource-list";
import { toastInfo } from "@/lib/toast";

export function PlanningModule() {
  const [tab, setTab] = useState<PlanningTab>("week");

  const totalResources = RESOURCES.length;
  const totalAllocations = ALLOCATIONS.length;
  const conflicts = CONFLICT_IDS.size;
  const totalHours = ALLOCATIONS.reduce((s, a) => s + a.durationHours, 0);
  const avgUtilisation = Math.round(
    RESOURCES.reduce((s, r) => s + r.utilisationWeek, 0) / RESOURCES.length,
  );

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
            avg utilisation {avgUtilisation}% · {RESOURCES.filter((r) => r.status === "Available").length} resources available now
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
            onClick={() => setTab(t.id)}
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
        {tab === "week" && <ScheduleView mode="week" />}
        {tab === "day" && <ScheduleView mode="day" />}
        {tab === "resources" && <ResourceList onCreate={() => toastInfo("Add resource", "Opening resource onboarding drawer.")} />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        <CalendarRange className="mr-1 inline h-3 w-3 align-text-bottom" />
        Planning rota · {RESOURCES.length} resources · {ALLOCATIONS.length} weekly allocations · {conflicts} conflict{conflicts === 1 ? "" : "s"} detected.
      </p>
    </div>
  );
}

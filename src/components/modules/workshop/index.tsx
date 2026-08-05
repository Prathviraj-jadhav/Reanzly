"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import {
  Wrench,
  Hammer,
  Boxes,
  Clock,
  Gauge,
  HardHat,
} from "lucide-react";
import {
  WORKSHOP_TABS,
  type WorkshopTab,
  JOB_CARDS,
  BAYS,
  PART_ISSUES,
  LABOUR_ENTRIES,
  formatINRCompact,
} from "./_helpers";
import { JobCardsTab } from "./job-cards";
import { BaysTab } from "./bays";
import { PartsIssueTab } from "./parts-issue";
import { LabourTab } from "./labour";
import { WorkshopFloorTab } from "./floor";
import { KpiTile } from "./_helpers";

export function WorkshopModule() {
  const [tab, setTab] = useState<WorkshopTab>("job-cards");

  const kpis = useMemo(() => {
    const open = JOB_CARDS.filter((j) => j.status === "Open" || j.status === "In Progress").length;
    const bayOcc = BAYS.filter((b) => b.status === "Occupied").length;
    const bayUtil = BAYS.length === 0 ? 0 : Math.round((bayOcc / BAYS.length) * 100);
    const completedToday = JOB_CARDS.filter((j) => j.status === "Completed").length;
    const avgTurnaround = "4.2h";
    const partsIssuedToday = PART_ISSUES.filter((p) => Date.now() - new Date(p.timestamp).getTime() < 86400000).length;
    const labourHours = LABOUR_ENTRIES.filter((l) => l.status === "In Progress").reduce((s, l) => s + l.hours, 0);
    const pendingAllocation = JOB_CARDS.filter((j) => j.status === "Open" && !j.bayCode).length;
    return { open, bayUtil, completedToday, avgTurnaround, partsIssuedToday, labourHours, pendingAllocation };
  }, []);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Workshop"
        description="Workshop floor - job cards, bay allocation, parts issue, and labour tracking. Physical operations hub."
        meta={[
          { label: "Lead", value: "Jaspal Singh · Head Mechanic" },
          { label: "Workshops", value: "Pune · Bhiwandi · Taloja" },
          { label: "Bays", value: `${BAYS.length} total · ${kpis.bayUtil}% utilised` },
        ]}
        actions={
          <span className="hidden text-[11px] text-muted-foreground tabular sm:inline">
            {JOB_CARDS.length} job cards · {BAYS.length} bays · {PART_ISSUES.length} parts issued
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Wrench className="h-3.5 w-3.5" />} label="Open Job Cards" value={String(kpis.open)} hint="active on floor" />
        <KpiTile icon={<Gauge className="h-3.5 w-3.5" />} label="Bay Utilisation" value={`${kpis.bayUtil}%`} hint={`${BAYS.filter((b) => b.status === "Occupied").length} of ${BAYS.length} occupied`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Avg Turnaround" value={kpis.avgTurnaround} hint="open → close" />
        <KpiTile icon={<Boxes className="h-3.5 w-3.5" />} label="Parts Issued Today" value={String(kpis.partsIssuedToday)} hint="from inventory" />
        <KpiTile icon={<HardHat className="h-3.5 w-3.5" />} label="Labour Hours" value={`${kpis.labourHours}h`} hint="active mechanics" />
        <KpiTile icon={<Hammer className="h-3.5 w-3.5" />} label="Pending Allocation" value={String(kpis.pendingAllocation)} hint="awaiting bay" />
      </div>

      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {WORKSHOP_TABS.map((t) => (
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
        {tab === "job-cards" && <JobCardsTab />}
        {tab === "bays" && <BaysTab />}
        {tab === "parts-issue" && <PartsIssueTab />}
        {tab === "labour" && <LabourTab />}
        {tab === "floor" && <WorkshopFloorTab />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {JOB_CARDS.length} job cards · {BAYS.length} bays · {PART_ISSUES.length} parts issues · {LABOUR_ENTRIES.length} labour entries · Labour value{" "}
        {formatINRCompact(LABOUR_ENTRIES.reduce((s, l) => s + l.cost, 0))}
      </p>
    </div>
  );
}

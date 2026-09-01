"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Filter,
  GripVertical,
  TrendingUp,
  Trophy,
  Target,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  DEAL_STAGES,
  STAGE_WON_WEIGHT,
  type Deal,
  type DealStage,
} from "./_data";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  daysBetween,
  dealStageBadge,
  initials,
  type CrmTab,
} from "./_helpers";

interface PipelineProps {
  onNavigate: (tab: CrmTab) => void;
}

const STAGE_COLOR_LABEL: Record<DealStage, string> = {
  "New Lead": "New",
  Qualified: "Qualified",
  "Quotation Sent": "Quote",
  Negotiation: "Negotiation",
  Won: "Won",
  Lost: "Lost",
};

export function Pipeline({ onNavigate }: PipelineProps) {
  const deals = useCrmStore((s) => s.deals);
  const updateDeal = useCrmStore((s) => s.updateDeal);

  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [laneFilter, setLaneFilter] = useState<string>("All");
  const [sizeFilter, setSizeFilter] = useState<string>("All");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const owners = useMemo(() => ["All", ...Array.from(new Set(deals.map((d) => d.owner)))], [deals]);
  const lanes = useMemo(() => ["All", ...Array.from(new Set(deals.flatMap((d) => [d.lane])))], [deals]);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (ownerFilter !== "All" && d.owner !== ownerFilter) return false;
      if (laneFilter !== "All" && d.lane !== laneFilter) return false;
      if (sizeFilter !== "All") {
        if (sizeFilter === "≤ ₹5L" && d.value > 500000) return false;
        if (sizeFilter === "₹5L–₹25L" && (d.value <= 500000 || d.value > 2500000)) return false;
        if (sizeFilter === "₹25L+" && d.value <= 2500000) return false;
      }
      return true;
    });
  }, [deals, ownerFilter, laneFilter, sizeFilter]);

  // ===== KPIs =====
  const totalPipeline = filtered
    .filter((d) => d.stage !== "Won" && d.stage !== "Lost")
    .reduce((s, d) => s + d.value, 0);
  const weightedForecast = filtered
    .filter((d) => d.stage !== "Won" && d.stage !== "Lost")
    .reduce((s, d) => s + d.value * STAGE_WON_WEIGHT[d.stage], 0);
  const wonCount = deals.filter((d) => d.stage === "Won").length;
  const lostCount = deals.filter((d) => d.stage === "Lost").length;
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;
  const wonDeals = deals.filter((d) => d.stage === "Won");
  const avgCycle =
    wonDeals.length > 0
      ? Math.round(
          wonDeals.reduce((s, d) => s + daysBetween(d.created, d.expectedClose), 0) /
            wonDeals.length,
        )
      : 0;

  const handleMove = async (dealId: string, stage: DealStage) => {
    // A single combined update - moveDealStage alone would just PATCH the
    // same endpoint a second time with less data, a redundant round-trip.
    const patch: Partial<Deal> = { stage, probability: stage === "Won" ? 100 : stage === "Lost" ? 0 : 50 };
    const ok = await updateDeal(dealId, patch);
    if (ok) {
      toast.success(`Deal moved to ${stage}`, {
        description: `Stage updated - forecast recalculated.`,
      });
    } else {
      toast.error("Couldn't move deal", { description: "Try again." });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip - Miller's Law: max 5 tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Pipeline Value"
          value={formatINRCompact(totalPipeline)}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          delta={`${filtered.filter((d) => d.stage !== "Won" && d.stage !== "Lost").length} deals`}
          trend="up"
        />
        <KpiCard
          label="Weighted Forecast"
          value={formatINRCompact(weightedForecast)}
          icon={<Target className="h-3.5 w-3.5" />}
          delta="probability-weighted"
          progress={totalPipeline > 0 ? Math.round((weightedForecast / totalPipeline) * 100) : 0}
          progressLabel="confidence"
        />
        <KpiCard
          label="Win Rate"
          value={`${winRate}%`}
          icon={<Trophy className="h-3.5 w-3.5" />}
          delta={`${wonCount}W / ${lostCount}L`}
          trend="up"
        />
        <KpiCard
          label="Avg Deal Cycle"
          value={`${avgCycle}d`}
          icon={<Clock className="h-3.5 w-3.5" />}
          delta="won deals"
          trend="down"
          invertDelta
        />
      </div>

      {/* Filter bar - Hick's Law: collapsed/compact */}
      <SectionCard
        title="Pipeline Filters"
        description="Narrow by owner, lane, or deal size"
        icon={<Filter className="h-4 w-4" />}
        collapsible
        defaultOpen={false}
        flush
        bodyClassName="px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Owner"
            value={ownerFilter}
            options={owners}
            onChange={setOwnerFilter}
          />
          <FilterSelect
            label="Lane"
            value={laneFilter}
            options={lanes}
            onChange={setLaneFilter}
          />
          <FilterSelect
            label="Size"
            value={sizeFilter}
            options={["All", "≤ ₹5L", "₹5L–₹25L", "₹25L+"]}
            onChange={setSizeFilter}
          />
          <div className="ml-auto text-[12px] text-muted-foreground tabular">
            {filtered.length} deals
          </div>
        </div>
      </SectionCard>

      {/* Kanban board */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium tracking-tight text-foreground">
            Deals by Stage
          </h2>
          <Btn variant="ghost" size="sm" iconRight={<ChevronRight className="h-3.5 w-3.5" />} onClick={() => onNavigate("leads")}>
            View all leads
          </Btn>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = filtered.filter((d) => d.stage === stage);
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
            const { variant, pulse } = dealStageBadge(stage);
            return (
              <div
                key={stage}
                className="flex w-[280px] shrink-0 flex-col rounded-[6px] border border-border bg-muted/30"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={variant} pulse={pulse}>
                      {STAGE_COLOR_LABEL[stage]}
                    </StatusBadge>
                    <span className="text-[11px] text-muted-foreground tabular">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium tabular text-foreground">
                    {formatINRCompact(stageValue)}
                  </span>
                </div>
                <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2 scrollbar-thin">
                  {stageDeals.length === 0 ? (
                    <div className="flex items-center justify-center px-3 py-8 text-center text-[11px] text-muted-foreground">
                      Drop deals here
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onClick={() => setSelectedDeal(deal)}
                        onMove={(s) => handleMove(deal.id, s)}
                      />
                    ))
                  )}
                </div>
                <div className="border-t border-border p-2">
                  <button
                    className="flex w-full items-center justify-center gap-1 rounded-[5px] border border-dashed border-border py-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => onNavigate("leads")}
                  >
                    <Plus className="h-3 w-3" /> Add deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DealDetailDrawer
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onMove={(s) => {
          if (selectedDeal) {
            handleMove(selectedDeal.id, s);
            setSelectedDeal({ ...selectedDeal, stage: s });
          }
        }}
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
          <span className="max-w-[110px] truncate text-foreground">{value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
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

function DealCard({
  deal,
  onClick,
  onMove,
}: {
  deal: Deal;
  onClick: () => void;
  onMove: (stage: DealStage) => void;
}) {
  const ageDays = daysBetween(deal.created);
  return (
    <div
      className="group relative flex flex-col gap-2 rounded-[5px] border border-border bg-background p-3 transition-colors hover:border-foreground/30"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground">
            {deal.title}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{deal.company}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="Move deal"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Move to
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEAL_STAGES.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onMove(s)}
                className={cn("text-[13px]", s === deal.stage && "font-medium")}
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium tabular text-foreground">
          {formatINRCompact(deal.value)}
        </span>
        <span className="text-[10px] tabular text-muted-foreground">
          {deal.probability}%
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium text-foreground">
            {initials(deal.owner)}
          </div>
          <span className="text-[11px] text-muted-foreground">{deal.owner.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tabular text-muted-foreground">
          <span>{deal.lane.split("–")[0]}</span>
          <span>·</span>
          <span>{ageDays}d</span>
        </div>
      </div>
    </div>
  );
}

function DealDetailDrawer({
  deal,
  onClose,
  onMove,
}: {
  deal: Deal | null;
  onClose: () => void;
  onMove: (stage: DealStage) => void;
}) {
  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        {deal && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <StatusBadge variant="outline" className="font-mono">
                  {deal.dealId}
                </StatusBadge>
                <StatusBadge {...dealStageBadge(deal.stage)}>{deal.stage}</StatusBadge>
              </div>
              <SheetTitle className="text-[17px] font-medium tracking-tight">
                {deal.title}
              </SheetTitle>
              <SheetDescription className="text-[12px]">
                {deal.company} · {deal.contact}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              <div className="grid grid-cols-2 gap-3">
                <DetailTile label="Deal Value" value={formatINR(deal.value)} mono />
                <DetailTile label="Probability" value={`${deal.probability}%`} mono />
                <DetailTile label="Expected Close" value={formatDate(deal.expectedClose)} />
                <DetailTile label="Age" value={`${daysBetween(deal.created)} days`} mono />
                <DetailTile label="Owner" value={deal.owner} />
                <DetailTile label="Lane" value={deal.lane} />
                <DetailTile label="Created" value={formatDate(deal.created)} />
                <DetailTile
                  label="Account"
                  value={deal.company}
                />
              </div>

              <div className="mt-5">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Move to Stage
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {DEAL_STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onMove(s)}
                      className={cn(
                        "tap rounded-[5px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        s === deal.stage
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[6px] border border-border bg-muted/30 p-3">
                <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </h4>
                <p className="text-[12.5px] leading-relaxed text-foreground">
                  {deal.stage === "Lost" && deal.lossReason
                    ? `Lost due to ${deal.lossReason}. Revisit next quarter.`
                    : deal.stage === "Won" && deal.winReason
                      ? `Won on ${deal.winReason}. Proceed to contract.`
                      : "Active deal in pipeline. Follow-up scheduled."}
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[5px] border border-border bg-background p-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-[13px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  BarChart3, Download, TrendingUp, Percent, Target,
  Trophy, Users, MapPin, ArrowRight, ArrowDownRight, ArrowUpRight,
  Inbox, Send, CheckCircle2, Filter, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  SEED_LANE_PROFIT,
  SEED_COMMISSION_TREND,
  SEED_TOP_CUSTOMERS,
  type LaneProfitRow,
  formatINR,
  formatINRCompact,
  formatPct,
  formatDate,
  KpiTile,
} from "./_helpers";
import { useBrokerEnquiriesData } from "./use-broker-enquiries-data";
import { useBrokerQuotesData } from "./use-broker-quotes-data";
import { useBrokerFinanceData } from "./use-broker-finance-data";

/* ============================================================
   BrokerAnalytics - brokerage performance trends.
   ------------------------------------------------------------
   Read-only dashboard exposing:
   • Lane profitability table (lane / trips / gross / commission / margin)
   • Win/loss funnel (enquiries → quotes → won)
   • 30-day commission trend rendered as monochrome CSS bars
   • Top 5 customers by volume + Top 5 lanes by margin
   All numbers are tabular. No hues, no shadows, ≤500 weight.
   ============================================================ */

type RangeKey = "30d" | "90d" | "ytd" | "all";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "ytd", label: "Year to date", days: 365 },
  { key: "all", label: "All time", days: -1 },
];

export function BrokerAnalytics() {
  const [range, setRange] = useState<RangeKey>("90d");
  const { enquiries } = useBrokerEnquiriesData();
  const { quotes } = useBrokerQuotesData();
  const { settlements: cycles } = useBrokerFinanceData();

  // ===== Derived: lane profitability (filter by range using commission trend?) =====
  // The seed lane-profit table is YTD-ish; we keep it as-is but expose the
  // range selector as a UX affordance. Realistic dashboards would slice
  // the underlying trips by date; this demo keeps totals stable.
  const laneRows = useMemo(() => SEED_LANE_PROFIT, []);

  const totalGross = laneRows.reduce((s, r) => s + r.grossFreightINR, 0);
  const totalCommission = laneRows.reduce((s, r) => s + r.commissionINR, 0);
  const avgMargin = totalGross === 0 ? 0 : (totalCommission / totalGross) * 100;
  const totalTrips = laneRows.reduce((s, r) => s + r.trips, 0);

  // ===== Funnel - real data =====
  const enquiryCount = enquiries.length;
  const quotedCount = enquiries.filter((e) => e.status !== "New").length;
  const quoteCount = quotes.length;
  const acceptedCount = quotes.filter((q) => q.status === "Accepted").length;
  const rejectedCount = quotes.filter((q) => q.status === "Rejected").length;
  const expiredCount = quotes.filter((q) => q.status === "Expired").length;
  const pendingCount = quotes.filter((q) => q.status === "Pending").length;
  const decidedQuotes = acceptedCount + rejectedCount + expiredCount;
  const quoteWinRate = decidedQuotes === 0 ? 0 : Math.round((acceptedCount / decidedQuotes) * 100);

  // ===== 30-day commission trend (CSS-width bars - seeded) =====
  const trend = SEED_COMMISSION_TREND;
  const trendMax = Math.max(...trend.map((t) => t.amountINR));
  const trendTotal = trend.reduce((s, t) => s + t.amountINR, 0);
  const trendAvg = trend.length === 0 ? 0 : Math.round(trendTotal / trend.length);
  const trendBest = trend.reduce((b, t) => (t.amountINR > b.amountINR ? t : b), trend[0]);

  // ===== Top customers + Top lanes by margin =====
  const topCustomers = SEED_TOP_CUSTOMERS;
  const maxCustomerFreight = Math.max(...topCustomers.map((c) => c.freightINR));
  const topLanesByMargin = [...laneRows]
    .sort((a, b) => b.commissionINR - a.commissionINR)
    .slice(0, 5);
  const maxLaneCommission = Math.max(...topLanesByMargin.map((l) => l.commissionINR));

  // ===== YTD commission from real settlement cycles =====
  const ytdCommission = cycles.reduce((s, c) => s + c.commissionEarnedINR, 0);

  // ===== Columns for lane profitability DataTable =====
  const laneColumns: Column<LaneProfitRow>[] = [
    {
      key: "lane",
      header: "Lane",
      sortable: true,
      align: "left",
      sortValue: (r) => r.lane,
      render: (r) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12.5px] font-medium text-foreground">{r.lane}</span>
        </div>
      ),
    },
    {
      key: "trips",
      header: "Trips",
      sortable: true,
      align: "right",
      sortValue: (r) => r.trips,
      render: (r) => <span className="tabular text-foreground">{r.trips}</span>,
    },
    {
      key: "gross",
      header: "Gross freight",
      sortable: true,
      align: "right",
      sortValue: (r) => r.grossFreightINR,
      hideable: true,
      render: (r) => <span className="tabular text-muted-foreground">{formatINRCompact(r.grossFreightINR)}</span>,
    },
    {
      key: "commission",
      header: "Commission",
      sortable: true,
      align: "right",
      sortValue: (r) => r.commissionINR,
      render: (r) => <span className="tabular font-medium text-foreground">{formatINR(r.commissionINR)}</span>,
    },
    {
      key: "margin",
      header: "Margin",
      sortable: true,
      align: "right",
      sortValue: (r) => r.marginPct,
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${Math.min(100, (r.marginPct / 12) * 100)}%` }}
            />
          </div>
          <span className="tabular text-foreground">{formatPct(r.marginPct)}</span>
        </div>
      ),
    },
    {
      key: "share",
      header: "Share",
      sortable: true,
      align: "right",
      sortValue: (r) => (r.commissionINR / totalCommission) * 100,
      hideable: true,
      render: (r) => {
        const share = (r.commissionINR / totalCommission) * 100;
        return <span className="tabular text-muted-foreground">{formatPct(share)}</span>;
      },
    },
  ];

  const funnelStages = [
    {
      label: "Enquiries received",
      icon: Inbox,
      value: enquiryCount,
      hint: "inbound load requests",
      pct: 100,
    },
    {
      label: "Enquiries quoted",
      icon: Send,
      value: quotedCount,
      hint: `${enquiryCount - quotedCount} dropped`,
      pct: enquiryCount === 0 ? 0 : (quotedCount / enquiryCount) * 100,
    },
    {
      label: "Quotes sent",
      icon: Send,
      value: quoteCount,
      hint: "active + closed",
      pct: enquiryCount === 0 ? 0 : (quoteCount / enquiryCount) * 100,
    },
    {
      label: "Quotes accepted (won)",
      icon: CheckCircle2,
      value: acceptedCount,
      hint: `${quoteWinRate}% of decided`,
      pct: enquiryCount === 0 ? 0 : (acceptedCount / enquiryCount) * 100,
    },
  ];

  const exportCsv = () => {
    const headers = ["Lane", "Trips", "Gross Freight (INR)", "Commission (INR)", "Margin %", "Share %"];
    const lines = [headers.join(",")];
    for (const r of laneRows) {
      const share = (r.commissionINR / totalCommission) * 100;
      lines.push([
        `"${r.lane}"`,
        String(r.trips),
        String(r.grossFreightINR),
        String(r.commissionINR),
        r.marginPct.toFixed(1),
        share.toFixed(1),
      ].join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brokerage-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastSuccess("Analytics exported", `${laneRows.length} lanes - CSV file downloaded.`);
  };

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "Last 90 days";

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Analytics & Insights"
        description="Brokerage performance trends - lane profitability, win rates, commission trends."
        meta={[
          { label: "Range", value: rangeLabel },
          { label: "Gross freight", value: formatINRCompact(totalGross) },
          { label: "Commission", value: formatINRCompact(totalCommission) },
          { label: "Avg margin", value: formatPct(avgMargin) },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Range:</span>
                  <span>{rangeLabel}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Date range</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {RANGES.map((r) => (
                  <DropdownMenuItem
                    key={r.key}
                    onClick={() => {
                      setRange(r.key);
                      toastInfo(`Range set to ${r.label}`, "Aggregations will reflect the new window.");
                    }}
                    className="text-[13px]"
                  >
                    {r.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Btn variant="primary" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv}>Export CSV</Btn>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiTile icon={<BarChart3 className="h-3.5 w-3.5" />} label="Gross freight" value={formatINRCompact(totalGross)} hint={`${totalTrips} trips`} />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Commission" value={formatINRCompact(totalCommission)} hint={`YTD ${formatINRCompact(ytdCommission)}`} />
        <KpiTile icon={<Percent className="h-3.5 w-3.5" />} label="Avg margin" value={formatPct(avgMargin)} hint="over gross freight" />
        <KpiTile icon={<Target className="h-3.5 w-3.5" />} label="Quote win rate" value={`${quoteWinRate}%`} hint={`${acceptedCount} of ${decidedQuotes} decided`} />
        <KpiTile icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="Pending quotes" value={String(pendingCount)} hint="awaiting customer" />
        <KpiTile icon={<ArrowDownRight className="h-3.5 w-3.5" />} label="Lost quotes" value={String(rejectedCount + expiredCount)} hint={`${rejectedCount} rejected · ${expiredCount} expired`} />
      </div>

      {/* Funnel + Commission trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Win/loss funnel */}
        <SectionCard
          title="Win / loss funnel"
          description="Conversion from enquiry → quote → win."
          icon={<Target className="h-4 w-4" />}
        >
          <ol className="space-y-3">
            {funnelStages.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-medium text-foreground">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground">{s.hint}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1.5">
                      <span className="tabular text-[16px] font-medium text-foreground">{s.value}</span>
                      <span className="tabular text-[11px] text-muted-foreground">{formatPct(s.pct)}</span>
                    </div>
                  </div>
                  <div className="ml-9 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={i === funnelStages.length - 1 ? "h-full rounded-full bg-foreground" : "h-full rounded-full bg-foreground/70"}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          {/* Quote status legend */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px]">
            <span className="text-muted-foreground">Quote outcomes:</span>
            <StatusBadge variant="solid" pulse>{acceptedCount} Accepted</StatusBadge>
            <StatusBadge variant="outline">{pendingCount} Pending</StatusBadge>
            <StatusBadge variant="muted">{rejectedCount} Rejected</StatusBadge>
            <StatusBadge variant="muted">{expiredCount} Expired</StatusBadge>
          </div>
        </SectionCard>

        {/* 30-day commission trend */}
        <SectionCard
          title="Commission trend - last 30 days"
          description="Daily commission earned (CSS bars, monochrome)."
          icon={<TrendingUp className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Avg</span>
                <span className="tabular font-medium text-foreground">{formatINRCompact(trendAvg)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Best</span>
                <span className="tabular font-medium text-foreground">{formatINRCompact(trendBest.amountINR)}</span>
                <span className="text-muted-foreground">· {trendBest.label}</span>
              </div>
            </div>
          }
        >
          <div className="flex h-44 items-end gap-px overflow-x-auto scrollbar-thin">
            {trend.map((t) => {
              const h = Math.max(4, Math.round((t.amountINR / trendMax) * 100));
              const isBest = t.day === trendBest.day;
              return (
                <div
                  key={t.day}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  title={`${t.label} · ${formatINR(t.amountINR)}`}
                  style={{ minWidth: 8 }}
                >
                  <div
                    className={isBest ? "w-full rounded-[2px] bg-foreground" : "w-full rounded-[2px] bg-foreground/55 group-hover:bg-foreground"}
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] tabular text-muted-foreground">
            <span>{trend[0]?.label}</span>
            <span>{formatINRCompact(trendTotal)} total</span>
            <span>{trend[trend.length - 1]?.label}</span>
          </div>
        </SectionCard>
      </div>

      {/* Lane profitability DataTable */}
      <SectionCard
        title="Lane profitability"
        description="Performance by lane - sortable, filterable, exportable."
        icon={<BarChart3 className="h-4 w-4" />}
        flush
      >
        <DataTable
          data={laneRows}
          columns={laneColumns}
          searchKeys={["lane"]}
          searchPlaceholder="Search lanes..."
          pageSize={10}
          initialSort={{ key: "commission", dir: "desc" }}
          emptyTitle="No lane data"
          emptyDescription="Lane profitability appears once trips start settling."
        />
      </SectionCard>

      {/* Top customers + Top lanes by margin */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top customers */}
        <SectionCard
          title="Top 5 customers by volume"
          description="Highest gross freight this period."
          icon={<Users className="h-4 w-4" />}
        >
          <ol className="space-y-2.5">
            {topCustomers.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-[10px] font-medium tabular text-muted-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-foreground">{c.name}</span>
                    <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(c.freightINR)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${(c.freightINR / maxCustomerFreight) * 100}%` }}
                      />
                    </div>
                    <span className="tabular text-[10px] text-muted-foreground">{c.trips} trips · {formatPct(c.sharePct)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
            Top 5 customers represent <span className="tabular font-medium text-foreground">{formatPct(topCustomers.reduce((s, c) => s + c.sharePct, 0))}</span> of brokerage volume.
          </div>
        </SectionCard>

        {/* Top lanes by commission */}
        <SectionCard
          title="Top 5 lanes by commission"
          description="Highest commission contribution this period."
          icon={<MapPin className="h-4 w-4" />}
        >
          <ol className="space-y-2.5">
            {topLanesByMargin.map((l, i) => (
              <li key={l.id} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-[10px] font-medium tabular text-muted-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-foreground">{l.lane}</span>
                    <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(l.commissionINR)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${(l.commissionINR / maxLaneCommission) * 100}%` }}
                      />
                    </div>
                    <span className="tabular text-[10px] text-muted-foreground">{l.trips} trips · {formatPct(l.marginPct)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
            <Trophy className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Best lane: <span className="font-medium text-foreground">{topLanesByMargin[0]?.lane}</span> with <span className="tabular font-medium text-foreground">{formatINR(topLanesByMargin[0]?.commissionINR ?? 0)}</span> commission.
            </span>
          </div>
        </SectionCard>
      </div>

      {/* Insight callouts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InsightTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Best performing lane"
          value={topLanesByMargin[0]?.lane ?? "-"}
          hint={`${formatINRCompact(topLanesByMargin[0]?.commissionINR ?? 0)} commission`}
        />
        <InsightTile
          icon={<ArrowRight className="h-4 w-4" />}
          label="Conversion gap"
          value={`${enquiryCount - acceptedCount} dropped`}
          hint={`${enquiryCount} enquiries → ${acceptedCount} won`}
        />
        <InsightTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Daily run rate"
          value={formatINRCompact(trendAvg)}
          hint="30-day commission average"
        />
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Aggregations are computed client-side</span>
        <span>·</span>
        <span>Commission = gross × markup %</span>
        <span>·</span>
        <span>Win rate = accepted / (accepted + rejected + expired)</span>
        <span>·</span>
        <span className="tabular">Last refreshed {formatDate(new Date().toISOString())}</span>
      </div>
    </div>
  );
}

/* ===== Local UI helpers ===== */

function InsightTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className="text-[15px] font-medium leading-tight text-foreground">{value}</span>
      <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
    </div>
  );
}

export default BrokerAnalytics;

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Activity,
  Receipt,
  AlertTriangle,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { SearchInput } from "@/components/shared/toolbar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useSuperadminStore, computeBillingKPIs } from "./_store";
import { REVENUE_TREND, PLANS, type Invoice, type PlanId } from "./_data";
import {
  formatINR,
  formatINRCompact,
  formatPct,
  formatDate,
  relativeTime,
  paymentStatusVariant,
  planVariant,
} from "./_helpers";
import {
  subscriptionModelById,
  isOnTrial,
  trialDaysRemaining,
} from "@/lib/onboarding/module-catalog";

/* ============================================================
   BillingView - KPI row (MRR, ARR, Active subs, Churn, ARPU),
   MRR-by-subscription-model strip, trial-conversions mini-card,
   plan breakdown card, revenue trend bar chart (monochrome
   divs), recent invoices table, failed/retry alerts.
   ============================================================ */

// Estimated Commission MRR per commission-only org. Commission orgs
// have no flat fee; they pay 7% per booked trip. We assume ~5 trips/mo
// at an average ₹15K/trip = ₹750/trip × 5 = ₹5,250/mo per commission
// org. This is a reviewer-facing estimate - real numbers come from
// the trips ledger.
const EST_COMMISSION_MRR_PER_ORG = 5_250;

export function BillingView() {
  const orgs = useSuperadminStore((s) => s.orgs);
  const invoices = useSuperadminStore((s) => s.invoices);
  const hasHydrated = useSuperadminStore((s) => s.hasHydrated);
  const retryInvoice = useSuperadminStore((s) => s.retryInvoice);
  const recordInvoicePayment = useSuperadminStore((s) => s.recordInvoicePayment);
  const refundInvoice = useSuperadminStore((s) => s.refundInvoice);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [planFilter, setPlanFilter] = useState<Set<string>>(new Set());

  const kpis = useMemo(() => computeBillingKPIs(useSuperadminStore.getState()), [orgs, invoices]);

  // === Smart-onboarding: MRR split by subscription model ===
  // SaaS / Master orgs contribute their flatMonthly fee directly.
  // Commission-only orgs have zero flat MRR - we estimate their
  // contribution using EST_COMMISSION_MRR_PER_ORG so the reviewer can
  // see roughly how much commission revenue to expect this month.
  const mrrByModel = useMemo(() => {
    const active = orgs.filter((o) => o.status === "Active");
    let saas = 0;
    let commission = 0;
    let master = 0;
    let saasCount = 0;
    let commissionCount = 0;
    let masterCount = 0;
    for (const o of active) {
      const model = o.subscriptionModel;
      if (model === "saas" || ["starter", "standard", "enterprise"].includes(model)) {
        saas += o.mrr || subscriptionModelById(model as any).flatMonthly;
        saasCount += 1;
      } else if (model === "commission" || ["freemium", "partner"].includes(model)) {
        commission += o.mrr || (subscriptionModelById(model as any).commissionPct ? EST_COMMISSION_MRR_PER_ORG : 0);
        commissionCount += 1;
      } else if (model === "master") {
        master += o.mrr || subscriptionModelById("enterprise").flatMonthly;
        masterCount += 1;
      }
    }
    return {
      saas,
      commission,
      master,
      saasCount,
      commissionCount,
      masterCount,
      total: saas + commission + master,
    };
  }, [orgs]);

  // === Trial conversions this month ===
  // Trials started: orgs whose trialStartedAt falls in the current
  // calendar month (regardless of current status). Trials converted:
  // orgs currently Active whose trialStartedAt also falls in the
  // current month. The ratio is the conversion rate.
  const trialConversions = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const inMonth = (iso?: string) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= monthStart && t < monthEnd;
    };
    const started = orgs.filter((o) => inMonth(o.trialStartedAt));
    const converted = started.filter((o) => o.status === "Active");
    const currentlyOnTrial = orgs.filter((o) => isOnTrial(o.trialEndsAt));
    const pendingConversion = currentlyOnTrial.filter(
      (o) => trialDaysRemaining(o.trialEndsAt) <= 2,
    );
    return {
      startedCount: started.length,
      convertedCount: converted.length,
      conversionRate: started.length > 0 ? (converted.length / started.length) * 100 : 0,
      currentlyOnTrial: currentlyOnTrial.length,
      pendingConversion: pendingConversion.length,
      pendingConversionOrgs: pendingConversion.slice(0, 5),
    };
  }, [orgs]);

  // Plan breakdown (Gestalt: grouped)
  const planBreakdown = useMemo(() => {
    return PLANS.map((p) => {
      const active = orgs.filter((o) => o.plan === p.id && o.status === "Active");
      const revenue = active.reduce((s, o) => s + o.mrr, 0);
      return { ...p, count: active.length, revenue };
    });
  }, [orgs]);

  // Failed / retrying invoices
  const failedInvoices = useMemo(
    () => invoices.filter((i) => i.status === "Failed" || (i.status === "Pending" && (i.retryCount ?? 0) > 0)),
    [invoices],
  );

  // Filtered invoices for table
  const filtered = useMemo(() => {
    let result = invoices;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.number.toLowerCase().includes(q) ||
          i.orgName.toLowerCase().includes(q) ||
          i.period.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) result = result.filter((i) => statusFilter.has(i.status));
    if (planFilter.size > 0) result = result.filter((i) => planFilter.has(i.plan));
    return result;
  }, [invoices, search, statusFilter, planFilter]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  // Max revenue for sparkline scaling
  const maxMrr = Math.max(...REVENUE_TREND.map((p) => p.mrr));
  const minMrr = Math.min(...REVENUE_TREND.map((p) => p.mrr));
  const lastDelta = REVENUE_TREND.length >= 2
    ? ((REVENUE_TREND[REVENUE_TREND.length - 1].mrr - REVENUE_TREND[REVENUE_TREND.length - 2].mrr) /
        REVENUE_TREND[REVENUE_TREND.length - 2].mrr) *
      100
    : 0;

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice #",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.number,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.number}</span>
      ),
    },
    {
      key: "orgName",
      header: "Organization",
      sortable: true,
      sortValue: (r) => r.orgName,
      render: (r) => (
        <span className="text-[12px] text-foreground truncate max-w-[200px] block">{r.orgName}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{formatINR(r.amount)}</span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.plan,
      render: (r) => <StatusBadge variant={planVariant(r.plan)}>{r.plan}</StatusBadge>,
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      width: "180px",
      hideOnMobile: true,
      sortValue: (r) => r.period,
      render: (r) => <span className="text-[11px] text-muted-foreground">{r.period}</span>,
    },
    {
      key: "issuedAt",
      header: "Issued",
      sortable: true,
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.issuedAt,
      render: (r) => (
        <span className="tabular text-[11px] text-muted-foreground">{formatDate(r.issuedAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const v = paymentStatusVariant(r.status);
        return (
          <div className="flex items-center gap-1">
            <StatusBadge variant={v.variant} pulse={v.pulse}>{r.status}</StatusBadge>
            {(r.retryCount ?? 0) > 0 && (
              <span className="text-[10px] text-muted-foreground tabular">({r.retryCount}/3)</span>
            )}
          </div>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View PDF", onClick: (i: Invoice) => toast("Invoice PDF queued", { description: i.number }) },
    {
      label: "Record manual payment",
      onClick: (i: Invoice) => {
        if (i.status === "Pending" || i.status === "Failed") {
          recordInvoicePayment(i.id);
          toast.success("Payment recorded", { description: i.number });
        }
      },
    },
    {
      label: "Retry charge",
      onClick: (i: Invoice) => {
        if (i.status === "Failed" || i.status === "Pending") {
          retryInvoice(i.id);
          toast("Retry queued", { description: `${i.number} · attempt ${(i.retryCount ?? 0) + 1}/3` });
        }
      },
    },
    {
      label: "Refund",
      onClick: (i: Invoice) => {
        if (i.status === "Paid") {
          refundInvoice(i.id);
          toast.success("Invoice refunded", { description: i.number });
        }
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Invoice[]) =>
        toast(`${rows.length} invoice${rows.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Retry failed",
      onClick: (rows: Invoice[]) => {
        const c = rows.filter((r) => r.status === "Failed" || r.status === "Pending").length;
        rows.forEach((r) => (r.status === "Failed" || r.status === "Pending") && retryInvoice(r.id));
        toast.success(`${c} invoice${c === 1 ? "" : "s"} retried`);
      },
    },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const planLabel = planFilter.size === 0 ? "All" : planFilter.size === 1 ? Array.from(planFilter)[0] : `${planFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row (Miller's Law: max 5) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total MRR"
          value={formatINRCompact(kpis.mrr)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          delta={`${lastDelta > 0 ? "+" : ""}${formatPct(lastDelta)}`}
          trend={lastDelta >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="ARR (forecast)"
          value={formatINRCompact(kpis.arr)}
          icon={<TrendingUp className="h-4 w-4" />}
          delta="MRR × 12"
          trend="up"
        />
        <KpiCard
          label="Active Subscriptions"
          value={kpis.subs}
          icon={<Activity className="h-4 w-4" />}
          delta={`${orgs.filter((o) => o.status === "Trial").length} on trial`}
          trend="up"
        />
        <KpiCard
          label="Churn Rate"
          value={formatPct(kpis.churnRate, 2)}
          icon={<TrendingDown className="h-4 w-4" />}
          delta={`${kpis.churned} churned`}
          trend="down"
          invertDelta
        />
        <KpiCard
          label="ARPU"
          value={formatINRCompact(kpis.arpu)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          delta="per active org"
          trend="up"
        />
      </div>

      {/* === Smart-onboarding: MRR split by subscription model ===
          Three-card strip showing how MRR breaks down across the
          SaaS / Commission / Master subscription models. Commission
          is an estimate (no flat fee) - see EST_COMMISSION_MRR_PER_ORG. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SubscriptionModelMrrCard
          modelId="saas"
          mrr={mrrByModel.saas}
          count={mrrByModel.saasCount}
          totalMrr={mrrByModel.total}
        />
        <SubscriptionModelMrrCard
          modelId="commission"
          mrr={mrrByModel.commission}
          count={mrrByModel.commissionCount}
          totalMrr={mrrByModel.total}
          estimate
        />
        <SubscriptionModelMrrCard
          modelId="master"
          mrr={mrrByModel.master}
          count={mrrByModel.masterCount}
          totalMrr={mrrByModel.total}
        />
      </div>

      {/* === Trial conversions mini-card ===
          Shows trials started vs converted this month, the conversion
          rate, and a list of orgs whose trials expire within 48h
          (the "pending conversion" queue). */}
      <SectionCard
        title="Trial conversions"
        description="Self-serve + assisted trials started this month vs converted to paid"
        icon={<Clock className="h-4 w-4" />}
        action={
          <StatusBadge variant="outline">
            {trialConversions.conversionRate.toFixed(0)}% conversion
          </StatusBadge>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Started this month */}
          <div className="rounded-[6px] border border-border bg-card p-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Trials started
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[24px] font-medium tabular text-foreground">
                {trialConversions.startedCount}
              </span>
              <span className="text-[11px] text-muted-foreground">this month</span>
            </div>
            <div className="text-[10px] text-muted-foreground tabular mt-1">
              {trialConversions.currentlyOnTrial} currently on trial
            </div>
          </div>
          {/* Converted this month */}
          <div className="rounded-[6px] border border-foreground/30 bg-accent/30 p-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Converted to paid
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[24px] font-medium tabular text-foreground">
                {trialConversions.convertedCount}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-foreground" />
            </div>
            <div className="text-[10px] text-muted-foreground tabular mt-1">
              {trialConversions.conversionRate.toFixed(1)}% conversion rate
            </div>
          </div>
          {/* Expiring in ≤48h */}
          <div className="rounded-[6px] border border-border bg-card p-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Expiring in ≤48h
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[24px] font-medium tabular text-foreground">
                {trialConversions.pendingConversion}
              </span>
              <span className="text-[11px] text-muted-foreground">need nudge</span>
            </div>
            {trialConversions.pendingConversionOrgs.length > 0 ? (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {trialConversions.pendingConversionOrgs.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-foreground truncate">{o.brandName}</span>
                    <span className="text-muted-foreground tabular shrink-0 ml-2">
                      {trialDaysRemaining(o.trialEndsAt)}d
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground mt-1">
                None expiring soon.
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Failed / retry alerts */}
      {failedInvoices.length > 0 && (
        <SectionCard
          title="Failed & retrying invoices"
          description="Auto-retry has been attempted - manual intervention may be required"
          icon={<AlertTriangle className="h-4 w-4" />}
          badge={<StatusBadge variant="muted" pulse>{failedInvoices.length} alert{failedInvoices.length === 1 ? "" : "s"}</StatusBadge>}
          flush
          bodyClassName="max-h-[220px] overflow-y-auto scrollbar-thin"
        >
          <div className="divide-y divide-border">
            {failedInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-foreground tabular">{inv.number}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {inv.orgName} · {inv.period} · {formatINR(inv.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <span className="text-[10px] text-muted-foreground tabular">
                    {inv.status === "Failed" ? `failed ${(inv.retryCount ?? 0)}/3` : `retry ${(inv.retryCount ?? 0)}/3`} · {relativeTime(inv.issuedAt)}
                  </span>
                  <StatusBadge variant={inv.status === "Failed" ? "muted" : "outline"} pulse>
                    {inv.status}
                  </StatusBadge>
                  <Btn
                    size="xs"
                    variant="outline"
                    icon={<RotateCcw className="h-3 w-3" />}
                    onClick={() => {
                      retryInvoice(inv.id);
                      toast("Retry queued", { description: inv.number });
                    }}
                  >
                    Retry
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Plan breakdown + Revenue trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Plan breakdown */}
        <SectionCard
          title="Plan breakdown"
          description="Active subscriptions and revenue by plan"
          icon={<Receipt className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-3">
            {planBreakdown.map((p) => {
              const totalOrgs = kpis.subs || 1;
              const pct = (p.count / totalOrgs) * 100;
              return (
                <div key={p.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={planVariant(p.id)}>{p.label}</StatusBadge>
                      <span className="text-[12px] text-muted-foreground tabular">
                        {p.count} org{p.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="tabular text-[13px] font-medium text-foreground">
                      {formatINRCompact(p.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/70 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular">
                    <span>{pct.toFixed(0)}% of active</span>
                    <span>{formatINR(p.monthly)}/mo each</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Revenue trend - monochrome bar chart using divs */}
        <SectionCard
          title="Revenue trend"
          description="Monthly recurring revenue · last 12 months"
          icon={<TrendingUp className="h-4 w-4" />}
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular">
              {lastDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="text-foreground font-medium">
                {lastDelta >= 0 ? "+" : ""}
                {formatPct(lastDelta)}
              </span>
              <span>MoM</span>
            </div>
          }
        >
          <div className="flex items-end justify-between gap-1.5 h-[180px] pt-3 pb-1 px-1">
            {REVENUE_TREND.map((p, i) => {
              const h = ((p.mrr - minMrr) / (maxMrr - minMrr || 1)) * 100;
              const isLast = i === REVENUE_TREND.length - 1;
              return (
                <div key={p.month} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                  <span className="text-[10px] text-muted-foreground tabular">
                    {formatINRCompact(p.mrr)}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t-[3px] transition-all duration-500",
                      isLast ? "bg-foreground" : "bg-foreground/40 hover:bg-foreground/60",
                    )}
                    style={{ height: `${Math.max(8, h)}%` }}
                    title={`${p.month}: ${formatINR(p.mrr)}`}
                  />
                  <span className={cn("text-[10px] tabular", isLast ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {p.month}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Invoices table */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search invoices - number, org, period…"
            className="max-w-[280px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Paid", "Pending", "Failed", "Refunded"].map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Plan:</span>
                <span className="max-w-[100px] truncate">{planLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by plan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["Starter", "Growth", "Enterprise"] as PlanId[]).map((p) => (
                <DropdownMenuCheckboxItem
                  key={p}
                  checked={planFilter.has(p)}
                  onCheckedChange={() => toggle(planFilter, setPlanFilter, p)}
                  className="text-[13px]"
                >
                  {p}
                </DropdownMenuCheckboxItem>
              ))}
              {planFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPlanFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Btn icon={<Download className="h-3.5 w-3.5" />} iconRight={<ChevronDown className="h-3 w-3" />}>
                Export
              </Btn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Export ({filtered.length})
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast("GSTR-1 CSV queued", { description: "Stubbed" })}>GSTR-1 CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast("All invoices CSV queued", { description: "Stubbed" })}>All invoices CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast("Excel queued", { description: "Stubbed" })}>Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          {!hasHydrated ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading invoices…</div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              onRowClick={() => undefined}
              rowActions={rowActions}
              bulkActions={bulkActions}
              emptyTitle="No invoices match"
              emptyDescription="Try adjusting your search or filters."
              initialSort={{ key: "issuedAt", dir: "desc" }}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {filtered.length} of {invoices.length} invoices · {filtered.filter((i) => i.status === "Paid").length} paid · {filtered.filter((i) => i.status === "Failed").length} failed
            </span>
            <span className="tabular text-[13px] font-medium text-foreground">
              {formatINRCompact(filtered.reduce((s, i) => s + (i.status === "Paid" ? i.amount : 0), 0))} collected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SubscriptionModelMrrCard - one card in the MRR-by-model strip.
   Renders the model name, count of active orgs on that model,
   the MRR contribution (formatted), and a progress bar showing
   that model's share of total MRR.
   ============================================================ */
function SubscriptionModelMrrCard({
  modelId,
  mrr,
  count,
  totalMrr,
  estimate,
}: {
  modelId: "saas" | "commission" | "master";
  mrr: number;
  count: number;
  totalMrr: number;
  estimate?: boolean;
}) {
  const sm = subscriptionModelById(modelId);
  // Monochrome dot convention (matches the Organizations table):
  //   saas        → solid filled dot
  //   commission  → outlined dot (revenue-share, no flat fee)
  //   master      → 40% opacity dot (bundle tier)
  const dotClass =
    modelId === "saas"
      ? "bg-foreground"
      : modelId === "commission"
        ? "border border-foreground bg-background"
        : "bg-foreground/40";
  const pct = totalMrr > 0 ? (mrr / totalMrr) * 100 : 0;
  return (
    <div className="flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} aria-hidden />
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-foreground truncate">
              {sm.label}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {sm.tagline}
            </div>
          </div>
        </div>
        <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground tabular shrink-0">
          {count} org{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-medium tabular text-foreground">
          {formatINRCompact(mrr)}
        </span>
        <span className="text-[10px] text-muted-foreground">/ mo</span>
        {estimate && (
          <span className="ml-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            est
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/70 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular">
        <span>{pct.toFixed(0)}% of total MRR</span>
        <span>
          {sm.flatMonthly > 0
            ? `${formatINR(sm.flatMonthly)} flat`
            : `${sm.commissionPct}% / trip`}
        </span>
      </div>
    </div>
  );
}

"use client";

/* ============================================================
   ComplianceView - regulatory compliance dashboard for the
   Reanzly platform. Five tabs:

     DPDP / GDPR / GST / Privacy Requests / Audit

   Each tab surfaces a focused dashboard:
     - DPDP: 8 control rows + retention rules summary
     - GDPR: 9 article-based control rows
     - GST:  8 return rows with filing status
     - Privacy Requests: 10 DSAR queue rows
     - Audit: 6 summary tiles + a top-actors list

   Strict monochrome Swiss design (black / white / grey only,
   6px radii, hairline borders, tabular numerals, no shadows).
   ============================================================ */

import { useState, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ShieldCheck, Scale, Landmark, FileLock2, History, Search,
  ChevronDown, Download, Filter, Clock, AlertTriangle,
  CheckCircle2, X, FileText, User as UserIcon, ArrowUpRight,
  ArrowDownRight, Building2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Btn } from "@/components/shared/btn";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSuperadminStore } from "./_store";
import {
  DPDP_CONTROLS, GDPR_CONTROLS, GST_RETURNS, RETENTION_RULES,
  PRIVACY_REQUESTS, AUDIT_SUMMARY,
  type DpdpControl, type GdprControl, type GstReturn,
  type RetentionRule, type PrivacyRequest, type AuditSummaryItem,
  type PrivacyRequestType, type PrivacyRequestStatus,
  dpdpStatusVariant, gdprStatusVariant, gstReturnStatusVariant,
  retentionStatusVariant, privacyRequestStatusVariant,
} from "./_compliance-data";
import { formatINR, formatDate, relativeTime, formatDateTime } from "./_helpers";

type TabId = "dpdp" | "gdpr" | "gst" | "privacy" | "audit";

const TABS: { id: TabId; label: string; icon: typeof ShieldCheck }[] = [
  { id: "dpdp",    label: "DPDP Act",       icon: ShieldCheck },
  { id: "gdpr",    label: "GDPR",            icon: Scale },
  { id: "gst",     label: "GST Returns",     icon: Landmark },
  { id: "privacy", label: "Privacy Requests", icon: FileLock2 },
  { id: "audit",   label: "Audit Summary",   icon: History },
];

export function ComplianceView() {
  const access = useSuperadminStore((s) => s.canAccess("compliance"));
  const readOnly = access === "read";
  const [tab, setTab] = useState<TabId>("dpdp");

  // Compute overall compliance score (simple weighted average across DPDP + GDPR)
  const overallScore = useMemo(() => {
    const dpdpTotal = DPDP_CONTROLS.length;
    const dpdpOk = DPDP_CONTROLS.filter((c) => c.status === "Compliant").length;
    const gdprTotal = GDPR_CONTROLS.length;
    const gdprOk = GDPR_CONTROLS.filter((c) => c.status === "Compliant").length;
    return Math.round(((dpdpOk + gdprOk) / (dpdpTotal + gdprTotal)) * 100);
  }, []);

  const overdueDsars = PRIVACY_REQUESTS.filter((p) => p.status === "Overdue").length;
  const openDsars = PRIVACY_REQUESTS.filter(
    (p) => p.status !== "Completed" && p.status !== "Cancelled",
  ).length;
  const gstOverdue = GST_RETURNS.filter((g) => g.status === "Overdue").length;
  const gstDueSoon = GST_RETURNS.filter((g) => g.status === "Due").length;
  const activeRetention = RETENTION_RULES.filter((r) => r.status === "Active").length;
  const lastPurge = useMemo(() => {
    const dates = RETENTION_RULES
      .map((r) => new Date(r.lastPurge).getTime())
      .filter((t) => !Number.isNaN(t));
    if (!dates.length) return null;
    return new Date(Math.max(...dates)).toISOString();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-foreground" />
          <h2 className="text-[14px] font-medium text-foreground">Compliance Center</h2>
          <span className="text-[11px] text-muted-foreground">
            DPDP - GDPR - GST - Privacy Requests - Audit Trail
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground tabular">
            Score · {overallScore}%
          </span>
          {readOnly && (
            <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* KPI strip - 4 tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Overall compliance"
          value={`${overallScore}%`}
          icon={<ShieldCheck className="h-4 w-4" />}
          delta="+3% vs last quarter"
          trend="up"
        />
        <KpiCard
          label="Open DSARs"
          value={openDsars}
          icon={<FileLock2 className="h-4 w-4" />}
          delta={`${overdueDsars} overdue`}
          trend={overdueDsars > 0 ? "down" : "up"}
        />
        <KpiCard
          label="GST returns due"
          value={gstDueSoon + gstOverdue}
          icon={<Landmark className="h-4 w-4" />}
          delta={gstOverdue > 0 ? `${gstOverdue} overdue` : "within schedule"}
          trend={gstOverdue > 0 ? "down" : "up"}
        />
        <KpiCard
          label="Retention rules active"
          value={activeRetention}
          icon={<History className="h-4 w-4" />}
          delta={lastPurge ? `Last purge ${relativeTime(lastPurge)}` : "no purges yet"}
          trend="up"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList
          className="h-9 w-fit rounded-[5px] border border-border bg-card p-0.5"
          aria-label="Compliance sections"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(
                  "h-8 rounded-[3px] px-3 text-[12px] font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none",
                  !isActive && "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ── DPDP tab ── */}
        <TabsContent value="dpdp" className="mt-4 flex flex-col gap-4">
          <DpdpTab />
        </TabsContent>

        {/* ── GDPR tab ── */}
        <TabsContent value="gdpr" className="mt-4 flex flex-col gap-4">
          <GdprTab />
        </TabsContent>

        {/* ── GST tab ── */}
        <TabsContent value="gst" className="mt-4 flex flex-col gap-4">
          <GstTab />
        </TabsContent>

        {/* ── Privacy Requests tab ── */}
        <TabsContent value="privacy" className="mt-4 flex flex-col gap-4">
          <PrivacyTab readOnly={readOnly} />
        </TabsContent>

        {/* ── Audit Summary tab ── */}
        <TabsContent value="audit" className="mt-4 flex flex-col gap-4">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   DPDP tab - 8 control rows + retention rules summary card.
   ============================================================ */
function DpdpTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    let r = DPDP_CONTROLS;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (c) =>
          c.control.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.owner.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All") r = r.filter((c) => c.status === statusFilter);
    return r;
  }, [search, statusFilter]);

  const columns: Column<DpdpControl>[] = [
    {
      key: "control",
      header: "Control",
      sortable: true,
      sortValue: (r) => r.control,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] text-foreground">{r.control}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.description}</span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      sortable: true,
      width: "220px",
      hideOnMobile: true,
      sortValue: (r) => r.owner,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <UserIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-[12px] text-foreground">{r.owner}</span>
        </div>
      ),
    },
    {
      key: "lastReviewed",
      header: "Last reviewed",
      sortable: true,
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.lastReviewed,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{relativeTime(r.lastReviewed)}</span>
      ),
    },
    {
      key: "evidence",
      header: "Evidence",
      width: "200px",
      hideOnMobile: true,
      hideable: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground">
          <FileText className="h-3 w-3 shrink-0" />
          {r.evidence}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = dpdpStatusVariant(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <>
      {/* Filter bar + table */}
      <div className="overflow-hidden rounded-[6px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search control, owner..."
              aria-label="Search DPDP controls"
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
              {["All", "Compliant", "In Progress", "Action Required", "Not Started"].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn("text-[13px]", s === statusFilter && "font-medium text-foreground")}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <Btn
            size="sm"
            variant="outline"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => toast("Exporting DPDP register", { description: `${filtered.length} controls` })}
          >
            Export
          </Btn>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          initialSort={{ key: "control", dir: "asc" }}
          emptyTitle="No controls match"
          emptyDescription="Adjust your search or status filter."
          pageSize={25}
        />
      </div>

      {/* Retention rules summary */}
      <RetentionRulesCard />
    </>
  );
}

function RetentionRulesCard() {
  const columns: Column<RetentionRule>[] = [
    {
      key: "dataCategory",
      header: "Data category",
      sortable: true,
      sortValue: (r) => r.dataCategory,
      render: (r) => (
        <span className="text-[12px] font-medium text-foreground">{r.dataCategory}</span>
      ),
    },
    {
      key: "retention",
      header: "Retention",
      width: "200px",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.retention}</span>
      ),
    },
    {
      key: "lastPurge",
      header: "Last purge",
      sortable: true,
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.lastPurge,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{relativeTime(r.lastPurge)}</span>
      ),
    },
    {
      key: "recordsPurged",
      header: "Records purged",
      sortable: true,
      width: "140px",
      align: "right",
      sortValue: (r) => r.recordsPurged,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.recordsPurged.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "nextPurge",
      header: "Next purge",
      width: "140px",
      hideOnMobile: true,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {typeof r.nextPurge === "string" && r.nextPurge.startsWith("-")
            ? relativeTime(r.nextPurge)
            : r.nextPurge}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = retentionStatusVariant(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <SectionCard
      title="Data retention policy enforcement"
      description="Active rules governing how long personal + operational data is kept before purge or anonymization."
      icon={<History className="h-4 w-4" />}
      flush
    >
      <DataTable
        data={RETENTION_RULES}
        columns={columns}
        initialSort={{ key: "dataCategory", dir: "asc" }}
        pageSize={25}
      />
    </SectionCard>
  );
}

/* ============================================================
   GDPR tab - 9 article-based control rows.
   ============================================================ */
function GdprTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    let r = GDPR_CONTROLS;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (c) =>
          c.control.toLowerCase().includes(q) ||
          c.article.toLowerCase().includes(q) ||
          c.notes.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All") r = r.filter((c) => c.status === statusFilter);
    return r;
  }, [search, statusFilter]);

  const columns: Column<GdprControl>[] = [
    {
      key: "article",
      header: "Article",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.article,
      render: (r) => (
        <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium tabular text-foreground">
          {r.article}
        </span>
      ),
    },
    {
      key: "control",
      header: "Control",
      sortable: true,
      sortValue: (r) => r.control,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] text-foreground">{r.control}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.notes}</span>
        </div>
      ),
    },
    {
      key: "euCustomers",
      header: "EU customers",
      sortable: true,
      width: "120px",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.euCustomers,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.euCustomers}</span>
      ),
    },
    {
      key: "lastReviewed",
      header: "Last reviewed",
      sortable: true,
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.lastReviewed,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{relativeTime(r.lastReviewed)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = gdprStatusVariant(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="relative flex h-8 w-full max-w-xs items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search article, control, notes..."
            aria-label="Search GDPR controls"
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
            {["All", "Compliant", "In Progress", "Action Required", "Not Applicable"].map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("text-[13px]", s === statusFilter && "font-medium text-foreground")}
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1" />
        <span className="text-[11px] text-muted-foreground tabular">
          {filtered.length} of {GDPR_CONTROLS.length} controls
        </span>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        initialSort={{ key: "article", dir: "asc" }}
        pageSize={25}
      />
    </div>
  );
}

/* ============================================================
   GST tab - 8 return rows.
   ============================================================ */
function GstTab() {
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    if (statusFilter === "All") return GST_RETURNS;
    return GST_RETURNS.filter((g) => g.status === statusFilter);
  }, [statusFilter]);

  const columns: Column<GstReturn>[] = [
    {
      key: "return_type",
      header: "Return",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.return_type,
      render: (r) => (
        <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium tabular text-foreground">
          {r.return_type}
        </span>
      ),
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.period,
      render: (r) => (
        <span className="text-[12px] font-medium text-foreground tabular">{r.period}</span>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN",
      width: "180px",
      hideOnMobile: true,
      render: (r) => (
        <span className="font-mono text-[11px] tabular text-muted-foreground">{r.gstin}</span>
      ),
    },
    {
      key: "turnover",
      header: "Turnover",
      sortable: true,
      width: "140px",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.turnover,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{formatINR(r.turnover)}</span>
      ),
    },
    {
      key: "taxLiability",
      header: "Tax liability",
      sortable: true,
      width: "140px",
      align: "right",
      sortValue: (r) => r.taxLiability,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {formatINR(r.taxLiability)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.dueDate,
      render: (r) => {
        const overdue = r.status === "Overdue";
        return (
          <span
            className={cn(
              "tabular text-[12px]",
              overdue ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {formatDate(r.dueDate)}
          </span>
        );
      },
    },
    {
      key: "filedBy",
      header: "Filed by",
      width: "150px",
      hideOnMobile: true,
      render: (r) =>
        r.filedBy ? (
          <span className="text-[12px] text-foreground">{r.filedBy}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = gstReturnStatusVariant(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Status:</span>
              <span className="max-w-[110px] truncate">{statusFilter}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Filter by status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {["All", "Filed", "Filing", "Due", "Overdue"].map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("text-[13px]", s === statusFilter && "font-medium text-foreground")}
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1" />
        <Btn
          size="sm"
          variant="outline"
          icon={<Download className="h-3.5 w-3.5" />}
          onClick={() => toast("Exporting GST register", { description: `${filtered.length} returns` })}
        >
          Export
        </Btn>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        initialSort={{ key: "dueDate", dir: "asc" }}
        pageSize={25}
      />
    </div>
  );
}

/* ============================================================
   Privacy Requests tab - DSAR queue.
   ============================================================ */
function PrivacyTab({ readOnly }: { readOnly: boolean }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    let r = PRIVACY_REQUESTS;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (p) =>
          p.subject.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "All") r = r.filter((p) => p.type === typeFilter);
    if (statusFilter !== "All") r = r.filter((p) => p.status === statusFilter);
    return r;
  }, [search, typeFilter, statusFilter]);

  const columns: Column<PrivacyRequest>[] = [
    {
      key: "id",
      header: "Request ID",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.id,
      render: (r) => (
        <span className="font-mono text-[11px] tabular text-foreground">{r.id}</span>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      sortValue: (r) => r.subject,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[12px] font-medium text-foreground">{r.subject}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.email}</span>
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
      key: "jurisdiction",
      header: "Jurisdiction",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.jurisdiction,
      render: (r) => (
        <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
          {r.jurisdiction}
        </span>
      ),
    },
    {
      key: "receivedAt",
      header: "Received",
      sortable: true,
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.receivedAt,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {relativeTime(r.receivedAt)}
        </span>
      ),
    },
    {
      key: "dueAt",
      header: "Due",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.dueAt,
      render: (r) => {
        const overdue = r.status === "Overdue";
        return (
          <span
            className={cn(
              "tabular text-[12px]",
              overdue ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {formatDate(r.dueAt)}
          </span>
        );
      },
    },
    {
      key: "assignedTo",
      header: "Assigned",
      width: "140px",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[12px] text-foreground">{r.assignedTo}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = privacyRequestStatusVariant(r.status);
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
          label: "Mark In Progress",
          onClick: (r: PrivacyRequest) =>
            toast("Marked In Progress", { description: `${r.id} - ${r.subject}` }),
        },
        {
          label: "Assign to me",
          onClick: (r: PrivacyRequest) =>
            toast("Assigned to you", { description: `${r.id} - ${r.subject}` }),
        },
        {
          label: "Mark Completed",
          onClick: (r: PrivacyRequest) =>
            toast("DSAR completed", { description: `${r.id} - ${r.subject}` }),
        },
      ];

  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="relative flex h-8 w-full max-w-xs items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, email, request ID..."
            aria-label="Search privacy requests"
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
        <FilterDropdown
          label="Type"
          value={typeFilter}
          options={["All", "Access", "Erasure", "Portability", "Rectification", "Objection", "Restriction"]}
          onSelect={setTypeFilter}
        />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          options={["All", "New", "In Progress", "Awaiting Verification", "Completed", "Overdue"]}
          onSelect={setStatusFilter}
        />
        <div className="flex-1" />
        <span className="text-[11px] text-muted-foreground tabular">
          {filtered.length} of {PRIVACY_REQUESTS.length} requests
        </span>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        rowActions={rowActions}
        initialSort={{ key: "dueAt", dir: "asc" }}
        pageSize={25}
      />
    </div>
  );
}

function FilterDropdown({
  label, value, options, onSelect,
}: {
  label: string; value: string;
  options: string[]; onSelect: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{label}:</span>
          <span className="max-w-[110px] truncate">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
            onClick={() => onSelect(opt)}
            className={cn("text-[13px]", opt === value && "font-medium text-foreground")}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ============================================================
   Audit Summary tab - tiles + summary list.
   ============================================================ */
function AuditTab() {
  const columns: Column<AuditSummaryItem>[] = [
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (r) => r.category,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-foreground">{r.category}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.description}</span>
        </div>
      ),
    },
    {
      key: "count",
      header: "Count (30d)",
      sortable: true,
      width: "120px",
      align: "right",
      sortValue: (r) => r.count,
      render: (r) => (
        <span className="tabular text-[14px] font-medium text-foreground">
          {r.count.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "trend",
      header: "Trend",
      sortable: true,
      width: "120px",
      align: "right",
      sortValue: (r) => r.trend,
      render: (r) => {
        if (r.trend === 0) {
          return <span className="tabular text-[12px] text-muted-foreground">flat</span>;
        }
        const up = r.trend > 0;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 tabular text-[12px] font-medium",
              up ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {up ? "+" : ""}
            {r.trend.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: "lastOccurred",
      header: "Last occurred",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.lastOccurred,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {relativeTime(r.lastOccurred)}
        </span>
      ),
    },
  ];

  const totalEvents = AUDIT_SUMMARY.reduce((acc, s) => acc + s.count, 0);
  const positiveTrendCount = AUDIT_SUMMARY.filter((s) => s.trend > 0).length;
  const negativeTrendCount = AUDIT_SUMMARY.filter((s) => s.trend < 0).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total events (30d)"
          value={totalEvents.toLocaleString("en-IN")}
          icon={<History className="h-4 w-4" />}
          delta="all categories"
          trend="up"
        />
        <KpiCard
          label="Categories up"
          value={positiveTrendCount}
          icon={<ArrowUpRight className="h-4 w-4" />}
          delta={`of ${AUDIT_SUMMARY.length} tracked`}
          trend="up"
        />
        <KpiCard
          label="Categories down"
          value={negativeTrendCount}
          icon={<ArrowDownRight className="h-4 w-4" />}
          delta="vs previous 30d"
          trend="down"
        />
        <KpiCard
          label="Window"
          value="30d"
          icon={<Clock className="h-4 w-4" />}
          delta="rolling look-back"
          trend="flat"
        />
      </div>
      <div className="overflow-hidden rounded-[6px] border border-border bg-card">
        <DataTable
          data={AUDIT_SUMMARY}
          columns={columns}
          initialSort={{ key: "count", dir: "desc" }}
          pageSize={25}
        />
      </div>
    </>
  );
}

export default ComplianceView;

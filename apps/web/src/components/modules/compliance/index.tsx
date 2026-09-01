"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import {
  ShieldCheck,
  FileText,
  Stamp,
  AlertTriangle,
  ClipboardCheck,
  CalendarClock,
  CheckCircle2,
  Ban,
} from "lucide-react";
import {
  COMPLIANCE_TABS,
  type ComplianceTab,
  STATUTORY_FILINGS,
  VEHICLE_COMPLIANCE_DOCS,
  DRIVER_COMPLIANCE_DOCS,
  EHS_INCIDENTS,
  AUDIT_LOG,
  complianceScoreColor,
  formatINRCompact,
} from "./_helpers";
import { StatutoryFilingsTab } from "./filings";
import { VehicleComplianceTab } from "./vehicle-compliance";
import { DriverComplianceTab } from "./driver-compliance";
import { EhsIncidentsTab } from "./ehs";
import { AuditLogTab } from "./audit";
import { ComplianceCalendarTab } from "./compliance-calendar";
import { KpiTile } from "./_helpers";

export function ComplianceModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "compliance");
  const resolvedTab = (view.tab as ComplianceTab | undefined) ?? "calendar";
  const [tab, setTab] = useState<ComplianceTab>(resolvedTab);

  useEffect(() => {
    setTab(resolvedTab);
  }, [resolvedTab]);

  const onTabChange = useCallback(
    (next: ComplianceTab) => {
      setTab(next);
      navigateCompat("compliance", "list", undefined, next === "calendar" ? undefined : next);
    },
    [navigateCompat],
  );

  const kpis = useMemo(() => {
    const filed = STATUTORY_FILINGS.filter((f) => f.status === "Filed").length;
    const totalFilings = STATUTORY_FILINGS.length;
    const complianceScore = totalFilings === 0 ? 100 : Math.round((filed / totalFilings) * 100);
    const pending = STATUTORY_FILINGS.filter((f) => f.status === "Pending").length;
    const overdue = STATUTORY_FILINGS.filter((f) => f.status === "Overdue").length;
    const expiredDocs = [...VEHICLE_COMPLIANCE_DOCS, ...DRIVER_COMPLIANCE_DOCS].filter((d) => d.status === "Expired").length;
    const upcoming = [...VEHICLE_COMPLIANCE_DOCS, ...DRIVER_COMPLIANCE_DOCS].filter((d) => d.status === "Expiring Soon").length;
    const openEhs = EHS_INCIDENTS.filter((e) => e.status === "Open" || e.status === "Investigating").length;
    return { complianceScore, pending, overdue, expiredDocs, upcoming, openEhs };
  }, []);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Compliance"
        description="GST filings, RTO fitness, PUC, permits, driver hours, EHS incidents and statutory audit trail."
        meta={[
          { label: "Owner", value: "Kuldeep Gill · Safety Officer" },
          { label: "Scope", value: "Statutory · Vehicle · Driver · EHS" },
          { label: "FY", value: "2025-26" },
        ]}
        actions={
          <span className="hidden text-[11px] text-muted-foreground tabular sm:inline">
            {STATUTORY_FILINGS.length} filings · {VEHICLE_COMPLIANCE_DOCS.length + DRIVER_COMPLIANCE_DOCS.length} docs
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Compliance Score" value={`${kpis.complianceScore}%`} hint="of statutory scope" />
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="Pending Filings" value={String(kpis.pending)} hint="awaiting submission" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Overdue" value={String(kpis.overdue)} hint="penalty accruing" />
        <KpiTile icon={<Ban className="h-3.5 w-3.5" />} label="Expired Docs" value={String(kpis.expiredDocs)} hint="vehicle + driver" />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Upcoming Renewals" value={String(kpis.upcoming)} hint="due in 30 days" />
        <KpiTile icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Open EHS" value={String(kpis.openEhs)} hint="under investigation" />
      </div>

      {/* Sub-nav */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {COMPLIANCE_TABS.map((t) => (
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
        {tab === "calendar" && <ComplianceCalendarTab />}
        {tab === "filings" && <StatutoryFilingsTab />}
        {tab === "vehicle" && <VehicleComplianceTab />}
        {tab === "driver" && <DriverComplianceTab />}
        {tab === "ehs" && <EhsIncidentsTab />}
        {tab === "audit" && <AuditLogTab />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {STATUTORY_FILINGS.length} statutory filings · {VEHICLE_COMPLIANCE_DOCS.length} vehicle docs ·{" "}
        {DRIVER_COMPLIANCE_DOCS.length} driver docs · {EHS_INCIDENTS.length} EHS incidents · {AUDIT_LOG.length} audit entries · Total
        liability {formatINRCompact(STATUTORY_FILINGS.reduce((s, f) => s + f.liability, 0))}
      </p>
    </div>
  );
}

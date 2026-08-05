"use client";

import { useMemo } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, issueSeverityBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/detail-layout";
import { ISSUES } from "@/lib/mock-data";
import type { Driver, Issue } from "@/lib/types";
import { AlertTriangle, CheckCircle2, AlertOctagon, Flag } from "lucide-react";
import { formatDate, driverSeed } from "../_helpers";

export function DriverIssuesTab({ driver }: { driver: Driver }) {
  // Reported-by OR assignee matches driver name OR seeded additional issues
  const directIssues = useMemo(
    () => ISSUES.filter((i: Issue) => i.reporter === driver.name || i.assignee === driver.name),
    [driver.name],
  );

  // Add a few deterministic seeded issues so every driver has *something* - types
  // specific to driver-related issues (accidents, complaints, violations, tardiness).
  const seed = driverSeed(driver.id);
  const extraIssueTypes = [
    { kind: "Accident", title: "Minor rear-end at signal", severity: "High" as Issue["severity"] },
    { kind: "Complaint", title: "Customer complaint - rude behavior", severity: "Medium" as Issue["severity"] },
    { kind: "Traffic Violation", title: "Over-speeding challan - NH-48", severity: "Medium" as Issue["severity"] },
    { kind: "Tardiness", title: "Late reporting - 3 incidents this month", severity: "Low" as Issue["severity"] },
  ];

  type IssueRow = Issue & { kind: string };

  const extraIssues: IssueRow[] = extraIssueTypes
    .filter((_, i) => (seed >> i) & 1)
    .map((e, i) => ({
      id: `drv-iss-${driver.id}-${i}`,
      issueId: `RZ-DI-${String(seed * 10 + i).padStart(4, "0")}`,
      title: e.title,
      severity: e.severity,
      vehicle: driver.assignedVehicle ?? "-",
      reporter: "System",
      assignee: driver.name,
      status: ["Open", "In Progress", "Resolved"][i % 3] as Issue["status"],
      createdDate: new Date(Date.now() - (i + 1) * 5 * 86400000).toISOString(),
      source: "Manual" as Issue["source"],
      description: `${e.kind} - auto-tracked for driver profile.`,
      kind: e.kind,
    }));

  const allRows: IssueRow[] = [
    ...directIssues.map((i): IssueRow => ({ ...i, kind: issueKindFromTitle(i.title) })),
    ...extraIssues,
  ];

  const openCount = allRows.filter((r) => r.status === "Open" || r.status === "In Progress").length;
  const resolvedCount = allRows.filter((r) => r.status === "Resolved" || r.status === "Closed").length;
  const criticalCount = allRows.filter((r) => r.severity === "Critical" || r.severity === "High").length;

  const columns: Column<IssueRow>[] = [
    {
      key: "issueId",
      header: "Issue ID",
      sortable: true,
      sortValue: (r) => r.issueId,
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.issueId}</span>,
    },
    {
      key: "kind",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.kind,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.kind}</span>,
    },
    {
      key: "title",
      header: "Title",
      render: (r) => <span className="text-[13px] text-foreground">{r.title}</span>,
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      sortValue: (r) => r.severity,
      render: (r) => {
        const { variant, pulse } = issueSeverityBadge(r.severity);
        return <StatusBadge variant={variant} pulse={pulse}>{r.severity}</StatusBadge>;
      },
    },
    {
      key: "createdDate",
      header: "Reported",
      sortable: true,
      sortValue: (r) => r.createdDate,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.createdDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Resolved" || r.status === "Closed" ? "muted" : "outline"}>
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" value={openCount} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Resolved" value={resolvedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Critical/High" value={criticalCount} icon={<AlertOctagon className="h-4 w-4" />} />
        <StatCard label="Total" value={allRows.length} icon={<Flag className="h-4 w-4" />} />
      </div>

      <SectionCard
        title="Issues Reported By / Against This Driver"
        icon={<AlertTriangle className="h-4 w-4" />}
        description="Accidents, complaints, traffic violations, and tardiness incidents."
      >
        <DataTable
          data={allRows}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "createdDate", dir: "desc" }}
          emptyTitle="No issues on record"
          emptyDescription="Clean slate - this driver has no incidents logged."
        />
      </SectionCard>
    </div>
  );
}

function issueKindFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("brake") || t.includes("clutch") || t.includes("engine") || t.includes("tyre") || t.includes("battery")) return "Vehicle Fault";
  if (t.includes("dent") || t.includes("crack") || t.includes("overheat")) return "Damage";
  return "Other";
}

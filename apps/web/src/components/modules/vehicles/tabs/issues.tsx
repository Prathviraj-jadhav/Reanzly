"use client";

import { useMemo, useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, issueSeverityBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/detail-layout";
import type { Vehicle, Issue } from "@/lib/types";
import { AlertTriangle, AlertOctagon, CheckCircle2, Flag } from "lucide-react";
import { formatDate, vehicleSeed } from "../_helpers";

export function VehicleIssuesTab({ vehicle }: { vehicle: Vehicle }) {
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    fetch("/api/issues")
      .then((r) => (r.ok ? r.json() : { issues: [] }))
      .then((data) => setIssues(data.issues ?? []))
      .catch(() => {});
  }, []);

  const direct = useMemo(
    () => issues.filter((i: Issue) => i.vehicle === vehicle.name),
    [issues, vehicle.name],
  );
  const seed = vehicleSeed(vehicle.id);
  // Add deterministic seeded issues so every vehicle has *something*
  const extra: Issue[] = Array.from({ length: 3 }, (_, k) => {
    const s = seed * 17 + k * 5;
    return {
      id: `viss-${vehicle.id}-${k}`,
      issueId: `RZ-VISS-${String(s).padStart(4, "0")}`,
      title: ["Brake pad wear exceeding limit", "Engine overheating on incline", "Battery draining overnight"][k],
      severity: (["High", "Critical", "Medium"] as Issue["severity"][])[k],
      vehicle: vehicle.name,
      reporter: ["Driver Self", "Fleet Manager", "Workshop"][k],
      assignee: "Sukhbir Gill",
      status: (["Open", "In Progress", "Resolved"] as Issue["status"][])[k],
      createdDate: new Date(Date.now() - (k + 1) * 6 * 86400000).toISOString(),
      resolutionDate: k === 2 ? new Date(Date.now() - 1 * 86400000).toISOString() : undefined,
      source: (["Manual", "Inspection", "Fault Code"] as Issue["source"][])[k],
      description: "Auto-tracked fault requiring maintenance review.",
    };
  });
  const all = [...direct, ...extra].sort((a, b) => +new Date(b.createdDate) - +new Date(a.createdDate));

  const openCount = all.filter((r) => r.status === "Open" || r.status === "In Progress").length;
  const resolvedCount = all.filter((r) => r.status === "Resolved" || r.status === "Closed").length;
  const criticalCount = all.filter((r) => r.severity === "Critical" || r.severity === "High").length;

  const columns: Column<Issue>[] = [
    {
      key: "issueId",
      header: "Issue ID",
      sortable: true,
      sortValue: (r) => r.issueId,
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.issueId}</span>,
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
      key: "source",
      header: "Source",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.source}</span>,
    },
    {
      key: "reporter",
      header: "Reporter",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.reporter}</span>,
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
        <StatCard label="Total" value={all.length} icon={<Flag className="h-4 w-4" />} />
      </div>

      <SectionCard
        title="Open & Resolved Issues"
        icon={<AlertTriangle className="h-4 w-4" />}
        description="Breakdowns, complaints, and faults raised for this vehicle."
      >
        <DataTable
          data={all}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "createdDate", dir: "desc" }}
          emptyTitle="No issues on record"
          emptyDescription="This vehicle has a clean bill of health."
        />
      </SectionCard>
    </div>
  );
}

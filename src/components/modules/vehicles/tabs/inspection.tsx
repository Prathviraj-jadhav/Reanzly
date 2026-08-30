"use client";

import { useMemo, useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, inspectionResultBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/detail-layout";
import type { Vehicle, Inspection } from "@/lib/types";
import { ClipboardCheck, CheckCircle2, XCircle, Camera } from "lucide-react";
import { formatDate, formatNumber, vehicleSeed } from "../_helpers";

export function VehicleInspectionTab({ vehicle }: { vehicle: Vehicle }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    fetch("/api/inspections")
      .then((r) => (r.ok ? r.json() : { inspections: [] }))
      .then((data) => setInspections(data.inspections ?? []))
      .catch(() => {});
  }, []);

  const direct = useMemo(
    () => inspections.filter((i: Inspection) => i.vehicle === vehicle.name),
    [inspections, vehicle.name],
  );

  const seed = vehicleSeed(vehicle.id);
  // Add a few deterministic seeded inspections so every vehicle has *something*
  const extra: Inspection[] = Array.from({ length: 3 }, (_, k) => {
    const s = seed * 11 + k * 5;
    return {
      id: `vins-${vehicle.id}-${k}`,
      inspectionId: `RZ-VINS-${String(s).padStart(4, "0")}`,
      type: ["Pre-Trip", "Post-Trip", "Quarterly"][k],
      vehicle: vehicle.name,
      driver: undefined,
      inspector: ["Sukhbir Gill", "Anil Reddy", "Rohit Sharma"][k],
      date: new Date(Date.now() - (k + 1) * 7 * 86400000).toISOString(),
      result: (["Pass", "Conditional", "Pass"] as Inspection["result"][])[k],
      odometer: vehicle.currentMeter - (k + 1) * 1200,
      linkedIssues: k === 1 ? 2 : 0,
    };
  });
  const all = [...inspections, ...extra].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const passCount = all.filter((i) => i.result === "Pass").length;
  const failCount = all.filter((i) => i.result === "Fail").length;
  const condCount = all.filter((i) => i.result === "Conditional").length;
  const passRate = all.length ? Math.round((passCount / all.length) * 100) : 0;
  const photosCount = all.reduce((s, i) => s + (i.linkedIssues * 2 + 1), 0);

  const columns: Column<Inspection>[] = [
    {
      key: "inspectionId",
      header: "Inspection ID",
      sortable: true,
      sortValue: (r) => r.inspectionId,
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.inspectionId}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[13px] text-foreground">{r.type}</span>,
    },
    {
      key: "inspector",
      header: "Inspector",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.inspector}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.date)}</span>,
    },
    {
      key: "odometer",
      header: "Odometer",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatNumber(r.odometer)} km</span>,
    },
    {
      key: "linkedIssues",
      header: "Findings",
      align: "right",
      render: (r) => (
        <span className={"text-[12px] tabular " + (r.linkedIssues > 0 ? "text-foreground" : "text-muted-foreground")}>
          {r.linkedIssues}
        </span>
      ),
    },
    {
      key: "result",
      header: "Result",
      sortable: true,
      sortValue: (r) => r.result,
      render: (r) => {
        const { variant, pulse } = inspectionResultBadge(r.result);
        return <StatusBadge variant={variant} pulse={pulse}>{r.result}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Inspections" value={all.length} icon={<ClipboardCheck className="h-4 w-4" />} />
        <StatCard label="Pass Rate" value={`${passRate}%`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Failures" value={failCount} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Photos" value={photosCount} icon={<Camera className="h-4 w-4" />} />
      </div>

      <SectionCard
        title="Inspection History"
        icon={<ClipboardCheck className="h-4 w-4" />}
        description={`${all.length} inspections · pre-trip, post-trip, quarterly · ${condCount} conditional`}
      >
        <DataTable
          data={all}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No inspections on file"
          emptyDescription="Log a pre-trip or post-trip inspection to start building this vehicle's record."
        />
      </SectionCard>
    </div>
  );
}

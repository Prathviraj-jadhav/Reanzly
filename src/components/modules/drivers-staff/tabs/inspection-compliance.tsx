"use client";

import { useMemo, useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, inspectionResultBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/detail-layout";
import type { Driver, Inspection } from "@/lib/types";
import { ClipboardCheck, CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { formatDate, driverSeed, generateCompliance } from "../_helpers";

export function DriverInspectionComplianceTab({ driver }: { driver: Driver }) {
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    fetch("/api/inspections")
      .then((r) => (r.ok ? r.json() : { inspections: [] }))
      .then((data) => setInspections(data.inspections ?? []))
      .catch(() => {});
  }, []);

  const driverInspections = useMemo(
    () => inspections.filter((i: Inspection) => i.driver === driver.name),
    [inspections, driver.name],
  );

  const passCount = driverInspections.filter((i) => i.result === "Pass").length;
  const failCount = driverInspections.filter((i) => i.result === "Fail").length;
  const condCount = driverInspections.filter((i) => i.result === "Conditional").length;
  const passRate = driverInspections.length ? Math.round((passCount / driverInspections.length) * 100) : 0;

  const compliance = useMemo(
    () => generateCompliance(driver.id, driver.licenseExpiry),
    [driver.id, driver.licenseExpiry],
  );
  const seed = driverSeed(driver.id);

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
      key: "vehicle",
      header: "Vehicle",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.vehicle}</span>,
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
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{r.odometer.toLocaleString("en-IN")} km</span>,
    },
    {
      key: "linkedIssues",
      header: "Issues",
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
      {/* Pass/Fail summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Inspections" value={driverInspections.length} icon={<ClipboardCheck className="h-4 w-4" />} />
        <StatCard label="Pass Rate" value={`${passRate}%`} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Failures" value={failCount} icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Conditional" value={condCount} icon={<AlertCircle className="h-4 w-4" />} />
      </div>

      {/* Inspections involving this driver */}
      <SectionCard
        title="Inspections Involving This Driver"
        icon={<ClipboardCheck className="h-4 w-4" />}
        description={`${driverInspections.length} records · pre-trip, post-trip, random, quarterly`}
      >
        <DataTable
          data={driverInspections}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No inspections on file"
          emptyDescription="This driver hasn't been part of any inspection yet."
        />
      </SectionCard>

      {/* Compliance checklist */}
      <SectionCard title="Compliance Checklist" icon={<ShieldCheck className="h-4 w-4" />}>
        <ul className="flex flex-col gap-2">
          {compliance.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5 rounded-[5px] border border-border bg-background p-2.5">
              {c.status === "Compliant" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              ) : c.status === "Warning" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">{c.label}</span>
                  <StatusBadge
                    variant={c.status === "Compliant" ? "outline" : c.status === "Warning" ? "solid" : "solid"}
                    pulse={c.status !== "Compliant"}
                  >
                    {c.status}
                  </StatusBadge>
                </div>
                <p className="text-[12px] text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
          <li className="flex items-start gap-2.5 rounded-[5px] border border-border bg-background p-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-foreground">Drug & Alcohol Screen</span>
                <StatusBadge variant="outline">Compliant</StatusBadge>
              </div>
              <p className="text-[12px] text-muted-foreground">Last screen {15 + (seed % 30)}d ago · negative</p>
            </div>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}

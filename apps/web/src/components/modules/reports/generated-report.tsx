"use client";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  ArrowLeft, Printer, FileDown, FileSpreadsheet,
  CalendarClock, Save, RefreshCw,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  formatDate,
  type ReportConfigForm, type ReportType,
} from "./_helpers";

const GREY_RAMP = ["#171717", "#525252", "#737373", "#a3a3a3", "#c4c4c4"];

interface ReportData {
  rows: Record<string, string>[];
  chartData: { label: string; value: number }[];
  chartType: "bar" | "line";
  stats: { label: string; value: string }[];
}

const EMPTY_DATA: ReportData = { rows: [], chartData: [], chartType: "bar", stats: [] };

interface GeneratedReportProps {
  report: ReportType;
  form: ReportConfigForm;
  onBack: () => void;
  onSchedule: () => void;
  onSaveCustom: () => void;
}

function buildQuery(form: ReportConfigForm): string {
  const p = new URLSearchParams({ datePreset: form.datePreset });
  if (form.datePreset === "custom") {
    p.set("customStart", form.customStart);
    p.set("customEnd", form.customEnd);
  }
  if (form.vehicleGroup !== "All") p.set("vehicleGroup", form.vehicleGroup);
  if (form.vehicleType !== "All") p.set("vehicleType", form.vehicleType);
  return p.toString();
}

/** Real CSV file, built from the actual rendered columns/rows and downloaded via a Blob URL - no fake toast. */
function downloadCsv(filename: string, columns: string[], rows: Record<string, string>[]) {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [columns.map(escape).join(",")];
  rows.forEach((r) => lines.push(columns.map((c) => escape(String(r[c] ?? ""))).join(",")));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Real .xls file via the HTML-table-as-Excel technique (no xlsx library needed) - Excel opens this natively. */
function downloadExcel(filename: string, columns: string[], rows: Record<string, string>[]) {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const head = `<tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${esc(String(r[c] ?? ""))}</td>`).join("")}</tr>`).join("");
  const html = `<html><head><meta charset="utf-8"></head><body><table>${head}${body}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function GeneratedReport({ report, form, onBack, onSchedule, onSaveCustom }: GeneratedReportProps) {
  const [data, setData] = useState<ReportData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const dateLabel = form.datePreset === "custom"
    ? `${formatDate(form.customStart)} → ${formatDate(form.customEnd)}`
    : form.datePreset === "ytd"
      ? "Year to date"
      : form.datePreset === "all"
        ? "All time"
        : `Last ${form.datePreset === "7d" ? 7 : form.datePreset === "30d" ? 30 : 90} days`;

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports/${report.id}?${buildQuery(form)}`)
      .then((r) => (r.ok ? r.json() : EMPTY_DATA))
      .then((d) => setData(d))
      .catch(() => { toast.error("Could not load report data."); setData(EMPTY_DATA); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, form.datePreset, form.customStart, form.customEnd, form.vehicleGroup, form.vehicleType]);

  useEffect(() => { load(); }, [load]);

  const columns = form.columns.filter((c) => c !== "-");
  const { rows, chartData, chartType, stats } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">{report.name}</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{report.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-muted-foreground">
              <span><span className="text-muted-foreground/70">Range:</span> <span className="text-foreground tabular">{dateLabel}</span></span>
              <span><span className="text-muted-foreground/70">Group By:</span> <span className="text-foreground">{form.groupBy}</span></span>
              {form.vehicleGroup !== "All" && <span><span className="text-muted-foreground/70">Group:</span> <span className="text-foreground">{form.vehicleGroup}</span></span>}
              {form.vehicleType !== "All" && <span><span className="text-muted-foreground/70">Type:</span> <span className="text-foreground">{form.vehicleType}</span></span>}
              {loading && <span className="text-muted-foreground/70">Loading…</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Btn size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={load}>
              Refresh
            </Btn>
            <Btn size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.print()}>
              Print / Save PDF
            </Btn>
            <Btn size="sm" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => { downloadCsv(`${report.name}.csv`, columns, rows); toast.success("CSV downloaded"); }}>
              CSV
            </Btn>
            <Btn size="sm" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => { downloadExcel(`${report.name}.xls`, columns, rows); toast.success("Excel file downloaded"); }}>
              Excel
            </Btn>
            <Btn size="sm" icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={onSchedule}>
              Schedule
            </Btn>
            <Btn size="sm" variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={onSaveCustom}>
              Save Custom
            </Btn>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-[6px] border border-border bg-card p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
            <span className="text-[16px] font-medium leading-none tracking-tight tabular text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {chartData.length > 0 && (
          <div className="rounded-[6px] border border-border bg-card p-4 lg:col-span-2 print:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                {chartType === "bar" ? "Bar Chart" : "Trend Line"}
              </h3>
              <span className="text-[11px] text-muted-foreground tabular">{chartData.length} series</span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "var(--accent)" }}
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        padding: "6px 10px",
                      }}
                      labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={GREY_RAMP[i % GREY_RAMP.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        padding: "6px 10px",
                      }}
                      labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--foreground)" strokeWidth={1.5} dot={{ r: 3, fill: "var(--foreground)" }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={`rounded-[6px] border border-border bg-card overflow-hidden ${chartData.length > 0 ? "lg:col-span-3" : "lg:col-span-5"}`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Data Table</h3>
            <span className="text-[11px] text-muted-foreground tabular">{rows.length} rows · {columns.length} cols</span>
          </div>
          <div className="max-h-[520px] overflow-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-accent/40 transition-colors">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 text-[12px] text-foreground whitespace-nowrap">
                        {String(r[c] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                      No data for the selected range and filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

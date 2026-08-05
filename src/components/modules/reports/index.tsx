"use client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Plus, CalendarClock, Star, Clock, MoreHorizontal,
  Edit3, Trash2, Play, Pause, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store/app-store";
import {
  REPORT_CATEGORIES, REPORT_TYPES, SCHEDULED_REPORTS, CUSTOM_REPORTS,
  getReportIcon, formatDate, formatDateTime, relativeTime,
  type ReportCategory, type ReportType, type ReportConfigForm, type ScheduleForm,
} from "./_helpers";
import { ReportConfigDrawer } from "./report-config-drawer";
import { ScheduleDrawer } from "./schedule-drawer";
import { GeneratedReport } from "./generated-report";
import { DataExplorer } from "./data-explorer";

export function ReportsModule() {
  const [activeTab, setActiveTab] = useState<"library" | "scheduled" | "custom" | "data">("library");
  const [activeCategory, setActiveCategory] = useState<ReportCategory | "All">("All");
  const [configOpen, setConfigOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [generated, setGenerated] = useState<{ report: ReportType; form: ReportConfigForm } | null>(null);
  const [scheduledList, setScheduledList] = useState(SCHEDULED_REPORTS);

  const filteredReports = useMemo(() => {
    if (activeCategory === "All") return REPORT_TYPES;
    return REPORT_TYPES.filter((r) => r.category === activeCategory);
  }, [activeCategory]);

  const openConfig = (report: ReportType) => {
    setActiveReport(report);
    setConfigOpen(true);
  };

  const handleGenerate = (form: ReportConfigForm) => {
    const report = REPORT_TYPES.find((r) => r.id === form.reportId);
    if (!report) return;
    setGenerated({ report, form });
    toast.success("Report generated", {
      description: `${report.name} · ${form.columns.length} columns · ${form.format}`,
    });
  };

  const handleSchedule = (form: ScheduleForm) => {
    const report = REPORT_TYPES.find((r) => r.id === form.reportId);
    if (!report) return;
    setScheduledList((prev) => [
      {
        id: "sch-" + (prev.length + 1),
        reportName: report.name,
        category: report.category,
        frequency: form.frequency,
        deliveryTime: form.deliveryTime,
        recipients: form.recipients.split(",").map((s) => s.trim()).filter(Boolean),
        format: form.format,
        nextRun: new Date(Date.now() + 86400000).toISOString(),
        createdBy: "You",
        status: "Active",
      },
      ...prev,
    ]);
    toast.success("Report scheduled", {
      description: `${report.name} · ${form.frequency} at ${form.deliveryTime}`,
    });
  };

  const openScheduleFromGenerated = () => {
    if (generated) {
      setActiveReport(generated.report);
      setScheduleOpen(true);
    }
  };

  const toggleSchedule = (id: string) => {
    setScheduledList((prev) => prev.map((s) => s.id === id ? { ...s, status: s.status === "Active" ? "Paused" : "Active" } : s));
  };

  const deleteSchedule = (id: string) => {
    setScheduledList((prev) => prev.filter((s) => s.id !== id));
    toast("Scheduled report removed");
  };

  // ===== Generated report view =====
  if (generated) {
    return (
      <div className="flex flex-col gap-5">
        <GeneratedReport
          report={generated.report}
          form={generated.form}
          onBack={() => setGenerated(null)}
          onSchedule={openScheduleFromGenerated}
        />
        <ScheduleDrawer
          open={scheduleOpen}
          report={activeReport}
          onClose={() => setScheduleOpen(false)}
          onSchedule={handleSchedule}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description="Generate, schedule, and export operational, fleet, financial, and compliance reports."
        actions={
          <>
            <Btn icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={() => setActiveTab("scheduled")}>
              Scheduled
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setActiveCategory("Custom")}>
              New Custom
            </Btn>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as never)}>
        <TabsList className="bg-transparent p-0 h-auto gap-4 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger
            value="library"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Report Library
            {activeTab === "library" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="scheduled"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Scheduled ({scheduledList.length})
            {activeTab === "scheduled" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Custom Reports ({CUSTOM_REPORTS.length})
            {activeTab === "custom" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Data Explorer
            {activeTab === "data" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
        </TabsList>

        {/* Library */}
        <TabsContent value="library" className="mt-5">
          {/* Category filter pills */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory("All")}
              className={
                "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors " +
                (activeCategory === "All"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:bg-accent")
              }
            >
              All
            </button>
            {REPORT_CATEGORIES.map((c) => {
              const count = REPORT_TYPES.filter((r) => r.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={
                    "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors flex items-center gap-1.5 " +
                    (activeCategory === c
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:bg-accent")
                  }
                >
                  {c}
                  <span className="text-[10px] opacity-70 tabular">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Report cards grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => {
              const Icon = getReportIcon(report.icon);
              return (
                <div
                  key={report.id}
                  className="group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 transition-colors hover:border-foreground/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground group-hover:text-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-medium leading-tight text-foreground flex items-center gap-1.5">
                          {report.name}
                          {report.isRean && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">{report.category}</p>
                      </div>
                    </div>
                    <StatusBadge variant="outline" className="text-[10px]">{report.formats.join(" · ")}</StatusBadge>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">
                    {report.description}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground tabular">{report.columns.length} columns</span>
                    <div className="flex items-center gap-1.5">
                      <Btn size="sm" variant="ghost" icon={<CalendarClock className="h-3.5 w-3.5" />}
                        onClick={() => { setActiveReport(report); setScheduleOpen(true); }}>
                        Schedule
                      </Btn>
                      <Btn size="sm" variant="primary" onClick={() => openConfig(report)}>
                        Generate
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredReports.length === 0 && (
            <div className="rounded-[6px] border border-border bg-card p-8 text-center">
              <p className="text-[13px] text-muted-foreground">No reports in this category yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Scheduled */}
        <TabsContent value="scheduled" className="mt-5">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Scheduled Reports</h3>
              <span className="text-[11px] text-muted-foreground tabular">{scheduledList.length} schedules</span>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Report</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Frequency</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Time</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Recipients</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Format</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Next Run</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created By</th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scheduledList.map((s) => (
                    <tr key={s.id} className="hover:bg-accent/40 transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="text-[13px] font-medium text-foreground">{s.reportName}</div>
                        <div className="text-[11px] text-muted-foreground">{s.category}</div>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-foreground">{s.frequency}</td>
                      <td className="px-4 py-2.5 text-[13px] text-foreground tabular">{s.deliveryTime}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground max-w-[200px] truncate">{s.recipients.join(", ")}</td>
                      <td className="px-4 py-2.5 text-[12px] text-foreground tabular">{s.format}</td>
                      <td className="px-4 py-2.5 text-[12px] text-foreground tabular">{formatDate(s.nextRun)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant={s.status === "Active" ? "solid" : "muted"} pulse={s.status === "Active"}>
                          {s.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{s.createdBy}</td>
                      <td className="px-4 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => toast("Edit schedule", { description: s.reportName })}>
                              <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSchedule(s.id)}>
                              {s.status === "Active" ? <Pause className="h-3.5 w-3.5 mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
                              {s.status === "Active" ? "Pause" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast("Running now…", { description: s.reportName })}>
                              <Clock className="h-3.5 w-3.5 mr-2" /> Run Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-foreground font-medium" onClick={() => deleteSchedule(s.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {scheduledList.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[13px] text-muted-foreground">No scheduled reports. Generate a report and click Schedule to set up automatic delivery.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Custom */}
        <TabsContent value="custom" className="mt-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CUSTOM_REPORTS.map((c) => (
              <div key={c.id} className="group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 hover:border-foreground/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground group-hover:text-foreground transition-colors">
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium leading-tight text-foreground">{c.name}</h3>
                      <p className="text-[11px] text-muted-foreground">Based on {c.baseReport} · {c.category}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => {
                        const r = REPORT_TYPES.find((rt) => rt.name === c.baseReport);
                        if (r) { openConfig(r); }
                      }}>
                        <Play className="h-3.5 w-3.5 mr-2" /> Run Now
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast("Edit custom report", { description: c.name })}>
                        <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast("Duplicate", { description: c.name + " (copy)" })}>
                        <Plus className="h-3.5 w-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-foreground font-medium" onClick={() => toast("Custom report deleted", { description: c.name })}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{c.description}</p>
                <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <span>By {c.createdBy}</span>
                  <span className="tabular">Last run {relativeTime(c.lastRun)} · {c.runCount} runs</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Data Explorer */}
        <TabsContent value="data" className="mt-5">
          <DataExplorer />
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      <ReportConfigDrawer
        open={configOpen}
        report={activeReport}
        onClose={() => setConfigOpen(false)}
        onGenerate={handleGenerate}
      />
      <ScheduleDrawer
        open={scheduleOpen}
        report={activeReport}
        onClose={() => setScheduleOpen(false)}
        onSchedule={handleSchedule}
      />
    </div>
  );
}

"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
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
import {
  REPORT_CATEGORIES, REPORT_TYPES,
  getReportIcon, formatDate, relativeTime, emptyConfigForm,
  type ReportCategory, type ReportType, type ReportConfigForm, type ScheduleForm, type CustomReportDTO,
} from "./_helpers";
import { ReportConfigDrawer } from "./report-config-drawer";
import { ScheduleDrawer } from "./schedule-drawer";
import { GeneratedReport } from "./generated-report";
import { DataExplorer } from "./data-explorer";
import { useReportsData } from "./use-reports-data";

type ReportsTab = "library" | "scheduled" | "custom" | "data";

export function ReportsModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const resolvedTab = (view.tab as ReportsTab | undefined) ?? "library";
  const {
    scheduled, custom, loaded,
    createSchedule, patchSchedule, deleteSchedule, runSchedule,
    saveCustom, deleteCustom, runCustom,
  } = useReportsData();

  const [activeTab, setActiveTab] = useState<ReportsTab>(resolvedTab);
  const [activeCategory, setActiveCategory] = useState<ReportCategory | "All">("All");
  const [configOpen, setConfigOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [generated, setGenerated] = useState<{ report: ReportType; form: ReportConfigForm } | null>(null);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  useEffect(() => {
    if (view.view === "detail" && view.id) {
      const report = REPORT_TYPES.find((r) => r.id === view.id);
      if (report) {
        setGenerated({
          report,
          form: emptyConfigForm(report.id, report.columns, report.defaultGroupBy),
        });
      }
    }
  }, [view.view, view.id]);

  const onTabChange = useCallback(
    (next: ReportsTab) => {
      setActiveTab(next);
      setGenerated(null);
      goToModule("reports", "list", undefined, next === "library" ? undefined : next);
    },
    [goToModule],
  );

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
    goToModule("reports", "detail", report.id);
  };

  const handleSchedule = async (form: ScheduleForm) => {
    const report = REPORT_TYPES.find((r) => r.id === form.reportId);
    if (!report) return;
    const created = await createSchedule({
      reportId: report.id,
      reportName: report.name,
      category: report.category,
      frequency: form.frequency,
      deliveryTime: form.deliveryTime,
      recipients: form.recipients,
      format: form.format,
    });
    if (created) {
      toast.success("Report scheduled", { description: `${report.name} · ${form.frequency} at ${form.deliveryTime}` });
    }
  };

  const handleSaveCustom = async () => {
    if (!generated) return;
    const { report, form } = generated;
    const existingForBase = custom.filter((c) => c.baseReportId === report.id).length;
    const filterBits: string[] = [];
    if (form.vehicleGroup !== "All") filterBits.push(`Group: ${form.vehicleGroup}`);
    if (form.vehicleType !== "All") filterBits.push(`Type: ${form.vehicleType}`);
    filterBits.push(`Range: ${form.datePreset === "custom" ? `${form.customStart} → ${form.customEnd}` : form.datePreset}`);
    const created = await saveCustom({
      name: existingForBase > 0 ? `${report.name} (Custom ${existingForBase + 1})` : `${report.name} (Custom)`,
      baseReportId: report.id,
      category: report.category,
      description: `${report.name} filtered - ${filterBits.join(", ")}.`,
      filters: form,
    });
    if (created) toast.success("Saved as Custom Report", { description: "Available under Custom tab" });
  };

  const openScheduleFromGenerated = () => {
    if (generated) {
      setActiveReport(generated.report);
      setScheduleOpen(true);
    }
  };

  const toggleSchedule = async (id: string, current: "Active" | "Paused") => {
    const updated = await patchSchedule(id, { status: current === "Active" ? "Paused" : "Active" });
    if (updated) toast(updated.status === "Active" ? "Activated" : "Paused", { description: updated.reportName });
  };

  const removeSchedule = async (id: string, name: string) => {
    const ok = await deleteSchedule(id);
    if (ok) toast("Scheduled report removed", { description: name });
  };

  const runScheduleNow = async (id: string, name: string) => {
    const result = await runSchedule(id);
    if (result) toast.success("Report generated", { description: `${name} · ${result.rowCount} rows` });
  };

  const runCustomReport = async (c: CustomReportDTO) => {
    const result = await runCustom(c.id);
    if (!result) return;
    const report = REPORT_TYPES.find((r) => r.id === c.baseReportId);
    if (report) {
      const saved = c.filters as Partial<ReportConfigForm>;
      setGenerated({
        report,
        form: { ...emptyConfigForm(report.id, report.columns, report.defaultGroupBy), ...saved, reportId: report.id, columns: report.columns },
      });
    }
    toast.success("Custom report run", { description: `${c.name} · ${result.data.rows.length} rows` });
  };

  const removeCustom = async (id: string, name: string) => {
    const ok = await deleteCustom(id);
    if (ok) toast("Custom report deleted", { description: name });
  };

  // ===== Generated report view =====
  if (generated) {
    return (
      <div className="flex flex-col gap-5">
        <GeneratedReport
          report={generated.report}
          form={generated.form}
          onBack={() => {
            setGenerated(null);
            goToModule("reports");
          }}
          onSchedule={openScheduleFromGenerated}
          onSaveCustom={handleSaveCustom}
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
            <Btn icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={() => onTabChange("scheduled")}>
              Scheduled
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setActiveCategory("Custom")}>
              New Custom
            </Btn>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ReportsTab)}>
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
            Scheduled ({scheduled.length})
            {activeTab === "scheduled" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Custom Reports ({custom.length})
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
              <span className="text-[11px] text-muted-foreground tabular">{scheduled.length} schedules</span>
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
                  {scheduled.map((s) => (
                    <tr key={s.id} className="hover:bg-accent/40 transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="text-[13px] font-medium text-foreground">{s.reportName}</div>
                        <div className="text-[11px] text-muted-foreground">{s.category}</div>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-foreground">{s.frequency}</td>
                      <td className="px-4 py-2.5 text-[13px] text-foreground tabular">{s.deliveryTime}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground max-w-[200px] truncate">{s.recipients.join(", ") || "-"}</td>
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
                            <DropdownMenuItem onClick={() => toggleSchedule(s.id, s.status)}>
                              {s.status === "Active" ? <Pause className="h-3.5 w-3.5 mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
                              {s.status === "Active" ? "Pause" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runScheduleNow(s.id, s.reportName)}>
                              <Clock className="h-3.5 w-3.5 mr-2" /> Run Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-foreground font-medium" onClick={() => removeSchedule(s.id, s.reportName)}>
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
            {loaded && scheduled.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[13px] text-muted-foreground">No scheduled reports. Generate a report and click Schedule to set up automatic delivery.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Custom */}
        <TabsContent value="custom" className="mt-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {custom.map((c) => (
              <div key={c.id} className="group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 hover:border-foreground/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground group-hover:text-foreground transition-colors">
                      <Star className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium leading-tight text-foreground">{c.name}</h3>
                      <p className="text-[11px] text-muted-foreground">Based on {REPORT_TYPES.find((r) => r.id === c.baseReportId)?.name ?? c.baseReportId} · {c.category}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => runCustomReport(c)}>
                        <Play className="h-3.5 w-3.5 mr-2" /> Run Now
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const r = REPORT_TYPES.find((rt) => rt.id === c.baseReportId);
                        if (r) openConfig(r);
                      }}>
                        <Edit3 className="h-3.5 w-3.5 mr-2" /> Generate Fresh Copy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-foreground font-medium" onClick={() => removeCustom(c.id, c.name)}>
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
          {loaded && custom.length === 0 && (
            <div className="rounded-[6px] border border-border bg-card p-8 text-center">
              <p className="text-[13px] text-muted-foreground">No custom reports yet. Generate a report and click "Save Custom" to save your filters.</p>
            </div>
          )}
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

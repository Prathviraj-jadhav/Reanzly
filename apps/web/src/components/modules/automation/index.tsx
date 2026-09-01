"use client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Edit3, Copy, Pause, Play, Trash2, Zap, Filter, Workflow,
  Sparkles, FileText, Wrench, ShieldCheck, UserCheck, Clock, Receipt, Repeat,
  type LucideIcon,
} from "lucide-react";
import type { Automation } from "@/lib/types";
import {
  AUTOMATION_TEMPLATES, EMPTY_FORM, SCHEDULE_INTERVALS, relativeTime,
  type AutomationTemplate, type AutomationForm,
} from "./_helpers";
import { AutomationBuilder } from "./automation-builder";
import { AskReanDrawer } from "./ask-rean-drawer";
import { useAutomationData } from "./use-automation-data";

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Wrench, Receipt, FileText, ShieldCheck, Sparkles, UserCheck, Clock,
};

export function AutomationModule() {
  const { automations, logs, loaded, createAutomation, patchAutomation, deleteAutomation, runAutomation } = useAutomationData();
  const [activeTab, setActiveTab] = useState<"active" | "templates" | "logs">("active");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [initialForm, setInitialForm] = useState<AutomationForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [askReanOpen, setAskReanOpen] = useState(false);

  const handleRowAction = async (action: string, a: Automation) => {
    switch (action) {
      case "edit":
        setEditingId(a.id);
        setInitialForm({
          name: a.name,
          description: a.description,
          triggerCategory: a.triggerCategory,
          trigger: a.trigger,
          conditionLogic: "AND",
          conditions: a.conditions,
          actions: a.actions,
          activate: a.status === "Active",
          scheduleEnabled: a.scheduleEnabled,
          scheduleIntervalMinutes: a.scheduleIntervalMinutes ?? EMPTY_FORM.scheduleIntervalMinutes,
        });
        setBuilderOpen(true);
        break;
      case "duplicate": {
        const copy = await createAutomation({
          name: a.name + " (copy)",
          description: a.description,
          triggerCategory: a.triggerCategory,
          trigger: a.trigger,
          conditions: a.conditions,
          actions: a.actions,
          activate: false,
        });
        if (copy) toast.success("Automation duplicated", { description: copy.name });
        break;
      }
      case "toggle": {
        const nextStatus = a.status === "Active" ? "Paused" : "Active";
        const updated = await patchAutomation(a.id, { status: nextStatus });
        if (updated) toast(nextStatus === "Active" ? "Activated" : "Paused", { description: a.name });
        break;
      }
      case "delete": {
        const ok = await deleteAutomation(a.id);
        if (ok) toast("Automation deleted", { description: a.name });
        break;
      }
      case "run": {
        const result = await runAutomation(a.id);
        if (!result) break;
        if (result.log.result === "Unsupported") {
          toast(a.name, { description: "Live evaluation not implemented for this trigger yet." });
        } else {
          const parts: string[] = [];
          if (result.tasksCreated > 0) parts.push(`${result.tasksCreated} task(s) in Operations Hub`);
          if (result.workOrdersCreated > 0) parts.push(`${result.workOrdersCreated} work order(s)`);
          const description = parts.length > 0
            ? `${result.log.triggerEntity} · created ${parts.join(" + ")}`
            : result.log.triggerEntity;
          toast.success(a.name, { description });
        }
        break;
      }
    }
  };

  const handleTemplateClick = (tpl: AutomationTemplate) => {
    setEditingId(null);
    setInitialForm({
      ...EMPTY_FORM,
      name: tpl.name,
      description: tpl.description,
      triggerCategory: tpl.triggerCategory,
      trigger: tpl.trigger,
      conditionLogic: "AND",
      conditions: tpl.conditions,
      actions: tpl.actions,
      activate: false,
    });
    setBuilderOpen(true);
  };

  const handleNewAutomation = () => {
    setEditingId(null);
    setInitialForm({ ...EMPTY_FORM });
    setBuilderOpen(true);
  };

  const handleUseReanDraft = (draft: Partial<AutomationForm>) => {
    setEditingId(null);
    setInitialForm({ ...EMPTY_FORM, ...draft });
    setAskReanOpen(false);
    setBuilderOpen(true);
  };

  const handleSave = async (form: AutomationForm) => {
    if (editingId) {
      const updated = await patchAutomation(editingId, {
        name: form.name,
        description: form.description,
        triggerCategory: form.triggerCategory,
        trigger: form.trigger,
        conditions: form.conditions,
        actions: form.actions,
        status: form.activate ? "Active" : "Paused",
        scheduleEnabled: form.scheduleEnabled,
        scheduleIntervalMinutes: form.scheduleIntervalMinutes,
      });
      if (updated) toast.success("Automation updated", { description: form.name });
    } else {
      const created = await createAutomation({
        name: form.name,
        description: form.description,
        triggerCategory: form.triggerCategory,
        trigger: form.trigger,
        conditions: form.conditions,
        actions: form.actions,
        activate: form.activate,
        scheduleEnabled: form.scheduleEnabled,
        scheduleIntervalMinutes: form.scheduleIntervalMinutes,
      });
      if (created) toast.success("Automation created", { description: form.name });
    }
    setBuilderOpen(false);
    setInitialForm(null);
    setEditingId(null);
  };

  const counts = useMemo(() => ({
    active: automations.filter((a) => a.status === "Active").length,
    paused: automations.filter((a) => a.status === "Paused").length,
    total: automations.length,
  }), [automations]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Automation"
        description="Trigger-action workflows that run across trips, fleet, finance, and compliance."
        actions={
          <>
            <Btn icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => setAskReanOpen(true)}>
              Create with Rean
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={handleNewAutomation}>
              New Automation
            </Btn>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as never)}>
        <TabsList className="bg-transparent p-0 h-auto gap-4 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger
            value="active"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Automations ({automations.length})
            {activeTab === "active" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Template Library ({AUTOMATION_TEMPLATES.length})
            {activeTab === "templates" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Execution Log ({logs.length})
            {activeTab === "logs" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
        </TabsList>

        {/* Automations list */}
        <TabsContent value="active" className="mt-5">
          {/* KPIs */}
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile label="Total" value={counts.total} />
            <KpiTile label="Active" value={counts.active} />
            <KpiTile label="Paused" value={counts.paused} />
            <KpiTile label="Total Runs" value={automations.reduce((s, a) => s + a.runCount, 0)} />
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Automation</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trigger</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Run</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Run Count</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created By</th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {automations.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/30 transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
                            <Zap className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
                              {a.name}
                              {a.triggerCategory === "Rean Alert" && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[280px]">{a.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[12px] text-foreground">{a.trigger}</div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {a.triggerCategory}
                          {a.scheduleEnabled && a.scheduleIntervalMinutes && (
                            <span className="flex items-center gap-0.5 rounded-[3px] border border-border px-1 py-0.5 text-foreground">
                              <Repeat className="h-2.5 w-2.5" />
                              {SCHEDULE_INTERVALS.find((s) => s.minutes === a.scheduleIntervalMinutes)?.label.replace("Every ", "") ?? `${a.scheduleIntervalMinutes}m`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant={a.status === "Active" ? "solid" : "muted"} pulse={a.status === "Active"}>
                          {a.status}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{relativeTime(a.lastRun)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-foreground tabular text-right">{a.runCount}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{a.createdBy}</td>
                      <td className="px-4 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleRowAction("edit", a)}>
                              <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRowAction("duplicate", a)}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRowAction("toggle", a)}>
                              {a.status === "Active" ? <Pause className="h-3.5 w-3.5 mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
                              {a.status === "Active" ? "Pause" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRowAction("run", a)}>
                              <Zap className="h-3.5 w-3.5 mr-2" /> Run Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-foreground font-medium" onClick={() => handleRowAction("delete", a)}>
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
            {loaded && automations.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[13px] text-muted-foreground">No automations yet. Use a template or create one from scratch.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Template library */}
        <TabsContent value="templates" className="mt-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {AUTOMATION_TEMPLATES.map((tpl) => {
              const Icon = TEMPLATE_ICONS[tpl.icon] || Workflow;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateClick(tpl)}
                  className="group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 text-left transition-colors hover:border-foreground/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground group-hover:text-foreground transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-medium leading-tight text-foreground flex items-center gap-1.5">
                          {tpl.name}
                          {tpl.triggerCategory === "Rean Alert" && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">{tpl.category}</p>
                      </div>
                    </div>
                    <StatusBadge variant="outline" className="text-[10px]">{tpl.triggerCategory}</StatusBadge>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">{tpl.description}</p>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Filter className="h-3 w-3" />{tpl.conditions.length} conditions</span>
                      <span className="flex items-center gap-1"><Workflow className="h-3 w-3" />{tpl.actions.length} actions</span>
                    </div>
                    <span className="text-[11px] font-medium text-foreground">Use template →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        {/* Execution log */}
        <TabsContent value="logs" className="mt-5">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Execution Log</h3>
              <span className="text-[11px] text-muted-foreground tabular">
                {logs.length} runs · {logs.filter((l) => l.result === "Success").length} success · {logs.filter((l) => l.result === "Unsupported").length} unsupported
              </span>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Timestamp</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Automation</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Trigger Entity</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Conditions Evaluated</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Result</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Duration</th>
                    <th className="w-10 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/30 transition-colors group">
                      <td className="px-4 py-2.5 text-[12px] text-foreground tabular whitespace-nowrap">{relativeTime(log.timestamp)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">{log.automationName}</td>
                      <td className="px-4 py-2.5 text-[12px] text-foreground">{log.triggerEntity}</td>
                      <td className="px-4 py-2.5 text-[11px] text-muted-foreground max-w-[280px] truncate">{log.conditionsEvaluated}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant={log.result === "Success" ? "outline" : "solid"} pulse={log.result === "Unsupported"}>
                          {log.result}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-foreground tabular text-right">{log.durationMs}ms</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => {
                            if (log.notes) toast.success("Rean's analysis", { description: log.notes });
                            else if (log.error) toast(log.error, { description: log.automationName });
                            else toast("Execution details", { description: `${log.automationName} · ${log.result}` });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loaded && logs.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[13px] text-muted-foreground">No runs yet. Use "Run Now" on an automation to see it here.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AutomationBuilder
        open={builderOpen}
        initial={initialForm}
        onClose={() => { setBuilderOpen(false); setInitialForm(null); setEditingId(null); }}
        onSave={handleSave}
      />
      <AskReanDrawer
        open={askReanOpen}
        onClose={() => setAskReanOpen(false)}
        onUseDraft={handleUseReanDraft}
      />
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card p-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
    </div>
  );
}

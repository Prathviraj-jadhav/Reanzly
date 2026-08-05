"use client";

/* ============================================================
   AutomationsView - Reanzly SuperAdmin
   Loop engineering enhanced view:
     - KPI strip (enabled / disabled / triggers / loop runs)
     - Tabs: Recipes | Loop runs
     - Recipe library with step flow viz + loop config summary +
       last run row + Test run action
     - Loop runs history table with View trace
     - Editor sheet (create + edit) hosting step builder + loop
       config editor
     - Run trace drawer (reused from SLM) for test runs
   Strict monochrome Swiss design. Lucide icons only.
   ============================================================ */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSuperadminStore } from "./_store";
import { type AutomationRecipe, type AutomationScope } from "./_data";
import { formatNum, relativeTime } from "./_helpers";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Zap, Plus, Trash2, Pencil, Mail, MessageSquare, Bell, Webhook,
  Power, Clock, Hash, User as UserIcon, Layers, Building2, ShieldCheck,
  Play, ArrowRight, Activity, History, Settings2, ChevronRight,
} from "lucide-react";
import {
  STEP_KIND_META, StepKindChip, loopConfigSummary, loopRunStatusVariant,
  resolveSteps, resolveLoopConfig, formatDuration, formatTokens,
} from "./automations-helpers";
import { AutomationsEditorSheet } from "./automations-editor-sheet";
import { AutomationsRunTraceDrawer } from "./automations-run-trace-drawer";
import type { LoopRunSummary } from "./_data";

// ============================================================
// Constants
// ============================================================
type ChannelId = "email" | "sms" | "in-app" | "webhook";
const CHANNEL_META: Record<ChannelId, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  "in-app": { label: "In-app", icon: Bell },
  webhook: { label: "Webhook", icon: Webhook },
};

const SCOPE_LABEL: Record<AutomationScope, string> = {
  platform: "Platform", org: "Org", role: "Role",
};

// ============================================================
// Main view
// ============================================================
export function AutomationsView() {
  const automations = useSuperadminStore((s) => s.automations);
  const loopRuns = useSuperadminStore((s) => s.loopRuns);
  const access = useSuperadminStore((s) => s.canAccess("automations"));
  const readOnly = access === "read";
  const canWrite = access === "write";

  const [tab, setTab] = useState<string>("recipes");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AutomationRecipe | null>(null);
  const [traceRunId, setTraceRunId] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);

  const kpis = useMemo(() => {
    const enabled = automations.filter((a) => a.enabled).length;
    const disabled = automations.length - enabled;
    const totalTriggers = automations.reduce((s, a) => s + a.triggerCount, 0);
    const byScope = {
      platform: automations.filter((a) => a.scope === "platform").length,
      org: automations.filter((a) => a.scope === "org").length,
      role: automations.filter((a) => a.scope === "role").length,
    };
    const succeeded = loopRuns.filter((r) => r.status === "succeeded").length;
    const successRate = loopRuns.length > 0
      ? Math.round((succeeded / loopRuns.length) * 100)
      : 0;
    return { enabled, disabled, totalTriggers, byScope, loopRunsCount: loopRuns.length, successRate };
  }, [automations, loopRuns]);

  function openCreate() {
    setEditTarget(null);
    setEditorOpen(true);
  }
  function openEdit(au: AutomationRecipe) {
    setEditTarget(au);
    setEditorOpen(true);
  }
  function openTrace(runId: string) {
    setTraceRunId(runId);
    setTraceOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={<Power className="h-3.5 w-3.5" />} label="Enabled"
          value={formatNum(kpis.enabled)} hint="live recipes" tone="solid" />
        <KpiTile icon={<Power className="h-3.5 w-3.5" />} label="Disabled"
          value={formatNum(kpis.disabled)} hint="paused recipes" />
        <KpiTile icon={<History className="h-3.5 w-3.5" />} label="Loop runs"
          value={formatNum(kpis.loopRunsCount)} hint={`${kpis.successRate}% success`} />
        <KpiTile icon={<Hash className="h-3.5 w-3.5" />} label="Total triggers"
          value={formatNum(kpis.totalTriggers)} hint={`platform ${kpis.byScope.platform} / org ${kpis.byScope.org} / role ${kpis.byScope.role}`} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-muted/40 rounded-[5px]">
            <TabsTrigger value="recipes" className="rounded-[3px] text-[12px] data-[state=active]:bg-foreground data-[state=active]:text-background">
              <Zap className="h-3 w-3" />
              Recipes
              <span className="ml-1 rounded-[3px] bg-foreground/10 px-1 py-0.5 text-[10px] tabular">
                {automations.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="runs" className="rounded-[3px] text-[12px] data-[state=active]:bg-foreground data-[state=active]:text-background">
              <Activity className="h-3 w-3" />
              Loop runs
              <span className="ml-1 rounded-[3px] bg-foreground/10 px-1 py-0.5 text-[10px] tabular">
                {loopRuns.length}
              </span>
            </TabsTrigger>
          </TabsList>
          {canWrite && (
            <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={openCreate}>
              New automation
            </Btn>
          )}
        </div>

        <TabsContent value="recipes" className="mt-3">
          <RecipesTab
            automations={automations}
            readOnly={readOnly}
            canWrite={canWrite}
            onEdit={openEdit}
            onTestRun={(au) => {
              if (readOnly) return;
              const runId = useSuperadminStore.getState().testRunAutomation(au.id);
              if (runId) {
                toast("Test run started", { description: `${au.name} - ${runId}` });
                openTrace(runId);
              } else {
                toast("Test run failed", { description: "Could not start the test run" });
              }
            }}
            onViewTrace={openTrace}
          />
        </TabsContent>

        <TabsContent value="runs" className="mt-3">
          <LoopRunsTab loopRuns={loopRuns} automations={automations} onViewTrace={openTrace} />
        </TabsContent>
      </Tabs>

      {/* Editor sheet (create + edit) */}
      <AutomationsEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        automation={editTarget}
        readOnly={readOnly}
      />

      {/* Run trace drawer */}
      <AutomationsRunTraceDrawer
        runId={traceRunId}
        open={traceOpen}
        onOpenChange={setTraceOpen}
        readOnly={readOnly}
      />
    </div>
  );
}

// ============================================================
// KPI tile
// ============================================================
function KpiTile({
  icon, label, value, hint, tone,
}: {
  icon: React.ReactNode; label: string; value: string; hint?: string; tone?: "solid";
}) {
  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3",
      tone === "solid" && "border-foreground",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

// ============================================================
// Recipes tab
// ============================================================
interface RecipesTabProps {
  automations: AutomationRecipe[];
  readOnly: boolean;
  canWrite: boolean;
  onEdit: (au: AutomationRecipe) => void;
  onTestRun: (au: AutomationRecipe) => void;
  onViewTrace: (runId: string) => void;
}

function RecipesTab({
  automations, readOnly, canWrite, onEdit, onTestRun, onViewTrace,
}: RecipesTabProps) {
  const loopRuns = useSuperadminStore((s) => s.loopRuns);

  if (automations.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-[12px] text-muted-foreground">
          No automations yet.
        </p>
        {canWrite && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Click <span className="font-medium text-foreground">New automation</span> at the top right.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-foreground" />
          <h3 className="text-[13px] font-medium text-foreground">Automation recipes</h3>
        </div>
        <span className="text-[11px] text-muted-foreground tabular">{automations.length} total</span>
      </div>
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin divide-y divide-border">
        {automations.map((au) => (
          <RecipeCard
            key={au.id}
            au={au}
            readOnly={readOnly}
            loopRuns={loopRuns.filter((r) => r.automationId === au.id)}
            onEdit={() => onEdit(au)}
            onTestRun={() => onTestRun(au)}
            onViewTrace={onViewTrace}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Recipe card (enhanced)
// ============================================================
interface RecipeCardProps {
  au: AutomationRecipe;
  readOnly: boolean;
  loopRuns: LoopRunSummary[];
  onEdit: () => void;
  onTestRun: () => void;
  onViewTrace: (runId: string) => void;
}

function RecipeCard({
  au, readOnly, loopRuns, onEdit, onTestRun, onViewTrace,
}: RecipeCardProps) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const toggleAutomation = useSuperadminStore((s) => s.toggleAutomation);
  const deleteAutomation = useSuperadminStore((s) => s.deleteAutomation);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const orgName = useMemo(() => {
    if (au.scope !== "org" || !au.appliesTo) return null;
    return orgs.find((o) => o.id === au.appliesTo)?.legalName ?? au.appliesTo;
  }, [au, orgs]);

  const scopeVariant: "solid" | "outline" = au.scope === "platform" ? "solid" : "outline";
  const steps = useMemo(() => resolveSteps(au), [au]);
  const loopCfg = useMemo(() => resolveLoopConfig(au), [au]);
  const lastRun = loopRuns[0] ?? null;

  return (
    <div className="group relative flex flex-col gap-2.5 px-3.5 py-3 transition-colors hover:bg-accent/40">
      {/* Header: name + scope + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[13px] font-medium text-foreground leading-tight">{au.name}</h4>
            <StatusBadge variant={scopeVariant}>{SCOPE_LABEL[au.scope]}</StatusBadge>
            {au.scope === "org" && orgName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                <Building2 className="h-3 w-3" />
                {orgName}
              </span>
            )}
            {au.scope === "role" && au.appliesTo && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {au.appliesTo}
              </span>
            )}
          </div>
          {au.description && (
            <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">{au.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular">
            {au.enabled ? "On" : "Off"}
          </span>
          <Switch
            checked={au.enabled}
            disabled={readOnly}
            onCheckedChange={() => {
              if (readOnly) return;
              toggleAutomation(au.id);
              toast(`${au.enabled ? "Disabled" : "Enabled"} automation`, { description: au.name });
            }}
            aria-label={`Toggle automation ${au.name}`}
          />
        </div>
      </div>

      {/* Trigger */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Zap className="h-2.5 w-2.5" />
          {au.trigger.module}
        </span>
        <span className="text-muted-foreground truncate">{au.trigger.label}</span>
      </div>

      {/* Actions list (kept for back-compat with legacy recipes) */}
      {au.actions.length > 0 && (
        <div className="flex flex-col gap-1">
          {au.actions.map((act, i) => {
            const meta = CHANNEL_META[act.channel as ChannelId] ?? CHANNEL_META["in-app"];
            const Icon = meta.icon;
            return (
              <div key={i} className="flex items-center gap-2 rounded-[5px] border border-border bg-background px-2 py-1.5">
                <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-foreground truncate flex-1">{act.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular shrink-0">
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Step flow visualization */}
      <StepFlowRow steps={steps} onEdit={onEdit} />

      {/* Loop config summary */}
      <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Settings2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
            Loop
          </span>
          <span className="text-[11px] text-foreground truncate">
            {loopConfigSummary(loopCfg)}
          </span>
        </div>
        {!readOnly && (
          <Btn size="xs" variant="ghost" icon={<Pencil className="h-3 w-3" />} onClick={onEdit}>
            Edit
          </Btn>
        )}
      </div>

      {/* Last run row */}
      {lastRun && (
        <LastRunRow run={lastRun} onViewTrace={() => onViewTrace(lastRun.runId)} />
      )}

      {/* Suggested-for-roles chips */}
      {au.suggestedForRoles.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested for</span>
          {au.suggestedForRoles.map((r) => (
            <span key={r} className="inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground leading-none">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Footer: stats + actor + hover actions */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground tabular pt-0.5 border-t border-border/60 mt-1">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1">
            <Hash className="h-2.5 w-2.5" />
            {formatNum(au.triggerCount)} runs
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {au.lastTriggered ? relativeTime(au.lastTriggered) : "never"}
          </span>
          <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
            <UserIcon className="h-2.5 w-2.5" />
            {au.createdBy}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          {!readOnly && (
            <Btn size="xs" variant="outline" icon={<Play className="h-3 w-3" />} onClick={onTestRun}>
              Test run
            </Btn>
          )}
          <Btn size="xs" variant="ghost" icon={<Pencil className="h-3 w-3" />} onClick={onEdit}>
            Edit
          </Btn>
          <Btn size="xs" variant="ghost" icon={<ChevronRight className="h-3 w-3" />}
            onClick={() => toast("Duplicate (stubbed)", { description: au.name })}>
            Duplicate
          </Btn>
          {!readOnly && (
            <Btn size="xs" variant="ghost" icon={<Trash2 className="h-3 w-3" />}
              onClick={() => setConfirmOpen(true)} className="hover:text-foreground">
              Delete
            </Btn>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Delete this automation?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              This permanently removes{" "}
              <span className="text-foreground font-medium">{au.name}</span> from
              the recipe library. The action is recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                deleteAutomation(au.id);
                setConfirmOpen(false);
                toast("Automation deleted", { description: au.name });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Step flow row - horizontal chips with arrows
// ============================================================
function StepFlowRow({
  steps, onEdit,
}: {
  steps: AutomationRecipe["steps"] extends (infer T)[] | undefined ? T[] : never;
  onEdit: () => void;
}) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className="rounded-[5px] border border-border bg-muted/20 px-2.5 py-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Step flow
        </span>
        <span className="text-[10px] text-muted-foreground tabular">{steps.length} step(s)</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {steps.map((s, i) => {
          const meta = STEP_KIND_META[s.kind];
          const Icon = meta.icon;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground hover:bg-accent tap"
                aria-label={`Edit step ${i + 1}: ${s.label}`}
              >
                <Icon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-[100px]">{s.label || meta.label}</span>
              </button>
              {i < steps.length - 1 && (
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Last run row
// ============================================================
function LastRunRow({
  run, onViewTrace,
}: {
  run: LoopRunSummary;
  onViewTrace: () => void;
}) {
  const v = loopRunStatusVariant(run.status);
  const durationMs = run.finishedAt
    ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
    : null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-2.5 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
          Last run
        </span>
        <StatusBadge variant={v.variant} pulse={v.pulse}>
          {run.status.replace("-", " ")}
        </StatusBadge>
        <span className="text-[11px] text-muted-foreground tabular">
          {run.iterations} iter · {formatTokens(run.tokensUsed)} · {run.stepCount} step(s)
          {durationMs !== null && ` · ${formatDuration(durationMs)}`}
        </span>
        <span className="text-[10px] text-muted-foreground tabular truncate">
          {relativeTime(run.startedAt)}
        </span>
      </div>
      <Btn size="xs" variant="ghost" icon={<Activity className="h-3 w-3" />} onClick={onViewTrace}>
        View trace
      </Btn>
    </div>
  );
}

// ============================================================
// Loop runs tab
// ============================================================
interface LoopRunsTabProps {
  loopRuns: LoopRunSummary[];
  automations: AutomationRecipe[];
  onViewTrace: (runId: string) => void;
}

function LoopRunsTab({ loopRuns, automations, onViewTrace }: LoopRunsTabProps) {
  const auById = useMemo(() => {
    const m = new Map<string, AutomationRecipe>();
    for (const a of automations) m.set(a.id, a);
    return m;
  }, [automations]);

  if (loopRuns.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <Activity className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-[12px] text-muted-foreground">
          No loop runs recorded yet.
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Trigger a <span className="font-medium text-foreground">Test run</span> from a recipe card to see the trace here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-foreground" />
          <h3 className="text-[13px] font-medium text-foreground">Loop run history</h3>
        </div>
        <span className="text-[11px] text-muted-foreground tabular">{loopRuns.length} run(s)</span>
      </div>
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin divide-y divide-border">
        {loopRuns.map((r) => {
          const au = auById.get(r.automationId);
          const v = loopRunStatusVariant(r.status);
          const durationMs = r.finishedAt
            ? new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()
            : null;
          return (
            <div
              key={r.runId}
              className="group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-accent/40"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background">
                <Activity className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-foreground truncate">
                    {au?.name ?? r.automationId}
                  </span>
                  <StatusBadge variant={v.variant} pulse={v.pulse}>
                    {r.status.replace("-", " ")}
                  </StatusBadge>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground tabular">
                  <span className="font-mono">{r.runId}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Hash className="h-2.5 w-2.5" />
                    {r.iterations} iter
                  </span>
                  <span>{formatTokens(r.tokensUsed)}</span>
                  <span>{r.stepCount} step(s)</span>
                  {durationMs !== null && <span>{formatDuration(durationMs)}</span>}
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {relativeTime(r.startedAt)}
                  </span>
                </div>
              </div>
              <Btn
                size="xs"
                variant="ghost"
                icon={<Activity className="h-3 w-3" />}
                onClick={() => onViewTrace(r.runId)}
              >
                View trace
              </Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AutomationsView;

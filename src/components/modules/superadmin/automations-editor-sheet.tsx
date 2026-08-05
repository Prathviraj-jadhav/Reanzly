"use client";

/* ============================================================
   AutomationsEditorSheet - right-side Sheet that hosts the full
   automation editor: basic info + step builder + loop config.
   Works in both "create" and "edit" modes.

   Strict monochrome Swiss design. Lucide icons only.
   ============================================================ */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import { useSuperadminStore } from "./_store";
import { ROLES, type AutomationRecipe, type AutomationScope, type AutomationStep, type LoopConfig } from "./_data";
import { DEFAULT_LOOP_CONFIG } from "./_data";
import { FieldLabel } from "./_helpers";
import { AutomationsStepBuilder } from "./automations-step-builder";
import { AutomationsLoopConfig } from "./automations-loop-config";
import {
  STEP_KIND_META, defaultLoopConfig, resolveSteps, resolveLoopConfig, StepKindChip,
} from "./automations-helpers";
import {
  Zap, Save, X, Plus, ArrowRight, FileText, Workflow, Settings2,
} from "lucide-react";

const TRIGGER_MODULES = [
  "Billing", "Offline Sync", "Organizations", "Issues", "Fleet",
  "Drivers", "POD", "Ledger", "Trips", "Maintenance",
] as const;

const SCOPE_LABEL: Record<AutomationScope, string> = {
  platform: "Platform", org: "Org", role: "Role",
};

export interface EditorSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When set, the editor is in "edit" mode for this automation.
   *  When undefined, the editor is in "create" mode. */
  automation?: AutomationRecipe | null;
  readOnly?: boolean;
}

// ── Editor form state ──────────────────────────────────────
interface EditorFormState {
  name: string;
  description: string;
  scope: AutomationScope;
  orgId: string;
  roleLabel: string;
  triggerLabel: string;
  triggerModule: string;
  suggestedRoles: string[];
  steps: AutomationStep[];
  loopConfig: LoopConfig;
}

function emptyState(): EditorFormState {
  return {
    name: "",
    description: "",
    scope: "platform",
    orgId: "",
    roleLabel: "",
    triggerLabel: "",
    triggerModule: "Billing",
    suggestedRoles: [],
    steps: [
      {
        id: `st-new-trig-${Math.random().toString(36).slice(2, 7)}`,
        kind: "trigger",
        label: "New trigger",
        config: { module: "Billing", event: "" },
      },
    ],
    loopConfig: defaultLoopConfig(),
  };
}

function stateFromAutomation(au: AutomationRecipe): EditorFormState {
  return {
    name: au.name,
    description: au.description,
    scope: au.scope,
    orgId: au.scope === "org" ? au.appliesTo ?? "" : "",
    roleLabel: au.scope === "role" ? au.appliesTo ?? "" : "",
    triggerLabel: au.trigger.label,
    triggerModule: au.trigger.module,
    suggestedRoles: [...au.suggestedForRoles],
    steps: resolveSteps(au).map((s) => ({ ...s, config: { ...s.config } })),
    loopConfig: { ...resolveLoopConfig(au) },
  };
}

// ── Main component ─────────────────────────────────────────
export function AutomationsEditorSheet({
  open, onOpenChange, automation, readOnly,
}: EditorSheetProps) {
  // Force a fresh remount of the inner body whenever the target automation
  // changes (so useState initializers re-run with the new values). The
  // Sheet itself mounts / unmounts via its Portal on open / close, so we
  // don't need a separate effect.
  const bodyKey = automation?.id ?? "new";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex-col gap-0 p-0 sm:max-w-3xl"
       showCloseButton={false}>
        <EditorSheetBody
          key={bodyKey}
          automation={automation ?? null}
          readOnly={readOnly}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

// ── Editor body (mounted fresh per open / per automation) ──
function EditorSheetBody({
  automation, readOnly, onClose,
}: {
  automation: AutomationRecipe | null;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const createAutomation = useSuperadminStore((s) => s.createAutomation);
  const updateAutomationMeta = useSuperadminStore((s) => s.updateAutomationMeta);
  const updateAutomationSteps = useSuperadminStore((s) => s.updateAutomationSteps);
  const updateLoopConfig = useSuperadminStore((s) => s.updateLoopConfig);

  const isEdit = !!automation;
  const [tab, setTab] = useState<string>("details");
  // useState initializer runs once per mount (per automation id thanks to
  // the keyed parent), so we read automation here without needing an effect.
  const [state, setState] = useState<EditorFormState>(() =>
    automation ? stateFromAutomation(automation) : emptyState(),
  );

  function patch(p: Partial<EditorFormState>) {
    setState((s) => ({ ...s, ...p }));
  }
  function patchSteps(steps: AutomationStep[]) {
    setState((s) => ({ ...s, steps }));
  }
  function patchLoopConfig(p: Partial<LoopConfig>) {
    setState((s) => ({ ...s, loopConfig: { ...s.loopConfig, ...p } }));
  }
  function toggleRole(r: string) {
    setState((s) => ({
      ...s,
      suggestedRoles: s.suggestedRoles.includes(r)
        ? s.suggestedRoles.filter((x) => x !== r)
        : [...s.suggestedRoles, r],
    }));
  }

  function handleSave() {
    const trimmedName = state.name.trim();
    const trimmedTrigger = state.triggerLabel.trim();

    if (!trimmedName) {
      toast("Name required", { description: "Give the recipe a clear name" });
      setTab("details");
      return;
    }
    if (!trimmedTrigger) {
      toast("Trigger label required", { description: "Describe when this fires" });
      setTab("details");
      return;
    }
    if (state.scope === "org" && !state.orgId) {
      toast("Select an org", { description: "Org-scoped recipes need a target" });
      setTab("details");
      return;
    }
    if (state.scope === "role" && !state.roleLabel) {
      toast("Select a role", { description: "Role-scoped recipes need a target role" });
      setTab("details");
      return;
    }
    const hasTrigger = state.steps.some((s) => s.kind === "trigger");
    if (!hasTrigger) {
      toast("Add a trigger step", { description: "Every automation needs at least one trigger" });
      setTab("steps");
      return;
    }

    const appliesTo =
      state.scope === "org" ? state.orgId :
      state.scope === "role" ? state.roleLabel :
      undefined;

    if (isEdit && automation) {
      updateAutomationMeta(automation.id, {
        name: trimmedName,
        description: state.description.trim(),
        scope: state.scope,
        appliesTo,
        suggestedForRoles: state.suggestedRoles,
        trigger: { label: trimmedTrigger, module: state.triggerModule },
        // Derive legacy actions list from action steps so old list view
        // remains in sync. Map toolFn -> label, channel -> channel.
        actions: state.steps
          .filter((s) => s.kind === "action")
          .map((s) => ({
            label: s.label,
            channel: ((s.config.channel as string) ?? "in-app") as
              | "email" | "sms" | "in-app" | "webhook",
          })),
      });
      updateAutomationSteps(automation.id, state.steps);
      updateLoopConfig(automation.id, state.loopConfig);
      toast("Automation updated", { description: `${trimmedName} - ${automation.id}` });
    } else {
      const id = createAutomation({
        name: trimmedName,
        description: state.description.trim(),
        trigger: { label: trimmedTrigger, module: state.triggerModule },
        actions: state.steps
          .filter((s) => s.kind === "action")
          .map((s) => ({
            label: s.label,
            channel: ((s.config.channel as string) ?? "in-app") as
              | "email" | "sms" | "in-app" | "webhook",
          })),
        scope: state.scope,
        appliesTo,
        suggestedForRoles: state.suggestedRoles,
        steps: state.steps,
        loopConfig: state.loopConfig,
      });
      toast("Automation created", { description: `${trimmedName} - ${id}` });
    }
    onClose();
  }

  // Compute a preview summary for the header description
  const stepCount = state.steps.length;
  const aiStepCount = state.steps.filter((s) => s.kind === "ai-step").length;

  return (
    <>
      <SheetHeader className="gap-2 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3 pr-6">
          <div className="min-w-0">
            <SheetTitle className="truncate text-[16px] tracking-tight">
              {isEdit ? "Edit automation" : "New automation"}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[12px]">
              {isEdit
                ? `${state.name || "Untitled"} - ${stepCount} step(s), ${aiStepCount} AI step(s)`
                : "Build a multi-step loop with conditions, AI steps, and integrations"}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Btn
              variant="ghost"
              size="sm"
              icon={<X className="h-3 w-3" />}
              onClick={onClose}
            >
              Cancel
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              icon={<Save className="h-3 w-3" />}
              onClick={handleSave}
              disabled={readOnly}
            >
              {isEdit ? "Save changes" : "Create automation"}
            </Btn>
          </div>
        </div>
          <Tabs value={tab} onValueChange={setTab} className="mt-1">
            <TabsList className="bg-muted/40 rounded-[5px]">
              <TabsTrigger value="details" className="rounded-[3px] text-[12px] data-[state=active]:bg-foreground data-[state=active]:text-background">
                <FileText className="h-3 w-3" />
                Details
              </TabsTrigger>
              <TabsTrigger value="steps" className="rounded-[3px] text-[12px] data-[state=active]:bg-foreground data-[state=active]:text-background">
                <Workflow className="h-3 w-3" />
                Steps
                <span className="ml-1 rounded-[3px] bg-foreground/10 px-1 py-0.5 text-[10px] tabular">
                  {stepCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="loop" className="rounded-[3px] text-[12px] data-[state=active]:bg-foreground data-[state=active]:text-background">
                <Settings2 className="h-3 w-3" />
                Loop config
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <Tabs value={tab} onValueChange={setTab}>
            {/* ── Details tab ── */}
            <TabsContent value="details" className="mt-0 flex flex-col gap-3">
              <div>
                <FieldLabel required>Name</FieldLabel>
                <Input
                  value={state.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="e.g. Invoice payment failed - alert billing"
                  className="h-9 rounded-[5px] text-[12px]"
                  disabled={readOnly}
                />
              </div>
              <div>
                <FieldLabel hint="optional">Description</FieldLabel>
                <Textarea
                  value={state.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="What this recipe does and why it exists"
                  rows={3}
                  className="rounded-[5px] text-[12px] min-h-[72px] resize-none"
                  disabled={readOnly}
                />
              </div>
              <div>
                <FieldLabel required>Scope</FieldLabel>
                <RadioGroup
                  value={state.scope}
                  onValueChange={(v) => patch({ scope: v as AutomationScope })}
                  className="grid grid-cols-3 gap-2"
                >
                  {(["platform", "org", "role"] as const).map((sc) => (
                    <label
                      key={sc}
                      className={cn(
                        "flex items-center gap-2 rounded-[5px] border px-2.5 py-1.5 cursor-pointer transition-colors",
                        state.scope === sc
                          ? "border-foreground bg-foreground/5"
                          : "border-border bg-background hover:bg-accent/40",
                      )}
                    >
                      <RadioGroupItem value={sc} className="h-3.5 w-3.5" />
                      <span className="text-[12px] font-medium text-foreground">{SCOPE_LABEL[sc]}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              {state.scope === "org" && (
                <div>
                  <FieldLabel required>Target org</FieldLabel>
                  <Select
                    value={state.orgId}
                    onValueChange={(v) => patch({ orgId: v })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[5px] text-[12px]">
                      <SelectValue placeholder="Select an org" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] max-h-72">
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-[12px]">
                          {o.legalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {state.scope === "role" && (
                <div>
                  <FieldLabel required>Target role</FieldLabel>
                  <Select
                    value={state.roleLabel}
                    onValueChange={(v) => patch({ roleLabel: v })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[5px] text-[12px]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] max-h-72">
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <FieldLabel required>Trigger label</FieldLabel>
                  <Input
                    value={state.triggerLabel}
                    onChange={(e) => patch({ triggerLabel: e.target.value })}
                    placeholder="e.g. When invoice payment fails"
                    className="h-9 rounded-[5px] text-[12px]"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <FieldLabel required>Trigger module</FieldLabel>
                  <Select
                    value={state.triggerModule}
                    onValueChange={(v) => patch({ triggerModule: v })}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[5px] text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[5px] max-h-72">
                      {TRIGGER_MODULES.map((m) => (
                        <SelectItem key={m} value={m} className="text-[12px]">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <FieldLabel hint="optional">Suggested for roles</FieldLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  {ROLES.map((r) => {
                    const checked = state.suggestedRoles.includes(r);
                    return (
                      <label
                        key={r}
                        className={cn(
                          "flex items-center gap-2 rounded-[5px] border px-2 py-1.5 cursor-pointer transition-colors",
                          checked
                            ? "border-foreground bg-foreground/5"
                            : "border-border bg-background hover:bg-accent/40",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleRole(r)}
                          className="h-3.5 w-3.5"
                          disabled={readOnly}
                        />
                        <span className="text-[11px] text-foreground truncate">{r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ── Steps tab ── */}
            <TabsContent value="steps" className="mt-0 flex flex-col gap-3">
              <StepFlowPreview steps={state.steps} />
              <AutomationsStepBuilder
                steps={state.steps}
                onChange={patchSteps}
                readOnly={readOnly}
              />
            </TabsContent>

            {/* ── Loop config tab ── */}
            <TabsContent value="loop" className="mt-0 flex flex-col gap-3">
              <div className="rounded-[6px] border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Loop configuration caps how the runtime executes this automation. Lower
                  max iterations and token budgets keep runaway loops in check. Toggle
                  auto-execute off to require human approval before high-impact actions.
                </p>
              </div>
              <AutomationsLoopConfig
                config={state.loopConfig}
                onChange={patchLoopConfig}
                readOnly={readOnly}
              />
              <div className="rounded-[6px] border border-border bg-card px-3 py-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Resolved runtime summary
                  </span>
                  <Zap className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <SummaryStat label="Max iter" value={String(state.loopConfig.maxIterations)} />
                  <SummaryStat label="Tokens" value={state.loopConfig.tokenBudget.toLocaleString("en-IN")} />
                  <SummaryStat label="Auto-exec" value={state.loopConfig.autoExecute ? "On" : "Off"} />
                  <SummaryStat label="Threshold" value={String(state.loopConfig.approvalThreshold)} />
                  <SummaryStat label="Cooldown" value={`${state.loopConfig.cooldownMinutes} min`} />
                  <SummaryStat label="Retries" value={String(state.loopConfig.retryCount)} />
                  <SummaryStat label="Backoff" value={state.loopConfig.retryBackoff} />
                  <SummaryStat label="Steps" value={String(state.steps.length)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────
function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[12px] font-medium text-foreground tabular">{value}</div>
    </div>
  );
}

/** Live preview of the step flow at the top of the Steps tab. */
function StepFlowPreview({ steps }: { steps: AutomationStep[] }) {
  const ordered = useMemo(() => steps, [steps]);
  if (ordered.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-[11px] text-muted-foreground">
        No steps yet. Use "Add step" below to build the loop.
      </div>
    );
  }
  return (
    <div className="rounded-[6px] border border-border bg-card px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Step flow preview
        </span>
        <span className="text-[10px] text-muted-foreground tabular">{ordered.length} step(s)</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
        {ordered.map((s, i) => {
          const meta = STEP_KIND_META[s.kind];
          const Icon = meta.icon;
          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground">
                <Icon className="h-2.5 w-2.5" />
                <span className="truncate max-w-[100px]">{s.label || meta.label}</span>
              </span>
              {i < ordered.length - 1 && (
                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick add trigger button (used by external trigger) ───
export function NewAutomationTriggerButton({
  onClick, readOnly,
}: {
  onClick: () => void;
  readOnly?: boolean;
}) {
  return (
    <Btn
      variant="primary"
      size="sm"
      icon={<Plus className="h-3.5 w-3.5" />}
      onClick={onClick}
      disabled={readOnly}
    >
      New automation
    </Btn>
  );
}

// ── Re-exports ─────────────────────────────────────────────
export { StepKindChip, DEFAULT_LOOP_CONFIG };

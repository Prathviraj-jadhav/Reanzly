"use client";

/* ============================================================
   AutomationsStepBuilder - vertical list of AutomationStep
   editors. Each step has a kind selector + per-kind config
   form. Supports add / remove / reorder. Strict monochrome
   Swiss design.
   ============================================================ */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronUp, ChevronDown, Trash2, Plus, GripVertical,
} from "lucide-react";
import { useSuperadminStore } from "./_store";
import {
  STEP_KIND_META, STEP_KIND_ORDER, CONDITION_OPERATORS,
  TRIGGER_MODULES, DELAY_UNITS, emptyStep, StepKindChip,
} from "./automations-helpers";
import { FieldLabel } from "./_helpers";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Btn } from "@/components/shared/btn";
import { BUILTIN_TOOLS, INTEGRATION_TOOL_TEMPLATES } from "@/lib/slm/tools";
import type {
  AutomationStep, AutomationStepKind, ConditionOperator,
} from "./_data";

export interface StepBuilderProps {
  steps: AutomationStep[];
  onChange: (steps: AutomationStep[]) => void;
  readOnly?: boolean;
}

// ── Main component ─────────────────────────────────────────
export function AutomationsStepBuilder({ steps, onChange, readOnly }: StepBuilderProps) {
  const agents = useSuperadminStore((s) => s.agents);
  const integrations = useSuperadminStore((s) => s.integrations);

  const connectedIntegrations = useMemo(
    () => integrations.filter((i) => i.connected),
    [integrations],
  );
  const integrationTools = useMemo(
    () => INTEGRATION_TOOL_TEMPLATES,
    [],
  );

  function addStep(kind: AutomationStepKind) {
    if (readOnly) return;
    onChange([...steps, emptyStep(kind, steps.length)]);
  }
  function removeStep(id: string) {
    if (readOnly) return;
    onChange(steps.filter((s) => s.id !== id));
  }
  function moveStep(idx: number, dir: -1 | 1) {
    if (readOnly) return;
    const next = idx + dir;
    if (next < 0 || next >= steps.length) return;
    const copy = steps.slice();
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    onChange(copy);
  }
  function patchStep(id: string, patch: Partial<AutomationStep>) {
    if (readOnly) return;
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function patchStepConfig(id: string, configPatch: Record<string, unknown>) {
    if (readOnly) return;
    onChange(steps.map((s) =>
      s.id === id ? { ...s, config: { ...s.config, ...configPatch } } : s,
    ));
  }
  function changeKind(id: string, kind: AutomationStepKind) {
    if (readOnly) return;
    const idx = steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const fresh = emptyStep(kind, idx);
    onChange(steps.map((s) => (s.id === id ? { ...fresh, id: s.id } : s)));
    toast(`Step changed to ${STEP_KIND_META[kind].label}`, {
      description: "Config reset to defaults for the new kind",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Step list */}
      <div className="flex flex-col gap-2">
        {steps.length === 0 && (
          <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-[12px] text-muted-foreground">
            No steps yet. Add a trigger to get started.
          </div>
        )}
        {steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            index={idx}
            total={steps.length}
            readOnly={readOnly}
            agents={agents.map((a) => ({ id: a.id, name: a.name }))}
            connectedIntegrations={connectedIntegrations.map((i) => ({ id: i.id, name: i.name }))}
            integrationTools={integrationTools.map((t) => ({ fn: t.fn, name: t.name, integrationId: t.integrationId ?? "" }))}
            onChange={(patch) => patchStep(step.id, patch)}
            onConfigChange={(p) => patchStepConfig(step.id, p)}
            onKindChange={(k) => changeKind(step.id, k)}
            onRemove={() => removeStep(step.id)}
            onMove={(dir) => moveStep(idx, dir)}
          />
        ))}
      </div>

      {/* Add step menu */}
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-[5px] border border-dashed border-border bg-background px-3 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-accent tap"
            >
              <Plus className="h-3.5 w-3.5" />
              Add step
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-[5px] w-56">
            {STEP_KIND_ORDER.map((k) => {
              const meta = STEP_KIND_META[k];
              const Icon = meta.icon;
              return (
                <DropdownMenuItem
                  key={k}
                  onClick={() => addStep(k)}
                  className="text-[12px] cursor-pointer"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <div className="flex flex-col">
                    <span>{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">{meta.description}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ── Single step card ───────────────────────────────────────
interface StepCardProps {
  step: AutomationStep;
  index: number;
  total: number;
  readOnly?: boolean;
  agents: { id: string; name: string }[];
  connectedIntegrations: { id: string; name: string }[];
  integrationTools: { fn: string; name: string; integrationId: string }[];
  onChange: (patch: Partial<AutomationStep>) => void;
  onConfigChange: (patch: Record<string, unknown>) => void;
  onKindChange: (kind: AutomationStepKind) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

function StepCard({
  step, index, total, readOnly,
  agents, connectedIntegrations, integrationTools,
  onChange, onConfigChange, onKindChange, onRemove, onMove,
}: StepCardProps) {
  const meta = STEP_KIND_META[step.kind];
  const Icon = meta.icon;

  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-2.5 py-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-foreground text-[10px] font-semibold text-background tabular">
          {index + 1}
        </span>
        <Icon className="h-3.5 w-3.5 text-foreground shrink-0" />
        <StepKindChip kind={step.kind} compact />
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            disabled={readOnly || index === 0}
            onClick={() => onMove(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none tap"
            aria-label="Move step up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={readOnly || index === total - 1}
            onClick={() => onMove(1)}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none tap"
            aria-label="Move step down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-6 items-center rounded-[3px] border border-border bg-background px-2 text-[10px] font-medium text-foreground hover:bg-accent tap"
                >
                  Change kind
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-[5px] w-44">
                {STEP_KIND_ORDER.map((k) => {
                  const m = STEP_KIND_META[k];
                  const KIcon = m.icon;
                  return (
                    <DropdownMenuItem
                      key={k}
                      onClick={() => onKindChange(k)}
                      className="text-[12px] cursor-pointer"
                    >
                      <KIcon className="h-3.5 w-3.5" />
                      {m.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground tap"
              aria-label="Remove step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-2.5">
        {/* Label */}
        <div>
          <FieldLabel required>Label</FieldLabel>
          <Input
            value={step.label}
            onChange={(e) => onChange({ label: e.target.value })}
            disabled={readOnly}
            placeholder="Short human readable step label"
            className="h-8 rounded-[5px] text-[12px]"
          />
        </div>

        {/* Per-kind config */}
        <StepConfigForm
          step={step}
          readOnly={readOnly}
          agents={agents}
          connectedIntegrations={connectedIntegrations}
          integrationTools={integrationTools}
          onConfigChange={onConfigChange}
        />

        {/* Notes (optional) */}
        <div>
          <FieldLabel hint="optional">Notes</FieldLabel>
          <Textarea
            value={step.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            disabled={readOnly}
            placeholder="Rationale, edge cases, TODOs..."
            rows={2}
            className="rounded-[5px] text-[12px] min-h-[44px] resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Per-kind config form ───────────────────────────────────
interface StepConfigFormProps {
  step: AutomationStep;
  readOnly?: boolean;
  agents: { id: string; name: string }[];
  connectedIntegrations: { id: string; name: string }[];
  integrationTools: { fn: string; name: string; integrationId: string }[];
  onConfigChange: (patch: Record<string, unknown>) => void;
}

function StepConfigForm({
  step, readOnly, agents, connectedIntegrations, integrationTools, onConfigChange,
}: StepConfigFormProps) {
  const cfg = step.config;

  switch (step.kind) {
    case "trigger":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel required>Module</FieldLabel>
            <Select
              value={(cfg.module as string) ?? "Billing"}
              onValueChange={(v) => onConfigChange({ module: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[5px] max-h-72">
                {TRIGGER_MODULES.map((m) => (
                  <SelectItem key={m} value={m} className="text-[12px]">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Event</FieldLabel>
            <Input
              value={(cfg.event as string) ?? ""}
              onChange={(e) => onConfigChange({ event: e.target.value })}
              disabled={readOnly}
              placeholder="e.g. invoice.payment_retry_failed"
              className="h-8 rounded-[5px] text-[12px] font-mono"
            />
          </div>
        </div>
      );

    case "condition":
      return (
        <div className="grid grid-cols-[1fr_140px_1fr] gap-2">
          <div>
            <FieldLabel required>Field</FieldLabel>
            <Input
              value={(cfg.field as string) ?? ""}
              onChange={(e) => onConfigChange({ field: e.target.value })}
              disabled={readOnly}
              placeholder="e.g. invoice.retryCount"
              className="h-8 rounded-[5px] text-[12px] font-mono"
            />
          </div>
          <div>
            <FieldLabel required>Operator</FieldLabel>
            <Select
              value={(cfg.operator as ConditionOperator) ?? "equals"}
              onValueChange={(v) => onConfigChange({ operator: v as ConditionOperator })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[5px]">
                {CONDITION_OPERATORS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-[12px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Value</FieldLabel>
            <Input
              value={(cfg.value as string | number) ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                const num = Number(raw);
                onConfigChange({ value: raw !== "" && !isNaN(num) ? num : raw });
              }}
              disabled={readOnly}
              placeholder="e.g. 3"
              className="h-8 rounded-[5px] text-[12px] font-mono"
            />
          </div>
        </div>
      );

    case "action": {
      const selectedTool = BUILTIN_TOOLS.find((t) => t.fn === (cfg.toolFn as string));
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <FieldLabel required>Built-in tool</FieldLabel>
            <Select
              value={(cfg.toolFn as string) ?? "create_ticket"}
              onValueChange={(v) => onConfigChange({ toolFn: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[5px] max-h-72">
                {BUILTIN_TOOLS.map((t) => (
                  <SelectItem key={t.id} value={t.fn} className="text-[12px]">
                    <span className="font-mono">{t.fn}</span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground">{t.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTool && (
            <div className="col-span-2 rounded-[5px] border border-border bg-background px-2.5 py-1.5">
              <p className="text-[11px] text-muted-foreground leading-snug">{selectedTool.description}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Impact</span>
                <span className="rounded-[3px] border border-border bg-card px-1.5 py-0.5 text-foreground tabular">
                  {selectedTool.impact}
                </span>
                {selectedTool.module && (
                  <>
                    <span>Module</span>
                    <span className="rounded-[3px] border border-border bg-card px-1.5 py-0.5 text-foreground">
                      {selectedTool.module}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="col-span-2">
            <FieldLabel hint="optional">Channel override</FieldLabel>
            <Select
              value={(cfg.channel as string) ?? ""}
              onValueChange={(v) => onConfigChange({ channel: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue placeholder="Use tool default" />
              </SelectTrigger>
              <SelectContent className="rounded-[5px]">
                <SelectItem value="" className="text-[12px]">Use tool default</SelectItem>
                <SelectItem value="email" className="text-[12px]">Email</SelectItem>
                <SelectItem value="sms" className="text-[12px]">SMS</SelectItem>
                <SelectItem value="in-app" className="text-[12px]">In-app</SelectItem>
                <SelectItem value="webhook" className="text-[12px]">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    case "ai-step":
      return (
        <div className="grid grid-cols-1 gap-2">
          <div>
            <FieldLabel required>SLM agent</FieldLabel>
            <Select
              value={(cfg.agentId as string) ?? ""}
              onValueChange={(v) => onConfigChange({ agentId: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue placeholder="Pick an agent" />
              </SelectTrigger>
              <SelectContent className="rounded-[5px] max-h-72">
                {agents.length === 0 ? (
                  <SelectItem value="__none__" disabled className="text-[12px]">
                    No agents available
                  </SelectItem>
                ) : agents.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-[12px]">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Goal / prompt</FieldLabel>
            <Textarea
              value={(cfg.goal as string) ?? ""}
              onChange={(e) => onConfigChange({ goal: e.target.value })}
              disabled={readOnly}
              placeholder="What should the agent reason about / decide?"
              rows={2}
              className="rounded-[5px] text-[12px] min-h-[44px] resize-none"
            />
          </div>
        </div>
      );

    case "integration": {
      const filteredTools = (cfg.integrationId as string)
        ? integrationTools.filter((t) => t.integrationId === (cfg.integrationId as string) || t.integrationId === "crm")
        : integrationTools;
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <FieldLabel required>Integration</FieldLabel>
            <Select
              value={(cfg.integrationId as string) ?? ""}
              onValueChange={(v) => onConfigChange({ integrationId: v, toolFn: "" })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue placeholder="Pick an integration" />
              </SelectTrigger>
              <SelectContent className="rounded-[5px] max-h-72">
                {connectedIntegrations.length === 0 ? (
                  <SelectItem value="__none__" disabled className="text-[12px]">
                    No connected integrations - showing all
                  </SelectItem>
                ) : null}
                {connectedIntegrations.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="text-[12px]">
                    {i.name}
                  </SelectItem>
                ))}
                {connectedIntegrations.length === 0 && (
                  integrationTools.map((t) => (
                    <SelectItem key={t.integrationId} value={t.integrationId} className="text-[12px]">
                      {t.integrationId}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <FieldLabel required>Tool</FieldLabel>
            <Select
              value={(cfg.toolFn as string) ?? ""}
              onValueChange={(v) => onConfigChange({ toolFn: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue placeholder="Pick a tool" />
              </SelectTrigger>
              <SelectContent className="rounded-[5px] max-h-72">
                {filteredTools.map((t) => (
                  <SelectItem key={t.fn} value={t.fn} className="text-[12px]">
                    <span className="font-mono">{t.fn}</span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground">{t.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    case "delay":
      return (
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <div>
            <FieldLabel required>Duration</FieldLabel>
            <Input
              type="number"
              min={1}
              value={String((cfg.duration as number) ?? 5)}
              onChange={(e) => onConfigChange({ duration: Math.max(1, Number(e.target.value) || 1) })}
              disabled={readOnly}
              className="h-8 rounded-[5px] text-[12px] tabular"
            />
          </div>
          <div>
            <FieldLabel required>Unit</FieldLabel>
            <Select
              value={(cfg.unit as string) ?? "minutes"}
              onValueChange={(v) => onConfigChange({ unit: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[5px]">
                {DELAY_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value} className="text-[12px]">
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "approval-gate": {
      const threshold = (cfg.impactThreshold as number) ?? 60;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FieldLabel required>Impact threshold</FieldLabel>
            <span className="text-[12px] font-medium text-foreground tabular">{threshold}</span>
          </div>
          <Slider
            value={[threshold]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => onConfigChange({ impactThreshold: v[0] ?? 60 })}
            disabled={readOnly}
            className="w-full"
          />
          <div>
            <FieldLabel hint="optional">Reason</FieldLabel>
            <Textarea
              value={(cfg.reason as string) ?? ""}
              onChange={(e) => onConfigChange({ reason: e.target.value })}
              disabled={readOnly}
              placeholder="Why does this step need human approval?"
              rows={2}
              className="rounded-[5px] text-[12px] min-h-[44px] resize-none"
            />
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ── Small switch-row helper used by external callers ───────
export function SwitchRow({
  label, checked, onChange, disabled, hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-2 rounded-[5px] border border-border bg-card px-2.5 py-2",
    )}>
      <div className="flex flex-col">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Convenience re-exports ─────────────────────────────────
export const StepBuilderAddButton = Btn;

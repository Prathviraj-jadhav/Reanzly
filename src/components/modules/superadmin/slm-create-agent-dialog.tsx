"use client";

/* ============================================================
   SLMCreateAgentDialog - modal form to create a new SLM agent.
   Fields:
     - Name, Description
     - Category (Select)
     - Brain (Select from brains)
     - System prompt (Textarea)
     - Max iterations (number, default 5)
     - Token budget (number, default 8000)
     - Auto execute (Switch)
     - Approval threshold (range 0-100, default 60)
     - Tool whitelist (multi-select checkboxes from all tools)
   On submit -> createAgent(...) -> toast + onCreated(id).
   ============================================================ */

import { useMemo, useState } from "react";
import { useSuperadminStore } from "./_store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AGENT_CATEGORY_LABEL,
} from "@/lib/slm/types";
import type { AgentCategory } from "@/lib/slm/types";
import {
  BUILTIN_TOOLS, MCP_TOOL_TEMPLATES, INTEGRATION_TOOL_TEMPLATES,
} from "@/lib/slm/tools";
import type { AgentTool } from "@/lib/slm/types";
import {
  Bot, Wrench, Cpu, Coins, Hash, ShieldAlert, Power, Loader2,
} from "lucide-react";
import { impactChipVariant } from "./slm-helpers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}

const CATEGORY_KEYS: AgentCategory[] = [
  "triage", "billing", "ops", "fleet", "sales", "security", "compliance", "custom",
];

const ALL_TOOLS: AgentTool[] = [
  ...BUILTIN_TOOLS,
  ...MCP_TOOL_TEMPLATES,
  ...INTEGRATION_TOOL_TEMPLATES,
];

function emptyForm() {
  return {
    name: "",
    description: "",
    category: "triage" as AgentCategory,
    brainId: "",
    systemPrompt: "",
    maxIterations: 5,
    tokenBudget: 8000,
    autoExecute: true,
    approvalThreshold: 60,
    toolIds: [] as string[],
  };
}

export function SLMCreateAgentDialog({ open, onOpenChange, onCreated }: Props) {
  const brains = useSuperadminStore((s) => s.brains);
  const createAgent = useSuperadminStore((s) => s.createAgent);
  const currentStaff = useSuperadminStore((s) => s.currentStaff);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog reopens.
  // Using a key based on `open` so React remounts the form below.
  // (Avoids setState-in-effect code smell.)

  const valid = useMemo(() => {
    if (!form.name.trim()) return false;
    if (form.name.trim().length < 3) return false;
    if (!form.description.trim()) return false;
    if (!form.brainId) return false;
    if (!form.systemPrompt.trim()) return false;
    if (form.maxIterations < 1 || form.maxIterations > 25) return false;
    if (form.tokenBudget < 1000) return false;
    if (form.approvalThreshold < 0 || form.approvalThreshold > 100) return false;
    return true;
  }, [form]);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function toggleTool(id: string) {
    setForm((prev) => ({
      ...prev,
      toolIds: prev.toolIds.includes(id)
        ? prev.toolIds.filter((t) => t !== id)
        : [...prev.toolIds, id],
    }));
  }

  function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    // Slight delay so the spinner is visible (Doherty threshold).
    setTimeout(() => {
      const brainFallback = brains[0]?.id ?? "brain-local";
      const id = createAgent({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        status: "draft",
        brainId: form.brainId || brainFallback,
        systemPrompt: form.systemPrompt.trim(),
        toolIds: form.toolIds,
        maxIterations: form.maxIterations,
        tokenBudget: form.tokenBudget,
        autoExecute: form.autoExecute,
        approvalThreshold: form.approvalThreshold,
        scopes: [{ kind: "platform" }],
        suggestedForRoles: [],
        createdBy: currentStaff?.email ?? "system",
      });
      setSubmitting(false);
      setForm(emptyForm());
      onCreated(id);
    }, 250);
  }

  function handleCancel() {
    onOpenChange(false);
    // Defer reset so the close animation isn't visually janky.
    setTimeout(() => setForm(emptyForm()), 200);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleCancel())}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] w-full overflow-hidden rounded-[6px] p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-b border-border px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <Bot className="h-4 w-4" />
            Create SLM agent
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Define a new agent, its brain, loop limits, and tool whitelist.
            New agents start in <span className="font-medium text-foreground">draft</span> status - activate from the Agents tab once ready.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable form body */}
        <div className="max-h-[calc(90vh-160px)] overflow-y-auto scrollbar-thin px-5 py-4">
          <FormBody
            key={open ? "open" : "closed"}
            form={form}
            setField={setField}
            toggleTool={toggleTool}
            brains={brains}
          />
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border px-5 py-3">
          <div className="mr-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <Wrench className="h-3 w-3" />
            <span className="tabular">
              {form.toolIds.length} tool{form.toolIds.length === 1 ? "" : "s"} whitelisted
            </span>
          </div>
          <Btn variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
            disabled={!valid || submitting}
          >
            {submitting ? "Creating..." : "Create agent"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   FormBody - separated so we can mount it fresh on each open
   via the `key` prop, avoiding set-state-in-effect cascades.
   ============================================================ */

function FormBody({
  form, setField, toggleTool, brains,
}: {
  form: ReturnType<typeof emptyForm>;
  setField: <K extends keyof ReturnType<typeof emptyForm>>(
    key: K, value: ReturnType<typeof emptyForm>[K],
  ) => void;
  toggleTool: (id: string) => void;
  brains: ReturnType<typeof useSuperadminStore.getState>["brains"];
}) {
  return (
    <div className="space-y-4">
      {/* Name + Description */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-[12px] font-medium text-foreground">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="e.g. Rean Refund Bot"
            className="mt-1 h-9 rounded-[5px] border-border bg-background text-[13px]"
            minLength={3}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Min 3 characters.</p>
        </div>
        <div>
          <Label className="text-[12px] font-medium text-foreground">Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setField("category", v as AgentCategory)}
          >
            <SelectTrigger className="mt-1 h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent className="rounded-[5px]">
              {CATEGORY_KEYS.map((c) => (
                <SelectItem key={c} value={c} className="text-[13px]">
                  {AGENT_CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[12px] font-medium text-foreground">Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="One-line summary of what this agent does."
          className="mt-1 min-h-[60px] resize-none rounded-[5px] border-border bg-background text-[12.5px]"
        />
      </div>

      {/* Brain */}
      <div>
        <Label className="text-[12px] font-medium text-foreground">Brain</Label>
        <Select
          value={form.brainId}
          onValueChange={(v) => setField("brainId", v)}
        >
          <SelectTrigger className="mt-1 h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
            <SelectValue placeholder="Pick a brain" />
          </SelectTrigger>
          <SelectContent className="rounded-[5px]">
            {brains.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-[13px]">
                <span className="font-medium">{b.name}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  {b.kind === "local-rules" ? "local rules" : `${b.model ?? b.providerId ?? "remote"}`}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Cpu className="h-3 w-3" />
          The brain decides the next tool call(s) during the THINK phase of each loop iteration.
        </p>
      </div>

      {/* System prompt */}
      <div>
        <Label className="text-[12px] font-medium text-foreground">System prompt</Label>
        <Textarea
          value={form.systemPrompt}
          onChange={(e) => setField("systemPrompt", e.target.value)}
          placeholder="You are Rean X. For every event: (1) ..., (2) ..., (3) ..."
          className="mt-1 min-h-[120px] resize-y rounded-[5px] border-border bg-background font-mono text-[12px]"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground tabular">
          {form.systemPrompt.length} chars
        </p>
      </div>

      {/* Loop config */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[12px] font-medium text-foreground">Max iterations</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={25}
              value={form.maxIterations}
              onChange={(e) => setField("maxIterations", Number(e.target.value))}
              className="h-9 w-full rounded-[5px] border-border bg-background text-[13px] tabular"
            />
            <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
        <div>
          <Label className="text-[12px] font-medium text-foreground">Token budget</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              min={1000}
              step={1000}
              value={form.tokenBudget}
              onChange={(e) => setField("tokenBudget", Number(e.target.value))}
              className="h-9 w-full rounded-[5px] border-border bg-background text-[13px] tabular"
            />
            <Coins className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Auto execute + approval threshold */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-card px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Power className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <div className="text-[12px] font-medium text-foreground">Auto execute</div>
              <div className="text-[10.5px] text-muted-foreground">
                Run autonomously; high-impact tools may still pause.
              </div>
            </div>
          </div>
          <Switch
            checked={form.autoExecute}
            onCheckedChange={(v) => setField("autoExecute", v)}
          />
        </div>
        <div className="rounded-[5px] border border-border bg-card px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <div className="text-[12px] font-medium text-foreground">
                  Approval threshold
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  Tool impact &ge; threshold pauses for review.
                </div>
              </div>
            </div>
            <span className="text-[13px] font-medium text-foreground tabular">
              {form.approvalThreshold}
            </span>
          </div>
          <Slider
            value={[form.approvalThreshold]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => setField("approvalThreshold", v[0] ?? 0)}
            className="mt-2"
          />
        </div>
      </div>

      {/* Tool whitelist */}
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <Label className="text-[12px] font-medium text-foreground">Tool whitelist</Label>
          <span className="text-[10px] text-muted-foreground tabular">
            {form.toolIds.length} of {ALL_TOOLS.length} selected
          </span>
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin rounded-[5px] border border-border bg-background p-2.5">
          {ALL_TOOLS.map((t) => {
            const checked = form.toolIds.includes(t.id);
            return (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-2.5 rounded-[3px] px-1.5 py-1.5 hover:bg-accent/40 tap"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleTool(t.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-medium text-foreground">{t.name}</span>
                    <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {t.fn}
                    </span>
                    <StatusBadge variant={impactChipVariant(t.impact)}>
                      {t.impact}
                    </StatusBadge>
                    <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                      {t.kind}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SLMCreateAgentDialog;

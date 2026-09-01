"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  X,
  Check,
  Trash2,
  Workflow,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  GitBranch,
  Square,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CHANNELS,
  journeyStepMeta,
  type Campaign,
  type JourneyStep,
  type JourneyStepType,
  type Channel,
} from "./_helpers";

interface JourneyBuilderProps {
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onSave: (campaignId: string, journey: JourneyStep[]) => void;
}

const STEP_TYPES: { type: JourneyStepType; icon: typeof Mail; label: string }[] = [
  { type: "Send", icon: Mail, label: "Send" },
  { type: "Wait", icon: Clock, label: "Wait" },
  { type: "Condition", icon: GitBranch, label: "Condition" },
  { type: "End", icon: Square, label: "End" },
];

export function JourneyBuilder({ open, campaign, onClose, onSave }: JourneyBuilderProps) {
  const [steps, setSteps] = useState<JourneyStep[]>([]);

  useEffect(() => {
    if (open && campaign) {
      setSteps(campaign.journey.map((s) => ({ ...s })));
    }
  }, [open, campaign]);

  const addStep = (type: JourneyStepType) => {
    const newStep: JourneyStep = {
      id: `s-new-${Date.now()}`,
      type,
      label:
        type === "Send" ? "Send message"
        : type === "Wait" ? "Wait"
        : type === "Condition" ? "Condition check"
        : "End journey",
      detail: type === "Send" ? "Channel broadcast" : type === "Wait" ? "Pause before next step" : type === "Condition" ? "Branch by attribute" : "Exit audience",
      channel: type === "Send" ? "Email" : undefined,
      durationLabel: type === "Wait" ? "1 day" : undefined,
      conditionLabel: type === "Condition" ? "opened == true" : undefined,
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const updateStep = (id: string, patch: Partial<JourneyStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const moveStep = (id: string, dir: "up" | "down") => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const newIdx = dir === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[newIdx];
      next[newIdx] = tmp;
      return next;
    });
  };

  const handleSave = () => {
    if (!campaign) return;
    if (steps.length === 0) {
      toastInfo("Journey empty", "Add at least one step before saving.");
      return;
    }
    if (!steps.some((s) => s.type === "Send")) {
      toastInfo("No send step", "A journey needs at least one Send step.");
      return;
    }
    onSave(campaign.id, steps);
    toastSuccess("Journey saved", `${campaign.name} · ${steps.length} steps updated.`);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Journey Builder
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {campaign?.name ?? "New campaign"} · {steps.length} step{steps.length === 1 ? "" : "s"}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step type toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Add step:</span>
            {STEP_TYPES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.type}
                  onClick={() => addStep(s.type)}
                  className="tap flex h-7 items-center gap-1.5 rounded-[5px] border border-border px-2 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Steps list */}
          <div className="flex flex-col gap-3">
            {steps.length === 0 && (
              <div className="rounded-[6px] border border-dashed border-border bg-background px-4 py-12 text-center text-[13px] text-muted-foreground">
                <Workflow className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
                Empty journey. Add Send, Wait, Condition, or End steps from the toolbar above.
              </div>
            )}
            {steps.map((s, idx) => {
              const meta = journeyStepMeta(s.type);
              return (
                <div key={s.id} className="rounded-[6px] border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="tabular flex h-6 w-6 items-center justify-center rounded-[5px] border border-border bg-muted text-[11px] font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <StatusBadge variant="muted">{meta.label}</StatusBadge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveStep(s.id, "up")} disabled={idx === 0} className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none" aria-label="Move up">↑</button>
                      <button onClick={() => moveStep(s.id, "down")} disabled={idx === steps.length - 1} className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none" aria-label="Move down">↓</button>
                      <button onClick={() => removeStep(s.id)} className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Remove step"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Step label</Label>
                  <Input
                    value={s.label}
                    onChange={(e) => updateStep(s.id, { label: e.target.value })}
                    className="mt-1 h-8 rounded-[5px] text-[13px]"
                  />
                  <Label className="mt-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Detail</Label>
                  <Input
                    value={s.detail ?? ""}
                    onChange={(e) => updateStep(s.id, { detail: e.target.value })}
                    placeholder="Optional context"
                    className="mt-1 h-8 rounded-[5px] text-[12px]"
                  />
                  {s.type === "Send" && (
                    <div className="mt-3 rounded-[5px] border border-border bg-background p-2.5">
                      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Channel</Label>
                      <Select
                        value={s.channel ?? "Email"}
                        onValueChange={(v) => updateStep(s.id, { channel: v as Channel })}
                      >
                        <SelectTrigger className="mt-1 h-7 w-full rounded-[5px] text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHANNELS.map((c) => {
                            const icon = c === "Email" ? <Mail className="h-3 w-3" /> : c === "SMS" ? <Smartphone className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />;
                            return (
                              <SelectItem key={c} value={c}>
                                <span className="inline-flex items-center gap-1.5">
                                  {icon} {c}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {s.type === "Wait" && (
                    <div className="mt-3 rounded-[5px] border border-border bg-background p-2.5">
                      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Duration label</Label>
                      <Input
                        value={s.durationLabel ?? ""}
                        onChange={(e) => updateStep(s.id, { durationLabel: e.target.value })}
                        placeholder="e.g. 2 days, 24h, 1 week"
                        className="mt-1 h-7 rounded-[4px] text-[12px] tabular"
                      />
                    </div>
                  )}
                  {s.type === "Condition" && (
                    <div className="mt-3 rounded-[5px] border border-border bg-background p-2.5">
                      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Condition expression</Label>
                      <Input
                        value={s.conditionLabel ?? ""}
                        onChange={(e) => updateStep(s.id, { conditionLabel: e.target.value })}
                        placeholder="e.g. opened == true"
                        className="mt-1 h-7 rounded-[4px] font-mono text-[12px] tabular"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular">
              {steps.length} step{steps.length === 1 ? "" : "s"}
            </span>
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSave}>
              Save Journey
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

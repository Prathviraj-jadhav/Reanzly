"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Plus, X, Check, Zap, Filter, Workflow, Play, AlertCircle,
  ChevronLeft, ChevronRight, Trash2, Sparkles,
} from "lucide-react";
import {
  TRIGGER_CATEGORIES, TRIGGER_EVENTS, CONDITION_FIELDS, CONDITION_OPERATORS,
  ACTION_TYPES, ACTION_CONFIG_LABELS, EMPTY_FORM, FieldLabel,
  type AutomationForm,
} from "./_helpers";

interface BuilderProps {
  open: boolean;
  initial: AutomationForm | null;
  onClose: () => void;
  onSave: (form: AutomationForm) => void;
}

const STEPS = [
  { id: 1, label: "Trigger" },
  { id: 2, label: "Conditions" },
  { id: 3, label: "Actions" },
  { id: 4, label: "Review" },
];

export function AutomationBuilder({ open, initial, onClose, onSave }: BuilderProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AutomationForm>(EMPTY_FORM);

  // Sync when initial changes (new vs edit vs template)
  if (open && initial && (form !== initial) && (form.name !== initial.name || form.trigger !== initial.trigger || form.conditions.length !== initial.conditions.length || form.actions.length !== initial.actions.length)) {
    setForm(initial);
    setStep(1);
  }
  if (!open && form.name) {
    setTimeout(() => { setForm(EMPTY_FORM); setStep(1); }, 0);
  }

  const update = <K extends keyof AutomationForm>(k: K, v: AutomationForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleCategoryChange = (cat: string) => {
    const events = TRIGGER_EVENTS[cat] || [];
    setForm((s) => ({ ...s, triggerCategory: cat, trigger: events[0] || "", conditions: [] }));
  };

  const addCondition = () => {
    const fields = CONDITION_FIELDS[form.triggerCategory] || [];
    update("conditions", [...form.conditions, { field: fields[0] || "", operator: "equals", value: "" }]);
  };

  const updateCondition = (idx: number, key: "field" | "operator" | "value", value: string) => {
    update("conditions", form.conditions.map((c, i) => i === idx ? { ...c, [key]: value } : c));
  };

  const removeCondition = (idx: number) => {
    update("conditions", form.conditions.filter((_, i) => i !== idx));
  };

  const addAction = () => {
    update("actions", [...form.actions, { type: ACTION_TYPES[0], config: "" }]);
  };

  const updateAction = (idx: number, key: "type" | "config", value: string) => {
    update("actions", form.actions.map((a, i) => i === idx ? { ...a, [key]: value } : a));
  };

  const removeAction = (idx: number) => {
    update("actions", form.actions.filter((_, i) => i !== idx));
  };

  const errors: string[] = [];
  if (step === 1) {
    if (!form.name.trim()) errors.push("Automation name is required");
    if (!form.trigger) errors.push("Trigger event is required");
  }
  if (step === 3 && form.actions.length === 0) {
    errors.push("At least one action is required");
  }

  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!form.trigger) {
      toast("Pick a trigger event first");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/automation/test-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerCategory: form.triggerCategory, trigger: form.trigger }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Test failed");
        return;
      }
      if (!result.supported) {
        toast("Live evaluation not available for this trigger yet", {
          description: "The automation can still be saved - Run Now will log it as unsupported until this trigger gets a real query.",
        });
        return;
      }
      toast.success(`${result.totalMatched} real match${result.totalMatched === 1 ? "" : "es"} found`, {
        description: result.matches.length > 0
          ? result.matches.map((m: { label: string }) => m.label).join(", ")
          : "No records currently match this trigger's real data.",
      });
    } catch {
      toast.error("Test failed - check your connection.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast("Name required");
      return;
    }
    if (form.actions.length === 0) {
      toast("At least one action required");
      return;
    }
    onSave(form);
  };

  const isLastStep = step === 4;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {initial?.name ? "Edit Automation" : "Create Automation"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Trigger → Conditions → Actions. Test before activating.
            </SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { if (s.id < step) setStep(s.id); }}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span className={
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors " +
                      (active || done ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")
                    }>
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span className={
                      "hidden text-[12px] font-medium md:inline " +
                      (active ? "text-foreground" : "text-muted-foreground")
                    }>
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={"h-px w-6 " + (step > s.id ? "bg-foreground" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Trigger */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Automation Details</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <FieldLabel required>Automation Name</FieldLabel>
                    <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Overdue Invoice Escalation" className="h-8 rounded-[5px] text-[13px]" />
                  </div>
                  <div>
                    <FieldLabel hint="optional">Description</FieldLabel>
                    <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What does this automation do?" className="min-h-[60px] rounded-[5px] text-[13px]" />
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Trigger</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Trigger Category</FieldLabel>
                    <Select value={form.triggerCategory} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Trigger Event</FieldLabel>
                    <Select value={form.trigger} onValueChange={(v) => update("trigger", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        {(TRIGGER_EVENTS[form.triggerCategory] || []).map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  When <span className="text-foreground font-medium">{form.trigger || "-"}</span> occurs, this automation fires.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Conditions */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Conditions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Logic:</span>
                    <div className="flex rounded-[5px] border border-border overflow-hidden">
                      {(["AND", "OR"] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() => update("conditionLogic", l)}
                          className={
                            "px-2.5 py-1 text-[11px] font-medium transition-colors " +
                            (form.conditionLogic === l ? "bg-foreground text-background" : "text-foreground hover:bg-accent")
                          }
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {form.conditions.length === 0 ? (
                  <div className="rounded-[5px] border border-dashed border-border py-8 text-center">
                    <Filter className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-[12px] text-muted-foreground">No conditions. Automation fires on every trigger event.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {form.conditions.map((c, idx) => {
                      const fields = CONDITION_FIELDS[form.triggerCategory] || [];
                      return (
                        <div key={idx} className="flex items-center gap-2 rounded-[5px] border border-border bg-background p-2">
                          {idx > 0 && (
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">{form.conditionLogic}</span>
                          )}
                          <Select value={c.field} onValueChange={(v) => updateCondition(idx, "field", v)}>
                            <SelectTrigger className="h-7 w-auto min-w-[120px] rounded-[4px] text-[12px] border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={c.operator} onValueChange={(v) => updateCondition(idx, "operator", v)}>
                            <SelectTrigger className="h-7 w-auto min-w-[110px] rounded-[4px] text-[12px] border-border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CONDITION_OPERATORS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {(c.operator !== "is empty" && c.operator !== "is not empty") && (
                            <Input
                              value={c.value}
                              onChange={(e) => updateCondition(idx, "value", e.target.value)}
                              placeholder="value"
                              className="h-7 flex-1 rounded-[4px] text-[12px]"
                            />
                          )}
                          <button
                            onClick={() => removeCondition(idx)}
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={addCondition}
                  className="mt-3 flex items-center gap-1.5 rounded-[5px] border border-border border-dashed px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors w-fit"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Condition
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Actions */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Actions</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular">{form.actions.length} action{form.actions.length !== 1 ? "s" : ""}</span>
                </div>
                {form.actions.length === 0 ? (
                  <div className="rounded-[5px] border border-dashed border-border py-8 text-center">
                    <Workflow className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-[12px] text-muted-foreground">Add at least one action to perform when the automation fires.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {form.actions.map((a, idx) => (
                      <div key={idx} className="rounded-[5px] border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] tabular">{idx + 1}</span>
                            Action
                          </span>
                          <button
                            onClick={() => removeAction(idx)}
                            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <Select value={a.type} onValueChange={(v) => updateAction(idx, "type", v)}>
                            <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t === "Trigger Rean Analysis" && <Sparkles className="h-3 w-3 mr-1.5 inline" />}
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div>
                            <FieldLabel hint={ACTION_CONFIG_LABELS[a.type]}>Config</FieldLabel>
                            <Input
                              value={a.config}
                              onChange={(e) => updateAction(idx, "config", e.target.value)}
                              placeholder={ACTION_CONFIG_LABELS[a.type]}
                              className="h-8 rounded-[5px] text-[12px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={addAction}
                  className="mt-3 flex items-center gap-1.5 rounded-[5px] border border-border border-dashed px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors w-fit"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Action
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Summary</span>
                  <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.activate}
                      onChange={(e) => update("activate", e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-foreground font-medium">Activate on save</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Name" value={form.name || "-"} />
                  <ReviewRow label="Description" value={form.description || "-"} />
                  <ReviewRow label="Trigger Category" value={form.triggerCategory} />
                  <ReviewRow label="Trigger Event" value={form.trigger || "-"} />
                  <ReviewRow label="Condition Logic" value={form.conditions.length > 0 ? form.conditionLogic : "-"} />
                  <ReviewRow label="Conditions" value={String(form.conditions.length)} mono />
                  <ReviewRow label="Actions" value={String(form.actions.length)} mono />
                  <ReviewRow label="On Save" value={form.activate ? "Activate" : "Save as Draft"} />
                </div>
              </div>

              {/* Flow visualization */}
              <div className="rounded-[6px] border border-border bg-card p-4">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-3 block">Automation Flow</span>
                <div className="flex flex-col gap-2">
                  <FlowNode label="Trigger" value={`${form.triggerCategory} · ${form.trigger}`} />
                  {form.conditions.length > 0 && (
                    <FlowNode label={`Conditions (${form.conditionLogic})`} value={form.conditions.map((c) => `${c.field} ${c.operator} ${c.value || "…"}`).join("  •  ")} />
                  )}
                  {form.actions.map((a, i) => (
                    <FlowNode key={i} label={`Action ${i + 1}`} value={`${a.type} · ${a.config || "-"}`} />
                  ))}
                </div>
              </div>

              {/* Test Run */}
              <div className="rounded-[6px] border border-border bg-accent/30 p-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Play className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Test Run</p>
                    <p className="text-[11px] text-muted-foreground">Query real data for this trigger, without saving or executing actions.</p>
                  </div>
                </div>
                <Btn size="sm" onClick={handleTest} disabled={testing}>{testing ? "Testing…" : "Test Now"}</Btn>
              </div>
            </div>
          )}
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/40 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={() => step > 1 ? setStep(step - 1) : onClose()} disabled={step === 1}>
            {step === 1 ? "Cancel" : "Back"}
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 4</div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSave}>
              {form.activate ? "Save & Activate" : "Save Draft"}
            </Btn>
          ) : (
            <Btn variant="primary" onClick={() => setStep(step + 1)} disabled={errors.length > 0}>
              Continue <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={"text-[13px] text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}

function FlowNode({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[12px] text-foreground">{value}</div>
    </div>
  );
}

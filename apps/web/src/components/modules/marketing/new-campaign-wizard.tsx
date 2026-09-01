"use client";

import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  GitBranch,
  Square,
  Sparkles,
  CalendarClock,
  Save,
  ArrowRight,
} from "lucide-react";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  AUDIENCE_SEGMENTS,
  CAMPAIGN_TEMPLATES,
  CHANNELS,
  channelMeta,
  journeyStepMeta,
  type AudienceSegment,
  type Campaign,
  type CampaignTemplate,
  type Channel,
  type JourneyStep,
  type JourneyStepType,
} from "./_helpers";

interface NewCampaignWizardProps {
  open: boolean;
  onClose: () => void;
  /** Returns the new campaign id so the parent can navigate to its detail. */
  onCreate: (campaign: Campaign) => void;
  /** Suggested next campaign numeric id (used to build CMP-XXXX). */
  nextCampaignNumber: number;
}

type TemplateFilter = "all" | "library" | "mine";

const CHANNEL_ICON: Record<Channel, typeof Mail> = {
  Email: Mail,
  SMS: Smartphone,
  WhatsApp: MessageSquare,
};

const BLANK_JOURNEY: JourneyStep[] = [
  { id: "s1", type: "Send", label: "Send initial message", detail: "Channel broadcast", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
  { id: "s2", type: "Wait", label: "Wait 2 days", detail: "48-hour cool-down", durationLabel: "2 days" },
  { id: "s3", type: "Condition", label: "Opened message?", detail: "Branch by engagement", conditionLabel: "opened == true" },
  { id: "s4", type: "Send", label: "Send follow-up", detail: "Channel nudge to non-openers", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
  { id: "s5", type: "End", label: "End journey", detail: "Exit audience" },
];

const STEP_ICONS: Record<JourneyStepType, typeof Mail> = {
  Send: Mail,
  Wait: Clock,
  Condition: GitBranch,
  End: Square,
};

export function NewCampaignWizard({
  open,
  onClose,
  onCreate,
  nextCampaignNumber,
}: NewCampaignWizardProps) {
  // Wizard step state - 1: template · 2: details · 3: journey preview
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all");

  // Selected template (or null = "Start from scratch")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Form state (step 2)
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [channel, setChannel] = useState<Channel>("Email");
  const [audience, setAudience] = useState<AudienceSegment>("All active customers");
  const [audienceSize, setAudienceSize] = useState<number>(1200);

  // Journey state (step 3) - shallow-cloned so we can mutate labels safely
  const [journey, setJourney] = useState<JourneyStep[]>(BLANK_JOURNEY);

  // NOTE: state is reset by the parent remounting this component via the
  // `key` prop each time the drawer opens (see NewCampaignWizard's caller
  // in index.tsx). We deliberately avoid useEffect+setState here to keep
  // the render path clean (React's "adjust state during render" rule).

  const selectedTemplate = useMemo(
    () => CAMPAIGN_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId],
  );

  // Apply template → pre-fill form + journey, then jump to step 2.
  const applyTemplate = (tpl: CampaignTemplate) => {
    setSelectedTemplateId(tpl.id);
    setName(tpl.name + " - copy");
    setGoal(tpl.goal);
    setChannel(tpl.channel);
    setAudience(tpl.audience);
    setJourney(tpl.journey.map((s) => ({ ...s, metrics: s.metrics ? { ...s.metrics } : undefined })));
    setStep(2);
  };

  const startFromScratch = () => {
    setSelectedTemplateId(null);
    setName("");
    setGoal("");
    setChannel("Email");
    setAudience("All active customers");
    setJourney(BLANK_JOURNEY.map((s) => ({ ...s })));
    setStep(2);
  };

  const filteredTemplates = useMemo(() => {
    if (templateFilter === "library") return CAMPAIGN_TEMPLATES.filter((t) => t.library);
    if (templateFilter === "mine") return CAMPAIGN_TEMPLATES.filter((t) => !t.library);
    return CAMPAIGN_TEMPLATES;
  }, [templateFilter]);

  // ===== Submit (Save Draft or Schedule) =====
  const buildCampaign = (status: Campaign["status"]): Campaign => {
    const id = `cmp-new-${Date.now()}`;
    const campaignId = `CMP-${String(nextCampaignNumber).padStart(4, "0")}`;
    const finalName = name.trim() || (selectedTemplate?.name ?? "Untitled campaign");
    return {
      id,
      campaignId,
      name: finalName,
      channel,
      status,
      audience: audienceSize,
      sent: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      startDate:
        status === "Scheduled"
          ? new Date(Date.now() + 86400000).toISOString()
          : new Date().toISOString(),
      endDate: undefined,
      owner: "You",
      goal: goal.trim() || (selectedTemplate?.goal ?? "-"),
      journey: journey,
      audienceMembers: [],
    };
  };

  const handleSaveDraft = () => {
    if (!name.trim() && !selectedTemplate) {
      toastInfo("Name required", "Give your campaign a name before saving.");
      return;
    }
    const c = buildCampaign("Draft");
    onCreate(c);
    toastSuccess("Draft saved", `${c.campaignId} · ${c.name}`);
  };

  const handleSchedule = () => {
    if (!name.trim() && !selectedTemplate) {
      toastInfo("Name required", "Give your campaign a name before scheduling.");
      return;
    }
    const c = buildCampaign("Scheduled");
    onCreate(c);
    toastSuccess("Campaign scheduled", `${c.campaignId} · goes live tomorrow.`);
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
              New Campaign
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Pick a template, configure audience, review journey - then save as draft or schedule.
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

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-2.5">
          {[
            { n: 1, label: "Template" },
            { n: 2, label: "Details" },
            { n: 3, label: "Journey" },
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center gap-2">
              {idx > 0 && <span className="text-[10px] text-muted-foreground/50">›</span>}
              <button
                onClick={() => {
                  // Allow going back to earlier steps always; forward only if prerequisites met.
                  if (s.n < step) setStep(s.n as 1 | 2 | 3);
                  else if (s.n === 2 && step === 1) setStep(2);
                  else if (s.n === 3 && step === 2) setStep(3);
                }}
                className={
                  "tap flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-[11px] font-medium transition-colors " +
                  (step === s.n
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground")
                }
              >
                <span className="tabular">{s.n}</span>
                {s.label}
              </button>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {selectedTemplate ? `From: ${selectedTemplate.name}` : "From scratch"}
          </div>
        </div>

        {/* Step body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {step === 1 && (
            <StepTemplate
              filter={templateFilter}
              onFilterChange={setTemplateFilter}
              templates={filteredTemplates}
              onApply={applyTemplate}
              onScratch={startFromScratch}
            />
          )}
          {step === 2 && (
            <StepDetails
              name={name}
              onName={setName}
              goal={goal}
              onGoal={setGoal}
              channel={channel}
              onChannel={setChannel}
              audience={audience}
              onAudience={setAudience}
              audienceSize={audienceSize}
              onAudienceSize={setAudienceSize}
            />
          )}
          {step === 3 && <StepJourney journey={journey} channel={channel} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Btn variant="ghost" onClick={() => setStep(step === 3 ? 2 : 1)}>
                Back
              </Btn>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <Btn
                variant="primary"
                iconRight={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => setStep(step === 1 ? 2 : 3)}
              >
                Continue
              </Btn>
            )}
            {step === 3 && (
              <>
                <span className="text-[11px] text-muted-foreground tabular">
                  {journey.length} step{journey.length === 1 ? "" : "s"} · {channel}
                </span>
                <Btn variant="outline" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSaveDraft}>
                  Save as Draft
                </Btn>
                <Btn variant="primary" icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={handleSchedule}>
                  Schedule
                </Btn>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Step 1 - Template picker
   ============================================================ */
function StepTemplate({
  filter,
  onFilterChange,
  templates,
  onApply,
  onScratch,
}: {
  filter: TemplateFilter;
  onFilterChange: (f: TemplateFilter) => void;
  templates: CampaignTemplate[];
  onApply: (t: CampaignTemplate) => void;
  onScratch: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Chip filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "all", label: "All" },
          { id: "library", label: "Reanzly Library" },
          { id: "mine", label: "My Templates" },
        ] as { id: TemplateFilter; label: string }[]).map((c) => (
          <button
            key={c.id}
            onClick={() => onFilterChange(c.id)}
            className={
              "tap inline-flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
              (filter === c.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {c.id === "library" && <Sparkles className="h-3 w-3" />}
            {c.label}
          </button>
        ))}
        <div className="ml-auto">
          <Btn variant="outline" size="sm" icon={<ArrowRight className="h-3 w-3" />} onClick={onScratch}>
            Start from scratch
          </Btn>
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => {
          const ChIcon = CHANNEL_ICON[t.channel];
          const steps = t.journey.length;
          const sends = t.journey.filter((s) => s.type === "Send").length;
          return (
            <button
              key={t.id}
              onClick={() => onApply(t)}
              className="tap group flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 hover:bg-accent/30"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
                    <ChIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.category}
                    </div>
                  </div>
                </div>
                <StatusBadge variant={t.library ? "outline" : "muted"}>
                  {t.library ? "Library" : "My"}
                </StatusBadge>
              </div>
              <p className="text-[12px] text-muted-foreground">{t.description}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] tabular text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {t.channel}
                </span>
                <span>·</span>
                <span>{steps} step{steps === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{sends} send{sends === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{t.estimatedDuration}</span>
              </div>
            </button>
          );
        })}
      </div>
      {templates.length === 0 && (
        <div className="rounded-[6px] border border-dashed border-border bg-background px-4 py-10 text-center text-[12px] text-muted-foreground">
          No templates in this category yet. Try All or start from scratch.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Step 2 - Details (name, goal, channel, audience, size)
   ============================================================ */
function StepDetails({
  name,
  onName,
  goal,
  onGoal,
  channel,
  onChannel,
  audience,
  onAudience,
  audienceSize,
  onAudienceSize,
}: {
  name: string;
  onName: (v: string) => void;
  goal: string;
  onGoal: (v: string) => void;
  channel: Channel;
  onChannel: (c: Channel) => void;
  audience: AudienceSegment;
  onAudience: (a: AudienceSegment) => void;
  audienceSize: number;
  onAudienceSize: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel required>Campaign name</FieldLabel>
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="e.g. Diwali Freight Promo 2025"
          className="h-8 rounded-[5px] text-[13px]"
        />
      </div>

      <div>
        <FieldLabel>Goal</FieldLabel>
        <Textarea
          value={goal}
          onChange={(e) => onGoal(e.target.value)}
          rows={2}
          placeholder="What does success look like?"
          className="rounded-[5px] text-[12.5px]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel required>Channel</FieldLabel>
          <Select value={channel} onValueChange={(v) => onChannel(v as Channel)}>
            <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => {
                const Icon = CHANNEL_ICON[c];
                return (
                  <SelectItem key={c} value={c}>
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="h-3 w-3" /> {c}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel required hint="target contacts">Audience size</FieldLabel>
          <Input
            type="number"
            min={1}
            value={audienceSize}
            onChange={(e) => onAudienceSize(Math.max(1, Number(e.target.value) || 0))}
            className="h-8 rounded-[5px] text-[13px] tabular"
          />
        </div>
      </div>

      <div>
        <FieldLabel required>Audience segment</FieldLabel>
        <Select value={audience} onValueChange={(v) => onAudience(v as AudienceSegment)}>
          <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_SEGMENTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Channel meta hint */}
      <div className="rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        {(() => {
          const meta = channelMeta(channel);
          return (
            <>
              Selected channel <span className="font-medium text-foreground">{meta.label}</span> ({meta.short}).
              Messages will be delivered via the {meta.label} gateway once the campaign is activated.
            </>
          );
        })()}
      </div>
    </div>
  );
}

/* ============================================================
   Step 3 - Journey preview (read-only summary; user can go back
   to step 2 to change channel; full journey editing happens in
   the JourneyBuilder drawer from the campaign detail page).
   ============================================================ */
function StepJourney({ journey, channel }: { journey: JourneyStep[]; channel: Channel }) {
  const sends = journey.filter((s) => s.type === "Send").length;
  const waits = journey.filter((s) => s.type === "Wait").length;
  const conds = journey.filter((s) => s.type === "Condition").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Mini label="Send steps" value={String(sends)} />
        <Mini label="Wait steps" value={String(waits)} />
        <Mini label="Conditions" value={String(conds)} />
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Journey preview
          </h3>
          <StatusBadge variant="muted">{channel}</StatusBadge>
        </div>
        <div className="flex flex-col items-stretch gap-0">
          {journey.map((s, idx) => {
            const meta = journeyStepMeta(s.type);
            const Icon = STEP_ICONS[s.type];
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div
                  className={
                    "relative flex w-full items-start gap-3 rounded-[5px] border px-3 py-2 " +
                    (s.type === "Send"
                      ? "border-foreground bg-foreground/5"
                      : s.type === "Wait"
                        ? "border-border bg-muted/30"
                        : s.type === "Condition"
                          ? "border-dashed border-foreground/40 bg-background"
                          : "border-border bg-muted/50")
                  }
                >
                  <span
                    className={
                      "tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-medium " +
                      (s.type === "Send"
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground")
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{s.label}</span>
                      <StatusBadge variant="muted">{meta.label}</StatusBadge>
                    </div>
                    {s.detail && <p className="mt-0.5 text-[11px] text-muted-foreground">{s.detail}</p>}
                    {s.durationLabel && (
                      <p className="mt-0.5 tabular text-[10px] text-muted-foreground">⏱ {s.durationLabel}</p>
                    )}
                    {s.conditionLabel && (
                      <p className="mt-0.5 font-mono text-[10px] text-foreground">if ({s.conditionLabel})</p>
                    )}
                  </div>
                  <span className="tabular text-[10px] text-muted-foreground">#{idx + 1}</span>
                </div>
                {idx < journey.length - 1 && (
                  <div className="my-0.5 h-4 w-px bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tip: open the campaign after saving to fine-tune the journey in the visual builder.
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="tabular text-[16px] font-medium text-foreground">{value}</div>
    </div>
  );
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

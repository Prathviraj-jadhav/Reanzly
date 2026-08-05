"use client";

import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Eye,
  Plus,
  Trash2,
  Save,
  Send,
  PenLine,
  Building2,
  FileText,
  Palette,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useDocStudioStore, type BuilderDraft } from "./_store";
import {
  TEMPLATES,
  templateById,
  type TemplateId,
  type TemplateMeta,
  type FieldSchema,
  type LineItemRow,
  type BrandingConfig,
} from "./_data";
import { FieldLabel, formatINR } from "./_helpers";
import { cn } from "@/lib/utils";
import { DocumentPreview } from "./document-preview";

interface DocumentBuilderProps {
  onExit: () => void;
  onCommitted: (docId: string) => void;
}

const STEPS = [
  { id: 1, label: "Template", icon: FileText },
  { id: 2, label: "Parties", icon: Building2 },
  { id: 3, label: "Content", icon: PenLine },
  { id: 4, label: "Branding", icon: Palette },
  { id: 5, label: "Preview & Download", icon: Eye },
] as const;

export function DocumentBuilder({ onExit, onCommitted }: DocumentBuilderProps) {
  const draft = useDocStudioStore((s) => s.draft);
  const startDraft = useDocStudioStore((s) => s.startDraft);
  const updateDraft = useDocStudioStore((s) => s.updateDraft);
  const commitDraft = useDocStudioStore((s) => s.commitDraft);

  const [step, setStep] = useState<number>(draft ? 2 : 1);
  const [brandedOverride, setBrandedOverride] = useState<boolean | undefined>(undefined);

  // ===== Template step =====
  if (!draft || step === 1) {
    return (
      <TemplatePicker
        onPick={(id) => {
          startDraft(id);
          setStep(2);
          toast.success("Template selected", {
            description: `${templateById(id)?.label} - fill in the details below.`,
          });
        }}
        onExit={onExit}
      />
    );
  }

  const tpl = templateById(draft.templateId);
  if (!tpl) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[13px] text-muted-foreground">Template not found.</p>
        <Btn variant="outline" onClick={onExit}>Back to Studio</Btn>
      </div>
    );
  }

  // ===== Step validation =====
  const stepErrors: Record<number, string | null> = {
    1: null,
    2: !draft.recipientName.trim() ? "Recipient name is required" : null,
    3: validateContent(tpl, draft),
    4: null,
    5: null,
  };

  const canAdvance = (target: number) => {
    for (let i = 1; i < target; i++) {
      if (stepErrors[i]) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (stepErrors[step]) {
      toast.error("Please fix the error first", { description: stepErrors[step]! });
      return;
    }
    if (step < 5) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved", { description: "You can resume from the Documents list." });
    onExit();
  };

  const handleCommit = () => {
    const newDoc = commitDraft();
    if (newDoc) {
      toast.success("Document created", { description: newDoc.docNumber });
      onCommitted(newDoc.id);
    } else {
      toast.error("Could not create document");
    }
  };

  // ===== Preview doc (constructed from draft) =====
  // NOTE: not memoized — hooks cannot be called conditionally, and we have an
  // early return above. The computation is trivial (a few arithmetic ops).
  let previewSubtotal: number | undefined;
  let previewTaxAmount: number | undefined;
  let previewTotalAmount: number | undefined;
  if (tpl.lineItemsEnabled && tpl.taxEnabled) {
    previewSubtotal = draft.lineItems.reduce((s, i) => s + i.amount, 0);
    previewTaxAmount = Math.round((previewSubtotal * draft.taxRate) / 100);
    previewTotalAmount = previewSubtotal + previewTaxAmount;
  }
  const previewDoc = {
    id: "preview",
    docNumber: "[Preview]",
    templateId: draft.templateId,
    title: draft.title || tpl.defaultSubject,
    recipientName: draft.recipientName,
    recipientOrg: draft.recipientOrg,
    recipientAddress: draft.recipientAddress,
    fields: draft.fields,
    lineItems: tpl.lineItemsEnabled ? draft.lineItems : undefined,
    subtotal: previewSubtotal,
    taxAmount: previewTaxAmount,
    totalAmount: previewTotalAmount,
    branding: draft.branding,
    status: "Draft" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "You",
    tags: draft.tags,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-3 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onExit}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground hover:bg-accent transition-colors tap"
            aria-label="Exit builder"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">Building:</span>
              <span className="text-[13px] font-medium text-foreground">{tpl.label}</span>
              <StatusBadge variant="outline">Draft</StatusBadge>
            </div>
            <h2 className="text-[15px] font-medium tracking-tight text-foreground truncate">
              {draft.title || tpl.defaultSubject}
            </h2>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar no-print rounded-[6px] border border-border bg-card px-2 py-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          const reachable = canAdvance(s.id);
          return (
            <button
              key={s.id}
              disabled={!reachable}
              onClick={() => reachable && setStep(s.id)}
              className={cn(
                "flex items-center gap-2 rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors tap whitespace-nowrap",
                isActive && "bg-foreground text-background",
                !isActive && isDone && "text-foreground hover:bg-accent",
                !isActive && !isDone && "text-muted-foreground",
                !reachable && "opacity-40 cursor-not-allowed",
              )}
            >
              <span className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border",
                isActive ? "border-background" : "border-border",
              )}>
                {isDone ? <Check className="h-2.5 w-2.5" /> : <Icon className="h-2.5 w-2.5" />}
              </span>
              <span>{s.label}</span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 ml-1 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex flex-col gap-4">
        {step === 2 && (
          <PartiesStep
            draft={draft}
            tpl={tpl}
            updateDraft={updateDraft}
          />
        )}
        {step === 3 && (
          <ContentStep
            draft={draft}
            tpl={tpl}
            updateDraft={updateDraft}
          />
        )}
        {step === 4 && (
          <BrandingStep
            draft={draft}
            tpl={tpl}
            updateDraft={updateDraft}
          />
        )}
        {step === 5 && previewDoc && (
          <div className="flex flex-col gap-4">
            <DocumentPreview
              doc={previewDoc}
              onBack={() => setStep(4)}
              onEdit={() => setStep(3)}
              compact
              reanzlyBrandedOverride={brandedOverride ?? draft.branding.reanzlyBranded}
              onBrandedToggle={(v) => {
                setBrandedOverride(v);
                updateDraft({ branding: { ...draft.branding, reanzlyBranded: v } });
              }}
            />
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 z-10 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5 no-print">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {stepErrors[step] ? (
            <span className="text-foreground">{stepErrors[step]}</span>
          ) : (
            <span>Step {step} of 5 · {STEPS[step - 1].label}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Btn variant="outline" size="sm" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={handleBack}>
              <span className="hidden sm:inline">Back</span>
            </Btn>
          )}
          {step < 5 ? (
            <>
              <Btn variant="ghost" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSaveDraft}>
                <span className="hidden sm:inline">Save Draft</span>
              </Btn>
              <Btn variant="primary" size="sm" iconRight={<ChevronRight className="h-3.5 w-3.5" />} onClick={handleNext}>
                Continue
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setStep(2)}>
                <span className="hidden sm:inline">Edit Details</span>
              </Btn>
              <Btn variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={handleCommit}>
                Create &amp; Issue Document
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   STEP 1 — Template picker (inline grid)
// ============================================================
function TemplatePicker({
  onPick,
  onExit,
}: {
  onPick: (id: TemplateId) => void;
  onExit: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-3 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground hover:bg-accent transition-colors tap"
            aria-label="Exit builder"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Step 1 of 5</span>
            <h2 className="text-[15px] font-medium tracking-tight text-foreground">Pick a template</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 text-left transition-colors hover:border-foreground/40 tap"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t.prefix}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-[14px] font-medium tracking-tight text-foreground">{t.label}</h4>
                <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
                  {t.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto">
                {t.highlights.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1 rounded-[5px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Check className="h-2.5 w-2.5" />
                    {h}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
//   STEP 2 — Parties
// ============================================================
function PartiesStep({
  draft,
  tpl,
  updateDraft,
}: {
  draft: BuilderDraft;
  tpl: TemplateMeta;
  updateDraft: (patch: Partial<BuilderDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <StepHeader step={2} title="Parties" subtitle={`Who is this ${tpl.label.toLowerCase()} for?`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            From (Issuer)
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel>Company Name</FieldLabel>
              <Input
                value={draft.branding.companyName}
                onChange={(e) => updateDraft({ branding: { ...draft.branding, companyName: e.target.value } })}
                className="h-9 rounded-[5px] text-[13px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Signatory Name</FieldLabel>
                <Input
                  value={draft.branding.signatoryName}
                  onChange={(e) => updateDraft({ branding: { ...draft.branding, signatoryName: e.target.value } })}
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </div>
              <div>
                <FieldLabel>Signatory Title</FieldLabel>
                <Input
                  value={draft.branding.signatoryTitle}
                  onChange={(e) => updateDraft({ branding: { ...draft.branding, signatoryTitle: e.target.value } })}
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </div>
            </div>
            <div>
              <FieldLabel hint="City, State - Pincode">Address</FieldLabel>
              <Textarea
                value={`${draft.branding.addressLine1}, ${draft.branding.addressLine2}, ${draft.branding.city}, ${draft.branding.state} - ${draft.branding.pincode}`}
                onChange={(e) => {
                  // Best-effort parse — keep simple
                  const parts = e.target.value.split(",").map((s) => s.trim());
                  updateDraft({
                    branding: {
                      ...draft.branding,
                      addressLine1: parts[0] ?? "",
                      addressLine2: parts[1] ?? "",
                      city: parts[2] ?? draft.branding.city,
                    },
                  });
                }}
                className="min-h-[60px] rounded-[5px] text-[13px]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            To ({tpl.recipientLabel})
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel required>{tpl.recipientLabel} Name</FieldLabel>
              <Input
                value={draft.recipientName}
                onChange={(e) => updateDraft({ recipientName: e.target.value })}
                placeholder={`Enter ${tpl.recipientLabel.toLowerCase()} name`}
                className="h-9 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <FieldLabel hint="Optional">Organisation</FieldLabel>
              <Input
                value={draft.recipientOrg}
                onChange={(e) => updateDraft({ recipientOrg: e.target.value })}
                placeholder="Company / Organisation"
                className="h-9 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <FieldLabel hint="Optional, multi-line">Address</FieldLabel>
              <Textarea
                value={draft.recipientAddress}
                onChange={(e) => updateDraft({ recipientAddress: e.target.value })}
                placeholder="Street, City, State - Pincode"
                className="min-h-[80px] rounded-[5px] text-[13px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Document Title
        </div>
        <Input
          value={draft.title}
          onChange={(e) => updateDraft({ title: e.target.value })}
          placeholder={tpl.defaultSubject}
          className="h-9 rounded-[5px] text-[13px]"
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          This title appears on the document header. Leave blank to use the default &quot;{tpl.defaultSubject}&quot;.
        </p>
      </div>
    </div>
  );
}

// ============================================================
//   STEP 3 — Content (template-specific fields + line items)
// ============================================================
function ContentStep({
  draft,
  tpl,
  updateDraft,
}: {
  draft: BuilderDraft;
  tpl: TemplateMeta;
  updateDraft: (patch: Partial<BuilderDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <StepHeader step={3} title="Content" subtitle="Fill in the template-specific fields. All fields are editable downstream." />

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {tpl.label} Fields
          </div>
          <span className="text-[11px] text-muted-foreground">
            {tpl.fields.filter((f) => f.type !== "lineitems").length} fields
            {tpl.lineItemsEnabled && " · line items enabled"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tpl.fields
            .filter((f) => f.type !== "lineitems")
            .map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={draft.fields[field.id] ?? ""}
                onChange={(v) => updateDraft({ fields: { ...draft.fields, [field.id]: v } })}
              />
            ))}
        </div>
      </div>

      {/* Line items */}
      {tpl.lineItemsEnabled && (
        <LineItemsEditor
          tpl={tpl}
          items={draft.lineItems}
          taxRate={draft.taxRate}
          onChange={(items, taxRate) => updateDraft({ lineItems: items, taxRate })}
        />
      )}

      {/* Tags */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <FieldLabel hint="Comma-separated">Tags</FieldLabel>
        <Input
          value={draft.tags.join(", ")}
          onChange={(e) =>
            updateDraft({
              tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
            })
          }
          placeholder="e.g. HR, Offer, Operations"
          className="h-9 rounded-[5px] text-[13px]"
        />
      </div>
    </div>
  );
}

// ============================================================
//   STEP 4 — Branding
// ============================================================
function BrandingStep({
  draft,
  tpl,
  updateDraft,
}: {
  draft: BuilderDraft;
  tpl: TemplateMeta;
  updateDraft: (patch: Partial<BuilderDraft>) => void;
}) {
  const b = draft.branding;
  return (
    <div className="flex flex-col gap-4">
      <StepHeader step={4} title="Branding & Customization" subtitle="Apply your brand identity, signature, watermark and the Created by Reanzly attribution." />

      {/* Created by Reanzly toggle */}
      <div className="rounded-[6px] border border-foreground bg-foreground/[0.02] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border bg-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[13px] font-medium text-foreground">Created by Reanzly</div>
              <p className="text-[12px] leading-relaxed text-muted-foreground max-w-md">
                When ON, every generated document carries the &quot;Created by Reanzly&quot; watermark in the footer + the Reanzly attribution line. Turn OFF for white-labeled documents you send under your own brand only.
              </p>
            </div>
          </div>
          <Switch
            checked={b.reanzlyBranded}
            onCheckedChange={(v) => updateDraft({ branding: { ...b, reanzlyBranded: v } })}
            aria-label="Toggle Created by Reanzly branding"
          />
        </div>
      </div>

      {/* Issuer branding block */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Issuer Branding
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <FieldLabel>Company Name</FieldLabel>
            <Input
              value={b.companyName}
              onChange={(e) => updateDraft({ branding: { ...b, companyName: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="2-3 chars">Monogram (Logo)</FieldLabel>
            <Input
              value={b.monogram}
              maxLength={3}
              onChange={(e) => updateDraft({ branding: { ...b, monogram: e.target.value.toUpperCase() } })}
              className="h-9 rounded-[5px] text-[13px] font-mono"
            />
          </div>
          <div>
            <FieldLabel>Legal Name</FieldLabel>
            <Input
              value={b.legalName}
              onChange={(e) => updateDraft({ branding: { ...b, legalName: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>GSTIN</FieldLabel>
            <Input
              value={b.gstin}
              onChange={(e) => updateDraft({ branding: { ...b, gstin: e.target.value.toUpperCase() } })}
              className="h-9 rounded-[5px] text-[13px] font-mono"
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input
              value={b.phone}
              onChange={(e) => updateDraft({ branding: { ...b, phone: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              value={b.email}
              onChange={(e) => updateDraft({ branding: { ...b, email: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <Input
              value={b.website}
              onChange={(e) => updateDraft({ branding: { ...b, website: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Address Line 1</FieldLabel>
            <Input
              value={b.addressLine1}
              onChange={(e) => updateDraft({ branding: { ...b, addressLine1: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Address Line 2</FieldLabel>
            <Input
              value={b.addressLine2}
              onChange={(e) => updateDraft({ branding: { ...b, addressLine2: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input
              value={b.city}
              onChange={(e) => updateDraft({ branding: { ...b, city: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>State</FieldLabel>
            <Input
              value={b.state}
              onChange={(e) => updateDraft({ branding: { ...b, state: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Pincode</FieldLabel>
            <Input
              value={b.pincode}
              onChange={(e) => updateDraft({ branding: { ...b, pincode: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px] font-mono"
            />
          </div>
        </div>
      </div>

      {/* Authorized signatory */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Authorized Signatory
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Signatory Name</FieldLabel>
            <Input
              value={b.signatoryName}
              onChange={(e) => updateDraft({ branding: { ...b, signatoryName: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Signatory Title</FieldLabel>
            <Input
              value={b.signatoryTitle}
              onChange={(e) => updateDraft({ branding: { ...b, signatoryTitle: e.target.value } })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Accent */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Accent Tone
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateDraft({ branding: { ...b, accent: "ink" } })}
            className={cn(
              "flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-[12px] font-medium transition-colors tap",
              b.accent === "ink" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent",
            )}
          >
            <span className="h-3 w-3 rounded-full bg-foreground border border-border" />
            Ink (default)
          </button>
          <button
            onClick={() => updateDraft({ branding: { ...b, accent: "muted" } })}
            className={cn(
              "flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-[12px] font-medium transition-colors tap",
              b.accent === "muted" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent",
            )}
          >
            <span className="h-3 w-3 rounded-full bg-muted-foreground border border-border" />
            Muted (soft)
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Monochrome only · no hues. &quot;Muted&quot; uses softer greys for backgrounds and secondary text.
        </p>
      </div>
    </div>
  );
}

// ============================================================
//   Field renderer
// ============================================================
function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: string;
  onChange: (v: string) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <div className="sm:col-span-2">
          <FieldLabel required={field.required} hint={field.hint}>{field.label}</FieldLabel>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[70px] rounded-[5px] text-[13px]"
          />
        </div>
      );
    case "select":
      return (
        <div>
          <FieldLabel required={field.required} hint={field.hint}>{field.label}</FieldLabel>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
              <SelectValue placeholder={field.placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-[13px]">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "date":
      return (
        <div>
          <FieldLabel required={field.required} hint={field.hint}>{field.label}</FieldLabel>
          <Input
            type="date"
            value={value ? value.slice(0, 10) : ""}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
            className="h-9 rounded-[5px] text-[13px]"
          />
        </div>
      );
    case "number":
      return (
        <div>
          <FieldLabel required={field.required} hint={field.hint}>{field.label}</FieldLabel>
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-9 rounded-[5px] text-[13px] tabular"
          />
        </div>
      );
    case "currency":
      return (
        <div>
          <FieldLabel required={field.required} hint={field.hint}>{field.label}</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder ?? "0"}
              className="h-9 rounded-[5px] pl-7 text-[13px] tabular"
            />
          </div>
          {value && parseFloat(value) > 0 && (
            <div className="mt-1 text-[10.5px] text-muted-foreground italic">
              {formatINR(value)}
            </div>
          )}
        </div>
      );
    default:
      return (
        <div>
          <FieldLabel required={field.required} hint={field.hint}>{field.label}</FieldLabel>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-9 rounded-[5px] text-[13px]"
          />
        </div>
      );
  }
}

// ============================================================
//   Line items editor
// ============================================================
function LineItemsEditor({
  tpl,
  items,
  taxRate,
  onChange,
}: {
  tpl: TemplateMeta;
  items: LineItemRow[];
  taxRate: number;
  onChange: (items: LineItemRow[], taxRate: number) => void;
}) {
  const lineItemField = tpl.fields.find((f) => f.type === "lineitems");
  const columns = lineItemField?.columns ?? [];
  // Payslip uses two pseudo-tables (earnings + deductions); treat all rows uniformly in editor
  const isPayslip = tpl.id === "payslip";

  const updateRow = (id: string, patch: Partial<LineItemRow>) => {
    const next = items.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      if (patch.qty !== undefined || patch.rate !== undefined) {
        updated.amount = Math.round((updated.qty ?? 0) * (updated.rate ?? 0) * 100) / 100;
      }
      return updated;
    });
    onChange(next, taxRate);
  };

  const addRow = () => {
    const id = `li-${Date.now()}`;
    const newRow: LineItemRow = { id, description: "", qty: 1, rate: 0, amount: 0 };
    if (tpl.taxEnabled) newRow.hsn = "";
    onChange([...items, newRow], taxRate);
  };

  const removeRow = (id: string) => {
    onChange(items.filter((r) => r.id !== id), taxRate);
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = tpl.taxEnabled ? Math.round((subtotal * taxRate) / 100) : 0;
  const total = subtotal + taxAmount;

  // For payslip: split earnings/deductions by id prefix ("e*" vs "d*").
  // Falls back to position-based split when ids aren't prefixed.
  const hasEPrefix = items.some((li) => li.id.startsWith("e"));
  const hasDPrefix = items.some((li) => li.id.startsWith("d"));
  let earningsRows: LineItemRow[] = items;
  let deductionRows: LineItemRow[] = [];
  if (isPayslip) {
    if (hasEPrefix || hasDPrefix) {
      earningsRows = items.filter((li) => li.id.startsWith("e"));
      deductionRows = items.filter((li) => li.id.startsWith("d"));
    } else {
      const splitAt = lineItemField?.defaultRows ?? 5;
      earningsRows = items.slice(0, splitAt);
      deductionRows = items.slice(splitAt);
    }
  }

  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {isPayslip ? "Earnings & Deductions" : "Line Items"}
        </div>
        <Btn variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addRow}>
          <span className="hidden sm:inline">Add Row</span>
        </Btn>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium" style={{ width: "36px" }}>#</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
                  style={{ width: c.width }}
                >
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider text-muted-foreground font-medium" style={{ width: "120px" }}>Amount</th>
              <th style={{ width: "32px" }} />
            </tr>
          </thead>
          <tbody>
            {isPayslip && earningsRows.length > 0 && (
              <>
                <tr className="border-b border-border bg-muted/30">
                  <td colSpan={columns.length + 3} className="px-2 py-1 text-[10px] uppercase tracking-wider text-foreground font-medium">
                    Earnings
                  </td>
                </tr>
                {earningsRows.map((li, i) => (
                  <LineItemRowEditor
                    key={li.id}
                    index={i + 1}
                    row={li}
                    columns={columns}
                    onUpdate={(patch) => updateRow(li.id, patch)}
                    onRemove={() => removeRow(li.id)}
                  />
                ))}
              </>
            )}
            {isPayslip && deductionRows.length > 0 && (
              <>
                <tr className="border-b border-border bg-muted/30">
                  <td colSpan={columns.length + 3} className="px-2 py-1 text-[10px] uppercase tracking-wider text-foreground font-medium">
                    Deductions
                  </td>
                </tr>
                {deductionRows.map((li, i) => (
                  <LineItemRowEditor
                    key={li.id}
                    index={earningsRows.length + i + 1}
                    row={li}
                    columns={columns}
                    onUpdate={(patch) => updateRow(li.id, patch)}
                    onRemove={() => removeRow(li.id)}
                  />
                ))}
              </>
            )}
            {!isPayslip && items.map((li, i) => (
              <LineItemRowEditor
                key={li.id}
                index={i + 1}
                row={li}
                columns={columns}
                onUpdate={(patch) => updateRow(li.id, patch)}
                onRemove={() => removeRow(li.id)}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={columns.length + 3} className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                  No line items yet. Click &quot;Add Row&quot; to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tax + totals */}
      {tpl.taxEnabled && (
        <div className="mt-3 flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">GST Rate (%)</span>
            <Input
              type="number"
              value={taxRate}
              onChange={(e) => onChange(items, parseFloat(e.target.value) || 0)}
              className="h-7 w-16 rounded-[5px] text-[12px] tabular"
            />
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-end">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular font-medium">{formatINR(subtotal)}</span>
          </div>
          {tpl.taxEnabled && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">GST @ {taxRate}%</span>
              <span className="tabular font-medium">{formatINR(taxAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-foreground pt-1 text-[13px]">
            <span className="font-semibold">Total</span>
            <span className="tabular font-semibold">{formatINR(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItemRowEditor({
  index,
  row,
  columns,
  onUpdate,
  onRemove,
}: {
  index: number;
  row: LineItemRow;
  columns: { key: string; label: string; type: "text" | "number" | "currency" }[];
  onUpdate: (patch: Partial<LineItemRow>) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-border">
      <td className="px-2 py-1 text-[11px] tabular text-muted-foreground">{index}</td>
      {columns.map((c) => (
        <td key={c.key} className="px-1 py-1">
          <Input
            type={c.type === "number" || c.type === "currency" ? "number" : "text"}
            value={(row as any)[c.key] ?? (c.type === "number" || c.type === "currency" ? 0 : "")}
            onChange={(e) => {
              const v = e.target.value;
              if (c.key === "qty") {
                onUpdate({ qty: parseFloat(v) || 0 });
              } else if (c.key === "rate") {
                onUpdate({ rate: parseFloat(v) || 0 });
              } else {
                onUpdate({ [c.key]: v } as Partial<LineItemRow>);
              }
            }}
            placeholder={c.label}
            className="h-8 rounded-[4px] text-[12px] tabular"
          />
        </td>
      ))}
      <td className="px-2 py-1 text-right text-[12px] tabular text-foreground">
        {formatINR(row.amount)}
      </td>
      <td className="px-1 py-1 text-center">
        <button
          onClick={onRemove}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors tap"
          aria-label="Remove row"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </td>
    </tr>
  );
}

// ============================================================
//   Step header
// ============================================================
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground bg-foreground text-[11px] font-medium text-background tabular">
        {step}
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[14px] font-medium tracking-tight text-foreground">{title}</h3>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ============================================================
//   Validation
// ============================================================
function validateContent(tpl: TemplateMeta, draft: BuilderDraft): string | null {
  for (const f of tpl.fields) {
    if (f.type === "lineitems") continue;
    if (f.required) {
      const v = draft.fields[f.id];
      if (!v || !v.trim()) return `${f.label} is required`;
    }
  }
  return null;
}

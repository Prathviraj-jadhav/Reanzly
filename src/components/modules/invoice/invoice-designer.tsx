"use client";

import { useState, useMemo, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Palette,
  FileText,
  Type,
  Eye,
  RotateCcw,
  Save,
  Sparkles,
  Building2,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Invoice } from "@/lib/types";
import {
  INVOICE_TEMPLATES,
  PAGE_FORMATS,
  ORIENTATIONS,
  ACCENT_CHOICES,
  FONT_CHOICES,
  DEFAULT_DESIGN_CONFIG,
  contactsForCustomer,
  contactById,
  formatDate,
  formatINR,
  type InvoiceDesignConfig,
  type InvoiceTemplateId,
  type SavedInvoiceTemplate,
  FieldLabel,
} from "./_helpers";

interface InvoiceDesignerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  /** Initial design config (current per-invoice design). */
  designConfig?: InvoiceDesignConfig;
  /** Apply the design to the invoice. */
  onApply?: (invoice: Invoice, config: InvoiceDesignConfig) => void;
  /** Save the current design as a reusable template. */
  onSaveTemplate?: (template: Omit<SavedInvoiceTemplate, "id">) => void;
}

export function InvoiceDesigner({
  open,
  onClose,
  invoice,
  designConfig,
  onApply,
  onSaveTemplate,
}: InvoiceDesignerProps) {
  const [config, setConfig] = useState<InvoiceDesignConfig>(
    designConfig ?? { ...DEFAULT_DESIGN_CONFIG },
  );
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");

  // Reset the local config whenever the drawer re-opens or the invoice
  // changes — so two invoices don't bleed settings into each other.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(designConfig ?? { ...DEFAULT_DESIGN_CONFIG });
    setSaveTplOpen(false);
    setTplName("");
    setTplDesc("");
  }, [open, invoice?.id, designConfig]);

  const update = <K extends keyof InvoiceDesignConfig>(
    k: K,
    v: InvoiceDesignConfig[K],
  ) => setConfig((s) => ({ ...s, [k]: v }));

  const updateSection = <K extends keyof InvoiceDesignConfig["sections"]>(
    k: K,
    v: boolean,
  ) =>
    setConfig((s) => ({
      ...s,
      sections: { ...s.sections, [k]: v },
    }));

  const handleApply = () => {
    if (!invoice) return;
    if (onApply) onApply(invoice, config);
    toast.success("Design applied", {
      description: `${invoice.invoiceNumber} · ${INVOICE_TEMPLATES.find((t) => t.id === config.template)?.label} · ${config.pageFormat} ${config.orientation}`,
    });
    onClose();
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_DESIGN_CONFIG });
    toast("Design reset to defaults");
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim()) {
      toast("Template name is required");
      return;
    }
    if (onSaveTemplate) {
      onSaveTemplate({
        name: tplName.trim(),
        description: tplDesc.trim() || "Custom template",
        designConfig: config,
        createdBy: "You",
        lastUsed: new Date().toISOString(),
      });
    }
    toast.success("Template saved", {
      description: `${tplName.trim()} · available from the Templates tab`,
    });
    setSaveTplOpen(false);
    setTplName("");
    setTplDesc("");
  };

  const customerContacts = useMemo(
    () => (invoice ? contactsForCustomer(invoice.customer) : []),
    [invoice],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-5xl flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Customize Invoice Design
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {invoice
                ? `${invoice.invoiceNumber} · ${invoice.customer}`
                : "Choose template, format, accent & sections"}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Body — split: controls | preview */}
        <div className="flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_1fr]">
            {/* Controls pane (scrollable) */}
            <div className="overflow-y-auto scrollbar-thin border-r border-border px-5 py-5">
              <div className="flex flex-col gap-5">
                {/* Template picker */}
                <DesignerSection
                  icon={<FileText className="h-4 w-4" />}
                  label="Template"
                  hint="Layout style"
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {INVOICE_TEMPLATES.map((t) => {
                      const active = config.template === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => update("template", t.id as InvoiceTemplateId)}
                          className={cn(
                            "flex flex-col items-start gap-1 rounded-[5px] border p-2.5 text-left transition-colors",
                            active
                              ? "border-foreground bg-foreground/5"
                              : "border-border hover:bg-accent/40",
                          )}
                        >
                          <TemplateThumb id={t.id} accent={config.accent} />
                          <span className="text-[12px] font-medium text-foreground">
                            {t.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.tagline}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </DesignerSection>

                {/* Page format + orientation */}
                <DesignerSection
                  icon={<Building2 className="h-4 w-4" />}
                  label="Page Format"
                  hint="Size & orientation"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 text-[12px]">Size</Label>
                      <RadioGroup
                        value={config.pageFormat}
                        onValueChange={(v) => update("pageFormat", v as InvoiceDesignConfig["pageFormat"])}
                        className="flex flex-col gap-1.5"
                      >
                        {PAGE_FORMATS.map((p) => (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-border px-2.5 py-1.5 hover:bg-accent/40 transition-colors"
                          >
                            <RadioGroupItem value={p.id} id={`pf-${p.id}`} />
                            <div className="flex flex-col">
                              <span className="text-[12px] font-medium text-foreground">
                                {p.label}
                              </span>
                              <span className="tabular text-[10px] text-muted-foreground">
                                {p.description}
                              </span>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label className="mb-1.5 text-[12px]">Orientation</Label>
                      <RadioGroup
                        value={config.orientation}
                        onValueChange={(v) => update("orientation", v as InvoiceDesignConfig["orientation"])}
                        className="flex flex-col gap-1.5"
                      >
                        {ORIENTATIONS.map((o) => (
                          <label
                            key={o.id}
                            className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-border px-2.5 py-1.5 hover:bg-accent/40 transition-colors"
                          >
                            <RadioGroupItem value={o.id} id={`or-${o.id}`} />
                            <span className="text-[12px] font-medium text-foreground">
                              {o.label}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </DesignerSection>

                {/* Accent + Font */}
                <DesignerSection
                  icon={<Palette className="h-4 w-4" />}
                  label="Accent & Font"
                  hint="Subtle accent only"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel hint="thin rule only">Accent</FieldLabel>
                      <Select
                        value={config.accent}
                        onValueChange={(v) => update("accent", v as InvoiceDesignConfig["accent"])}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCENT_CHOICES.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2 w-2 rounded-full border border-border"
                                  style={{ background: a.hex }}
                                />
                                <span>{a.label}</span>
                                <span className="text-muted-foreground">· {a.description}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Font</FieldLabel>
                      <Select
                        value={config.font}
                        onValueChange={(v) => update("font", v as InvoiceDesignConfig["font"])}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_CHOICES.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              <span>{f.label}</span>
                              <span className="ml-2 text-muted-foreground">· {f.description}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DesignerSection>

                {/* Letterhead + watermark */}
                <DesignerSection
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Header & Watermark"
                >
                  <div className="flex flex-col gap-3">
                    <ToggleRow
                      label="Show letterhead"
                      hint="Branded header with monogram"
                      checked={config.letterhead}
                      onChange={(v) => update("letterhead", v)}
                    />
                    <ToggleRow
                      label="Watermark"
                      hint="Overlaid text — e.g. DRAFT, PAID, COPY"
                      checked={config.watermark}
                      onChange={(v) => update("watermark", v)}
                    />
                    {config.watermark && (
                      <div className="ml-1">
                        <FieldLabel>Watermark text</FieldLabel>
                        <Input
                          value={config.watermarkText}
                          onChange={(e) =>
                            update("watermarkText", e.target.value.toUpperCase())
                          }
                          placeholder="DRAFT"
                          maxLength={20}
                          className="h-8 rounded-[5px] text-[12px] tabular uppercase"
                        />
                      </div>
                    )}
                  </div>
                </DesignerSection>

                {/* Section toggles */}
                <DesignerSection
                  icon={<FileText className="h-4 w-4" />}
                  label="Sections"
                  hint="Show / hide blocks"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ToggleRow compact label="Line items" checked={config.sections.lineItems} onChange={(v) => updateSection("lineItems", v)} />
                    <ToggleRow compact label="Totals" checked={config.sections.totals} onChange={(v) => updateSection("totals", v)} />
                    <ToggleRow compact label="Payment terms" checked={config.sections.paymentTerms} onChange={(v) => updateSection("paymentTerms", v)} />
                    <ToggleRow compact label="GST breakdown" checked={config.sections.gstBreakdown} onChange={(v) => updateSection("gstBreakdown", v)} />
                    <ToggleRow compact label="TCS" checked={config.sections.tcs} onChange={(v) => updateSection("tcs", v)} />
                    <ToggleRow compact label="TDS" checked={config.sections.tds} onChange={(v) => updateSection("tds", v)} />
                    <ToggleRow compact label="Notes" checked={config.sections.notes} onChange={(v) => updateSection("notes", v)} />
                    <ToggleRow compact label="Signature block" checked={config.sections.signature} onChange={(v) => updateSection("signature", v)} />
                  </div>
                </DesignerSection>

                {/* Footer message */}
                <DesignerSection
                  icon={<Type className="h-4 w-4" />}
                  label="Footer message"
                >
                  <Textarea
                    value={config.footerMessage}
                    onChange={(e) => update("footerMessage", e.target.value)}
                    placeholder="Custom footer line — terms, thank-you note, jurisdiction…"
                    className="min-h-[64px] rounded-[5px] text-[12px]"
                  />
                </DesignerSection>
              </div>
            </div>

            {/* Preview pane (sticky, scrollable) */}
            <div className="flex flex-col bg-muted/30">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  Live preview
                </div>
                <StatusBadge variant="outline">
                  {config.pageFormat} · {config.orientation}
                </StatusBadge>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                <InvoicePreview
                  invoice={invoice}
                  config={config}
                  contacts={customerContacts}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save-as-template inline panel */}
        {saveTplOpen && (
          <div className="border-t border-border bg-muted/40 px-5 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <FieldLabel required>Template name</FieldLabel>
                <Input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. Q4 B2B Tax Invoice"
                  className="h-8 rounded-[5px] text-[13px]"
                />
              </div>
              <div className="flex-1">
                <FieldLabel hint="optional">Description</FieldLabel>
                <Input
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  placeholder="Short note for the templates grid"
                  className="h-8 rounded-[5px] text-[12px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="ghost" onClick={() => setSaveTplOpen(false)}>
                  Cancel
                </Btn>
                <Btn
                  size="sm"
                  variant="primary"
                  icon={<Check className="h-3.5 w-3.5" />}
                  onClick={handleSaveTemplate}
                >
                  Save
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Btn
              variant="ghost"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleReset}
            >
              Reset
            </Btn>
            {!saveTplOpen && (
              <Btn
                variant="outline"
                icon={<Save className="h-3.5 w-3.5" />}
                onClick={() => setSaveTplOpen(true)}
              >
                Save as Template
              </Btn>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleApply}
              disabled={!invoice}
            >
              Apply Design
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Section wrapper =====
function DesignerSection({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

// ===== Toggle row =====
function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  compact,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-[5px] border border-border transition-colors hover:bg-accent/40",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
      )}
    >
      <div className="flex flex-col">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

// ===== Template thumbnail (mini SVG/CSS rendering) =====
function TemplateThumb({
  id,
  accent,
}: {
  id: InvoiceTemplateId;
  accent: InvoiceDesignConfig["accent"];
}) {
  const accentHex = ACCENT_CHOICES.find((a) => a.id === accent)?.hex ?? "#0a0a0a";
  // Each thumbnail is a stylized 56×72 mock of an A4 page.
  const accentRule = (
    <div
      className="h-[2px] w-full"
      style={{ background: accentHex }}
    />
  );
  return (
    <div className="flex h-[72px] w-full items-stretch overflow-hidden rounded-[3px] border border-border bg-background">
      <div className="flex flex-1 flex-col gap-[3px] p-1.5">
        {id === "classic" && (
          <>
            <div className="flex justify-between">
              <div className="h-1.5 w-8 rounded-[1px] bg-foreground/80" />
              <div className="h-1.5 w-6 rounded-[1px] bg-muted-foreground/60" />
            </div>
            {accentRule}
            <div className="mt-1 flex flex-col gap-[2px]">
              <div className="h-1 w-full rounded-[1px] bg-muted-foreground/30" />
              <div className="h-1 w-full rounded-[1px] bg-muted-foreground/30" />
              <div className="h-1 w-2/3 rounded-[1px] bg-muted-foreground/30" />
            </div>
            <div className="mt-auto h-1.5 w-1/2 self-end rounded-[1px] bg-foreground/80" />
          </>
        )}
        {id === "modern" && (
          <>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-[1px] bg-foreground" />
              <div className="flex-1">
                <div className="h-1 w-8 rounded-[1px] bg-foreground/70" />
                <div className="mt-[2px] h-1 w-6 rounded-[1px] bg-muted-foreground/50" />
              </div>
            </div>
            {accentRule}
            <div className="mt-1 grid grid-cols-3 gap-[2px]">
              <div className="h-1 rounded-[1px] bg-muted-foreground/30" />
              <div className="h-1 rounded-[1px] bg-muted-foreground/30" />
              <div className="h-1 rounded-[1px] bg-muted-foreground/30" />
            </div>
            <div className="mt-auto flex justify-end">
              <div className="h-1.5 w-8 rounded-[1px] bg-foreground" />
            </div>
          </>
        )}
        {id === "minimal" && (
          <>
            <div className="mt-2 h-1.5 w-10 rounded-[1px] bg-foreground" />
            <div className="mt-2 flex flex-col gap-[3px]">
              <div className="h-[2px] w-full bg-muted-foreground/20" />
              <div className="h-[2px] w-full bg-muted-foreground/20" />
              <div className="h-[2px] w-1/2 bg-muted-foreground/20" />
            </div>
            <div className="mt-auto h-1 w-1/3 self-end bg-foreground/70" />
          </>
        )}
        {id === "letterhead" && (
          <>
            <div className="flex items-center gap-1 border-b border-border pb-1">
              <div className="flex h-3 w-3 items-center justify-center rounded-[1px] bg-foreground text-[6px] font-bold text-background">
                RZ
              </div>
              <div className="h-1.5 w-8 rounded-[1px] bg-foreground/80" />
            </div>
            <div className="mt-1 flex flex-col gap-[2px]">
              <div className="h-1 w-full rounded-[1px] bg-muted-foreground/30" />
              <div className="h-1 w-2/3 rounded-[1px] bg-muted-foreground/30" />
            </div>
            <div className="mt-auto h-1.5 w-1/2 self-end rounded-[1px] bg-foreground/80" />
          </>
        )}
        {id === "tax-invoice" && (
          <>
            <div className="flex justify-between">
              <div className="h-1.5 w-8 rounded-[1px] bg-foreground/80" />
              <div className="h-1.5 w-4 rounded-[1px] bg-muted-foreground/60" />
            </div>
            {accentRule}
            <div className="mt-1 grid grid-cols-2 gap-[2px]">
              <div className="h-1 rounded-[1px] bg-muted-foreground/40" />
              <div className="h-1 rounded-[1px] bg-muted-foreground/30" />
              <div className="h-1 rounded-[1px] bg-muted-foreground/40" />
              <div className="h-1 rounded-[1px] bg-muted-foreground/30" />
            </div>
            <div className="mt-auto h-1.5 w-full rounded-[1px] bg-foreground/80" />
          </>
        )}
        {id === "proforma" && (
          <>
            <div className="h-1.5 w-6 rounded-[1px] bg-foreground/70" />
            <div className="mt-1 rounded-[1px] border border-dashed border-foreground/40 p-[2px]">
              <div className="h-1 w-full bg-muted-foreground/30" />
              <div className="mt-[2px] h-1 w-2/3 bg-muted-foreground/30" />
            </div>
            <div className="mt-auto h-1.5 w-1/2 self-end rounded-[1px] bg-foreground/80" />
          </>
        )}
      </div>
    </div>
  );
}

// ===== Live preview (HTML render of the invoice with the design) =====
function InvoicePreview({
  invoice,
  config,
  contacts,
}: {
  invoice: Invoice | null;
  config: InvoiceDesignConfig;
  contacts: ReturnType<typeof contactsForCustomer>;
}) {
  // Use a representative placeholder when no invoice is selected.
  const inv = invoice ?? {
    invoiceNumber: "RZ-INV-00001",
    customer: "Preview Customer",
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    amount: 48000,
    taxAmount: 8640,
    totalAmount: 56640,
    tripRef: "RZ-TRP-0042",
    igst: 8640,
    cgst: undefined,
    sgst: undefined,
  } as Invoice;

  const accentHex = ACCENT_CHOICES.find((a) => a.id === config.accent)?.hex ?? "#0a0a0a";
  const fontFamily =
    config.font === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : config.font === "mono"
        ? "var(--font-geist-mono), monospace"
        : "var(--font-geist-sans), system-ui, sans-serif";
  const tpl = INVOICE_TEMPLATES.find((t) => t.id === config.template);
  const pageWidth = config.orientation === "Landscape" ? "297mm" : "210mm";
  const pageHeight = config.orientation === "Landscape" ? "210mm" : "297mm";

  // Build line items (deterministic 1-3 rows for the preview).
  const seed = parseInt(inv.id?.replace(/\D/g, "") ?? "1") || 1;
  const numLines = (seed % 3) + 1;
  const lines = Array.from({ length: numLines }).map((_, i) => {
    const rate = Math.round((inv.amount / numLines) * (1 - i * 0.1));
    const amount = rate;
    const taxRate = 18;
    const taxAmount = Math.round((amount * taxRate) / 100);
    return { idx: i + 1, desc: ["Transport of goods - FTL", "Loading & unloading", "Door delivery"][i % 3], hsn: "996511", qty: 1, rate, amount, taxRate, taxAmount };
  });

  const assignedContact = contacts.find((c) => c.isPrimary) ?? contacts[0];

  return (
    <div className="mx-auto" style={{ maxWidth: "100%" }}>
      <div
        className="relative mx-auto overflow-hidden rounded-[3px] border border-border bg-background"
        style={{
          // Show a scaled page mock; aspect ratio matches the page format.
          aspectRatio:
            config.orientation === "Landscape" ? "297 / 210" : "210 / 297",
          fontFamily,
          // CSS var passthrough so the preview pane "feels" like paper.
          // Actual print rendering would use these dimensions.
          ["--rz-page-w" as string]: pageWidth,
          ["--rz-page-h" as string]: pageHeight,
        }}
      >
        {/* Accent rule at the very top (subtle, monochrome-friendly) */}
        <div
          className="h-[3px] w-full"
          style={{ background: accentHex }}
        />

        {/* Watermark */}
        {config.watermark && config.watermarkText && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="rotate-[-25deg] text-[44px] font-bold uppercase tracking-widest opacity-[0.08]"
              style={{ color: accentHex }}
            >
              {config.watermarkText}
            </span>
          </div>
        )}

        {/* Letterhead */}
        {config.letterhead && (
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-start gap-2">
              {config.template === "letterhead" && (
                <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-foreground text-[10px] font-bold text-background">
                  RZ
                </div>
              )}
              <div>
                <div className="text-[11px] font-semibold text-foreground">
                  Reanzly Logistics Pvt. Ltd.
                </div>
                <div className="text-[8px] leading-tight text-muted-foreground">
                  Plot 14, MIDC, Andheri East, Mumbai · GSTIN 27AABCR1234F1Z5
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {tpl?.label ?? "Invoice"}
              </div>
              <div className="tabular text-[10px] text-foreground">
                {inv.invoiceNumber}
              </div>
            </div>
          </div>
        )}

        {/* Bill-to + meta */}
        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          <div>
            <div className="mb-1 text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
              Bill To
            </div>
            <div className="text-[10px] font-medium text-foreground">
              {inv.customer}
            </div>
            {assignedContact && (
              <div className="text-[8px] text-muted-foreground">
                {assignedContact.name} · {assignedContact.role}
              </div>
            )}
            <div className="tabular text-[8px] text-muted-foreground">
              {assignedContact?.email ?? "accounts@customer.in"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] text-muted-foreground">
              Date: <span className="tabular text-foreground">{formatDate(inv.invoiceDate)}</span>
            </div>
            <div className="text-[8px] text-muted-foreground">
              Due: <span className="tabular text-foreground">{formatDate(inv.dueDate)}</span>
            </div>
            {config.sections.paymentTerms && (
              <div className="text-[8px] text-muted-foreground">Net 30</div>
            )}
            {inv.tripRef && (
              <div className="text-[8px] text-muted-foreground">
                Trip: <span className="tabular text-foreground">{inv.tripRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        {config.sections.lineItems && (
          <div className="px-4 pb-2">
            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1 text-left font-medium uppercase tracking-wider text-muted-foreground">Desc</th>
                  <th className="py-1 text-left font-medium uppercase tracking-wider text-muted-foreground">HSN</th>
                  <th className="py-1 text-right font-medium uppercase tracking-wider text-muted-foreground">Rate</th>
                  <th className="py-1 text-right font-medium uppercase tracking-wider text-muted-foreground">Tax</th>
                  <th className="py-1 text-right font-medium uppercase tracking-wider text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.idx} className="border-b border-border/60">
                    <td className="py-1 text-foreground">{l.desc}</td>
                    <td className="py-1 tabular text-muted-foreground">{l.hsn}</td>
                    <td className="py-1 text-right tabular">{formatINR(l.rate)}</td>
                    <td className="py-1 text-right tabular text-muted-foreground">{formatINR(l.taxAmount)}</td>
                    <td className="py-1 text-right tabular font-medium">{formatINR(l.amount + l.taxAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        {config.sections.totals && (
          <div className="flex justify-end px-4 py-2">
            <div className="w-1/2 space-y-[2px] text-[9px]">
              <Row label="Subtotal" value={formatINR(inv.amount)} />
              {config.sections.gstBreakdown &&
                (inv.igst !== undefined ? (
                  <Row label="IGST 18%" value={formatINR(inv.igst ?? 0)} />
                ) : (
                  <>
                    <Row label="CGST 9%" value={formatINR(inv.cgst ?? 0)} />
                    <Row label="SGST 9%" value={formatINR(inv.sgst ?? 0)} />
                  </>
                ))}
              {config.sections.tds && (
                <Row label="TDS 2%" value={`-${formatINR(Math.round(inv.amount * 0.02))}`} muted />
              )}
              {config.sections.tcs && (
                <Row label="TCS 1%" value={formatINR(Math.round(inv.amount * 0.01))} muted />
              )}
              <div
                className="flex items-center justify-between border-t pt-[2px] text-[10px] font-semibold"
                style={{ borderColor: accentHex }}
              >
                <span>Total</span>
                <span className="tabular">{formatINR(inv.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes & signature */}
        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border px-4 py-2">
          {config.sections.notes && (
            <div>
              <div className="mb-0.5 text-[7px] font-medium uppercase tracking-wider text-muted-foreground">
                Notes
              </div>
              <p className="text-[8px] leading-tight text-muted-foreground">
                {config.footerMessage}
              </p>
            </div>
          )}
          {config.sections.signature && (
            <div className="text-right">
              <div className="mb-0.5 text-[7px] font-medium uppercase tracking-wider text-muted-foreground">
                Authorised Signatory
              </div>
              <div className="text-[8px] text-foreground">Rohit Deshpande</div>
              <div className="text-[7px] text-muted-foreground">Director - Operations</div>
            </div>
          )}
        </div>

        {/* Footer rule */}
        <div
          className="h-[2px] w-full opacity-30"
          style={{ background: accentHex }}
        />
      </div>

      {/* Caption below preview */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Banknote className="h-3 w-3" />
          {inv.invoiceNumber} · {inv.customer}
        </span>
        <span className="tabular">
          {tpl?.label} · {config.pageFormat} {config.orientation}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

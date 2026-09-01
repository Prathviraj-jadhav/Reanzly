"use client";

import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Sparkles,
  RotateCcw,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useDocStudioStore } from "./_store";
import { DEFAULT_BRANDING, type BrandingConfig } from "./_data";
import { FieldLabel } from "./_helpers";
import { cn } from "@/lib/utils";

interface BrandingSettingsProps {
  onBack: () => void;
}

export function BrandingSettings({ onBack }: BrandingSettingsProps) {
  const branding = useDocStudioStore((s) => s.branding);
  const setBranding = useDocStudioStore((s) => s.setBranding);

  const update = (patch: Partial<BrandingConfig>) => setBranding(patch);

  const handleSave = () => {
    toast.success("Branding defaults saved", {
      description: "All new documents will inherit these settings.",
    });
    onBack();
  };

  const handleReset = () => {
    setBranding({ ...DEFAULT_BRANDING });
    toast("Branding reset to defaults");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground hover:bg-accent transition-colors tap"
            aria-label="Back to studio"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Settings</span>
            <h2 className="text-[15px] font-medium tracking-tight text-foreground">
              Branding Defaults
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={handleReset}>
            <span className="hidden sm:inline">Reset</span>
          </Btn>
          <Btn variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave}>
            Save Defaults
          </Btn>
        </div>
      </div>

      {/* Created by Reanzly global toggle */}
      <div className="rounded-[6px] border border-foreground bg-foreground/[0.02] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border bg-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[14px] font-medium text-foreground">
                &quot;Created by Reanzly&quot; Default
              </div>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground max-w-lg">
                Set the global default for the Reanzly attribution on every new document.
                When ON, all documents carry the &quot;Created by Reanzly&quot; watermark in the footer.
                When OFF, documents are white-labeled by default. Individual documents can override this in the Branding step of the builder, or via the toggle on the preview screen.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                <span>Applies to: offer letters, certifications, bills, invoices, quotations, POs, delivery notes, NOCs, payslips, and every other document type.</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={branding.reanzlyBranded}
              onCheckedChange={(v) => update({ reanzlyBranded: v })}
              aria-label="Toggle Created by Reanzly default"
            />
            <span className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              branding.reanzlyBranded ? "text-foreground" : "text-muted-foreground",
            )}>
              {branding.reanzlyBranded ? "Branded" : "White-label"}
            </span>
          </div>
        </div>
      </div>

      {/* Company identity */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-foreground">
            Company Identity
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2">
            <FieldLabel>Company Name</FieldLabel>
            <Input
              value={branding.companyName}
              onChange={(e) => update({ companyName: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel hint="2-3 chars">Monogram (Logo)</FieldLabel>
            <Input
              value={branding.monogram}
              maxLength={3}
              onChange={(e) => update({ monogram: e.target.value.toUpperCase() })}
              className="h-9 rounded-[5px] text-[13px] font-mono"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel>Legal Name</FieldLabel>
            <Input
              value={branding.legalName}
              onChange={(e) => update({ legalName: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>GSTIN</FieldLabel>
            <Input
              value={branding.gstin}
              onChange={(e) => update({ gstin: e.target.value.toUpperCase() })}
              className="h-9 rounded-[5px] text-[13px] font-mono"
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input
              value={branding.phone}
              onChange={(e) => update({ phone: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              value={branding.email}
              onChange={(e) => update({ email: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <Input
              value={branding.website}
              onChange={(e) => update({ website: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Address block */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-foreground">
          Registered Address
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel>Address Line 1</FieldLabel>
            <Input
              value={branding.addressLine1}
              onChange={(e) => update({ addressLine1: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <FieldLabel hint="Optional">Address Line 2</FieldLabel>
            <Input
              value={branding.addressLine2}
              onChange={(e) => update({ addressLine2: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input
              value={branding.city}
              onChange={(e) => update({ city: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>State</FieldLabel>
            <Input
              value={branding.state}
              onChange={(e) => update({ state: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Pincode</FieldLabel>
            <Input
              value={branding.pincode}
              onChange={(e) => update({ pincode: e.target.value })}
              className="h-9 rounded-[5px] text-[13px] font-mono"
            />
          </div>
        </div>
      </div>

      {/* Authorized signatory */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-foreground">
          Authorized Signatory
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Signatory Name</FieldLabel>
            <Input
              value={branding.signatoryName}
              onChange={(e) => update({ signatoryName: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Signatory Title</FieldLabel>
            <Input
              value={branding.signatoryTitle}
              onChange={(e) => update({ signatoryTitle: e.target.value })}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Accent tone */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-foreground">
          Accent Tone (Monochrome Only)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => update({ accent: "ink" })}
            className={cn(
              "flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-[12px] font-medium transition-colors tap",
              branding.accent === "ink" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent",
            )}
          >
            <span className="h-3 w-3 rounded-full bg-foreground border border-border" />
            Ink (default)
          </button>
          <button
            onClick={() => update({ accent: "muted" })}
            className={cn(
              "flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-[12px] font-medium transition-colors tap",
              branding.accent === "muted" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent",
            )}
          >
            <span className="h-3 w-3 rounded-full bg-muted-foreground border border-border" />
            Muted (soft)
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          No hues allowed · strictly black/white/grey. &quot;Muted&quot; softens background fills and secondary text.
        </p>
      </div>

      {/* Footer save bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <div className="text-[11px] text-muted-foreground">
          Defaults apply to all new documents. Existing documents retain their snapshot.
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={handleReset}>
            <span className="hidden sm:inline">Reset</span>
          </Btn>
          <Btn variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave}>
            Save Defaults
          </Btn>
        </div>
      </div>
    </div>
  );
}

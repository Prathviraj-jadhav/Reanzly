"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  usePartnerStore,
  PARTNER_TIER_NAMES,
  type PartnerTier,
} from "@/lib/store/partner-store";
import { PARTNER_TIERS } from "./_data";
import { FieldLabel } from "./_helpers";

interface ApplyPartnerDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a tier - e.g. when opened from a specific row in the tier
   *  comparison table. */
  presetTier?: PartnerTier;
}

interface FormState {
  tier: PartnerTier;
  expectedMonthlyReferrals: string;
  notes: string;
}

function emptyForm(presetTier?: PartnerTier): FormState {
  return {
    tier: presetTier ?? "Reseller Partner",
    expectedMonthlyReferrals: "",
    notes: "",
  };
}

export function ApplyPartnerDrawer({ open, onClose, presetTier }: ApplyPartnerDrawerProps) {
  const apply = usePartnerStore((s) => s.apply);
  const [form, setForm] = useState<FormState>(() => emptyForm(presetTier));

  // Reset the form each time the drawer opens, honouring a preset tier.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      setForm(emptyForm(presetTier));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, presetTier]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const selectedTierDef = PARTNER_TIERS.find((t) => t.id === form.tier);

  const handleSubmit = () => {
    const volume = Number(form.expectedMonthlyReferrals);
    if (!form.expectedMonthlyReferrals || isNaN(volume) || volume <= 0) {
      toast("Expected monthly referral volume must be greater than zero");
      return;
    }
    if (!form.notes.trim()) {
      toast("Tell us a little about how you plan to refer customers");
      return;
    }
    apply({
      tier: form.tier,
      expectedMonthlyReferrals: volume,
      notes: form.notes.trim(),
    });
    toast.success("Application submitted", {
      description: `${form.tier} · Reanzly's partnerships team typically responds within 2 business days`,
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Apply to the Partner Programme
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Tell us about your business - we'll review and get back to you within 2 business days.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4">
              <div>
                <FieldLabel required>Which tier are you applying for?</FieldLabel>
                <Select value={form.tier} onValueChange={(v) => update("tier", v as PartnerTier)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTNER_TIER_NAMES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTierDef && (
                <div className="rounded-[5px] border border-dashed border-border bg-background px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-foreground">
                      {selectedTierDef.commissionLabel}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{selectedTierDef.tagline}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    {selectedTierDef.commissionDetail}
                  </p>
                </div>
              )}
              <div>
                <FieldLabel required hint="companies / month">Expected Monthly Referral Volume</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={form.expectedMonthlyReferrals}
                  onChange={(e) => update("expectedMonthlyReferrals", e.target.value)}
                  placeholder="e.g. 4"
                  className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
                />
              </div>
              <div>
                <FieldLabel required hint="max 500 characters">Tell us about your business</FieldLabel>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value.slice(0, 500))}
                  placeholder="How do you work with logistics businesses today, and how do you plan to bring them onto Reanzly?"
                  className="min-h-[100px] text-[13px]"
                />
                <div className="mt-1 text-right text-[10px] text-muted-foreground tabular">
                  {form.notes.length}/500
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              By applying, you agree to Reanzly's Partner Programme terms. Applications are reviewed by the
              partnerships team - approval isn't automatic and depends on fit with the tier's requirements.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
            Submit Application
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

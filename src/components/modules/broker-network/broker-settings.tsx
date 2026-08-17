"use client";

import { useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Percent,
  Calendar,
  Receipt,
  MapPin,
  Plus,
  X,
  Check,
  RotateCcw,
  Save,
  ShieldCheck,
  Info,
  Building2,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { useBrokerProfileData } from "./use-broker-profile-data";
import {
  SETTLEMENT_CYCLE_TYPES,
  GST_TREATMENTS,
  DEFAULT_MARKUP_PCT,
  DEFAULT_COVERAGE_LANES,
  type SettlementCycleType,
  type GstTreatment,
  formatINR,
  resaleRate,
} from "./_helpers";

/* ============================================================
   BrokerSettings - the broker's commercial profile settings.
   ------------------------------------------------------------
   Markup %, settlement cycle, GST treatment, coverage lanes.
   Drives the rate card, settlement runs, and enquiry routing.
   ============================================================ */

interface BrokerSettingsForm {
  brokerCode: string;
  markupPct: number;
  settlementCycle: SettlementCycleType;
  gstTreatment: GstTreatment;
  coverageLanes: string[];
  // Org-level identity (display only - drives the directory listing).
  brokerageName: string;
  parentBroker: string;
  gstin: string;
  registeredState: string;
}

const FALLBACK: BrokerSettingsForm = {
  brokerCode: "RZ-BRK-001",
  markupPct: DEFAULT_MARKUP_PCT,
  settlementCycle: "Fortnightly",
  gstTreatment: "Forward Charge",
  coverageLanes: DEFAULT_COVERAGE_LANES,
  brokerageName: "Reanzly Broker Network - Mumbai Hub",
  parentBroker: "Reanzly HQ (direct)",
  gstin: "",
  registeredState: "Maharashtra",
};

function formFromProfile(bp: ReturnType<typeof useBrokerProfileData>["profile"]): BrokerSettingsForm {
  if (!bp) return FALLBACK;
  return {
    brokerCode: bp.brokerCode,
    markupPct: bp.markupPct,
    settlementCycle: bp.settlementCycle,
    gstTreatment: bp.gstTreatment,
    coverageLanes: bp.coverageLanes,
    brokerageName: bp.companyName,
    parentBroker: bp.parentBrokerId ?? "Reanzly HQ (direct)",
    gstin: bp.gstin ?? "",
    registeredState: FALLBACK.registeredState,
  };
}

export function BrokerSettings() {
  const { profile, laneRates, updateProfile } = useBrokerProfileData();

  const [form, setForm] = useState<BrokerSettingsForm>(FALLBACK);
  const [laneDraft, setLaneDraft] = useState("");
  const [dirty, setDirty] = useState(false);

  // Load the real saved form once the profile arrives.
  useEffect(() => {
    if (profile) setForm(formFromProfile(profile));
  }, [profile]);

  const set = <K extends keyof BrokerSettingsForm>(k: K, v: BrokerSettingsForm[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const addLane = () => {
    const v = laneDraft.trim();
    if (!v) return;
    if (form.coverageLanes.includes(v)) {
      toast("Lane already in coverage");
      return;
    }
    set("coverageLanes", [...form.coverageLanes, v]);
    setLaneDraft("");
  };

  const removeLane = (lane: string) => {
    set(
      "coverageLanes",
      form.coverageLanes.filter((l) => l !== lane),
    );
  };

  const save = async () => {
    const ok = await updateProfile({
      markupPct: form.markupPct,
      settlementCycle: form.settlementCycle,
      gstTreatment: form.gstTreatment,
      coverageLanes: form.coverageLanes,
      companyName: form.brokerageName,
      gstin: form.gstin,
    });
    if (ok) {
      setDirty(false);
      toast.success("Settings saved", {
        description: `Markup ${form.markupPct}% - ${form.settlementCycle} cycle - ${form.coverageLanes.length} coverage lanes.`,
      });
    }
  };

  const reset = () => {
    setForm(formFromProfile(profile));
    setDirty(false);
    toast("Settings reverted to last saved values");
  };

  // Derived: avg resale rate at current markup.
  const avgResale = laneRates.length
    ? Math.round(laneRates.reduce((s, l) => s + resaleRate(l.baseRatePerKm, form.markupPct), 0) / laneRates.length)
    : 0;

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Commercial profile for your brokerage. Drives the rate card, settlement runs, and enquiry routing on the marketplace.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Broker code</span>
                <span className="font-medium text-foreground tabular">{form.brokerCode}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Markup</span>
                <span className="font-medium text-foreground tabular">{form.markupPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Cycle</span>
                <span className="font-medium text-foreground">{form.settlementCycle}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge variant={dirty ? "solid" : "outline"} pulse={dirty}>
                  {dirty ? "Unsaved changes" : "Saved"}
                </StatusBadge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset} disabled={!dirty}>
              Revert
            </Btn>
            <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={save} disabled={!dirty}>
              Save changes
            </Btn>
          </div>
        </div>
      </div>

      {/* Commercial settings */}
      <SectionCard
        title="Commercial settings"
        description="Your markup, settlement cycle, and GST treatment. These apply across every lane and sub-broker."
        icon={<Percent className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Markup */}
          <Field label="Markup %" required hint="0 - 50">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={form.markupPct}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!isNaN(v)) set("markupPct", Math.max(0, Math.min(50, v)));
                }}
                className="h-9 w-24 rounded-[5px] text-[13px] tabular"
              />
              <span className="text-[12px] text-muted-foreground">
                avg resale <span className="font-medium text-foreground tabular">{formatINR(avgResale)}/km</span>
              </span>
            </div>
            {/* Quick presets */}
            <div className="mt-2 flex items-center gap-1 rounded-[5px] border border-border bg-muted/30 p-0.5 w-fit">
              {[5, 8, 10, 12, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("markupPct", m)}
                  className={
                    "tap inline-flex h-6 items-center rounded-[3px] px-2 text-[11px] font-medium transition-colors " +
                    (form.markupPct === m
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {m}%
                </button>
              ))}
            </div>
          </Field>

          {/* Settlement cycle */}
          <Field label="Settlement cycle" hint="commission run frequency">
            <Select
              value={form.settlementCycle}
              onValueChange={(v) => set("settlementCycle", v as SettlementCycleType)}
            >
              <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SETTLEMENT_CYCLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* GST treatment */}
          <Field label="GST treatment" hint="forward vs reverse charge">
            <Select
              value={form.gstTreatment}
              onValueChange={(v) => set("gstTreatment", v as GstTreatment)}
            >
              <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GST_TREATMENTS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Inline tip */}
        <div className="mt-4 flex items-start gap-2 rounded-[5px] border border-border bg-muted/30 p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Markup changes apply on the next rate card publication. Settlement cycle changes take effect from the next cycle run. GST treatment changes require a fresh GSTIN verification.
          </p>
        </div>
      </SectionCard>

      {/* Coverage lanes */}
      <SectionCard
        title="Coverage lanes"
        description="Lanes you actively resell on. Reanzly routes matching enquiries to you based on this list."
        icon={<MapPin className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {form.coverageLanes.map((lane) => (
            <span
              key={lane}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-foreground"
            >
              {lane}
              <button
                onClick={() => removeLane(lane)}
                className="tap flex h-4 w-4 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`Remove ${lane}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {form.coverageLanes.length === 0 && (
            <span className="text-[12px] text-muted-foreground">No lanes declared yet - add one below.</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Input
            value={laneDraft}
            onChange={(e) => setLaneDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLane();
              }
            }}
            placeholder="Add a lane (e.g. Mumbai - Nagpur)"
            className="h-9 min-w-[200px] flex-1 rounded-[5px] text-[13px]"
          />
          <Btn variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={addLane}>
            Add lane
          </Btn>
        </div>
        {/* Suggested lanes from the rate card not yet in coverage */}
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Suggested lanes (from Reanzly rate card)
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {laneRates.filter((l) => !form.coverageLanes.includes(l.lane)).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => set("coverageLanes", [...form.coverageLanes, l.lane])}
                className="tap inline-flex items-center gap-1 rounded-[5px] border border-dashed border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                {l.lane}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Brokerage identity */}
      <SectionCard
        title="Brokerage identity"
        description="Legal entity details. Drives your directory listing + GST invoices."
        icon={<Building2 className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brokerage name" required>
            <Input
              value={form.brokerageName}
              onChange={(e) => set("brokerageName", e.target.value)}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </Field>
          <Field label="Broker code" hint="auto-assigned, read-only">
            <Input
              value={form.brokerCode}
              readOnly
              className="h-9 rounded-[5px] text-[13px] tabular text-muted-foreground"
            />
          </Field>
          <Field label="Parent broker" hint="who onboarded you">
            <Input
              value={form.parentBroker}
              readOnly
              className="h-9 rounded-[5px] text-[13px] text-muted-foreground"
            />
          </Field>
          <Field label="GSTIN" required mono>
            <Input
              value={form.gstin}
              onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              maxLength={15}
              className="h-9 rounded-[5px] text-[13px] tabular"
            />
          </Field>
          <Field label="Registered state">
            <Input
              value={form.registeredState}
              onChange={(e) => set("registeredState", e.target.value)}
              className="h-9 rounded-[5px] text-[13px]"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Sticky footer save bar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <StatusBadge variant={dirty ? "solid" : "outline"} pulse={dirty}>
            {dirty ? "Unsaved" : "Saved"}
          </StatusBadge>
          {dirty && <span>Changes apply on next rate card publication.</span>}
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset} disabled={!dirty}>
            Revert
          </Btn>
          <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={save} disabled={!dirty}>
            Save changes
          </Btn>
        </div>
      </div>

      {/* Compliance footer info */}
      <SectionCard
        title="Compliance & security"
        description="Your brokerage is governed by these policies."
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ComplianceTile icon={Receipt} label="GST filing" value="Monthly" hint="GSTR-1 + GSTR-3B" />
          <ComplianceTile icon={Calendar} label="TDS deduction" value="1% on commission" hint="u/s 194H" />
          <ComplianceTile icon={Handshake} label="NACH mandate" value="Active" hint="UMR verified" />
          <ComplianceTile icon={ShieldCheck} label="DPDP compliance" value="Verified" hint="data residency: India" />
        </div>
      </SectionCard>
    </div>
  );
}

/* ===== Local UI helpers ===== */

function Field({
  label,
  required,
  hint,
  mono,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className={"text-[12px] font-medium text-foreground " + (mono ? "tabular" : "")}>
          {label}
          {required && <span className="ml-0.5 text-foreground">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ComplianceTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Check className="h-3 w-3 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground">{value}</span>
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground tabular">{hint}</div>}
    </div>
  );
}

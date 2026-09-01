"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Handshake, ChevronDown, Check, ArrowRight, ArrowLeft, User, Banknote,
  Tags, Plus, X, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  REANZLY_LANE_RATES,
  SETTLEMENT_CYCLE_TYPES,
  GST_TREATMENTS,
  DEFAULT_MARKUP_PCT,
  type SettlementCycleType,
  type GstTreatment,
  nextBrokerCode,
  FieldLabel,
} from "./_helpers";

/** The broker record produced by the wizard. Consumed by the parent to
 *  prepend to its sub-brokers list. */
export interface OnboardedBroker {
  name: string;
  brokerCode: string;
  contactName: string;
  email: string;
  phone: string;
  markupPct: number;
  coverageLanes: string[];
  settlementCycle: SettlementCycleType;
  gstTreatment: GstTreatment;
  gstin: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Used to auto-generate the broker code as RZSB-XXX. */
  existingCount: number;
  /** Called when the wizard completes. Parent prepends to its list. */
  onOnboarded: (b: OnboardedBroker) => void;
}

const STEPS = [
  { id: 1, label: "Identity", icon: User },
  { id: 2, label: "Commercial", icon: Banknote },
  { id: 3, label: "Review", icon: ShieldCheck },
] as const;

export function BrokerOnboardingDialog({ open, onOpenChange, existingCount, onOnboarded }: Props) {
  // Use a key-based remount strategy in the parent (broker-console passes
  // `open` directly) so state initialises from props in useState's
  // initializer - no setState-in-useMemo anti-pattern.
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 - identity
  const [name, setName] = useState("");
  const [brokerCode] = useState<string>(nextBrokerCode(existingCount));
  const [gstin, setGstin] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 - commercial
  const [markupPct, setMarkupPct] = useState<string>(String(DEFAULT_MARKUP_PCT));
  const [settlementCycle, setSettlementCycle] = useState<SettlementCycleType>("Fortnightly");
  const [gstTreatment, setGstTreatment] = useState<GstTreatment>("Forward Charge");
  const [coverageLanes, setCoverageLanes] = useState<string[]>(
    REANZLY_LANE_RATES.slice(0, 2).map((l) => l.lane),
  );

  // ===== Validation =====
  const step1Valid = name.trim() && gstin.trim() && contactName.trim() && email.trim() && phone.trim();
  const step2Valid = coverageLanes.length > 0 && markupPct !== "";

  const close = () => onOpenChange(false);

  const resetAndClose = () => {
    // Reset wizard to step 1 on close so reopening starts fresh.
    setStep(1);
    setName("");
    setGstin("");
    setContactName("");
    setEmail("");
    setPhone("");
    setMarkupPct(String(DEFAULT_MARKUP_PCT));
    setSettlementCycle("Fortnightly");
    setGstTreatment("Forward Charge");
    setCoverageLanes(REANZLY_LANE_RATES.slice(0, 2).map((l) => l.lane));
    close();
  };

  const handleOnboard = () => {
    if (!step1Valid || !step2Valid) {
      toast("Please complete all required fields");
      return;
    }
    onOnboarded({
      name: name.trim(),
      brokerCode,
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      markupPct: Number(markupPct) || DEFAULT_MARKUP_PCT,
      coverageLanes,
      settlementCycle,
      gstTreatment,
      gstin: gstin.trim(),
    });
    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-medium tracking-tight">
            <Handshake className="h-4 w-4" /> Onboard a broker
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Add a sub-broker to your network. They will resell Reanzly capacity under their own brand at their own markup.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 border-b border-border px-5 py-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex flex-1 items-center gap-1">
                <button
                  onClick={() => {
                    // Allow going back to earlier steps; going forward requires validation.
                    if (s.id < step) setStep(s.id);
                  }}
                  className={
                    "flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[12px] font-medium transition-colors " +
                    (isActive
                      ? "bg-foreground text-background"
                      : isDone
                        ? "text-foreground hover:bg-accent"
                        : "text-muted-foreground")
                  }
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className={
                    "flex h-5 w-5 items-center justify-center rounded-[3px] text-[11px] tabular " +
                    (isActive ? "bg-background/20 text-background" : isDone ? "bg-foreground text-background" : "bg-muted text-muted-foreground")
                  }>
                    {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </span>
                  <span>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="h-px flex-1 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step body */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin px-5 py-4">
          {step === 1 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required>Broker / company name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Patel Freight Links"
                  className="h-8 rounded-[5px] text-[13px]"
                />
              </div>
              <div>
                <FieldLabel hint="auto-generated">Broker code</FieldLabel>
                <Input
                  value={brokerCode}
                  readOnly
                  className="h-8 rounded-[5px] text-[13px] tabular bg-muted/30 border-border"
                />
              </div>
              <div>
                <FieldLabel required>GSTIN</FieldLabel>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="27ABCDE1234F1Z5"
                  maxLength={15}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <FieldLabel required>Contact name</FieldLabel>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Rakesh Patel"
                  className="h-8 rounded-[5px] text-[13px]"
                />
              </div>
              <div>
                <FieldLabel required>Phone</FieldLabel>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel required>Email</FieldLabel>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rakesh@patelfreight.in"
                  type="email"
                  className="h-8 rounded-[5px] text-[13px]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required hint="over Reanzly base">Markup %</FieldLabel>
                <Input
                  value={markupPct}
                  onChange={(e) => setMarkupPct(e.target.value)}
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  className="h-8 rounded-[5px] text-[13px] tabular"
                />
              </div>
              <div>
                <FieldLabel required>Settlement cycle</FieldLabel>
                <Select value={settlementCycle} onValueChange={(v) => setSettlementCycle(v as SettlementCycleType)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTLEMENT_CYCLE_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel required>GST treatment</FieldLabel>
                <Select value={gstTreatment} onValueChange={(v) => setGstTreatment(v as GstTreatment)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_TREATMENTS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel required hint={`${coverageLanes.length} selected`}>Coverage lanes</FieldLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-8 w-full items-center justify-between gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[13px] font-medium text-foreground hover:bg-accent transition-colors">
                      <span className="truncate">
                        {coverageLanes.length === 0
                          ? "Select lanes..."
                          : coverageLanes.length === 1
                            ? coverageLanes[0]
                            : `${coverageLanes.length} lanes selected`}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[260px] w-[280px] overflow-y-auto scrollbar-thin">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Toggle coverage lanes
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {REANZLY_LANE_RATES.map((l) => (
                      <DropdownMenuCheckboxItem
                        key={l.id}
                        checked={coverageLanes.includes(l.lane)}
                        onCheckedChange={(checked) => {
                          setCoverageLanes((prev) =>
                            checked ? [...prev, l.lane] : prev.filter((x) => x !== l.lane),
                          );
                        }}
                        className="text-[13px]"
                      >
                        {l.lane}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Selected lanes as chips */}
                {coverageLanes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {coverageLanes.map((lane) => (
                      <span
                        key={lane}
                        className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                      >
                        {lane}
                        <button
                          onClick={() => setCoverageLanes((prev) => prev.filter((x) => x !== lane))}
                          className="tap flex h-3.5 w-3.5 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label={`Remove ${lane}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <div className="rounded-[6px] border border-border bg-muted/30 px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Identity</div>
                <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-2">
                  <ReviewRow label="Name" value={name || "-"} />
                  <ReviewRow label="Broker code" value={brokerCode} mono />
                  <ReviewRow label="GSTIN" value={gstin || "-"} mono />
                  <ReviewRow label="Contact" value={contactName || "-"} />
                  <ReviewRow label="Phone" value={phone || "-"} mono />
                  <ReviewRow label="Email" value={email || "-"} />
                </div>
              </div>
              <div className="rounded-[6px] border border-border bg-muted/30 px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Commercial</div>
                <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-2">
                  <ReviewRow label="Markup" value={`${markupPct || "0"}%`} mono />
                  <ReviewRow label="Settlement" value={settlementCycle} />
                  <ReviewRow label="GST treatment" value={gstTreatment} />
                  <ReviewRow label="Coverage lanes" value={`${coverageLanes.length} lane${coverageLanes.length === 1 ? "" : "s"}`} mono />
                </div>
                {coverageLanes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                    {coverageLanes.map((lane) => (
                      <span key={lane} className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                        <Tags className="h-3 w-3 text-muted-foreground" /> {lane}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 rounded-[6px] border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Onboarding creates a Pending sub-broker. They get an invite email and appear in your Broker Console. Verify their GSTIN before approving to Active.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border px-5 py-3 sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular">Step {step} of {STEPS.length}</span>
            {step === 1 && <StatusBadge variant="muted">Identity</StatusBadge>}
            {step === 2 && <StatusBadge variant="muted">Commercial</StatusBadge>}
            {step === 3 && <StatusBadge variant="solid" pulse>Ready to onboard</StatusBadge>}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Btn variant="ghost" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}>
                Back
              </Btn>
            )}
            {step < 3 && (
              <Btn
                variant="primary"
                iconRight={<ArrowRight className="h-3.5 w-3.5" />}
                disabled={step === 1 ? !step1Valid : !step2Valid}
                onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
              >
                Continue
              </Btn>
            )}
            {step === 3 && (
              <Btn
                variant="primary"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleOnboard}
              >
                Onboard broker
              </Btn>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={"text-right font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}

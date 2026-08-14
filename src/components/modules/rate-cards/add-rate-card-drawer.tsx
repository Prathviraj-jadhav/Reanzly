"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput } from "@/components/shared/savage-input";
import { toast } from "sonner";
import { X, Check, Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import type { RateCard, RateCardSurcharge as Surcharge } from "@/lib/types";
import {
  VEHICLE_TYPES,
  LOAD_TYPES,
  RATE_CALC_TYPES,
  RATE_CARD_STATUSES,
  type VehicleType,
  type LoadType,
  type RateCalculationType,
  type RateCardStatus,
  type RateCardPayload,
  FieldLabel,
} from "./_helpers";

interface AddRateCardDrawerProps {
  open: boolean;
  onClose: () => void;
  /** When provided the drawer operates in edit mode for this rate card. */
  record?: RateCard;
  onCreate?: (payload: RateCardPayload) => Promise<boolean>;
  onUpdate?: (id: string, patch: Partial<RateCardPayload>) => Promise<boolean>;
}

interface FormState {
  name: string;
  source: string;
  destination: string;
  vehicleType: VehicleType;
  loadType: LoadType;
  rateType: RateCalculationType;
  baseRate: string;
  surcharges: Surcharge[];
  detentionPerDay: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: RateCardStatus;
  gstApplicable: boolean;
  gstRate: string;
}

function emptyForm(): FormState {
  return {
    name: "",
    source: "",
    destination: "",
    vehicleType: "Container 32ft",
    loadType: "FTL",
    rateType: "Per Trip",
    baseRate: "",
    surcharges: [],
    detentionPerDay: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    status: "Draft",
    gstApplicable: false,
    gstRate: "5",
  };
}

function fromRecord(r: RateCard): FormState {
  return {
    name: r.name,
    source: r.source,
    destination: r.destination,
    vehicleType: r.vehicleType,
    loadType: r.loadType,
    rateType: r.rateType,
    baseRate: String(r.baseRate),
    surcharges: r.surcharges.map((s) => ({ ...s })),
    detentionPerDay: r.detentionPerDay ? String(r.detentionPerDay) : "",
    effectiveFrom: r.effectiveFrom.slice(0, 10),
    effectiveTo: r.effectiveTo ? r.effectiveTo.slice(0, 10) : "",
    status: r.status,
    gstApplicable: r.gstApplicable,
    gstRate: String(r.gstRate),
  };
}

export function AddRateCardDrawer({ open, onClose, record, onCreate, onUpdate }: AddRateCardDrawerProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Pre-fill from record when entering edit mode.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open && record) {
      setForm(fromRecord(record));
    } else if (open && !record) {
      setForm(emptyForm());
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, record?.id]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const addSurcharge = () => {
    const id = `s-${Date.now().toString(36)}`;
    update("surcharges", [...form.surcharges, { id, name: "", type: "fixed", value: 0 }]);
  };
  const updateSurcharge = (id: string, patch: Partial<Surcharge>) => {
    update(
      "surcharges",
      form.surcharges.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };
  const removeSurcharge = (id: string) => {
    update("surcharges", form.surcharges.filter((s) => s.id !== id));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast("Rate card name is required");
      return;
    }
    if (!form.source.trim() || !form.destination.trim()) {
      toast("Source and destination are required");
      return;
    }
    if (!form.baseRate || Number(form.baseRate) <= 0) {
      toast("Base rate must be greater than zero");
      return;
    }
    const payload: RateCardPayload = {
      name: form.name,
      source: form.source,
      destination: form.destination,
      vehicleType: form.vehicleType,
      loadType: form.loadType,
      rateType: form.rateType,
      baseRate: Number(form.baseRate),
      surcharges: form.surcharges.filter((s) => s.name.trim() !== ""),
      detentionPerDay: Number(form.detentionPerDay) || 0,
      effectiveFrom: new Date(form.effectiveFrom).toISOString(),
      effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
      status: form.status,
      gstApplicable: form.gstApplicable,
      gstRate: form.gstApplicable ? Number(form.gstRate) || 0 : 0,
    };

    setSaving(true);
    try {
      if (record) {
        const ok = await onUpdate?.(record.id, payload);
        if (ok === false) return;
        toast.success("Rate card updated", { description: `${form.name} · ${form.source} → ${form.destination}` });
        onClose();
        return;
      }
      const ok = await onCreate?.(payload);
      if (ok === false) return;
      toast.success("Rate card created", { description: `${form.name} · ${form.source} → ${form.destination}` });
      setForm(emptyForm());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {record ? "Edit Rate Card" : "Create Rate Card"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? `Editing ${record.name} · ${record.source} → ${record.destination}`
                : "Lane + vehicle + load type pricing. Surcharges, detention, GST."}
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
            <Section title="Identification">
              <div>
                <FieldLabel required>Name</FieldLabel>
                <SavageInput category="name" value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Mumbai-Pune FTL - Container 32ft" />
              </div>
            </Section>

            <Section title="Lane & Vehicle">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Source</FieldLabel>
                  <SavageInput category="city" value={form.source}
                    onChange={(e) => update("source", e.target.value)} />
                </div>
                <div>
                  <FieldLabel required>Destination</FieldLabel>
                  <SavageInput category="city" value={form.destination}
                    onChange={(e) => update("destination", e.target.value)} />
                </div>
                <div>
                  <FieldLabel required>Vehicle Type</FieldLabel>
                  <Select value={form.vehicleType} onValueChange={(v) => update("vehicleType", v as VehicleType)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>Load Type</FieldLabel>
                  <Select value={form.loadType} onValueChange={(v) => update("loadType", v as LoadType)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOAD_TYPES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <Section title="Pricing">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Rate Calculation Type</FieldLabel>
                  <Select value={form.rateType} onValueChange={(v) => update("rateType", v as RateCalculationType)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATE_CALC_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required hint="₹">Base Rate</FieldLabel>
                  <SavageInput category="rate" type="number" value={form.baseRate}
                    onChange={(e) => update("baseRate", e.target.value)} />
                </div>
                <div>
                  <FieldLabel hint="₹ / day">Detention Charges</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.detentionPerDay}
                    onChange={(e) => update("detentionPerDay", e.target.value)} />
                </div>
              </div>
            </Section>

            <Section title="Surcharges" action={
              <Btn size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={addSurcharge}>
                Add Surcharge
              </Btn>
            }>
              {form.surcharges.length === 0 && (
                <div className="rounded-[5px] border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground">
                  No surcharges. Click "Add Surcharge" to add fixed or % charges.
                </div>
              )}
              <div className="flex flex-col gap-2">
                {form.surcharges.map((s) => (
                  <div key={s.id} className="grid grid-cols-12 items-center gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateSurcharge(s.id, { name: e.target.value })}
                      placeholder="Surcharge name (e.g. Toll, Fuel Surcharge)"
                      className="col-span-6 h-8 rounded-[5px] border border-border bg-background px-2.5 text-[13px]"
                    />
                    <Select value={s.type} onValueChange={(v) => updateSurcharge(s.id, { type: v as Surcharge["type"] })}>
                      <SelectTrigger className="col-span-2 h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed ₹</SelectItem>
                        <SelectItem value="percent">% of base</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      type="number"
                      value={s.value}
                      onChange={(e) => updateSurcharge(s.id, { value: Number(e.target.value) || 0 })}
                      className="col-span-3 h-8 rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-right"
                    />
                    <button
                      onClick={() => removeSurcharge(s.id)}
                      className="col-span-1 flex h-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label="Remove surcharge"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Effective Dates & Status">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Effective From</FieldLabel>
                  <input type="date" value={form.effectiveFrom}
                    onChange={(e) => update("effectiveFrom", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
                <div>
                  <FieldLabel hint="optional">Effective To</FieldLabel>
                  <input type="date" value={form.effectiveTo}
                    onChange={(e) => update("effectiveTo", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={form.status} onValueChange={(v) => update("status", v as RateCardStatus)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RATE_CARD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <Section title="GST">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-[5px] border border-border bg-background px-3 py-2">
                  <div>
                    <div className="text-[13px] font-medium text-foreground">GST Applicable</div>
                    <div className="text-[11px] text-muted-foreground">Toggle on if GST is charged on this lane</div>
                  </div>
                  <Switch checked={form.gstApplicable} onCheckedChange={(v) => update("gstApplicable", v)} />
                </div>
                {form.gstApplicable && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel hint="%">GST Rate</FieldLabel>
                      <SavageInput category="amount" type="number" value={form.gstRate}
                        onChange={(e) => update("gstRate", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={saving}>
            {record ? "Save Changes" : "Create Rate Card"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

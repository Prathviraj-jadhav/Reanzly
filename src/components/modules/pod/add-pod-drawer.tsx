"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  ImageIcon,
  PenLine,
  Trash2,
  PenTool,
  Eraser,
} from "lucide-react";
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
import { usePODStore, POD_TYPES, POD_STATUSES, POD_SUBMISSION_STATUSES, lorryReceiptOptions, type CapturedImage } from "@/lib/store/pod-store";
import { fileToCapturedPhoto, formatBytes } from "@/lib/photo";
import {
  FieldLabel,
  toInputDate,
  toInputDateTime,
} from "./_helpers";

/* ============================================================
   AddPODDrawer - 6-step wizard for capturing proof of delivery.
   Strict monochrome. Tabs: Consignment · POD Capture · Status ·
   Additional · Charges · Review.
   ============================================================ */

const STEPS = [
  { id: 1, label: "Consignment" },
  { id: 2, label: "POD Capture" },
  { id: 3, label: "Status" },
  { id: 4, label: "Additional" },
  { id: 5, label: "Charges" },
  { id: 6, label: "Review" },
];

interface AddPODDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface PODFormState {
  consignmentNumber: string;
  type: "Delivery" | "Pickup" | "Return";
  source: string;
  destination: string;
  consignee: string;
  consignor: string;
  consignmentDate: string;
  loadingDate: string;
  frontImage?: CapturedImage;
  backImage?: CapturedImage;
  signatureImage?: CapturedImage;
  receivingDate: string;
  reportingDate: string;
  unloadingDate: string;
  weight: string;
  packages: string;
  status: "Delivered" | "Pending" | "Rejected" | "Damaged";
  submissionStatus: "Draft" | "Submitted" | "Approved";
  deliveryDate: string;
  contactPhone: string;
  contactEmail: string;
  contactRelation: string;
  stampImage?: CapturedImage;
  signatureDrawn?: string;
  startOdometer: string;
  endOdometer: string;
  remarks: string;
  unloadingCharges: string;
  otherCharges: string;
  vehicleNumber: string;
  vehicleHireNumber: string;
}

const EMPTY: PODFormState = {
  consignmentNumber: "",
  type: "Delivery",
  source: "",
  destination: "",
  consignee: "",
  consignor: "",
  consignmentDate: toInputDate(new Date().toISOString()),
  loadingDate: toInputDate(new Date().toISOString()),
  receivingDate: "",
  reportingDate: "",
  unloadingDate: "",
  weight: "",
  packages: "",
  status: "Pending",
  submissionStatus: "Draft",
  deliveryDate: "",
  contactPhone: "",
  contactEmail: "",
  contactRelation: "",
  startOdometer: "",
  endOdometer: "",
  remarks: "",
  unloadingCharges: "",
  otherCharges: "",
  vehicleNumber: "",
  vehicleHireNumber: "",
};

const LR_OPTIONS = lorryReceiptOptions();

export function AddPODDrawer({ open, onClose }: AddPODDrawerProps) {
  const addPOD = usePODStore((s) => s.addPOD);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PODFormState>(EMPTY);
  const [lrQuery, setLrQuery] = useState("");
  const [lrOpen, setLrOpen] = useState(false);

  // reset on open - legitimate form-reset pattern; the rule's cascading-render
  // concern does not apply here because this only fires when `open` flips true.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setForm(EMPTY);
      setLrQuery("");
      setLrOpen(false);
    }
  }, [open]);

  const update = <K extends keyof PODFormState>(k: K, v: PODFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const filteredLRs = useMemo(() => {
    const q = lrQuery.toLowerCase().trim();
    if (!q) return LR_OPTIONS.slice(0, 8);
    return LR_OPTIONS.filter(
      (l) =>
        l.lrNumber.toLowerCase().includes(q) ||
        l.origin.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q) ||
        l.consignee.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [lrQuery]);

  const distance = useMemo(() => {
    const s = Number(form.startOdometer);
    const e = Number(form.endOdometer);
    if (!s || !e || e < s) return 0;
    return e - s;
  }, [form.startOdometer, form.endOdometer]);

  // ===== Validation per step =====
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (step === 1) {
      if (!form.consignmentNumber.trim()) errs.push("Consignment number is required");
      if (!form.source.trim()) errs.push("Source is required");
      if (!form.destination.trim()) errs.push("Destination is required");
      if (!form.consignee.trim()) errs.push("Consignee is required");
    }
    if (step === 5) {
      if (form.unloadingCharges && Number(form.unloadingCharges) < 0) errs.push("Unloading charges cannot be negative");
    }
    return errs;
  }, [step, form]);

  const canAdvance = errors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", {
        description: errors[0] || "Resolve errors on this step",
      });
      return;
    }
    if (step < 6) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const applyLR = (lr: typeof LR_OPTIONS[number]) => {
    update("consignmentNumber", lr.lrNumber);
    update("source", lr.origin);
    update("destination", lr.destination);
    update("consignee", lr.consignee);
    update("consignor", lr.consignor);
    setLrOpen(false);
    setLrQuery("");
  };

  const handleSubmit = () => {
    if (!form.consignmentNumber.trim()) {
      toast("Consignment number is required");
      setStep(1);
      return;
    }
    const id = addPOD({
      consignmentNumber: form.consignmentNumber,
      type: form.type,
      source: form.source,
      destination: form.destination,
      consignee: form.consignee,
      consignor: form.consignor,
      consignmentDate: new Date(form.consignmentDate).toISOString(),
      loadingDate: new Date(form.loadingDate).toISOString(),
      frontImage: form.frontImage,
      backImage: form.backImage,
      signatureImage: form.signatureImage,
      receivingDate: form.receivingDate ? new Date(form.receivingDate).toISOString() : undefined,
      reportingDate: form.reportingDate ? new Date(form.reportingDate).toISOString() : undefined,
      unloadingDate: form.unloadingDate ? new Date(form.unloadingDate).toISOString() : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      packages: form.packages ? Number(form.packages) : undefined,
      status: form.status,
      submissionStatus: form.submissionStatus,
      deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : undefined,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      contactRelation: form.contactRelation,
      stampImage: form.stampImage,
      signatureDrawn: form.signatureDrawn,
      startOdometer: form.startOdometer ? Number(form.startOdometer) : undefined,
      endOdometer: form.endOdometer ? Number(form.endOdometer) : undefined,
      distance: distance || undefined,
      remarks: form.remarks,
      unloadingCharges: form.unloadingCharges ? Number(form.unloadingCharges) : undefined,
      otherCharges: form.otherCharges ? Number(form.otherCharges) : undefined,
      vehicleNumber: form.vehicleNumber,
      vehicleHireNumber: form.vehicleHireNumber,
    });
    toast.success("POD created", {
      description: `Voucher generated - submission status: ${form.submissionStatus}`,
    });
    onClose();
    return id;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Create POD
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              6-step capture wizard · photos · signature pad · audit trail
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

        {/* Stepper */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                    }}
                    className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-1 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors",
                        (active || done) && "border-foreground bg-foreground text-background",
                        !active && !done && "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[12px] font-medium md:inline",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-4",
                        step > s.id ? "bg-foreground" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <SectionTitle index={1} title="Consignment Details" />
              <div className="flex flex-col gap-3">
                <div>
                  <FieldLabel required hint="from lorry receipts">Consignment Number</FieldLabel>
                  <div className="relative">
                    <SavageInput
                      category="consignmentNumber"
                      value={form.consignmentNumber}
                      onChange={(e) => update("consignmentNumber", e.target.value)}
                      onFocus={() => setLrOpen(true)}
                      placeholder="Search or type a consignment number"
                    />
                    {lrOpen && (
                      <div className="absolute z-20 mt-1 w-full rounded-[5px] border border-border bg-card shadow-none">
                        <div className="border-b border-border px-2 py-1.5">
                          <input
                            autoFocus
                            value={lrQuery}
                            onChange={(e) => setLrQuery(e.target.value)}
                            placeholder="Search LR #, origin, destination, consignee…"
                            className="h-7 w-full rounded-[4px] border border-border bg-background px-2 text-[12px]"
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto scrollbar-thin">
                          {filteredLRs.length === 0 && (
                            <div className="px-3 py-3 text-[12px] text-muted-foreground">
                              No matching lorry receipts.
                            </div>
                          )}
                          {filteredLRs.map((lr) => (
                            <button
                              key={lr.lrNumber}
                              onClick={() => applyLR(lr)}
                              className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-accent/50 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="tabular text-[12px] font-medium text-foreground">
                                  {lr.lrNumber}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {lr.origin} → {lr.destination}
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {lr.consignee}
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setLrOpen(false)}
                          className="block w-full border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent/50 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Voucher Number</FieldLabel>
                    <SavageInput
                      category="consignmentNumber"
                      value="Auto-generated on submit"
                      disabled
                      placeholder=""
                    />
                  </div>
                  <div>
                    <FieldLabel required>Type</FieldLabel>
                    <Select value={form.type} onValueChange={(v) => update("type", v as PODFormState["type"])}>
                      <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Source</FieldLabel>
                    <SavageInput category="city" value={form.source} onChange={(e) => update("source", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel required>Destination</FieldLabel>
                    <SavageInput category="city" value={form.destination} onChange={(e) => update("destination", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel required>Consignee</FieldLabel>
                    <SavageInput category="name" value={form.consignee} onChange={(e) => update("consignee", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Consignor</FieldLabel>
                    <SavageInput category="name" value={form.consignor} onChange={(e) => update("consignor", e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Consignment Date</FieldLabel>
                    <input
                      type="date"
                      value={form.consignmentDate}
                      onChange={(e) => update("consignmentDate", e.target.value)}
                      className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
                    />
                  </div>
                  <div>
                    <FieldLabel>Loading Date</FieldLabel>
                    <input
                      type="date"
                      value={form.loadingDate}
                      onChange={(e) => update("loadingDate", e.target.value)}
                      className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <SectionTitle index={2} title="POD Capture" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <PhotoUpload label="Front Copy" image={form.frontImage} onCapture={(img) => update("frontImage", img)} />
                <PhotoUpload label="Back Copy" image={form.backImage} onCapture={(img) => update("backImage", img)} />
                <PhotoUpload label="Signature Copy" image={form.signatureImage} onCapture={(img) => update("signatureImage", img)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <FieldLabel>Receiving Date</FieldLabel>
                  <input type="datetime-local" value={form.receivingDate}
                    onChange={(e) => update("receivingDate", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
                <div>
                  <FieldLabel>Reporting Date</FieldLabel>
                  <input type="datetime-local" value={form.reportingDate}
                    onChange={(e) => update("reportingDate", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
                <div>
                  <FieldLabel>Unloading Date</FieldLabel>
                  <input type="datetime-local" value={form.unloadingDate}
                    onChange={(e) => update("unloadingDate", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
                <div>
                  <FieldLabel hint="kg">Weight</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.weight}
                    onChange={(e) => update("weight", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Packages</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.packages}
                    onChange={(e) => update("packages", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <SectionTitle index={3} title="Status & Report" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Status</FieldLabel>
                  <Select value={form.status} onValueChange={(v) => update("status", v as PODFormState["status"])}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Report Number</FieldLabel>
                  <SavageInput category="consignmentNumber" value="Auto-generated" disabled placeholder="" />
                </div>
                <div>
                  <FieldLabel required>Submission Status</FieldLabel>
                  <Select value={form.submissionStatus} onValueChange={(v) => update("submissionStatus", v as PODFormState["submissionStatus"])}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POD_SUBMISSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Delivery Date & Time</FieldLabel>
                  <input type="datetime-local" value={form.deliveryDate}
                    onChange={(e) => update("deliveryDate", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <SectionTitle index={4} title="Additional Information" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <FieldLabel>Contact Phone</FieldLabel>
                  <SavageInput category="phone" value={form.contactPhone}
                    onChange={(e) => update("contactPhone", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Contact Email</FieldLabel>
                  <SavageInput category="email" type="email" value={form.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Relation to Consignee</FieldLabel>
                  <SavageInput category="name" value={form.contactRelation}
                    onChange={(e) => update("contactRelation", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PhotoUpload label="Stamp" image={form.stampImage} onCapture={(img) => update("stampImage", img)} />
                <SignaturePad
                  label="Signature (draw)"
                  value={form.signatureDrawn}
                  onChange={(v) => update("signatureDrawn", v)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <FieldLabel hint="km">Start Odometer</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.startOdometer}
                    onChange={(e) => update("startOdometer", e.target.value)} />
                </div>
                <div>
                  <FieldLabel hint="km">End Odometer</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.endOdometer}
                    onChange={(e) => update("endOdometer", e.target.value)} />
                </div>
                <div>
                  <FieldLabel hint="auto-calculated">Distance</FieldLabel>
                  <input
                    type="text"
                    disabled
                    value={distance ? `${distance.toLocaleString("en-IN")} km` : "-"}
                    className="h-8 w-full rounded-[5px] border border-border bg-muted px-2.5 text-[13px] tabular text-muted-foreground"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Remarks</FieldLabel>
                <SavageTextarea
                  category="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => update("remarks", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-4">
              <SectionTitle index={5} title="Charges & Vehicle" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel hint="₹">Unloading Charges</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.unloadingCharges}
                    onChange={(e) => update("unloadingCharges", e.target.value)} />
                </div>
                <div>
                  <FieldLabel hint="₹">Other Charges</FieldLabel>
                  <SavageInput category="amount" type="number" value={form.otherCharges}
                    onChange={(e) => update("otherCharges", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Vehicle Number</FieldLabel>
                  <SavageInput category="vehicleNumber" value={form.vehicleNumber}
                    onChange={(e) => update("vehicleNumber", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Vehicle Hire Number</FieldLabel>
                  <SavageInput category="consignmentNumber" value={form.vehicleHireNumber}
                    onChange={(e) => update("vehicleHireNumber", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-4">
              <SectionTitle index={6} title="Review & Submit" />
              <ReviewBlock title="Consignment">
                <ReviewRow label="Consignment #" value={form.consignmentNumber} mono />
                <ReviewRow label="Type" value={form.type} />
                <ReviewRow label="Route" value={`${form.source || "-"} → ${form.destination || "-"}`} />
                <ReviewRow label="Consignee" value={form.consignee} />
                <ReviewRow label="Consignor" value={form.consignor || "-"} />
                <ReviewRow label="Consignment Date" value={form.consignmentDate} mono />
                <ReviewRow label="Loading Date" value={form.loadingDate || "-"} mono />
              </ReviewBlock>
              <ReviewBlock title="POD Capture">
                <ReviewRow label="Front Image" value={form.frontImage ? "Captured" : "-"} />
                <ReviewRow label="Back Image" value={form.backImage ? "Captured" : "-"} />
                <ReviewRow label="Signature Image" value={form.signatureImage ? "Captured" : "-"} />
                <ReviewRow label="Weight" value={form.weight ? `${form.weight} kg` : "-"} mono />
                <ReviewRow label="Packages" value={form.packages || "-"} mono />
              </ReviewBlock>
              <ReviewBlock title="Status & Charges">
                <ReviewRow label="Status" value={form.status} />
                <ReviewRow label="Submission" value={form.submissionStatus} />
                <ReviewRow label="Delivery Date" value={form.deliveryDate ? toInputDateTime(form.deliveryDate) : "-"} mono />
                <ReviewRow label="Unloading Charges" value={form.unloadingCharges ? `₹${Number(form.unloadingCharges).toLocaleString("en-IN")}` : "-"} mono />
                <ReviewRow label="Other Charges" value={form.otherCharges ? `₹${Number(form.otherCharges).toLocaleString("en-IN")}` : "-"} mono />
                <ReviewRow label="Distance" value={distance ? `${distance.toLocaleString("en-IN")} km` : "-"} mono />
                <ReviewRow label="Vehicle #" value={form.vehicleNumber || "-"} mono />
              </ReviewBlock>
              <div className="rounded-[6px] border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
                Voucher and report numbers will be auto-generated on submit. An audit
                trail entry ("POD created") will be appended automatically.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={goBack} disabled={step === 1}>
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">
            Step {step} of {STEPS.length}
          </div>
          {step < 6 ? (
            <Btn variant="primary" onClick={goNext}>
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          ) : (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
              Submit POD
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */
function SectionTitle({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-foreground bg-foreground text-[11px] tabular font-medium text-background">
        {index}
      </span>
      <h3 className="text-[13px] font-medium tracking-tight text-foreground">{title}</h3>
    </div>
  );
}

function PhotoUpload({
  label,
  image,
  onCapture,
}: {
  label: string;
  image?: CapturedImage;
  onCapture: (img: CapturedImage | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const captured = await fileToCapturedPhoto(file);
    if (captured) onCapture(captured);
    else toast("Could not read image. Try another file.");
  };

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={cn(
          "relative flex aspect-[4/3] items-center justify-center rounded-[6px] border border-border bg-muted/30 overflow-hidden",
        )}
      >
        {image ? (
          <img src={image.thumb} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
            <span className="text-[11px]">No capture</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Btn size="sm" variant="outline" icon={<ImageIcon className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>
          Upload
        </Btn>
        <Btn size="sm" variant="ghost" icon={<Camera className="h-3.5 w-3.5" />} onClick={() => cameraRef.current?.click()}>
          Camera
        </Btn>
        {image && (
          <button
            onClick={() => onCapture(undefined)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Remove photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {image && (
        <div className="text-[10px] text-muted-foreground tabular">
          {formatBytes(image.bytes)} · {label.toLowerCase()} captured
        </div>
      )}
    </div>
  );
}

function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // `hasInk` is derived from the persisted `value` (set once on mount / when
  // an external value arrives) plus local ink state. Sync via key remount
  // rather than setState-in-effect.

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const start = useCallback((x: number, y: number) => {
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const move = useCallback((x: number, y: number) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.strokeStyle = "var(--foreground)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }, []);

  const end = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [onChange]);

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasInk(false);
    onChange(undefined);
  };

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel hint="draw with mouse/touch">{label}</FieldLabel>
      <div className="relative rounded-[6px] border border-border bg-background overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          className="block h-[140px] w-full touch-none"
          style={{ aspectRatio: "20 / 9" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = pointer(e);
            start(p.x, p.y);
          }}
          onPointerMove={(e) => {
            const p = pointer(e);
            move(p.x, p.y);
          }}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <PenLine className="h-3.5 w-3.5" /> Draw signature here
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Btn size="sm" variant="outline" icon={<PenTool className="h-3.5 w-3.5" />} disabled>
          Drawn
        </Btn>
        <Btn size="sm" variant="ghost" icon={<Eraser className="h-3.5 w-3.5" />} onClick={clear} disabled={!hasInk}>
          Clear
        </Btn>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

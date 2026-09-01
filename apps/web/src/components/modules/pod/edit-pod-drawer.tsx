"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
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
import {
  usePODStore,
  POD_TYPES,
  POD_STATUSES,
  POD_SUBMISSION_STATUSES,
  type ProofOfDelivery,
  type PODType,
  type PODStatus,
  type PODSubmissionStatus,
} from "@/lib/store/pod-store";
import { FieldLabel, formatINR } from "./_helpers";

/**
 * EditPODDrawer - lightweight summary-only editor for an existing POD.
 *
 * The 6-step wizard (`AddPODDrawer`) is the only way to capture photos and
 * signatures. After capture, those raw artefacts should not be re-editable;
 * what ops usually needs to tweak after the fact is the summary: consignment
 * link, status, delivery date, receiver contact, charges, remarks.
 *
 * That's exactly what this drawer edits. All updates route through
 * `usePODStore.updatePOD` so the persisted slice stays in sync.
 */
interface EditPODDrawerProps {
  open: boolean;
  onClose: () => void;
  pod?: ProofOfDelivery | null;
}

interface EditForm {
  consignmentNumber: string;
  type: PODType;
  status: PODStatus;
  submissionStatus: PODSubmissionStatus;
  deliveryDate: string;
  receiverName: string;
  receiverPhone: string;
  unloadingCharges: string;
  otherCharges: string;
  remarks: string;
}

function emptyForm(): EditForm {
  return {
    consignmentNumber: "",
    type: "Delivery",
    status: "Pending",
    submissionStatus: "Draft",
    deliveryDate: "",
    receiverName: "",
    receiverPhone: "",
    unloadingCharges: "",
    otherCharges: "",
    remarks: "",
  };
}

function fromPod(pod: ProofOfDelivery): EditForm {
  return {
    consignmentNumber: pod.consignmentNumber,
    type: pod.type,
    status: pod.status,
    submissionStatus: pod.submissionStatus,
    deliveryDate: pod.deliveryDate ? pod.deliveryDate.slice(0, 10) : "",
    receiverName: pod.consignee,
    receiverPhone: pod.contactPhone ?? "",
    unloadingCharges: pod.unloadingCharges != null ? String(pod.unloadingCharges) : "",
    otherCharges: pod.otherCharges != null ? String(pod.otherCharges) : "",
    remarks: pod.remarks ?? "",
  };
}

export function EditPODDrawer({ open, onClose, pod }: EditPODDrawerProps) {
  const updatePOD = usePODStore((s) => s.updatePOD);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open && pod) {
      setForm(fromPod(pod));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, pod?.id]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!pod) return;
    if (!form.consignmentNumber.trim()) {
      toast("Consignment number is required");
      return;
    }
    setSubmitting(true);
    const updated = await updatePOD(pod.id, {
      consignmentNumber: form.consignmentNumber.trim(),
      type: form.type,
      status: form.status,
      submissionStatus: form.submissionStatus,
      deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : undefined,
      consignee: form.receiverName.trim() || pod.consignee,
      contactPhone: form.receiverPhone.trim() || undefined,
      unloadingCharges: form.unloadingCharges ? Number(form.unloadingCharges) : undefined,
      otherCharges: form.otherCharges ? Number(form.otherCharges) : undefined,
      remarks: form.remarks.trim() || undefined,
    });
    setSubmitting(false);
    if (!updated) {
      toast.error("Could not update POD");
      return;
    }
    toast.success("POD updated", {
      description: `${pod.voucherNumber} · ${form.status} · ${form.submissionStatus}`,
    });
    onClose();
  };

  const chargesTotal =
    (Number(form.unloadingCharges) || 0) + (Number(form.otherCharges) || 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Edit POD
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {pod
                ? `Editing ${pod.voucherNumber} · summary fields only - photos & signatures remain on file.`
                : "No POD selected."}
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
            <Section title="Consignment">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Consignment Number</FieldLabel>
                  <SavageInput
                    category="consignmentNumber"
                    value={form.consignmentNumber}
                    onChange={(e) => update("consignmentNumber", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel required>Type</FieldLabel>
                  <Select value={form.type} onValueChange={(v) => update("type", v as PODType)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Delivery Date</FieldLabel>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => update("deliveryDate", e.target.value)}
                    className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
                  />
                </div>
              </div>
            </Section>

            <Section title="Status">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>POD Status</FieldLabel>
                  <Select value={form.status} onValueChange={(v) => update("status", v as PODStatus)}>
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Submission Status</FieldLabel>
                  <Select
                    value={form.submissionStatus}
                    onValueChange={(v) => update("submissionStatus", v as PODSubmissionStatus)}
                  >
                    <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POD_SUBMISSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            <Section title="Receiver Contact">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Receiver Name</FieldLabel>
                  <SavageInput
                    category="name"
                    value={form.receiverName}
                    onChange={(e) => update("receiverName", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Receiver Phone</FieldLabel>
                  <SavageInput
                    category="phone"
                    value={form.receiverPhone}
                    onChange={(e) => update("receiverPhone", e.target.value)}
                  />
                </div>
              </div>
            </Section>

            <Section title="Charges">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel hint="₹">Unloading Charges</FieldLabel>
                  <SavageInput
                    category="amount"
                    type="number"
                    value={form.unloadingCharges}
                    onChange={(e) => update("unloadingCharges", e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel hint="₹">Other Charges</FieldLabel>
                  <SavageInput
                    category="amount"
                    type="number"
                    value={form.otherCharges}
                    onChange={(e) => update("otherCharges", e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-[5px] border border-border bg-muted/30 px-3 py-1.5 text-[12px]">
                <span className="text-muted-foreground">Total charges</span>
                <span className="tabular font-medium text-foreground">{formatINR(chargesTotal)}</span>
              </div>
            </Section>

            <Section title="Remarks">
              <SavageTextarea
                category="remarks"
                rows={4}
                value={form.remarks}
                onChange={(e) => update("remarks", e.target.value)}
              />
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit} disabled={!pod || submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

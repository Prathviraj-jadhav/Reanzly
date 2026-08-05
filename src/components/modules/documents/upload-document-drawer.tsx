"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Upload,
  FileText,
  Truck,
  User,
  Building2,
  Package,
  Hash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { VEHICLES, DRIVERS, CUSTOMERS, VENDORS } from "@/lib/mock-data";
import type { DocumentRecord } from "@/lib/types";
import {
  DOCUMENT_TYPES,
  ENTITY_TYPES,
  ISSUING_AUTHORITIES,
  EMPTY_DOC_FORM,
  type DocumentForm,
  FieldLabel,
  toInputDate,
  formatDate,
  daysUntil,
} from "./_helpers";

interface UploadDocumentDrawerProps {
  open: boolean;
  onClose: () => void;
  record?: DocumentRecord;
  onAdd?: (data: Partial<DocumentRecord>) => void;
  onUpdate?: (id: string, data: Partial<DocumentRecord>) => void;
}

function recordToForm(record: DocumentRecord): DocumentForm {
  return {
    ...EMPTY_DOC_FORM,
    name: record.name,
    entityType: record.entityType,
    entity: record.entityName,
    documentType: record.type,
    issueDate: record.issueDate,
    expiryDate: record.expiryDate || "",
  };
}

function statusForExpiry(expiryDate?: string): DocumentRecord["status"] {
  if (!expiryDate) return "Valid";
  const days = daysUntil(expiryDate);
  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring Soon";
  return "Valid";
}

function formToData(form: DocumentForm, existing?: DocumentRecord): Partial<DocumentRecord> {
  const name = form.name.trim() || `${form.documentType} - ${form.entity}`;
  return {
    name,
    type: form.documentType,
    entityType: form.entityType as DocumentRecord["entityType"],
    entityName: form.entity,
    issueDate: form.issueDate,
    expiryDate: form.expiryDate || undefined,
    status: statusForExpiry(form.expiryDate || undefined),
    uploadedBy: existing?.uploadedBy || "Reanzly User",
    uploadDate: existing?.uploadDate || new Date().toISOString(),
  };
}

const STEPS = [
  { id: 1, label: "Entity & Type" },
  { id: 2, label: "Dates & File" },
  { id: 3, label: "Review" },
];

export function UploadDocumentDrawer({
  open,
  onClose,
  record,
  onAdd,
  onUpdate,
}: UploadDocumentDrawerProps) {
  const [step, setStep] = useState(1);
  // Initialise from `record` if editing, else empty form. Parent passes a
  // `key` based on record.id so the drawer remounts fresh each time.
  const [form, setForm] = useState<DocumentForm>(() =>
    record ? recordToForm(record) : EMPTY_DOC_FORM,
  );

  const update = <K extends keyof DocumentForm>(k: K, v: DocumentForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const entityOptions = useMemo(() => {
    if (form.entityType === "Vehicle") return VEHICLES.map((v) => ({ id: v.id, label: `${v.name} · ${v.licensePlate}` }));
    if (form.entityType === "Driver") return DRIVERS.map((d) => ({ id: d.id, label: `${d.name} · ${d.role}` }));
    if (form.entityType === "Customer") return CUSTOMERS.map((c) => ({ id: c.id, label: c.companyName }));
    if (form.entityType === "Vendor") return VENDORS.map((v) => ({ id: v.id, label: v.companyName }));
    return [{ id: "company-1", label: "Reanzly Logistics Pvt Ltd" }];
  }, [form.entityType]);

  const handleEntityTypeChange = (t: string) => {
    setForm((s) => ({ ...s, entityType: t, entity: "" }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      update("fileName", f.name);
      update("fileSize", `${(f.size / 1024 / 1024).toFixed(2)} MB`);
      toast.success("File attached", { description: f.name });
    }
  };

  const errors: string[] = [];
  if (step === 1) {
    if (record && !form.name.trim()) errors.push("Document name is required");
    if (!form.entityType) errors.push("Entity type is required");
    if (!form.entity) errors.push("Entity is required");
    if (!form.documentType) errors.push("Document type is required");
  }
  if (step === 2) {
    if (!form.documentNumber.trim()) errors.push("Document number is required");
    if (!form.issueDate) errors.push("Issue date is required");
    if (form.expiryDate && new Date(form.expiryDate) < new Date(form.issueDate)) {
      errors.push("Expiry date cannot be before issue date");
    }
    // File upload only required for create (not edit - existing file is kept)
    if (!record && !form.fileName) errors.push("File upload is required");
  }

  const isLastStep = step === 3;
  const canAdvance = errors.length === 0;

  const goNext = () => {
    if (!canAdvance) {
      toast("Cannot continue", { description: errors[0] });
      return;
    }
    if (step < 3) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const payload = formToData(form, record);
    if (record && onUpdate) {
      onUpdate(record.id, payload);
      toast.success("Document updated", {
        description: `${form.documentType} · ${form.entity} · ${form.fileName || record.name}`,
      });
    } else if (onAdd) {
      onAdd(payload);
      toast.success("Document uploaded", {
        description: `${form.documentType} · ${form.entity} · ${form.fileName}`,
      });
    } else {
      toast.success("Document uploaded", {
        description: `${form.documentType} · ${form.entity} · ${form.fileName}`,
      });
    }
    setStep(1);
    setForm(EMPTY_DOC_FORM);
    onClose();
  };

  const EntityIcon = form.entityType === "Vehicle" ? Truck : form.entityType === "Driver" ? User : form.entityType === "Vendor" ? Package : Building2;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record ? "Edit Document" : "Upload Document"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record
                ? "Update document metadata and expiry"
                : "3 steps · link to entity · auto-track expiry"}
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
          <div className="flex items-center gap-1">
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
                      className={
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium transition-colors " +
                        (active || done
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground")
                      }
                    >
                      {done ? <Check className="h-3 w-3" /> : s.id}
                    </span>
                    <span
                      className={
                        "hidden text-[12px] font-medium md:inline " +
                        (active ? "text-foreground" : "text-muted-foreground")
                      }
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={"h-px w-6 " + (step > s.id ? "bg-foreground" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Step 1: Entity & Type */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <EntityIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Entity</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Entity Type</FieldLabel>
                    <Select value={form.entityType} onValueChange={handleEntityTypeChange}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Entity</FieldLabel>
                    <Select value={form.entity || "none"} onValueChange={(v) => update("entity", v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue placeholder={`Select ${form.entityType.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        <SelectItem value="none">- Select -</SelectItem>
                        {entityOptions.map((e) => (
                          <SelectItem key={e.id} value={e.label}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Document Type</span>
                </div>
                <div className="mb-3">
                  <FieldLabel hint={record ? "required" : "optional"}>Document Name</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={record ? "" : "e.g. Fitness Certificate - MH01AB1234 (auto-derived if blank)"}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <FieldLabel required>Document Type</FieldLabel>
                <Select value={form.documentType} onValueChange={(v) => update("documentType", v)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto scrollbar-thin">
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Dates & File */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Document Details</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <FieldLabel required>Document Number</FieldLabel>
                    <Input
                      value={form.documentNumber}
                      onChange={(e) => update("documentNumber", e.target.value)}
                      placeholder="e.g. DL-0420190012345"
                      className="h-8 rounded-[5px] text-[13px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel required>Issue Date</FieldLabel>
                    <Input
                      type="date"
                      value={toInputDate(form.issueDate)}
                      onChange={(e) => update("issueDate", new Date(e.target.value).toISOString())}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel hint="optional">Expiry Date</FieldLabel>
                    <Input
                      type="date"
                      value={form.expiryDate ? toInputDate(form.expiryDate) : ""}
                      onChange={(e) => update("expiryDate", e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel hint="optional">Issuing Authority</FieldLabel>
                    <Select value={form.issuingAuthority} onValueChange={(v) => update("issuingAuthority", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                        {ISSUING_AUTHORITIES.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">File Upload</span>
                </div>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-foreground/30 hover:bg-accent/30">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">
                    {form.fileName ? form.fileName : "Click to upload document"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {form.fileName ? form.fileSize : "PDF, JPG, PNG · up to 10 MB"}
                  </span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
                </label>
                {form.fileName && (
                  <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-[12px] text-foreground">{form.fileName}</span>
                    </div>
                    <span className="tabular text-[11px] text-muted-foreground">{form.fileSize}</span>
                  </div>
                )}
              </div>

              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Notes</span>
                </div>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Optional notes about this document…"
                  className="min-h-[60px] rounded-[5px] text-[13px]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Document Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <ReviewRow label="Entity Type" value={form.entityType} />
                  <ReviewRow label="Entity" value={form.entity} />
                  <ReviewRow label="Document Type" value={form.documentType} />
                  <ReviewRow label="Document #" value={form.documentNumber} mono />
                  <ReviewRow label="Issue Date" value={formatDate(form.issueDate)} mono />
                  <ReviewRow label="Expiry Date" value={form.expiryDate ? formatDate(form.expiryDate) : "-"} mono />
                  <ReviewRow label="Issuing Authority" value={form.issuingAuthority} />
                  <ReviewRow label="File" value={form.fileName} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={goBack} disabled={step === 1}>
            Back
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">Step {step} of 3</div>
          {isLastStep ? (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
              {record ? "Save Changes" : "Upload Document"}
            </Btn>
          ) : (
            <Btn variant="primary" onClick={goNext} disabled={!canAdvance}>
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={"text-[13px] text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, docStatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { SavageInput } from "@/components/shared/savage-input";
import type { Driver } from "@/lib/types";
import { FileText, Upload, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDate, daysUntil, generateDriverDocs, type DriverDocRow } from "../_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function expiryWeight(status: DriverDocRow["status"]) {
  return status === "Expired" ? 0 : status === "Expiring Soon" ? 1 : 2;
}

export function DriverDocumentsTab({ driver }: { driver: Driver }) {
  const docs = useMemo(
    () => generateDriverDocs(driver.id, driver.licenseNumber, driver.licenseExpiry),
    [driver.id, driver.licenseNumber, driver.licenseExpiry],
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<string>("");

  const expiringCount = docs.filter((d) => d.status === "Expiring Soon").length;
  const expiredCount = docs.filter((d) => d.status === "Expired").length;

  const columns: Column<DriverDocRow>[] = [
    {
      key: "type",
      header: "Document",
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">{r.type}</span>
        </div>
      ),
    },
    {
      key: "number",
      header: "Number",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{r.number || "-"}</span>,
    },
    {
      key: "issueDate",
      header: "Issue",
      sortable: true,
      sortValue: (r) => r.issueDate,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.issueDate)}</span>,
    },
    {
      key: "expiryDate",
      header: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiryDate ?? "9999",
      render: (r) => {
        if (!r.expiryDate) return <span className="text-[12px] text-muted-foreground">-</span>;
        const days = daysUntil(r.expiryDate);
        const weight = expiryWeight(r.status);
        return (
          <div className="flex flex-col">
            <span className="text-[12px] tabular text-foreground">{formatDate(r.expiryDate)}</span>
            {days !== null && (
              <span
                className={
                  "text-[10px] tabular " +
                  (weight === 0
                    ? "font-bold text-foreground"
                    : weight === 1
                      ? "font-medium text-muted-foreground"
                      : "text-muted-foreground/70")
                }
              >
                {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "uploadedBy",
      header: "Uploaded By",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.uploadedBy}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const { variant, pulse } = docStatusBadge(r.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Driver Documents"
        icon={<FileText className="h-4 w-4" />}
        description={`${docs.length} documents · ${expiringCount} expiring soon · ${expiredCount} expired`}
        action={
          <Btn size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setUploadOpen(true)}>
            Upload
          </Btn>
        }
      >
        {expiredCount > 0 && (
          <div className="mb-3 flex items-start gap-2 rounded-[5px] border border-foreground/30 bg-background p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <div className="text-[12px] text-foreground">
              <span className="font-medium">{expiredCount} document{expiredCount === 1 ? "" : "s"} expired.</span>{" "}
              <span className="text-muted-foreground">Driver may be blocked from active trips until renewed.</span>
            </div>
          </div>
        )}
        <DataTable
          data={docs}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "expiryDate", dir: "asc" }}
          emptyTitle="No documents on file"
          emptyDescription="Upload the driver's license, RC, and KYC documents to begin."
        />
      </SectionCard>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        docType={uploadType}
        setDocType={setUploadType}
      />
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  docType,
  setDocType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  docType: string;
  setDocType: (v: string) => void;
}) {
  const submit = () => {
    if (!docType) {
      toast.error("Pick a document type first");
      return;
    }
    toast.success("Document uploaded", { description: `${docType} queued for verification` });
    onOpenChange(false);
    setDocType("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium">Upload Document</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Choose the document type and attach a scan or photo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Document Type</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Driving License", "RC Book", "Insurance Certificate", "National Permit",
                  "Aadhaar Card", "PAN Card", "Medical Certificate", "Police Verification",
                ].map((t) => (
                  <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Document Number</label>
            <SavageInput category="consignmentNumber" className="h-9 text-[13px] tabular" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Expiry (if applicable)</label>
            <SavageInput category="remarks" type="date" placeholder="" className="h-9 text-[13px] tabular" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">File</label>
            <button
              type="button"
              onClick={() => toast("File picker would open")}
              className="flex h-20 flex-col items-center justify-center gap-1 rounded-[5px] border border-dashed border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[12px]">Click to attach (PDF / JPG / PNG)</span>
            </button>
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={submit}>Upload</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

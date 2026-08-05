"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  FolderArchive, FileText, UploadCloud, Download, Eye, Plus, X,
  CheckCircle2, AlertCircle, Clock, FileCheck, Paperclip, Calendar, Filter, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  SEED_BROKER_DOCUMENTS,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  documentStatusBadge,
  licenseStatusFromExpiry,
  type BrokerDocument,
  type DocumentStatus,
  type DocumentType,
  formatDate,
  relativeTime,
  daysAgo,
  daysAhead,
  KpiTile,
} from "./_helpers";

/* ============================================================
   BrokerDocuments - broker document vault.
   ------------------------------------------------------------
   DataTable of every regulatory / commercial document the broker
   must keep on file: broker agreement, GST certificate, PAN,
   Aadhaar of proprietor, cancelled cheque, monthly commission
   statement PDFs, IRGT license. Upload via Sheet drawer with
   showCloseButton={false} and a manual X in the header.
   ============================================================ */

interface UploadForm {
  name: string;
  type: DocumentType;
  fileName: string;
  notes: string;
  expiresAt: string;
}

const EMPTY_FORM: UploadForm = {
  name: "",
  type: "Broker Agreement",
  fileName: "",
  notes: "",
  expiresAt: "",
};

export function BrokerDocuments() {
  const [docs, setDocs] = useState<BrokerDocument[]>(SEED_BROKER_DOCUMENTS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewing, setViewing] = useState<BrokerDocument | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "All">("All");
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);

  // ===== Derived counts =====
  const counts = useMemo(() => {
    const c: Record<DocumentStatus, number> = { Valid: 0, "Expiring Soon": 0, Expired: 0, Missing: 0 };
    for (const d of docs) c[d.status] += 1;
    return c;
  }, [docs]);

  const filtered = useMemo(() => {
    if (statusFilter === "All") return docs;
    return docs.filter((d) => d.status === statusFilter);
  }, [docs, statusFilter]);

  // ===== Handlers =====
  const onPickFile = () => {
    // Mock: simulate a user picking "broker-agreement.pdf" from the OS dialog.
    const fakeName = form.type.toLowerCase().replace(/\s+/g, "-") + ".pdf";
    setForm((f) => ({ ...f, fileName: fakeName }));
    toastInfo("File selected", `${fakeName} - 248 KB`);
  };

  const submitUpload = () => {
    if (!form.name.trim()) {
      toastInfo("Document name required", "Please give the document a friendly name.");
      return;
    }
    const newDoc: BrokerDocument = {
      id: `doc-${String(docs.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      type: form.type,
      fileName: form.fileName || form.name.toLowerCase().replace(/\s+/g, "-") + ".pdf",
      sizeKB: 200 + Math.floor(Math.random() * 100),
      uploadedAt: new Date().toISOString(),
      expiresAt: form.expiresAt || undefined,
      status: form.expiresAt ? licenseStatusFromExpiry(form.expiresAt) : "Valid",
    };
    setDocs((p) => [newDoc, ...p]);
    setForm(EMPTY_FORM);
    setUploadOpen(false);
    toastSuccess("Document uploaded", `${newDoc.name} added to the vault.`);
  };

  const downloadDoc = (d: BrokerDocument) => {
    toastInfo("Download started", `${d.fileName} - ${d.sizeKB} KB`);
  };

  // ===== Columns =====
  const columns: Column<BrokerDocument>[] = [
    {
      key: "name",
      header: "Document",
      sortable: true,
      align: "left",
      sortValue: (d) => d.name,
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-foreground">{d.name}</div>
            <div className="truncate text-[11px] text-muted-foreground tabular">{d.fileName} · {d.sizeKB} KB</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      align: "left",
      sortValue: (d) => d.type,
      hideable: true,
      render: (d) => <span className="text-[12px] text-muted-foreground">{d.type}</span>,
    },
    {
      key: "uploadedAt",
      header: "Uploaded",
      sortable: true,
      align: "left",
      sortValue: (d) => d.uploadedAt,
      hideable: true,
      render: (d) => (
        <div className="text-[12px] tabular">
          <div className="text-foreground">{formatDate(d.uploadedAt)}</div>
          <div className="text-[10px] text-muted-foreground">{relativeTime(d.uploadedAt)}</div>
        </div>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      sortable: true,
      align: "left",
      sortValue: (d) => d.expiresAt ?? "",
      render: (d) => (
        <div className="text-[12px] tabular">
          {d.expiresAt ? (
            <>
              <div className="text-foreground">{formatDate(d.expiresAt)}</div>
              <div className="text-[10px] text-muted-foreground">
                {Math.ceil((new Date(d.expiresAt).getTime() - Date.now()) / 86400000) > 0
                  ? `${Math.ceil((new Date(d.expiresAt).getTime() - Date.now()) / 86400000)}d left`
                  : "expired"}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">No expiry</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "left",
      sortValue: (d) => d.status,
      render: (d) => {
        const b = documentStatusBadge(d.status);
        return (
          <StatusBadge variant={b.variant} pulse={b.pulse}>{d.status}</StatusBadge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      hideable: false,
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewing(d)}
            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={`View ${d.name}`}
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => downloadDoc(d)}
            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={`Download ${d.name}`}
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Document Vault"
        description="Every regulatory, commercial, and commission document - securely archived."
        meta={[
          { label: "Total", value: docs.length },
          { label: "Valid", value: counts.Valid },
          { label: "Expiring", value: counts["Expiring Soon"] },
          { label: "Expired", value: counts.Expired },
        ]}
        actions={
          <Btn variant="primary" icon={<UploadCloud className="h-3.5 w-3.5" />} onClick={() => setUploadOpen(true)}>
            Upload document
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <KpiTile icon={<FolderArchive className="h-3.5 w-3.5" />} label="Total documents" value={String(docs.length)} hint="in vault" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Valid" value={String(counts.Valid)} hint="current + non-expiring" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Expiring soon" value={String(counts["Expiring Soon"])} hint="within 30 days" />
        <KpiTile icon={<AlertCircle className="h-3.5 w-3.5" />} label="Expired" value={String(counts.Expired)} hint="needs renewal" />
        <KpiTile icon={<FileCheck className="h-3.5 w-3.5" />} label="Statements" value={String(docs.filter((d) => d.type === "Commission Statement").length)} hint="monthly PDFs" />
        <KpiTile icon={<Paperclip className="h-3.5 w-3.5" />} label="Storage used" value={`${(docs.reduce((s, d) => s + d.sizeKB, 0) / 1024).toFixed(1)} MB`} hint="of 1 GB quota" />
      </div>

      {/* Document table */}
      <SectionCard
        title="Documents"
        description="Filter by status, search by name or type. Click the eye to preview, the down-arrow to download."
        icon={<FolderArchive className="h-4 w-4" />}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span>{statusFilter}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("All")} className="text-[13px]">All</DropdownMenuItem>
              {DOCUMENT_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        flush
      >
        <DataTable
          data={filtered}
          columns={columns}
          searchKeys={["name", "fileName", "type"]}
          searchPlaceholder="Search documents..."
          pageSize={10}
          initialSort={{ key: "uploadedAt", dir: "desc" }}
          rowActions={[
            { label: "View", onClick: (d) => setViewing(d) },
            { label: "Download", onClick: (d) => downloadDoc(d) },
          ]}
          emptyTitle="No documents"
          emptyDescription="Upload your first document to populate the vault."
          emptyAction={
            <Btn variant="primary" size="sm" icon={<UploadCloud className="h-3.5 w-3.5" />} onClick={() => setUploadOpen(true)}>
              Upload document
            </Btn>
          }
        />
      </SectionCard>

      {/* Compliance checklist */}
      <SectionCard
        title="Compliance checklist"
        description="Required documents for active brokerage status. Reanzly onboarding requires all of these."
        icon={<FileCheck className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DOCUMENT_TYPES.map((t) => {
            const doc = docs.find((d) => d.type === t);
            const status = doc?.status ?? "Missing";
            const b = documentStatusBadge(status as DocumentStatus);
            return (
              <div
                key={t}
                className="flex items-center gap-2.5 rounded-[5px] border border-border bg-background p-2.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card text-muted-foreground">
                  {status === "Valid" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   status === "Missing" ? <AlertCircle className="h-3.5 w-3.5" /> :
                   <Clock className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-foreground">{t}</div>
                  <div className="mt-0.5">
                    <StatusBadge variant={b.variant} pulse={b.pulse}>{status}</StatusBadge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ===== Upload sheet ===== */}
      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
          <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
            <div className="space-y-1">
              <SheetTitle className="text-[16px] font-medium tracking-tight">Upload document</SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                Add a regulatory or commercial document to your vault. PDF, JPG, or PNG up to 5 MB.
              </SheetDescription>
            </div>
            <button
              onClick={() => setUploadOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
            <div className="flex flex-col gap-4">
              {/* Document name */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Document name <span className="text-foreground">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. GST Certificate 2025-26"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Type <span className="text-foreground">*</span>
                </label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as DocumentType }))}
                >
                  <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File picker */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">File</label>
                <button
                  type="button"
                  onClick={onPickFile}
                  className="tap flex w-full flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors hover:border-foreground/30 hover:bg-muted"
                >
                  <UploadCloud className="h-5 w-5 text-muted-foreground" />
                  <div className="text-[12px] font-medium text-foreground">
                    {form.fileName ? form.fileName : "Click to choose a file"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">PDF, JPG, or PNG · up to 5 MB</div>
                </button>
              </div>

              {/* Expiry */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">
                  Expiry date <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Leave blank if the document does not expire (e.g. PAN card).
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-foreground">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Optional internal notes about this document."
                  className="rounded-[5px] text-[12.5px]"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Btn variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon={<UploadCloud className="h-3.5 w-3.5" />} onClick={submitUpload}>
              Upload
            </Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ===== View-document sheet ===== */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
          {viewing && (
            <>
              <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
                <div className="space-y-1">
                  <SheetTitle className="text-[16px] font-medium tracking-tight">{viewing.name}</SheetTitle>
                  <SheetDescription className="text-[12px] text-muted-foreground">
                    {viewing.type} · {viewing.fileName}
                  </SheetDescription>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
                {/* Status pill */}
                <div className="flex items-center gap-2">
                  <StatusBadge variant={documentStatusBadge(viewing.status).variant} pulse={documentStatusBadge(viewing.status).pulse}>
                    {viewing.status}
                  </StatusBadge>
                  <span className="text-[11px] text-muted-foreground tabular">{viewing.sizeKB} KB</span>
                </div>

                {/* Preview placeholder */}
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-[6px] border border-border bg-muted/30 p-6 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div className="text-[12px] text-muted-foreground">PDF preview not available in demo</div>
                  <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadDoc(viewing)}>
                    Download to view
                  </Btn>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2">
                  <MetaTile label="Uploaded" value={formatDate(viewing.uploadedAt)} hint={relativeTime(viewing.uploadedAt)} />
                  <MetaTile label="Expires" value={viewing.expiresAt ? formatDate(viewing.expiresAt) : "No expiry"} hint={viewing.expiresAt ? relativeTime(viewing.expiresAt) : undefined} />
                  <MetaTile label="Type" value={viewing.type} />
                  <MetaTile label="File size" value={`${viewing.sizeKB} KB`} mono />
                </div>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadDoc(viewing)}>Download</Btn>
                <Btn variant="primary" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => toastInfo("Opening viewer", "External PDF viewer would open here.")}>Open viewer</Btn>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ===== Local UI helpers ===== */
function MetaTile({ label, value, hint, mono }: { label: string; value: string; hint?: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-1 text-[12.5px] font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground tabular">{hint}</div>}
    </div>
  );
}

export default BrokerDocuments;

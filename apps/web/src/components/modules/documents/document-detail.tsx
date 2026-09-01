"use client";
import { useState, useEffect } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, docStatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import type { DocumentRecord, Vehicle, Driver, Customer, Vendor } from "@/lib/types";
import {
  Pencil,
  Download,
  Upload,
  Trash2,
  FileText,
  Truck,
  User,
  Building2,
  Package,
  ChevronRight,
  Calendar,
  Hash,
  Building,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  daysUntil,
} from "./_helpers";
import { UploadDocumentDrawer } from "./upload-document-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "preview", label: "Document Preview" },
  { id: "history", label: "History" },
];

interface DocumentDetailProps {
  documentId: string;
  documents: DocumentRecord[];
  onUpdate: (id: string, data: Partial<DocumentRecord>) => Promise<boolean>;
}

export function DocumentDetail({ documentId, documents, onUpdate: onUpdateReal }: DocumentDetailProps) {
  const { navigate, navigateDetail } = useModuleNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const doc = documents.find((d) => d.id === documentId);
  const [editing, setEditing] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
      fetch("/api/customers").then((r) => (r.ok ? r.json() : { customers: [] })),
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : { vendors: [] })),
    ]).then(([v, d, c, ven]) => {
      setVehicles(v.vehicles ?? []);
      setDrivers(d.drivers ?? []);
      setCustomers(c.customers ?? []);
      setVendors(ven.vendors ?? []);
    });
  }, []);

  const handleUpdate = (id: string, data: Partial<DocumentRecord>) => {
    return onUpdateReal(id, data);
  };

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Document <span className="tabular">{documentId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("documents")}>Back to Documents</Btn>
      </div>
    );
  }

  const meta = docStatusBadge(doc.status);
  const daysToExpiry = daysUntil(doc.expiryDate);

  // Find linked entity
  let linkedEntity: { id: string; module: "vehicles" | "drivers-staff" | "customers" | "vendors" } | null = null;
  if (doc.entityType === "Vehicle") {
    const v = vehicles.find((x) => x.name === doc.entityName);
    if (v) linkedEntity = { id: v.id, module: "vehicles" };
  } else if (doc.entityType === "Driver") {
    const d = drivers.find((x) => x.name === doc.entityName);
    if (d) linkedEntity = { id: d.id, module: "drivers-staff" };
  } else if (doc.entityType === "Customer") {
    const c = customers.find((x) => x.companyName === doc.entityName);
    if (c) linkedEntity = { id: c.id, module: "customers" };
  } else if (doc.entityType === "Vendor") {
    const vd = vendors.find((x) => x.companyName === doc.entityName);
    if (vd) linkedEntity = { id: vd.id, module: "vendors" };
  }

  const EntityIcon = doc.entityType === "Vehicle" ? Truck : doc.entityType === "Driver" ? User : doc.entityType === "Vendor" ? Package : Building2;

  const actions = (
    <>
      <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Downloading", { description: doc.name })} aria-label="Download">
        <span className="hidden sm:inline">Download</span>
      </Btn>
      <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => toast.success("Replace document", { description: doc.name })}>
        <span className="hidden sm:inline">Replace</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Edit Metadata", onClick: () => setEditing(true) },
    { label: "Send Reminder", onClick: () => toast.success("Reminder sent", { description: `Renewal due in ${daysToExpiry}d` }) },
    { label: "Share Link", onClick: () => toast("Link copied", { description: doc.name }) },
    {
      label: "Delete",
      onClick: () => {
        toast(`Deleted document`, { description: doc.name });
        navigate("documents");
      },
    },
  ];

  // History
  const history = [
    { icon: Upload, label: "Document uploaded", detail: `by ${doc.uploadedBy}`, ts: doc.uploadDate },
    { icon: Pencil, label: "Metadata updated", detail: "issuing authority verified", ts: doc.uploadDate },
    ...(doc.status === "Expiring Soon" ? [{ icon: AlertTriangle, label: "Expiry alert sent", detail: `to fleet manager · ${daysToExpiry}d remaining`, ts: doc.uploadDate }] : []),
    ...(doc.status === "Expired" ? [{ icon: AlertTriangle, label: "Document expired", detail: "vehicle marked non-compliant", ts: doc.expiryDate || doc.uploadDate }] : []),
  ];

  return (
    <DetailLayout
      title={doc.name}
      subtitle={`${doc.type} · ${doc.entityType} document`}
      badges={<StatusBadge variant={meta.variant} pulse={meta.pulse}>{doc.status}</StatusBadge>}
      meta={
        <>
          <span className="flex items-center gap-1"><Building className="h-3 w-3" />{doc.entityName}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />issued {formatDate(doc.issueDate)}</span>
          {doc.expiryDate && (
            <span className="flex items-center gap-1 tabular"><Clock className="h-3 w-3" />expires {formatDate(doc.expiryDate)}</span>
          )}
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Document Type" value={doc.type} icon={<FileText className="h-3.5 w-3.5" />} />
            <StatCard label="Entity Type" value={doc.entityType} icon={<EntityIcon className="h-3.5 w-3.5" />} />
            <StatCard label="Status" value={doc.status} icon={doc.status === "Valid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} />
            <StatCard label="Days to Expiry" value={doc.expiryDate ? `${daysToExpiry}d` : "-"} icon={<Clock className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Document Metadata">
              <InfoRow label="Document Name" value={doc.name} />
              <InfoRow label="Document Type" value={doc.type} />
              <InfoRow label="Status" value={<StatusBadge variant={meta.variant} pulse={meta.pulse}>{doc.status}</StatusBadge>} />
              <InfoRow label="Issue Date" value={<span className="tabular">{formatDate(doc.issueDate)}</span>} />
              <InfoRow label="Expiry Date" value={doc.expiryDate ? <span className="tabular">{formatDate(doc.expiryDate)}</span> : "-"} />
              <InfoRow label="Days to Expiry" value={doc.expiryDate ? <span className="tabular">{daysToExpiry}d</span> : "-"} />
              <InfoRow label="Uploaded By" value={doc.uploadedBy} />
              <InfoRow label="Upload Date" value={<span className="tabular">{formatDateTime(doc.uploadDate)}</span>} />
            </InfoSection>

            <InfoSection title="Linked Entity">
              <div className="px-4 py-3">
                {linkedEntity ? (
                  <button
                    onClick={() => navigateDetail(linkedEntity!.module, linkedEntity!.id)}
                    className="w-full flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <EntityIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{doc.entityName}</div>
                        <div className="text-[11px] text-muted-foreground">{doc.entityType}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ) : (
                  <div className="text-[12px] text-muted-foreground py-4 text-center">No linked entity</div>
                )}
              </div>
            </InfoSection>
          </div>
        </div>
      )}

      {/* ===== Document Preview ===== */}
      {activeTab === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Document Preview</span>
              </div>
              <span className="text-[11px] text-muted-foreground">PDF · 1 page</span>
            </div>
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              {/* Mock document preview */}
              <div className="w-full max-w-md aspect-[1/1.414] rounded-[6px] border border-border bg-background p-8 flex flex-col">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{doc.type}</div>
                    <div className="text-[15px] font-medium text-foreground mt-1">{doc.entityName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Document #</div>
                    <div className="text-[12px] tabular text-foreground">DOC-{doc.id.slice(-6).toUpperCase()}</div>
                  </div>
                </div>
                <div className="flex-1 py-4 flex flex-col gap-2 text-[11px] text-muted-foreground">
                  <div className="flex justify-between"><span>Issue Date</span><span className="tabular text-foreground">{formatDate(doc.issueDate)}</span></div>
                  <div className="flex justify-between"><span>Expiry Date</span><span className="tabular text-foreground">{doc.expiryDate ? formatDate(doc.expiryDate) : "-"}</span></div>
                  <div className="flex justify-between"><span>Issuing Authority</span><span className="text-foreground">RTO Mumbai</span></div>
                  <div className="flex justify-between"><span>Status</span><span className="text-foreground">{doc.status}</span></div>
                  <div className="mt-auto pt-3 border-t border-border">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      This is a digitally issued certificate. Verify authenticity by scanning the QR code at the issuing authority's portal.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Btn size="sm" variant="outline" icon={<Download className="h-3 w-3" />} onClick={() => toast("Downloading PDF", { description: doc.name })}>
                  Download
                </Btn>
                <Btn size="sm" variant="outline" icon={<FileText className="h-3 w-3" />} onClick={() => toast("Opening print dialog")}>
                  Print
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== History ===== */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                {history.map((evt, i) => (
                  <div key={i} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                    {i < history.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                      <evt.icon className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[13px] font-medium text-foreground">{evt.label}</p>
                        <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{evt.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <UploadDocumentDrawer
        key={doc ? `edit-${doc.id}` : "closed"}
        open={editing}
        record={doc}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdate}
      />
    </DetailLayout>
  );
}

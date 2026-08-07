"use client";
import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, docStatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { DocumentRecord, Vehicle, Driver, Customer, Vendor } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  Truck,
  User,
  Building2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  DOCUMENT_TYPES,
  ENTITY_TYPES,
  formatDate,
} from "./_helpers";
import { UploadDocumentDrawer } from "./upload-document-drawer";

interface DocumentsListProps {
  onCreate: () => void;
  documents: DocumentRecord[];
  onUpdate: (id: string, data: Partial<DocumentRecord>) => Promise<boolean>;
}

const EXPIRY_FILTERS = [
  { id: "all", label: "All" },
  { id: "valid", label: "Valid" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "expired", label: "Expired" },
];

export function DocumentsList({ onCreate, documents, onUpdate: onUpdateReal }: DocumentsListProps) {
  const { navigateDetail } = useAppStore();
  const rows = documents;
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<Set<string>>(new Set());
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [expiryFilter, setExpiryFilter] = useState<string>("all");

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
    onUpdateReal(id, data);
  };

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.entityName.toLowerCase().includes(q) ||
          d.uploadedBy.toLowerCase().includes(q),
      );
    }
    if (docTypeFilter.size > 0) r = r.filter((d) => docTypeFilter.has(d.type));
    if (entityTypeFilter) r = r.filter((d) => d.entityType === entityTypeFilter);
    if (statusFilter.size > 0) r = r.filter((d) => statusFilter.has(d.status));
    if (expiryFilter !== "all") {
      const map: Record<string, string> = { valid: "Valid", expiring: "Expiring Soon", expired: "Expired" };
      r = r.filter((d) => d.status === map[expiryFilter]);
    }
    return r;
  }, [rows, search, docTypeFilter, entityTypeFilter, statusFilter, expiryFilter]);

  const toggleDocType = (t: string) =>
    setDocTypeFilter((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  // KPIs
  const total = rows.length;
  const validCount = rows.filter((d) => d.status === "Valid").length;
  const expiringCount = rows.filter((d) => d.status === "Expiring Soon").length;
  const expiredCount = rows.filter((d) => d.status === "Expired").length;

  const entityIcon = (type: string) => {
    if (type === "Vehicle") return <Truck className="h-3 w-3" />;
    if (type === "Driver") return <User className="h-3 w-3" />;
    if (type === "Customer") return <Building2 className="h-3 w-3" />;
    if (type === "Vendor") return <Package className="h-3 w-3" />;
    return <Building2 className="h-3 w-3" />;
  };

  const handleEntityClick = (d: DocumentRecord) => {
    if (d.entityType === "Vehicle") {
      const v = vehicles.find((x) => x.name === d.entityName);
      if (v) navigateDetail("vehicles", v.id);
    } else if (d.entityType === "Driver") {
      const dr = drivers.find((x) => x.name === d.entityName);
      if (dr) navigateDetail("drivers-staff", dr.id);
    } else if (d.entityType === "Customer") {
      const c = customers.find((x) => x.companyName === d.entityName);
      if (c) navigateDetail("customers", c.id);
    } else if (d.entityType === "Vendor") {
      const vd = vendors.find((x) => x.companyName === d.entityName);
      if (vd) navigateDetail("vendors", vd.id);
    }
  };

  const columns: Column<DocumentRecord>[] = [
    {
      key: "name",
      header: "Document Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[13px] font-medium text-foreground truncate">{r.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.type,
      render: (r) => <StatusBadge variant="outline">{r.type}</StatusBadge>,
    },
    {
      key: "entityType",
      header: "Entity Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.entityType,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
          {entityIcon(r.entityType)}
          {r.entityType}
        </span>
      ),
    },
    {
      key: "entityName",
      header: "Entity Name",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.entityName,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEntityClick(r);
          }}
          className="text-[12px] text-foreground hover:text-foreground/70 transition-colors truncate block max-w-[160px]"
        >
          {r.entityName}
        </button>
      ),
    },
    {
      key: "issueDate",
      header: "Issue Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.issueDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.issueDate)}</span>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.expiryDate || "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.expiryDate ? formatDate(r.expiryDate) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = docStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>{r.status}</StatusBadge>
        );
      },
    },
    {
      key: "uploadedBy",
      header: "Uploaded By",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.uploadedBy,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.uploadedBy}</span>,
    },
    {
      key: "uploadDate",
      header: "Upload Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.uploadDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.uploadDate)}</span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (d: DocumentRecord) => navigateDetail("documents", d.id) },
    { label: "Download", onClick: (d: DocumentRecord) => toast("Downloading", { description: d.name }) },
    { label: "Replace", onClick: (d: DocumentRecord) => toast("Replace document", { description: d.name }) },
    { label: "Edit Metadata", onClick: (d: DocumentRecord) => setEditing(d) },
    {
      label: "Delete",
      onClick: (d: DocumentRecord) => toast(`Deleted document`, { description: d.name }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: DocumentRecord[]) =>
        toast(`${selected.length} document${selected.length === 1 ? "" : "s"} exported`, { description: "ZIP file generated" }),
    },
    {
      label: "Send Reminders",
      onClick: (selected: DocumentRecord[]) =>
        toast.success(`${selected.length} reminder${selected.length === 1 ? "" : "s"} sent`),
    },
  ];

  const docTypeLabel = docTypeFilter.size === 0 ? "All" : docTypeFilter.size === 1 ? Array.from(docTypeFilter)[0] : `${docTypeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Documents"
        description="Centralised repository for vehicle fitness, insurance, permits, PUC, driver licenses, GST, contracts, and more - across every entity."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting documents", { description: "ZIP file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => {
                useAppStore.getState().navigate("document-studio");
                toast("Open Document Studio", {
                  description: "Generate offer letters, certifications, bills, quotations, NOCs and more - branded, customizable, downloadable.",
                });
              }}
            >
              <span className="hidden sm:inline">Document Studio</span>
            </Btn>
            <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={onCreate}>Upload Document</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="Total Documents" value={String(total)} hint={`${DOCUMENT_TYPES.length} types`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Valid" value={String(validCount)} hint={`${total > 0 ? Math.round((validCount / total) * 100) : 0}% valid`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Expiring Soon" value={String(expiringCount)} hint="within 30 days" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Expired" value={String(expiredCount)} hint="needs renewal" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search document name, type, entity…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{docTypeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by document type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DOCUMENT_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={docTypeFilter.has(t)} onCheckedChange={() => toggleDocType(t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Entity:</span>
                <span>{entityTypeFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by entity</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEntityTypeFilter("")} className="text-[13px]">All</DropdownMenuItem>
              <DropdownMenuSeparator />
              {ENTITY_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setEntityTypeFilter(t)} className="text-[13px]">{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={statusFilter.has("Valid")} onCheckedChange={() => toggleStatus("Valid")} className="text-[13px]">Valid</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.has("Expiring Soon")} onCheckedChange={() => toggleStatus("Expiring Soon")} className="text-[13px]">Expiring Soon</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.has("Expired")} onCheckedChange={() => toggleStatus("Expired")} className="text-[13px]">Expired</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Expiry:</span>
                <span>{EXPIRY_FILTERS.find((f) => f.id === expiryFilter)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Expiry range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EXPIRY_FILTERS.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => setExpiryFilter(f.id)} className="text-[13px]">{f.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(d) => navigateDetail("documents", d.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No documents uploaded"
          emptyDescription="Upload your first document to start tracking renewals."
          emptyAction={
            <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={onCreate}>
              Upload Document
            </Btn>
          }
          initialSort={{ key: "expiryDate", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {rows.length} documents across {ENTITY_TYPES.length} entity types · {DOCUMENT_TYPES.length} document types · {expiringCount + expiredCount} need attention
      </p>

      <UploadDocumentDrawer
        key={editing ? `edit-${editing.id}` : "closed"}
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

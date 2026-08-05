"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Search,
  ShieldCheck,
  FileSignature,
  Filter,
  X,
  Clock,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useHrStore } from "./_store";
import {
  DOC_TYPES,
  DOC_CATEGORIES,
  DOC_CATEGORY_LIST,
  type DocType,
  type DocCategory,
  type Employee,
  type DocumentRequest,
} from "./_data";
import {
  formatDate,
  relativeTime,
  docExpiryMeta,
  initials,
  FieldLabel,
} from "./_helpers";

interface DocRow {
  id: string; // composite: empId + docType
  empId: string;
  empCode: string;
  empName: string;
  designation: string;
  branch: string;
  docType: DocType;
  category: DocCategory;
  refNo?: string;
  verified: boolean;
  expiry?: string;
  eSigned: boolean;
}

export function Documents() {
  const employees = useHrStore((s) => s.employees);
  const docRequests = useHrStore((s) => s.docRequests);
  const setDocRequestStatus = useHrStore((s) => s.setDocRequestStatus);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [docTypeFilter, setDocTypeFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [expiryFilter, setExpiryFilter] = useState<string>("All");
  const [view, setView] = useState<"repository" | "expiring" | "requests">("repository");

  // Flatten all employee documents into rows
  const rows = useMemo<DocRow[]>(() => {
    const out: DocRow[] = [];
    for (const emp of employees) {
      for (const d of emp.documents) {
        out.push({
          id: `${emp.id}-${d.type}`,
          empId: emp.id,
          empCode: emp.empCode,
          empName: emp.name,
          designation: emp.designation,
          branch: emp.branch,
          docType: d.type,
          category: DOC_CATEGORIES[d.type] || "KYC",
          refNo: d.refNo,
          verified: d.verified,
          expiry: d.expiry,
          eSigned: d.verified && Math.floor(emp.empCode.slice(-1).charCodeAt(0)) % 2 === 0,
        });
      }
    }
    return out;
  }, [employees]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (docTypeFilter !== "All" && r.docType !== docTypeFilter) return false;
      if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
      if (expiryFilter !== "All") {
        const meta = docExpiryMeta(r.expiry);
        if (expiryFilter === "Expired" && !meta.label.startsWith("Expired")) return false;
        if (expiryFilter === "Expiring Soon" && !(meta.pulse && meta.label.includes("d left"))) return false;
        if (expiryFilter === "Verified" && !r.verified) return false;
        if (expiryFilter === "Pending" && r.verified) return false;
      }
      return true;
    });
  }, [rows, docTypeFilter, categoryFilter, expiryFilter]);

  // Aggregates
  const expiredCount = rows.filter((r) => {
    const meta = docExpiryMeta(r.expiry);
    return meta.label.startsWith("Expired");
  }).length;
  const expiringSoonCount = rows.filter((r) => {
    const meta = docExpiryMeta(r.expiry);
    return meta.pulse && meta.label.includes("d left");
  }).length;
  const verifiedCount = rows.filter((r) => r.verified).length;
  const pendingCount = rows.length - verifiedCount;

  const columns: Column<DocRow>[] = [
    {
      key: "empName",
      header: "Employee",
      sortable: true,
      sortValue: (r) => r.empName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium text-foreground">
            {initials(r.empName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">{r.empCode} · {r.designation}</span>
          </div>
        </div>
      ),
    },
    {
      key: "docType",
      header: "Document",
      sortable: true,
      sortValue: (r) => r.docType,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] text-foreground">{r.docType}</span>
          {r.refNo && (
            <span className="font-mono text-[10px] tabular text-muted-foreground">{r.refNo}</span>
          )}
        </div>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      sortable: true,
      sortValue: (r) => r.branch,
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-foreground">{r.branch}</span>,
    },
    {
      key: "expiry",
      header: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiry || "",
      hideOnMobile: true,
      render: (r) => {
        if (!r.expiry) return <span className="text-[11px] text-muted-foreground">-</span>;
        const meta = docExpiryMeta(r.expiry);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {meta.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "verified",
      header: "Verified",
      align: "center",
      render: (r) =>
        r.verified ? (
          <StatusBadge variant="solid">
            <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Verified
          </StatusBadge>
        ) : (
          <StatusBadge variant="outline" pulse>
            Pending
          </StatusBadge>
        ),
    },
    {
      key: "eSigned",
      header: "e-Sign",
      align: "center",
      hideOnMobile: true,
      render: (r) =>
        r.eSigned ? (
          <StatusBadge variant="outline">
            <FileSignature className="mr-0.5 h-2.5 w-2.5" /> Signed
          </StatusBadge>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[11px] tabular text-muted-foreground">
          {formatDate(r.expiry ? new Date(new Date(r.expiry).getTime() - 365 * 86400000).toISOString() : undefined)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Total Documents" value={String(rows.length)} icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiMini label="Verified" value={String(verifiedCount)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiMini label="Expiring Soon" value={String(expiringSoonCount)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiMini label="Expired" value={String(expiredCount)} icon={<X className="h-3.5 w-3.5" />} />
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
          {[
            { id: "repository", label: "Repository" },
            { id: "expiring", label: "Expiry Tracker" },
            { id: "requests", label: "Requests" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id as typeof view)}
              className={cn(
                "rounded-[3px] px-3 py-1.5 text-[12px] font-medium transition-colors tap",
                view === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.id === "requests" && docRequests.filter((r) => r.status === "Pending" || r.status === "Overdue").length > 0 && (
                <span className="ml-1.5 tabular">({docRequests.filter((r) => r.status === "Pending" || r.status === "Overdue").length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {view === "repository" && (
        <>
          {/* Filter bar */}
          <SectionCard
            title="Document Repository"
            description="Categorised by KYC, Education, Employment, Health, Legal, Statutory"
            icon={<FileText className="h-4 w-4" />}
            flush
            bodyClassName="px-4 py-3"
            action={
              <div className="flex items-center gap-2">
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<Upload className="h-3.5 w-3.5" />}
                  onClick={() => setUploadOpen(true)}
                >
                  Bulk Upload
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  icon={<Upload className="h-3.5 w-3.5" />}
                  onClick={() => setUploadOpen(true)}
                >
                  Upload
                </Btn>
              </div>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelect label="Document" value={docTypeFilter} options={["All", ...DOC_TYPES]} onChange={setDocTypeFilter} />
              <FilterSelect label="Category" value={categoryFilter} options={["All", ...DOC_CATEGORY_LIST]} onChange={setCategoryFilter} />
              <FilterSelect
                label="Status"
                value={expiryFilter}
                options={["All", "Verified", "Pending", "Expiring Soon", "Expired"]}
                onChange={setExpiryFilter}
              />
              <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                <Filter className="h-3 w-3" />
                <span className="tabular">{filtered.length} of {rows.length}</span>
              </div>
            </div>
          </SectionCard>

          <DataTable
            data={filtered}
            columns={columns}
            searchKeys={["empCode", "empName", "docType", "refNo"]}
            searchPlaceholder="Search by employee code, name, doc type…"
            onRowClick={(r) => {
              const emp = employees.find((e) => e.id === r.empId);
              if (emp) setSelectedEmp(emp);
            }}
            rowActions={[
              {
                label: "View Employee",
                onClick: (r) => {
                  const emp = employees.find((e) => e.id === r.empId);
                  if (emp) setSelectedEmp(emp);
                },
              },
              {
                label: "Download",
                onClick: (r) => toast.success("Document downloaded", { description: `${r.docType} · ${r.empName}` }),
              },
              {
                label: "Verify",
                onClick: (r) => toast.success("Document verified", { description: `${r.docType} · ${r.empName}` }),
              },
              {
                label: "Request Re-upload",
                onClick: (r) => toast.success("Re-upload requested", { description: `Employee notified: ${r.empName}` }),
              },
            ]}
            pageSize={20}
          />
        </>
      )}

      {view === "expiring" && (
        <ExpiryTrackerView rows={rows} />
      )}

      {view === "requests" && (
        <DocRequestsView
          requests={docRequests}
          onMarkReceived={(r) => {
            setDocRequestStatus(r.id, "Received");
            toast.success("Document received", { description: `${r.docType} · ${r.empName}` });
          }}
          onRequest={(r) => toast.success("Re-request sent", { description: `${r.empName} notified` })}
        />
      )}

      <EmployeeDocsDrawer
        employee={selectedEmp}
        onClose={() => setSelectedEmp(null)}
      />

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

// ============================================================
// Expiry Tracker View - all docs with expiry date, sorted by urgency
// ============================================================
function ExpiryTrackerView({ rows }: { rows: DocRow[] }) {
  const expiringRows = rows
    .filter((r) => r.expiry)
    .map((r) => ({
      ...r,
      daysUntil: Math.ceil((new Date(r.expiry!).getTime() - Date.now()) / 86400000),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Group by urgency
  const expired = expiringRows.filter((r) => r.daysUntil < 0);
  const critical = expiringRows.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 15);
  const soon = expiringRows.filter((r) => r.daysUntil > 15 && r.daysUntil <= 60);
  const ok = expiringRows.filter((r) => r.daysUntil > 60);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Expired" value={String(expired.length)} icon={<X className="h-3.5 w-3.5" />} />
        <KpiMini label="Critical (≤15d)" value={String(critical.length)} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiMini label="Soon (≤60d)" value={String(soon.length)} icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiMini label="Valid (>60d)" value={String(ok.length)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </div>

      <SectionCard
        title="Expiry Tracker"
        description={`${expiringRows.length} documents with expiry dates · sorted by urgency`}
        icon={<Clock className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {["Employee", "Doc", "Ref No", "Expiry", "Days Left", "Status", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expiringRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Inbox className="h-5 w-5" />}
                      title="No documents with expiry"
                      description="Driving Licence, Medical Fitness, Police Verification will appear here."
                      compact
                    />
                  </td>
                </tr>
              ) : (
                expiringRows.map((r) => {
                  const meta = docExpiryMeta(r.expiry);
                  return (
                    <tr key={r.id} className="hover:bg-accent/30">
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
                          <span className="font-mono text-[10px] tabular text-muted-foreground">{r.empCode} · {r.designation}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-foreground">{r.docType}</td>
                      <td className="px-3 py-2.5 font-mono text-[10.5px] tabular text-muted-foreground">{r.refNo || "-"}</td>
                      <td className="px-3 py-2.5 text-[11.5px] tabular text-foreground">{formatDate(r.expiry)}</td>
                      <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                        {r.daysUntil < 0 ? `${Math.abs(r.daysUntil)}d ago` : `${r.daysUntil}d`}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge variant={meta.variant} pulse={meta.pulse}>{meta.label}</StatusBadge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Btn
                          variant="outline"
                          size="xs"
                          onClick={() => toast.success("Renewal reminder sent", { description: `${r.empName} · ${r.docType}` })}
                        >
                          Remind
                        </Btn>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================
// Doc Requests View
// ============================================================
function DocRequestsView({
  requests,
  onMarkReceived,
  onRequest,
}: {
  requests: DocumentRequest[];
  onMarkReceived: (r: DocumentRequest) => void;
  onRequest: (r: DocumentRequest) => void;
}) {
  const active = requests.filter((r) => r.status === "Pending" || r.status === "Overdue");
  const received = requests.filter((r) => r.status === "Received");
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Pending Document Requests"
        description={`${active.length} awaiting submission`}
        icon={<FileText className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
        action={
          <Btn variant="primary" size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => toast.info("Request Document", { description: "Open the request form." })}>
            New Request
          </Btn>
        }
      >
        <div className="divide-y divide-border">
          {active.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No pending document requests.
            </div>
          ) : (
            active.map((r) => {
              const isOverdue = r.status === "Overdue" || new Date(r.dueDate).getTime() < Date.now();
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">
                    {initials(r.empName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
                      <StatusBadge variant="outline" className="font-mono">{r.empCode}</StatusBadge>
                      <StatusBadge variant="muted">{r.docType}</StatusBadge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Requested {relativeTime(r.requestedOn)} · Due {formatDate(r.dueDate)}
                    </div>
                    <div className="mt-1 text-[11px] text-foreground">{r.reason}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge variant={isOverdue ? "solid" : "outline"} pulse={isOverdue}>
                      {isOverdue ? "Overdue" : "Pending"}
                    </StatusBadge>
                    <Btn variant="outline" size="xs" icon={<ChevronRight className="h-3 w-3" />} onClick={() => onMarkReceived(r)}>
                      Received
                    </Btn>
                    <Btn variant="ghost" size="xs" onClick={() => onRequest(r)}>
                      Re-request
                    </Btn>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Received Documents"
        description={`${received.length} submitted`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {received.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No documents received yet.
            </div>
          ) : (
            received.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
                    <StatusBadge variant="muted">{r.docType}</StatusBadge>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground">
                    Received {relativeTime(r.receivedOn)} · Due was {formatDate(r.dueDate)}
                  </div>
                </div>
                <Btn variant="ghost" size="xs" onClick={() => toast.success("Document opened", { description: r.docType })}>
                  View
                </Btn>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] font-medium transition-colors hover:bg-accent tap">
          <span className="text-muted-foreground">{label}:</span>
          <span className="max-w-[130px] truncate text-foreground">{value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto scrollbar-thin">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className={cn("text-[13px]", opt === value && "font-medium")}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmployeeDocsDrawer({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        {employee && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-[16px] font-medium tracking-tight">
                  {employee.name}
                </SheetTitle>
                <SheetClose asChild>
                  <button className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </SheetClose>
              </div>
              <SheetDescription className="text-[12px]">
                {employee.empCode} · {employee.designation} · {employee.branch}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Documents ({employee.documents.length})
                </h4>
                <Btn variant="outline" size="sm" icon={<Upload className="h-3.5 w-3.5" />}>
                  Add Doc
                </Btn>
              </div>
              <div className="flex flex-col gap-2">
                {employee.documents.map((d, i) => {
                  const meta = docExpiryMeta(d.expiry);
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-[5px] border border-border p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-foreground">{d.type}</span>
                          {d.expiry && (
                            <StatusBadge variant={meta.variant} pulse={meta.pulse}>
                              {meta.label}
                            </StatusBadge>
                          )}
                        </div>
                        {d.refNo && (
                          <span className="font-mono text-[10.5px] tabular text-muted-foreground">
                            {d.refNo}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={d.verified ? "solid" : "outline"} pulse={!d.verified}>
                            {d.verified ? "Verified" : "Pending"}
                          </StatusBadge>
                          {d.expiry && (
                            <span className="text-[10.5px] tabular text-muted-foreground">
                              Expires {formatDate(d.expiry)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[5px] border border-border bg-muted/30 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Compliance Status
                </div>
                <p className="text-[12px] text-muted-foreground">
                  {employee.designation === "Driver"
                    ? "Driver role requires: DL, Police Verification, Medical Fitness. All must be valid and verified."
                    : "Standard employee KYC: Aadhaar, PAN, Photo, Bank Passbook."}
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function UploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [eSigned, setESigned] = useState(false);
  const [verified, setVerified] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium tracking-tight">
            Upload Document
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Bulk upload supported - select multiple files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel required>Document Type</FieldLabel>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-full items-center justify-between rounded-[5px] border border-border bg-background px-2.5 text-[13px] text-foreground transition-colors hover:bg-accent tap">
                  <span className="text-muted-foreground">Select type…</span>
                  <Filter className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[440px] max-h-72 overflow-y-auto scrollbar-thin">
                {DOC_TYPES.map((t) => (
                  <DropdownMenuItem key={t} className="text-[13px]">{t}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Drop zone */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
            <Upload className="h-7 w-7 text-muted-foreground" />
            <div className="text-[12.5px] text-foreground">Drag &amp; drop files here</div>
            <div className="text-[11px] text-muted-foreground">or click to browse · PDF, JPG, PNG · max 10MB</div>
            <Btn variant="outline" size="sm" icon={<Search className="h-3.5 w-3.5" />}>
              Browse Files
            </Btn>
          </div>

          <div className="flex items-center justify-between rounded-[5px] border border-border p-3">
            <div>
              <div className="text-[13px] font-medium text-foreground">Mark as verified</div>
              <div className="text-[11px] text-muted-foreground">Document has been physically checked</div>
            </div>
            <Switch checked={verified} onCheckedChange={setVerified} />
          </div>
          <div className="flex items-center justify-between rounded-[5px] border border-border p-3">
            <div>
              <div className="text-[13px] font-medium text-foreground">Request e-Signature</div>
              <div className="text-[11px] text-muted-foreground">Send to employee via Aadhaar e-Sign</div>
            </div>
            <Switch checked={eSigned} onCheckedChange={setESigned} />
          </div>
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={<Upload className="h-3.5 w-3.5" />}
            onClick={() => {
              toast.success("Document uploaded", {
                description: verified ? "Marked as verified." : "Pending verification.",
              });
              onClose();
              setESigned(false);
              setVerified(false);
            }}
          >
            Upload
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KpiMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

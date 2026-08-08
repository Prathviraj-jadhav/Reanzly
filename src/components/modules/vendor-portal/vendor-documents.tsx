"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge, docStatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { ChipGroup, type FilterChipOption } from "@/components/shared/toolbar";
import {
  FileText,
  Lock,
  Download,
  Eye,
  FileCheck2,
  Calendar,
} from "lucide-react";
import {
  formatDate,
  type VendorSubView,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

/* ============================================================
   VendorDocuments - read-only document library for the vendor.
   ------------------------------------------------------------
   Backed by GET /api/vendor-portal/documents (real Document rows
   with entityType "Customer" and entityId = the customer's name -
   see that route's comment on why there's no FK for this case).
   Filter by category (LR, Invoice, POD, eWay Bill, Statement).
   ============================================================ */

interface PortalDocument {
  id: string; name: string; type: string; issueDate: string;
  expiryDate?: string; status: string; uploadDate: string;
}

interface VendorDocumentsProps {
  onNavigate?: (view: VendorSubView) => void;
}

function docCategory(d: PortalDocument): string {
  const t = d.type.toLowerCase();
  if (t.includes("statement") || t.includes("compliance") || t.includes("gst") || t.includes("pan")) return "Statement";
  if (t.includes("pod")) return "POD";
  if (t.includes("eway") || t.includes("e-way")) return "eWay Bill";
  return "LR";
}

export function VendorDocuments(_props: VendorDocumentsProps) {
  void _props;
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/vendor-portal/documents")
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then(({ documents }) => {
        setDocs(documents ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return docs;
    return docs.filter((d) => docCategory(d) === filter);
  }, [filter, docs]);

  const categoryOptions: FilterChipOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    docs.forEach((d) => {
      const c = docCategory(d);
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return [
      { label: "All", value: "All", count: docs.length },
      ...Object.entries(counts).map(([k, v]) => ({ label: k, value: k, count: v })),
    ];
  }, [docs]);

  const columns: Column<PortalDocument>[] = [
    {
      key: "name",
      header: "Document Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-[12.5px] font-medium text-foreground">{r.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (r) => docCategory(r),
      hideOnMobile: true,
      render: (r) => <StatusBadge variant="outline">{docCategory(r)}</StatusBadge>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.type}</span>,
    },
    {
      key: "issueDate",
      header: "Issue Date",
      sortable: true,
      sortValue: (r) => r.issueDate,
      hideOnMobile: true,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.issueDate ? formatDate(r.issueDate) : "-"}</span>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry",
      sortable: true,
      sortValue: (r) => r.expiryDate || "",
      hideOnMobile: true,
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
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = docStatusBadge(r.status);
        return <StatusBadge variant={meta.variant} pulse={meta.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toastInfo("Document opened", `${r.name} - preview in new tab`);
            }}
            className="tap inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`View ${r.name}`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toastInfo("Download started", `${r.name} - PDF download initiated`);
            }}
            className="tap inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Download ${r.name}`}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read-only library
            </div>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Documents
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              All your LR copies, invoices, PODs, eWay bills, and monthly statements in one place. Download or view any document.
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <ChipGroup
          options={categoryOptions}
          value={filter}
          onChange={(v) => setFilter((Array.isArray(v) ? v[0] : v) || "All")}
          allowMultiple={false}
          showCounts
        />
      </div>

      {/* Table */}
      <SectionCard
        title={`Documents (${filtered.length})`}
        description={filter === "All" ? "All document types" : `Filtered: ${filter}`}
        icon={<FileCheck2 className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading documents…</div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            searchKeys={["name", "type"]}
            searchPlaceholder="Search documents, types..."
            pageSize={10}
            emptyTitle="No documents"
            emptyDescription="Documents will appear here once they're shared with you."
          />
        )}
      </SectionCard>

      {/* Footer note */}
      <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>
          Monthly statements are issued on the 1st of every month. Past statements remain available for 7 years per GST retention rules.
        </span>
      </div>
    </div>
  );
}

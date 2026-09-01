"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Plus,
  Search,
  Download,
  Printer,
  Copy,
  Archive,
  Eye,
  FileText,
  Layers,
  CheckCircle2,
  Send,
  Clock,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useDocStudioStore } from "./_store";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  templateById,
  docStatusBadge,
  type GeneratedDocument,
} from "./_data";
import { formatINR, formatDate, relativeTime, KpiTile } from "./_helpers";

interface StudioListProps {
  onCreate: () => void;
  onView: (docId: string) => void;
}

export function StudioList({ onCreate, onView }: StudioListProps) {
  const documents = useDocStudioStore((s) => s.documents);
  const duplicate = useDocStudioStore((s) => s.duplicateDocument);
  const archive = useDocStudioStore((s) => s.archiveDocument);

  const [search, setSearch] = useState("");
  const [tplFilter, setTplFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let r = documents;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.docNumber.toLowerCase().includes(q) ||
          d.recipientName.toLowerCase().includes(q) ||
          (d.recipientOrg ?? "").toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (tplFilter.size > 0) r = r.filter((d) => tplFilter.has(d.templateId));
    if (statusFilter.size > 0) r = r.filter((d) => statusFilter.has(d.status));
    return r;
  }, [documents, search, tplFilter, statusFilter]);

  const toggleTpl = (id: string) =>
    setTplFilter((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  // ===== KPIs =====
  const total = documents.length;
  const issuedCount = documents.filter((d) => d.status === "Issued").length;
  const sentCount = documents.filter((d) => d.status === "Sent").length;
  const draftCount = documents.filter((d) => d.status === "Draft").length;
  const thisMonth = documents.filter((d) => {
    const created = new Date(d.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const columns: Column<GeneratedDocument>[] = [
    {
      key: "docNumber",
      header: "Doc No.",
      sortable: true,
      sortValue: (r) => r.docNumber,
      width: "160px",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[12px] tabular text-foreground">{r.docNumber}</span>
          <span className="text-[10px] text-muted-foreground">{templateById(r.templateId)?.shortLabel ?? r.templateId}</span>
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => {
        const Icon = templateById(r.templateId)?.icon ?? FileText;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[13px] font-medium text-foreground truncate">{r.title}</span>
          </div>
        );
      },
    },
    {
      key: "recipientName",
      header: "Recipient",
      sortable: true,
      sortValue: (r) => r.recipientName,
      width: "200px",
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12.5px] text-foreground truncate">{r.recipientName || "-"}</span>
          {r.recipientOrg && (
            <span className="text-[11px] text-muted-foreground truncate">{r.recipientOrg}</span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      width: "130px",
      align: "right",
      sortValue: (r) => r.totalAmount ?? 0,
      render: (r) =>
        r.totalAmount ? (
          <span className="tabular text-[12.5px] text-foreground">{formatINR(r.totalAmount)}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={docStatusBadge(r.status)}>{r.status}</StatusBadge>
      ),
    },
    {
      key: "reanzlyBranded",
      header: "Branding",
      width: "120px",
      hideOnMobile: true,
      render: (r) =>
        r.branding.reanzlyBranded ? (
          <StatusBadge variant="outline">
            <span className="font-mono text-[10px]">RZ-Branded</span>
          </StatusBadge>
        ) : (
          <span className="text-[11px] text-muted-foreground">White-label</span>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="tabular text-[12px] text-foreground">{formatDate(r.createdAt)}</span>
          <span className="text-[10.5px] text-muted-foreground">{relativeTime(r.createdAt)}</span>
        </div>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View / Preview",
      icon: <Eye className="h-3.5 w-3.5" />,
      onClick: (d: GeneratedDocument) => onView(d.id),
    },
    {
      label: "Download PDF",
      icon: <Download className="h-3.5 w-3.5" />,
      onClick: (d: GeneratedDocument) => {
        onView(d.id);
        toast("Opening print preview", {
          description: "Use Save as PDF in the print dialog.",
        });
      },
    },
    {
      label: "Print",
      icon: <Printer className="h-3.5 w-3.5" />,
      onClick: (d: GeneratedDocument) => {
        onView(d.id);
        toast("Print dialog will open in preview");
      },
    },
    {
      label: "Duplicate",
      icon: <Copy className="h-3.5 w-3.5" />,
      onClick: (d: GeneratedDocument) => {
        const copy = duplicate(d.id);
        if (copy) {
          toast.success("Document duplicated", { description: copy.docNumber });
        }
      },
    },
    {
      label: "Archive",
      icon: <Archive className="h-3.5 w-3.5" />,
      onClick: (d: GeneratedDocument) => {
        archive(d.id);
        toast.success("Document archived", { description: d.docNumber });
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export CSV",
      onClick: (sel: GeneratedDocument[]) =>
        toast(`${sel.length} document${sel.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Archive",
      onClick: (sel: GeneratedDocument[]) => {
        sel.forEach((d) => archive(d.id));
        toast.success(`${sel.length} archived`);
      },
    },
  ];

  const tplLabel =
    tplFilter.size === 0
      ? "All templates"
      : tplFilter.size === 1
        ? templateById(Array.from(tplFilter)[0] as any)?.label ?? "1 template"
        : `${tplFilter.size} templates`;
  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Document Studio"
        description="Generate, customize, brand and download every business document - offer letters, certifications, bills, invoices, quotations, POs, delivery notes, NOCs, payslips and more."
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
            New Document
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={<Layers className="h-3.5 w-3.5" />} label="Total Docs" value={String(total)} hint="all time" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Issued" value={String(issuedCount)} hint="ready to send" />
        <KpiTile icon={<Send className="h-3.5 w-3.5" />} label="Sent" value={String(sentCount)} hint="delivered" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Drafts" value={String(draftCount)} hint="in progress" />
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="This Month" value={String(thisMonth)} hint="new docs" />
      </div>

      {/* Filter bar */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doc no, title, recipient…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Template:</span>
                <span className="max-w-[140px] truncate">{tplLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 max-h-80 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by template
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TEMPLATES.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t.id}
                  checked={tplFilter.has(t.id)}
                  onCheckedChange={() => toggleTpl(t.id)}
                  className="text-[13px]"
                >
                  <span className="flex items-center gap-2">
                    <span>{t.label}</span>
                    <span className="text-[10px] text-muted-foreground">· {t.category}</span>
                  </span>
                </DropdownMenuCheckboxItem>
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
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Draft", "Issued", "Sent", "Archived"].map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleStatus(s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "document" : "documents"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(d) => onView(d.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No documents yet"
          emptyDescription="Pick a template and generate your first customized, branded document."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              Browse Templates
            </Btn>
          }
          initialSort={{ key: "createdAt", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {documents.length} documents · {TEMPLATES.length} templates across {TEMPLATE_CATEGORIES.length} categories · Every document supports &quot;Created by Reanzly&quot; branding toggle and PDF download.
      </p>
    </div>
  );
}

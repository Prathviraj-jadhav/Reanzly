"use client";
import { useState, useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { Invoice } from "@/lib/types";
import { CUSTOMERS, TRIPS, PAYMENTS } from "@/lib/mock-data";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  FileText,
  Banknote,
  AlertTriangle,
  TrendingUp,
  Palette,
  Send,
  CheckCircle2,
  LayoutTemplate,
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
  INVOICE_STATUSES,
  PAYMENT_STATUSES,
  formatDate,
  formatINR,
  daysUntil,
  invoiceStatusBadge,
  paymentStatusVariant,
  type SavedInvoiceTemplate,
} from "./_helpers";
import { InvoiceTemplates } from "./invoice-templates";

interface InvoiceListProps {
  onCreate: () => void;
  onRecordPayment: (invoice: Invoice) => void;
  /** Lifted in-memory invoice list so recorded payments & edits reflect
   *  without a reload. When omitted, the static INVOICES mock is used. */
  invoices?: Invoice[];
  /** Open the invoice designer (Task 15-d). Pass null to design the
   *  default template (no invoice selected). */
  onCustomizeDesign?: (invoice: Invoice | null) => void;
  /** Open the release drawer for a single invoice (Task 15-d). */
  onRelease?: (invoice: Invoice) => void;
  /** Open the bulk release drawer for a set of invoices (Task 15-d). */
  onBulkRelease?: (invoices: Invoice[]) => void;
  /** Apply a status patch to one or more invoices (used by bulk Mark as Sent). */
  onUpdateStatus?: (invoices: Invoice[], status: Invoice["status"]) => void;
  /** Saved templates for the Templates tab (Task 15-d). */
  templates?: SavedInvoiceTemplate[];
  /** Use a saved template (apply as default). */
  onUseTemplate?: (tpl: SavedInvoiceTemplate) => void;
  /** Edit a saved template (opens the designer with its config). */
  onEditTemplate?: (tpl: SavedInvoiceTemplate) => void;
  /** Delete a user-saved template. */
  onDeleteTemplate?: (id: string) => void;
  /** Set a template as the org default. */
  onSetDefaultTemplate?: (id: string) => void;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
];

export function InvoiceList({
  onCreate,
  onRecordPayment,
  invoices,
  onCustomizeDesign,
  onRelease,
  onBulkRelease,
  onUpdateStatus,
  templates,
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onSetDefaultTemplate,
}: InvoiceListProps) {
  const { navigateDetail, currentRole } = useAppStore();
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<Set<string>>(
    new Set(),
  );
  const [dateRange, setDateRange] = useState<string>("all");
  // Task 15-d: top-level chip filter - All / Draft / Sent / Paid / Templates.
  // The first four pre-apply the status filter; Templates swaps the body for
  // the saved-templates grid.
  const [viewMode, setViewMode] = useState<"all" | "Draft" | "Sent" | "Paid" | "Templates">("all");

  // Role-specific column gating (Step D).
  //  • Finance manager / accountant: GST, TDS, net receivable, aging bucket,
  //    "Record payment" row action.
  //  • Owner: also sees margin + customer credit days.
  //  • Accountant: GST return cycle + journal posted flag.
  const roleId = currentRole?.id ?? "";
  const isFinance = ["finance-manager", "accountant", "owner"].includes(roleId);
  const isAccountant = roleId === "accountant";
  const isOwner = roleId === "owner";

  // Role-aware empty-state copy + CTA. Customers land on the vendor portal
  // (read-only) so they get a calm "your invoices will appear here" message
  // instead of a Create CTA they can't act on. Finance-manager / accountant
  // / owner all see the "Create Invoice" CTA (their primary create flow).
  // Everyone else also gets the create CTA since invoice creation is
  // generally a back-office task.
  const isCustomer = roleId === "customer";
  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => {
    if (isCustomer) {
      return {
        title: "Your invoices will appear here",
        description: "Open and paid invoices will show up here as they are generated. Download a copy anytime.",
        action: null,
      };
    }
    return {
      title: "No invoices yet",
      description: "Create your first invoice from a delivered trip or service.",
      action: (
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
          Create Invoice
        </Btn>
      ),
    };
  }, [isCustomer, onCreate]);

  const invoicesSource = invoices ?? [];

  const uniqueCustomers = useMemo(
    () => Array.from(new Set(invoicesSource.map((i) => i.customer))).sort(),
    [invoicesSource],
  );

  const filtered = useMemo(() => {
    let result = invoicesSource;
    // Top-level chip filter (Draft / Sent / Paid) pre-applies a status gate
    // so finance users can flip between buckets in a single click without
    // touching the multi-select Status dropdown.
    if (viewMode === "Draft" || viewMode === "Sent" || viewMode === "Paid") {
      result = result.filter((i) => i.status === viewMode);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customer.toLowerCase().includes(q) ||
          (i.tripRef || "").toLowerCase().includes(q),
      );
    }
    if (customerFilter) {
      result = result.filter((i) => i.customer === customerFilter);
    }
    if (statusFilter.size > 0) {
      result = result.filter((i) => statusFilter.has(i.status));
    }
    if (paymentStatusFilter.size > 0) {
      result = result.filter((i) => paymentStatusFilter.has(i.paymentStatus));
    }
    if (dateRange !== "all") {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        "7d": 7 * 86400000,
        "30d": 30 * 86400000,
        "90d": 90 * 86400000,
        ytd: now - new Date(new Date().getFullYear(), 0, 1).getTime(),
      };
      const cutoff = cutoffs[dateRange];
      if (cutoff) {
        result = result.filter(
          (i) => now - new Date(i.invoiceDate).getTime() <= cutoff,
        );
      }
    }
    return result;
  }, [invoicesSource, search, customerFilter, statusFilter, paymentStatusFilter, dateRange, viewMode]);

  const toggleStatus = (status: string) => {
    setStatusFilter((s) => {
      const next = new Set(s);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };
  const togglePaymentStatus = (status: string) => {
    setPaymentStatusFilter((s) => {
      const next = new Set(s);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice Number",
      sortable: true,
      sortValue: (r) => r.invoiceNumber,
      width: "150px",
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.invoiceNumber}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (r) => r.customer,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[10px] font-medium tabular">
            {r.customer
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {r.customer}
            </div>
            {r.tripRef && (
              <div className="text-[11px] tabular text-muted-foreground">
                {r.tripRef}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "invoiceDate",
      header: "Invoice Date",
      sortable: true,
      hideable: true,
      width: "120px",
      sortValue: (r) => r.invoiceDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.invoiceDate)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      hideable: true,
      width: "120px",
      sortValue: (r) => r.dueDate,
      render: (r) => {
        const dueIn = daysUntil(r.dueDate);
        const overdue = r.paymentStatus !== "Paid" && dueIn < 0;
        return (
          <div className="flex flex-col">
            <span
              className={
                overdue
                  ? "tabular text-[12px] font-medium text-foreground"
                  : "tabular text-[12px] text-muted-foreground"
              }
            >
              {formatDate(r.dueDate)}
            </span>
            {overdue && (
              <span className="text-[10px] text-foreground">
                {Math.abs(dueIn)}d overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="tabular text-[13px]">{formatINR(r.amount)}</span>
      ),
    },
    {
      key: "taxAmount",
      header: "Tax Amount",
      sortable: true,
      hideable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.taxAmount,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatINR(r.taxAmount)}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.totalAmount,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">
          {formatINR(r.totalAmount)}
        </span>
      ),
    },
    // ----- Finance: GST, TDS, net receivable, aging bucket -----
    ...(isFinance
      ? [
          {
            key: "gstAmount",
            header: "GST",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "110px",
            sortValue: (r: Invoice) => r.taxAmount,
            render: (r: Invoice) => (
              <span className="tabular text-[12px] text-foreground">
                {formatINR(r.taxAmount)}
              </span>
            ),
          } as Column<Invoice>,
          {
            key: "tdsAmount",
            header: "TDS",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "110px",
            sortValue: (r: Invoice) => Math.round(r.amount * 0.02),
            render: (r: Invoice) => {
              // TDS @ 2% on contractor (logistics) - typical Indian TDS slab.
              const tds = Math.round(r.amount * 0.02);
              return (
                <span className="tabular text-[12px] text-muted-foreground">
                  {formatINR(tds)}
                </span>
              );
            },
          } as Column<Invoice>,
          {
            key: "netReceivable",
            header: "Net Receivable",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "130px",
            sortValue: (r: Invoice) => r.totalAmount - Math.round(r.amount * 0.02),
            render: (r: Invoice) => {
              const tds = Math.round(r.amount * 0.02);
              const net = r.totalAmount - tds;
              return (
                <span className="tabular text-[12px] font-medium text-foreground">
                  {formatINR(net)}
                </span>
              );
            },
          } as Column<Invoice>,
          {
            key: "agingBucket",
            header: "Aging",
            sortable: true,
            hideable: true,
            width: "100px",
            sortValue: (r: Invoice) => {
              const dueIn = daysUntil(r.dueDate);
              if (r.paymentStatus === "Paid") return -1;
              if (dueIn > 0) return 0;
              return Math.abs(dueIn);
            },
            render: (r: Invoice) => {
              if (r.paymentStatus === "Paid") {
                return <StatusBadge variant="muted">Settled</StatusBadge>;
              }
              const dueIn = daysUntil(r.dueDate);
              if (dueIn > 0) {
                return <StatusBadge variant="outline">0–30</StatusBadge>;
              }
              const overdueDays = Math.abs(dueIn);
              if (overdueDays <= 30) {
                return <StatusBadge variant="solid">0–30</StatusBadge>;
              }
              if (overdueDays <= 60) {
                return <StatusBadge variant="solid" pulse>31–60</StatusBadge>;
              }
              return <StatusBadge variant="solid" pulse>60+</StatusBadge>;
            },
          } as Column<Invoice>,
        ]
      : []),
    // ----- Accountant: GST return cycle + journal posted flag -----
    ...(isAccountant || isOwner
      ? [
          {
            key: "gstReturnCycle",
            header: "GST Return",
            sortable: true,
            hideable: true,
            width: "110px",
            sortValue: (r: Invoice) => {
              const month = new Date(r.invoiceDate).getMonth();
              return month;
            },
            render: (r: Invoice) => {
              const month = new Date(r.invoiceDate).getMonth();
              // Quarterly GSTR-1 filing rhythm: Q1, Q2, Q3, Q4.
              const q = Math.floor(month / 3) + 1;
              return (
                <span className="tabular text-[12px] text-foreground">Q{q}</span>
              );
            },
          } as Column<Invoice>,
          {
            key: "journalPosted",
            header: "Journal Posted",
            sortable: true,
            hideable: true,
            width: "120px",
            sortValue: (r: Invoice) =>
              r.status === "Paid" || r.status === "Sent" ? 1 : 0,
            render: (r: Invoice) => {
              const posted = r.status === "Paid" || r.status === "Sent";
              return (
                <StatusBadge variant={posted ? "solid" : "muted"}>
                  {posted ? "Posted" : "Pending"}
                </StatusBadge>
              );
            },
          } as Column<Invoice>,
        ]
      : []),
    // ----- Owner: margin + customer credit days -----
    ...(isOwner
      ? [
          {
            key: "margin",
            header: "Margin",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "100px",
            sortValue: (r: Invoice) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              return 14 + (seed % 18);
            },
            render: (r: Invoice) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              const margin = 14 + (seed % 18);
              return (
                <span className="tabular text-[12px] font-medium text-foreground">
                  {margin}%
                </span>
              );
            },
          } as Column<Invoice>,
          {
            key: "customerCreditDays",
            header: "Credit Days",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "100px",
            sortValue: (r: Invoice) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              return [15, 30, 45, 60][seed % 4];
            },
            render: (r: Invoice) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              const days = [15, 30, 45, 60][seed % 4];
              return (
                <span className="tabular text-[12px] text-foreground">
                  {days}d
                </span>
              );
            },
          } as Column<Invoice>,
        ]
      : []),
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = invoiceStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.paymentStatus,
      render: (r) => (
        <StatusBadge variant={paymentStatusVariant(r.paymentStatus)}>
          {r.paymentStatus}
        </StatusBadge>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View",
      onClick: (i: Invoice) => navigateDetail("invoice", i.invoiceNumber),
    },
    // Finance: surface "Record Payment" near the top of the action list so
    // it's reachable without scrolling through Send/Print noise.
    ...(isFinance
      ? [
          {
            label: "Record Payment",
            onClick: (i: Invoice) => onRecordPayment(i),
          },
        ]
      : []),
    // Task 15-d: Release opens the dedicated release drawer (replaces the
    // legacy "Send Email" toast-only action).
    ...(onRelease
      ? [
          {
            label: "Release Invoice",
            onClick: (i: Invoice) => onRelease(i),
          },
        ]
      : []),
    // Task 15-d: Customize Design opens the designer for this invoice.
    ...(onCustomizeDesign
      ? [
          {
            label: "Customize Design",
            onClick: (i: Invoice) => onCustomizeDesign(i),
          },
        ]
      : []),
    {
      label: "Edit",
      onClick: (i: Invoice) => {
        if (i.status !== "Draft") {
          toast("Cannot edit", {
            description: "Only Draft invoices can be edited.",
          });
          return;
        }
        // Open the detail view (which surfaces the Edit button that opens
        // the focused EditInvoiceDrawer).
        navigateDetail("invoice", i.invoiceNumber);
      },
    },
    {
      label: "Send Email",
      onClick: (i: Invoice) =>
        toast.success("Invoice emailed", {
          description: `${i.invoiceNumber} sent to ${i.customer}`,
        }),
    },
    {
      label: "Send SMS",
      onClick: (i: Invoice) =>
        toast.success("Invoice SMS sent", {
          description: `${i.invoiceNumber} · ${i.customer}`,
        }),
    },
    {
      label: "Record Payment",
      onClick: (i: Invoice) => onRecordPayment(i),
    },
    {
      label: "Generate Credit Note",
      onClick: (i: Invoice) =>
        toast("Credit note drafted", {
          description: `Against ${i.invoiceNumber}`,
        }),
    },
    {
      label: "Generate Debit Note",
      onClick: (i: Invoice) =>
        toast("Debit note drafted", {
          description: `Against ${i.invoiceNumber}`,
        }),
    },
    {
      label: "Download PDF",
      onClick: (i: Invoice) =>
        toast("PDF generated", { description: i.invoiceNumber }),
    },
    {
      label: "Print",
      onClick: (i: Invoice) =>
        toast("Opening print preview", { description: i.invoiceNumber }),
    },
    {
      label: "Cancel Invoice",
      onClick: (i: Invoice) => {
        onUpdateStatus?.([i], "Cancelled");
        toast(`Cancelled ${i.invoiceNumber}`, {
          description: "Status set to Cancelled",
        });
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    // Task 15-d: bulk release - opens the dedicated bulk release drawer for
    // >1 selected invoices; falls back to the single-invoice drawer for 1.
    ...(onBulkRelease || onRelease
      ? [
          {
            label: "Release Selected",
            onClick: (rows: Invoice[]) => {
              if (rows.length === 0) return;
              if (rows.length === 1 && onRelease) {
                onRelease(rows[0]);
                return;
              }
              if (onBulkRelease) {
                onBulkRelease(rows);
              } else if (onRelease) {
                // Fallback: if no bulk drawer is wired, release each row
                // individually via the single-invoice drawer.
                onRelease(rows[0]);
              }
            },
          },
        ]
      : []),
    // Task 15-d: bulk Mark as Sent - quick toggle without the release drawer.
    ...(onUpdateStatus
      ? [
          {
            label: "Mark as Sent",
            onClick: (rows: Invoice[]) => {
              const drafts = rows.filter((r) => r.status === "Draft");
              if (drafts.length === 0) {
                toast("No Draft invoices selected", {
                  description: "Mark as Sent only applies to Draft rows.",
                });
                return;
              }
              onUpdateStatus(drafts, "Sent");
              toast.success(`${drafts.length} invoice${drafts.length === 1 ? "" : "s"} marked as Sent`);
            },
          },
        ]
      : []),
    // Task 15-d: bulk assign - opens a toast pointing the user to per-row
    // assignment via the detail view (since assignees are contact-specific).
    {
      label: "Assign to Contact",
      onClick: (rows: Invoice[]) => {
        if (rows.length === 0) return;
        toast(`${rows.length} invoices selected`, {
          description:
            "Open each invoice's detail view to pick assignees from the customer's contacts.",
        });
      },
    },
    {
      label: "Export",
      onClick: (rows: Invoice[]) =>
        toast(`${rows.length} invoice${rows.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Send Email",
      onClick: (rows: Invoice[]) =>
        toast.success(`${rows.length} invoice${rows.length === 1 ? "" : "s"} emailed`),
    },
  ];

  // KPI metrics - computed from the lifted list so recorded payments reflect.
  const totalInvoiced = invoicesSource.reduce((s, i) => s + i.totalAmount, 0);
  const totalOutstanding = invoicesSource.filter(
    (i) => i.paymentStatus !== "Paid" && i.status !== "Cancelled",
  ).reduce((s, i) => s + i.totalAmount, 0);
  const totalOverdue = invoicesSource.filter(
    (i) => i.status === "Overdue",
  ).reduce((s, i) => s + i.totalAmount, 0);
  const now = Date.now();
  const paidThisMonth = invoicesSource.filter(
    (i) =>
      i.paymentStatus === "Paid" &&
      now - new Date(i.invoiceDate).getTime() <= 30 * 86400000,
  ).reduce((s, i) => s + i.totalAmount, 0);

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;
  const paymentLabel =
    paymentStatusFilter.size === 0
      ? "All"
      : paymentStatusFilter.size === 1
        ? Array.from(paymentStatusFilter)[0]
        : `${paymentStatusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Invoice"
        description="Generate GST-compliant invoices, track payments, and manage receivables."
        actions={
          <>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Exporting invoices", {
                  description: "CSV file generated",
                })
              }
            >
              Export
            </Btn>
            {/* Task 15-d: Customize Design entry point at the toolbar.
                Opens the designer for the default template (no invoice). */}
            {onCustomizeDesign && (
              <Btn
                icon={<Palette className="h-3.5 w-3.5" />}
                onClick={() => onCustomizeDesign(null)}
              >
                Customize Design
              </Btn>
            )}
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Create Invoice
            </Btn>
          </>
        }
      />

      {/* Task 15-d: top-level chip filter - All / Draft / Sent / Paid / Templates.
          The chip bar lets finance users pivot between status buckets and the
          saved-templates grid without dropping into the multi-select filter. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "all", label: "All", icon: FileText, count: invoicesSource.length },
          { id: "Draft", label: "Draft", icon: FileText, count: invoicesSource.filter((i) => i.status === "Draft").length },
          { id: "Sent", label: "Sent", icon: Send, count: invoicesSource.filter((i) => i.status === "Sent").length },
          { id: "Paid", label: "Paid", icon: CheckCircle2, count: invoicesSource.filter((i) => i.status === "Paid").length },
          { id: "Templates", label: "Templates", icon: LayoutTemplate, count: templates?.length ?? 0 },
        ] as const).map((chip) => {
          const Icon = chip.icon;
          const active = viewMode === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setViewMode(chip.id)}
              className={
                "flex h-7 items-center gap-1.5 rounded-[3px] border px-2.5 text-[12px] font-medium transition-colors " +
                (active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-accent")
              }
            >
              <Icon className="h-3 w-3" />
              {chip.label}
              <span className={"tabular text-[10px] " + (active ? "text-background/70" : "text-muted-foreground")}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Total Invoiced"
          value={formatINR(totalInvoiced)}
        />
        <KpiTile
          icon={<Banknote className="h-3.5 w-3.5" />}
          label="Outstanding"
          value={formatINR(totalOutstanding)}
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Overdue"
          value={formatINR(totalOverdue)}
        />
        <KpiTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Paid (30d)"
          value={formatINR(paidThisMonth)}
        />
      </div>

      {/* Templates view (Task 15-d) */}
      {viewMode === "Templates" ? (
        <div className="rounded-[6px] border border-border bg-card p-4">
          <InvoiceTemplates
            templates={templates ?? []}
            onUseTemplate={(tpl) => {
              onUseTemplate?.(tpl);
              toast.success("Template applied", {
                description: `${tpl.name} is now the default for new invoices`,
              });
            }}
            onEditTemplate={(tpl) => {
              onEditTemplate?.(tpl);
            }}
            onDeleteTemplate={(id) => {
              onDeleteTemplate?.(id);
              toast("Template deleted", { description: id });
            }}
            onSetDefault={(id) => {
              onSetDefaultTemplate?.(id);
              toast.success("Default template updated");
            }}
          />
        </div>
      ) : (
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Custom toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer, trip…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          {/* Customer single-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Customer:</span>
                <span className="max-w-[110px] truncate">
                  {customerFilter || "All"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 max-h-72 overflow-y-auto scrollbar-thin"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by customer
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setCustomerFilter("")}
                className="text-[13px]"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueCustomers.map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setCustomerFilter(c)}
                  className="text-[13px]"
                >
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {INVOICE_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleStatus(s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setStatusFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Payment status multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Payment:</span>
                <span className="max-w-[100px] truncate">{paymentLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by payment status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PAYMENT_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={paymentStatusFilter.has(s)}
                  onCheckedChange={() => togglePaymentStatus(s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {paymentStatusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setPaymentStatusFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Range:</span>
                <span>
                  {DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Invoice date
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DATE_RANGE_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setDateRange(p.id)}
                  className="text-[13px]"
                >
                  {p.label}
                </DropdownMenuItem>
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
          onRowClick={(i) => navigateDetail("invoice", i.invoiceNumber)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "invoiceDate", dir: "desc" }}
        />
      </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {invoicesSource.length} invoices · {CUSTOMERS.length} customers ·{" "}
        {TRIPS.length} trips · {PAYMENTS.length} payments · 18% GST default on
        logistics services
      </p>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { InfoRow, InfoSection } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  FileText,
  Building2,
  Lock,
  Download,
  Printer,
  Receipt,
} from "lucide-react";
import {
  formatINR,
  formatDate,
  relativeTime,
  invoiceStatusBadge,
  paymentStatusBadge,
  type Invoice,
} from "./_helpers";
import { toastInfo, toastSuccess } from "@/lib/toast";

/* ============================================================
   VendorInvoices - read-only DataTable of the vendor's invoices.
   ------------------------------------------------------------
   Backed by GET /api/vendor-portal/invoices (real Invoice rows
   scoped to the logged-in customer, same DTO as /api/invoices).
   Line items are an illustrative percentage breakdown, not real
   stored data - this app has no line-item model for Invoice
   anywhere (not even the main Invoices module), so this stays
   clearly labeled as an estimate rather than claiming to be real.
   ============================================================ */

export function VendorInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/vendor-portal/invoices")
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then(({ invoices }) => {
        setInvoices(invoices ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      sortable: true,
      sortValue: (r) => r.invoiceNumber,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
          className="tabular text-[12.5px] font-medium text-foreground hover:underline underline-offset-4"
        >
          {r.invoiceNumber}
        </button>
      ),
    },
    {
      key: "invoiceDate",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.invoiceDate,
      hideOnMobile: true,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.invoiceDate)}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (r) => r.customer,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          {r.customer}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      sortValue: (r) => r.amount,
      align: "right",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.amount)}</span>,
    },
    {
      key: "taxAmount",
      header: "Tax",
      sortable: true,
      sortValue: (r) => r.taxAmount,
      align: "right",
      hideOnMobile: true,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.taxAmount)}</span>,
    },
    {
      key: "totalAmount",
      header: "Total",
      sortable: true,
      sortValue: (r) => r.totalAmount,
      align: "right",
      render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{formatINR(r.totalAmount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const b = invoiceStatusBadge(r.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      sortValue: (r) => r.paymentStatus,
      hideOnMobile: true,
      render: (r) => {
        const b = paymentStatusBadge(r.paymentStatus);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.paymentStatus}</StatusBadge>;
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      sortValue: (r) => r.dueDate,
      hideOnMobile: true,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.dueDate)}</span>,
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
              Read-only view
            </div>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Invoices
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              All invoices raised against your account. Click any row for totals, an estimated charge breakdown, and PDF download.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <SectionCard
        title={`Invoices (${invoices.length})`}
        description="Read-only - filtered to your vendor account."
        icon={<FileText className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading invoices…</div>
        ) : (
          <DataTable
            data={invoices}
            columns={columns}
            searchKeys={["invoiceNumber", "customer", "tripRef"]}
            searchPlaceholder="Search invoices, customers, trips..."
            onRowClick={(r) => setSelected(r)}
            pageSize={10}
            emptyTitle="No invoices"
            emptyDescription="You don't have any invoices yet."
          />
        )}
      </SectionCard>

      <InvoiceDetailSheet invoice={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ============================================================
   InvoiceDetailSheet - read-only side sheet for a single invoice.
   ============================================================ */

interface InvoiceDetailSheetProps {
  invoice: Invoice | null;
  onClose: () => void;
}

function InvoiceDetailSheet({ invoice, onClose }: InvoiceDetailSheetProps) {
  const open = invoice !== null;
  const b = invoice ? invoiceStatusBadge(invoice.status) : null;
  const pb = invoice ? paymentStatusBadge(invoice.paymentStatus) : null;

  const downloadPdf = () => {
    if (!invoice) return;
    try {
      window.print();
    } catch {
      toastInfo("PDF download", `${invoice.invoiceNumber} - print dialog blocked; please use the browser print menu.`);
      return;
    }
    toastSuccess("PDF download started", `${invoice.invoiceNumber} · ${formatINR(invoice.totalAmount)}`);
  };

  // Illustrative charge breakdown (this app has no real Invoice line-item
  // model to read from - see file header comment).
  const lineItems = invoice
    ? [
        { desc: "Freight charges", qty: 1, rate: Math.round(invoice.amount * 0.78), total: Math.round(invoice.amount * 0.78) },
        { desc: "Loading & unloading", qty: 1, rate: Math.round(invoice.amount * 0.12), total: Math.round(invoice.amount * 0.12) },
        { desc: "Detention/halt charges", qty: 1, rate: Math.round(invoice.amount * 0.06), total: Math.round(invoice.amount * 0.06) },
        { desc: "Fuel surcharge", qty: 1, rate: Math.round(invoice.amount * 0.04), total: Math.round(invoice.amount * 0.04) },
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {invoice && b && pb && (
          <>
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                <span className="tabular">{invoice.invoiceNumber}</span>
              </SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                Issued {relativeTime(invoice.invoiceDate)} · Due {formatDate(invoice.dueDate)}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge variant={b.variant} pulse={b.pulse}>{invoice.status}</StatusBadge>
                <StatusBadge variant={pb.variant} pulse={pb.pulse}>{invoice.paymentStatus}</StatusBadge>
                {invoice.tripRef && <StatusBadge variant="outline">Trip {invoice.tripRef}</StatusBadge>}
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" />
                  Read-only
                </span>
              </div>
            </SheetHeader>

            {/* Body */}
            <div className="flex flex-col gap-4 p-4">
              {/* Header info */}
              <InfoSection title="Invoice details">
                <InfoRow label="Invoice #" value={invoice.invoiceNumber} mono />
                <InfoRow label="Issued" value={formatDate(invoice.invoiceDate)} mono />
                <InfoRow label="Due" value={formatDate(invoice.dueDate)} mono />
                <InfoRow label="Customer" value={invoice.customer} />
                {invoice.tripRef && <InfoRow label="Trip reference" value={invoice.tripRef} mono />}
              </InfoSection>

              {/* Line items */}
              <SectionCard
                title="Estimated charge breakdown"
                description="Freight + accessory charges, estimated from the invoice total."
                icon={<Receipt className="h-4 w-4" />}
                flush
                bodyClassName="p-0"
              >
                <table className="w-full text-[12px]">
                  <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Description</th>
                      <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                      <th className="px-3 py-1.5 text-right font-medium">Rate</th>
                      <th className="px-3 py-1.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td className="px-3 py-2 text-foreground">{li.desc}</td>
                        <td className="px-3 py-2 text-right tabular text-muted-foreground">{li.qty}</td>
                        <td className="px-3 py-2 text-right tabular text-muted-foreground">{formatINR(li.rate)}</td>
                        <td className="px-3 py-2 text-right tabular font-medium text-foreground">{formatINR(li.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/20">
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground" colSpan={3}>Subtotal</td>
                      <td className="px-3 py-2 text-right tabular text-foreground">{formatINR(invoice.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </SectionCard>

              {/* Totals */}
              <InfoSection title="Totals">
                <InfoRow label="Subtotal" value={formatINR(invoice.amount)} mono />
                {invoice.igst !== undefined && <InfoRow label="IGST (18%)" value={formatINR(invoice.igst)} mono />}
                {invoice.cgst !== undefined && <InfoRow label="CGST (9%)" value={formatINR(invoice.cgst)} mono />}
                {invoice.sgst !== undefined && <InfoRow label="SGST (9%)" value={formatINR(invoice.sgst)} mono />}
                {invoice.igst === undefined && <InfoRow label="Tax (18%)" value={formatINR(invoice.taxAmount)} mono />}
                <InfoRow label="Total" value={formatINR(invoice.totalAmount)} mono hint="GST inclusive" />
              </InfoSection>

              {/* Payment status - see the Ledger tab for actual payment
                  transactions; this app doesn't yet link a specific payment
                  to a specific invoice, so a per-invoice history isn't
                  fabricated here. */}
              <InfoSection title="Payment">
                <InfoRow
                  label="Status"
                  value={invoice.paymentStatus}
                  hint={invoice.paymentStatus === "Paid" ? "see the Ledger tab for the payment entry" : "not yet paid"}
                />
              </InfoSection>

              {/* Footer actions - download PDF + print */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Btn variant="primary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadPdf}>
                  Download PDF
                </Btn>
                <Btn variant="outline" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toastInfo("Print dialog", "Use your browser's print dialog to save as PDF.")}>
                  Print
                </Btn>
                <div className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Read-only - disputes via account manager
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

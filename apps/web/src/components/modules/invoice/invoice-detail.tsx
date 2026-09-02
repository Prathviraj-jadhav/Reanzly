"use client";
import { useState, useMemo, useEffect } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { Invoice, Customer, Payment } from "@/lib/types";
import { EditInvoiceDrawer } from "./edit-invoice-drawer";
import {
  Building2,
  MapPin,
  Banknote,
  Pencil,
  Send,
  Download,
  Printer,
  FileText,
  Receipt,
  Clock,
  XCircle,
  Truck,
  Palette,
  Users,
  CheckCircle2,
  Mail,
  MessageCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatINR,
  formatDateTime,
  daysUntil,
  invoiceStatusBadge,
  paymentStatusVariant,
  stateNameFromCode,
  INVOICE_TEMPLATES,
  PAGE_FORMATS,
  ORIENTATIONS,
  ACCENT_CHOICES,
  FONT_CHOICES,
  contactsForCustomer,
  contactById,
  type InvoiceMeta,
  type InvoiceDesignConfig,
  type InvoiceActivityEntry,
  type InvoiceReleaseLog,
} from "./_helpers";

const TABS = [
  { id: "invoice", label: "Invoice View" },
  { id: "payments", label: "Payment History" },
  { id: "activity", label: "Activity Log" },
  // Task 15-d: design tab shows the current PDF design + customize entry.
  { id: "design", label: "Design" },
];

interface InvoiceDetailProps {
  invoiceNumber: string;
  /** Lifted in-memory invoice list so edits mutate locally. Optional - when
   *  omitted, the static INVOICES mock is used (read-only display). */
  invoices?: Invoice[];
  onRecordPayment: (invoice: Invoice) => void;
  onUpdate?: (id: string, data: Partial<Invoice>) => void;
  /** Task 15-d: per-invoice meta (assigned contacts, design, activity, release). */
  meta?: InvoiceMeta;
  /** Open the invoice designer (Task 15-d). */
  onCustomizeDesign?: (invoice: Invoice) => void;
  /** Open the release drawer (Task 15-d). */
  onRelease?: (invoice: Invoice) => void;
  /** Update the assigned-contact list for this invoice. */
  onAssign?: (invoice: Invoice, contactIds: string[]) => void;
}

export function InvoiceDetail({
  invoiceNumber,
  invoices,
  onRecordPayment,
  onUpdate,
  meta,
  onCustomizeDesign,
  onRelease,
  onAssign,
}: InvoiceDetailProps) {
    const { goToModule: navigate, goToDetail: navigateDetail } = useAppNavigation();
  const [activeTab, setActiveTab] = useState("invoice");
  const [editOpen, setEditOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : { customers: [] }))
      .then((data) => setCustomers(data.customers ?? []))
      .catch(() => {});
  }, []);

  const invoice = useMemo(
    () => (invoices ?? []).find((i) => i.invoiceNumber === invoiceNumber),
    [invoices, invoiceNumber],
  );

  const customer = useMemo(
    () => customers.find((c) => c.companyName === invoice?.customer),
    [customers, invoice],
  );

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Invoice <span className="tabular">{invoiceNumber}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("invoice")}>
          Back to Invoices
        </Btn>
      </div>
    );
  }

  const statusMeta = invoiceStatusBadge(invoice.status);
  const isCreditNote = invoice.status === "Credit Note";
  const isCancelled = invoice.status === "Cancelled";

  const actions = (
    <>
      {!isCancelled && (
        <Btn
          icon={<Pencil className="h-3.5 w-3.5" />}
          onClick={() => {
            if (invoice.status !== "Draft") {
              toast("Cannot edit", {
                description: "Only Draft invoices can be edited.",
              });
              return;
            }
            setEditOpen(true);
          }}
        >
          Edit
        </Btn>
      )}
      {/* Task 15-d: Customize Design opens the designer with this invoice's
          current design pre-loaded. */}
      {onCustomizeDesign && (
        <Btn
          icon={<Palette className="h-3.5 w-3.5" />}
          onClick={() => onCustomizeDesign(invoice)}
        >
          Customize
        </Btn>
      )}
      {/* Task 15-d: Release replaces the legacy Send toast. Opens the
          dedicated release drawer (recipients, channel, schedule). */}
      {!isCancelled && !isCreditNote && onRelease && (
        <Btn
          variant="primary"
          icon={<Send className="h-3.5 w-3.5" />}
          onClick={() => onRelease(invoice)}
        >
          Release
        </Btn>
      )}
      {/* Legacy Send button (toast-only) kept for users who haven't adopted
          the release flow yet - only rendered when no onRelease handler. */}
      {!isCancelled && !isCreditNote && !onRelease && (
        <Btn
          icon={<Send className="h-3.5 w-3.5" />}
          onClick={() =>
            toast.success("Invoice sent", {
              description: `${invoice.invoiceNumber} emailed to ${invoice.customer}`,
            })
          }
        >
          Send
        </Btn>
      )}
      {!isCancelled && invoice.paymentStatus !== "Paid" && (
        <Btn
          variant="primary"
          icon={<Banknote className="h-3.5 w-3.5" />}
          onClick={() => onRecordPayment(invoice)}
        >
          Record Payment
        </Btn>
      )}
    </>
  );

  const quickActions = [
    {
      label: "Generate Credit Note",
      onClick: () =>
        toast("Credit note drafted", {
          description: `Against ${invoice.invoiceNumber}`,
        }),
    },
    {
      label: "Generate Debit Note",
      onClick: () =>
        toast("Debit note drafted", {
          description: `Against ${invoice.invoiceNumber}`,
        }),
    },
    {
      label: "Download PDF",
      onClick: () =>
        toast("PDF generated", { description: invoice.invoiceNumber }),
    },
    {
      label: "Print",
      onClick: () =>
        toast("Opening print preview", { description: invoice.invoiceNumber }),
    },
    {
      label: "Cancel Invoice",
      onClick: () => {
        onUpdate?.(invoice.id, { status: "Cancelled" });
        toast(`Cancelled ${invoice.invoiceNumber}`, {
          description: "Status set to Cancelled",
        });
      },
    },
  ];

  const dueIn = daysUntil(invoice.dueDate);
  const overdue = invoice.paymentStatus !== "Paid" && dueIn < 0;

  return (
    <>
    <DetailLayout
      title={invoice.invoiceNumber}
      subtitle={invoice.customer}
      badges={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
            {invoice.status}
          </StatusBadge>
          <StatusBadge variant={paymentStatusVariant(invoice.paymentStatus)}>
            {invoice.paymentStatus}
          </StatusBadge>
          {overdue && (
            <StatusBadge variant="solid" pulse>
              {Math.abs(dueIn)}d overdue
            </StatusBadge>
          )}
        </div>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {formatDate(invoice.invoiceDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due {formatDate(invoice.dueDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {formatINR(invoice.totalAmount)}
          </span>
          {invoice.tripRef && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" />
              <button
                onClick={() => invoice.tripRef && navigateDetail("trips", invoice.tripRef)}
                className="text-foreground underline-offset-2 hover:underline"
              >
                {invoice.tripRef}
              </button>
            </span>
          )}
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {activeTab === "invoice" && (
        <InvoiceViewTab invoice={invoice} customer={customer} meta={meta} onAssign={onAssign} />
      )}
      {activeTab === "payments" && <PaymentHistoryTab invoice={invoice} />}
      {activeTab === "activity" && <ActivityLogTab invoice={invoice} meta={meta} />}
      {activeTab === "design" && (
        <DesignTab
          invoice={invoice}
          meta={meta}
          onCustomizeDesign={onCustomizeDesign}
        />
      )}
    </DetailLayout>
      <EditInvoiceDrawer
        open={editOpen}
        invoice={invoice}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
        // Task 15-d: pass the assigned-contact list so the editor can also
        // manage assignees in the same drawer (Add/Edit parity).
        assignedContactIds={meta?.assignedContactIds ?? []}
        onAssign={onAssign}
      />
    </>
  );
}

// ===== Invoice View Tab =====
function InvoiceViewTab({
  invoice,
  customer,
  meta,
  onAssign,
}: {
  invoice: Invoice;
  customer?: Customer;
  meta?: InvoiceMeta;
  onAssign?: (invoice: Invoice, contactIds: string[]) => void;
}) {
    const { goToModule: navigate } = useAppNavigation();
  // Deterministic line items derived from invoice
  const seed = parseInt(invoice.id.replace(/\D/g, "")) || 1;
  const lineItems = useMemo(() => {
    const descriptions = [
      "Transport of goods - FTL",
      "Loading & unloading",
      "Detention charges",
      "Door delivery",
    ];
    const hsnCodes = ["996511", "996521", "996531", "996541"];
    const items: {
      description: string;
      hsn: string;
      qty: number;
      rate: number;
      amount: number;
      taxRate: number;
      taxAmount: number;
    }[] = [];
    let running = 0;
    let runningTax = 0;
    const numLines = (seed % 3) + 1;
    for (let i = 0; i < numLines; i++) {
      const rate = Math.round((invoice.amount / numLines) * (1 - i * 0.1));
      const qty = 1;
      const amount = rate * qty;
      const taxRate = invoice.igst !== undefined ? 18 : 18;
      const taxAmount = Math.round((amount * taxRate) / 100);
      items.push({
        description: descriptions[(seed + i) % descriptions.length],
        hsn: hsnCodes[(seed + i) % hsnCodes.length],
        qty,
        rate,
        amount,
        taxRate,
        taxAmount,
      });
      running += amount;
      runningTax += taxAmount;
    }
    return items;
  }, [invoice, seed]);

  const isInterState = invoice.igst !== undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Top KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Taxable Amount"
          value={formatINR(invoice.amount)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Tax Amount"
          value={formatINR(invoice.taxAmount)}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="Total"
          value={formatINR(invoice.totalAmount)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Outstanding"
          value={formatINR(
            invoice.paymentStatus === "Paid"
              ? 0
              : invoice.paymentStatus === "Partially Paid"
                ? Math.round(invoice.totalAmount * 0.4)
                : invoice.totalAmount,
          )}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Formatted invoice card */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Header: bill-from / bill-to */}
        <div className="grid grid-cols-1 gap-0 border-b border-border sm:grid-cols-3">
          <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
            <div className="mb-2 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bill From
              </span>
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-foreground">
                Reanzly Logistics Pvt. Ltd.
              </p>
              <p className="text-[12px] text-muted-foreground">
                Plot 14, Transport Nagar
              </p>
              <p className="text-[12px] text-muted-foreground">
                Andheri East, Mumbai - 400069
              </p>
              <p className="text-[12px] tabular text-muted-foreground">
                GSTIN: 27AABCR1234F1Z5
              </p>
              <p className="text-[12px] tabular text-muted-foreground">
                State: Maharashtra (27)
              </p>
            </div>
          </div>
          <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bill To
              </span>
            </div>
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-foreground">
                {invoice.customer}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {customer?.city ?? "-"}, {seed % 28 + 1} Industrial Estate
              </p>
              <p className="text-[12px] tabular text-muted-foreground">
                GSTIN: {customer?.gstin ?? "-"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                State:{" "}
                {customer
                  ? stateNameFromCode(customer.gstin.slice(0, 2))
                  : "-"}
              </p>
              <p className="text-[12px] tabular text-muted-foreground">
                {customer?.phone ?? "-"}
              </p>
              {/* Task 15-d: assigned contacts strip */}
              <div className="mt-2 border-t border-border pt-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Assigned To
                  </span>
                </div>
                {meta && meta.assignedContactIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {meta.assignedContactIds.map((id) => {
                      const c = contactById(id);
                      if (!c) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-[2px] border border-border bg-background px-1.5 py-0.5 text-[11px]"
                        >
                          <span className="text-foreground">{c.name}</span>
                          <span className="text-muted-foreground">({c.role})</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No assignees - invoice will be sent to the default billing contact.
                  </p>
                )}
                {onAssign && (
                  <AssignToInline
                    // Remount whenever the assigned-contact set changes so
                    // the local draft state re-initializes from the latest
                    // prop without a synchronous setState-in-effect.
                    key={(meta?.assignedContactIds ?? []).join(",") || "none"}
                    invoice={invoice}
                    selectedIds={meta?.assignedContactIds ?? []}
                    onAssign={onAssign}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Invoice Details
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">
                  Invoice #
                </span>
                <span className="text-[12px] tabular font-medium">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Date</span>
                <span className="text-[12px] tabular">
                  {formatDate(invoice.invoiceDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Due</span>
                <span className="text-[12px] tabular">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">
                  Terms
                </span>
                <span className="text-[12px]">
                  {customer?.paymentTerms ?? "Net 30"}
                </span>
              </div>
              {invoice.tripRef && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">
                    Trip Ref
                  </span>
                  <span className="text-[12px] tabular">
                    {invoice.tripRef}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line items table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {[
                  "Description",
                  "HSN/SAC",
                  "Qty",
                  "Rate",
                  "Amount",
                  "Tax %",
                  "Tax",
                  "Total",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ${
                      i >= 2 && i <= 6 ? "text-right" : i === 7 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineItems.map((li, idx) => (
                <tr key={idx} className="hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2.5 text-[13px] text-foreground">
                    {li.description}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                    {li.hsn}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] tabular">
                    {li.qty}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] tabular">
                    {formatINR(li.rate)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] tabular">
                    {formatINR(li.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular text-muted-foreground">
                    {li.taxRate}%
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12px] tabular text-muted-foreground">
                    {formatINR(li.taxAmount)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                    {formatINR(li.amount + li.taxAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 gap-0 border-t border-border sm:grid-cols-2">
          <div className="hidden p-4 sm:block">
            <p className="text-[11px] text-muted-foreground">
              {invoice.amount > 50000 ? "Material received in good condition." : "Goods transported as per LR."}
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Subject to Mumbai jurisdiction · E. & O.E.
            </p>
          </div>
          <div className="border-t border-border p-4 sm:border-l sm:border-t-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Subtotal (Taxable)</span>
                <span className="tabular">{formatINR(invoice.amount)}</span>
              </div>
              {isInterState ? (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">IGST (18%)</span>
                  <span className="tabular">{formatINR(invoice.igst ?? 0)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">CGST (9%)</span>
                    <span className="tabular">
                      {formatINR(invoice.cgst ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">SGST (9%)</span>
                    <span className="tabular">
                      {formatINR(invoice.sgst ?? 0)}
                    </span>
                  </div>
                </>
              )}
              <div className="border-t border-border pt-1.5">
                <div className="flex items-center justify-between text-[14px] font-medium">
                  <span>Total</span>
                  <span className="tabular">
                    {formatINR(invoice.totalAmount)}
                  </span>
                </div>
              </div>
              {invoice.paymentStatus !== "Unpaid" &&
                invoice.paymentStatus !== "Overdue" && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">
                      {invoice.paymentStatus === "Paid"
                        ? "Received"
                        : "Partially Received"}
                    </span>
                    <span className="tabular">
                      {formatINR(
                        invoice.paymentStatus === "Paid"
                          ? invoice.totalAmount
                          : Math.round(invoice.totalAmount * 0.6),
                      )}
                    </span>
                  </div>
                )}
              {invoice.paymentStatus !== "Paid" && (
                <div className="flex items-center justify-between text-[13px] font-medium">
                  <span>Balance Due</span>
                  <span className="tabular">
                    {formatINR(
                      invoice.paymentStatus === "Partially Paid"
                        ? Math.round(invoice.totalAmount * 0.4)
                        : invoice.totalAmount,
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bank details + notes */}
        <div className="grid grid-cols-1 gap-0 border-t border-border sm:grid-cols-2">
          <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
            <div className="mb-2 flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Bank Details
              </span>
            </div>
            <div className="space-y-0.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bank</span>
                <span className="text-foreground">HDFC Bank</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account</span>
                <span className="tabular text-foreground">
                  50200012345678
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IFSC</span>
                <span className="tabular text-foreground">HDFC0001234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Branch</span>
                <span className="text-foreground">Andheri East</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Notes & Terms
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Interest @ 18% p.a. on overdue bills. All disputes subject to
              Mumbai jurisdiction. Reverse charge applicable as per GST rules.
              Goods carried at owner&apos;s risk unless insured separately.
            </p>
          </div>
        </div>
      </div>

      {/* Action toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card p-3">
        <span className="mr-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Actions
        </span>
        <Btn size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => toast.success("Invoice sent", { description: invoice.invoiceNumber })}>
          Send Email
        </Btn>
        <Btn size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => toast.success("SMS sent", { description: invoice.invoiceNumber })}>
          Send SMS
        </Btn>
        <Btn size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("PDF generated", { description: invoice.invoiceNumber })}>
          Download PDF
        </Btn>
        <Btn size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Print preview", { description: invoice.invoiceNumber })}>
          Print
        </Btn>
        <Btn
          size="sm"
          variant="primary"
          icon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => {
            navigate("document-studio");
            toast("Open Document Studio", {
              description: "Generate a branded, customizable quotation from this invoice.",
            });
          }}
        >
          Customize in Studio
        </Btn>
      </div>
    </div>
  );
}

// ===== Payment History Tab =====
function PaymentHistoryTab({ invoice }: { invoice: Invoice }) {
  const [fetchedPayments, setFetchedPayments] = useState<Payment[]>([]);

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => (r.ok ? r.json() : { payments: [] }))
      .then((data) => setFetchedPayments(data.payments ?? []))
      .catch(() => {});
  }, []);

  // Filter payments linked to this invoice, plus add a few deterministic ones
  const seed = parseInt(invoice.id.replace(/\D/g, "")) || 1;
  const payments = useMemo(() => {
    const linked = fetchedPayments.filter(
      (p) => p.linkedInvoice === invoice.invoiceNumber,
    );
    // Add a deterministic partial payment if Partially Paid
    if (invoice.paymentStatus === "Partially Paid" || invoice.paymentStatus === "Paid") {
      const receivedAmount =
        invoice.paymentStatus === "Paid"
          ? invoice.totalAmount
          : Math.round(invoice.totalAmount * 0.6);
      linked.push({
        id: `pay-seed-${seed}`,
        voucherType: "Settlement",
        referenceNumber: `RZ-VCH-${String(seed * 4 + 4001).padStart(5, "0")}`,
        date: new Date(
          new Date(invoice.invoiceDate).getTime() + 15 * 86400000,
        ).toISOString(),
        party: invoice.customer,
        amount: receivedAmount,
        mode: seed % 2 === 0 ? "Bank Transfer" : "UPI",
        status: "Completed",
        linkedInvoice: invoice.invoiceNumber,
      });
    }
    return linked.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [fetchedPayments, invoice, seed]);

  const totalReceived = payments
    .filter((p) => p.status === "Completed" || p.status === "Approved")
    .reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(0, invoice.totalAmount - totalReceived);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Invoice Total" value={formatINR(invoice.totalAmount)} />
        <StatCard label="Received" value={formatINR(totalReceived)} />
        <StatCard label="Balance Due" value={formatINR(balanceDue)} />
        <StatCard label="Payments" value={payments.length} icon={<Receipt className="h-4 w-4" />} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <span className="text-muted-foreground">
              <Banknote className="h-6 w-6" />
            </span>
            <p className="text-[14px] font-medium text-foreground">
              No payments recorded
            </p>
            <p className="text-[12px] text-muted-foreground">
              Record a payment to start the ledger for this invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {[
                    "Voucher #",
                    "Date",
                    "Mode",
                    "Reference",
                    "Amount",
                    "Status",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${
                        i === 4 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p: Payment) => (
                  <tr
                    key={p.id}
                    className="hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                      {p.referenceNumber}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">{p.mode}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {p.referenceNumber.slice(-6)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        variant={
                          p.status === "Pending"
                            ? "muted"
                            : p.status === "Completed"
                              ? "solid"
                              : "outline"
                        }
                      >
                        {p.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Activity Log Tab =====
function ActivityLogTab({
  invoice,
  meta,
}: {
  invoice: Invoice;
  meta?: InvoiceMeta;
}) {
  const seed = parseInt(invoice.id.replace(/\D/g, "")) || 1;
  // Merge the deterministic baseline activity with any lifted events the
  // finance team has triggered (customized, released, assigned, edited…).
  // Lifted events win on duplicate timestamps because they carry real actor
  // info and richer detail.
  const activities = useMemo(() => {
    const items: {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      detail: string;
      ts: string;
      actor: string;
      done: boolean;
    }[] = [];
    items.push({
      icon: FileText,
      label: "Invoice created",
      detail: `Drafted by ${["Reena Mehta", "Vikram Deshmukh", "Anil Reddy"][seed % 3]}`,
      ts: invoice.invoiceDate,
      actor: ["Reena Mehta", "Vikram Deshmukh", "Anil Reddy"][seed % 3],
      done: true,
    });
    if (invoice.status !== "Draft" && !meta?.releaseLog.length) {
      items.push({
        icon: Send,
        label: "Invoice sent",
        detail: `Emailed to ${invoice.customer}`,
        ts: new Date(
          new Date(invoice.invoiceDate).getTime() + 1 * 86400000,
        ).toISOString(),
        actor: ["Reena Mehta", "Vikram Deshmukh", "Anil Reddy"][(seed + 1) % 3],
        done: true,
      });
    }
    if (invoice.paymentStatus !== "Unpaid") {
      items.push({
        icon: Banknote,
        label:
          invoice.paymentStatus === "Paid"
            ? "Payment received"
            : "Partial payment received",
        detail: `Via ${seed % 2 === 0 ? "Bank Transfer" : "UPI"}`,
        ts: new Date(
          new Date(invoice.invoiceDate).getTime() + 15 * 86400000,
        ).toISOString(),
        actor: ["Reena Mehta", "Vikram Deshmukh", "Anil Reddy"][(seed + 2) % 3],
        done: true,
      });
    }
    if (invoice.status === "Overdue") {
      items.push({
        icon: Clock,
        label: "Marked overdue",
        detail: `Past due date ${formatDate(invoice.dueDate)}`,
        ts: invoice.dueDate,
        actor: "System",
        done: true,
      });
    }
    if (invoice.status === "Cancelled") {
      items.push({
        icon: XCircle,
        label: "Invoice cancelled",
        detail: "Marked as Cancelled",
        ts: new Date(
          new Date(invoice.invoiceDate).getTime() + 5 * 86400000,
        ).toISOString(),
        actor: "System",
        done: true,
      });
    }
    // Merge lifted activity entries (Task 15-d). Each entry carries its own
    // icon mapping based on type so the timeline stays visually consistent.
    if (meta?.activityLog?.length) {
      const seenIds = new Set(items.map((_, i) => `seed-${i}`));
      for (const e of meta.activityLog) {
        if (seenIds.has(e.id)) continue;
        seenIds.add(e.id);
        items.push({
          icon: activityIcon(e.type),
          label: e.label,
          detail: e.detail ?? "",
          ts: e.ts,
          actor: e.actor,
          done: true,
        });
      }
    }
    return items.sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime(),
    );
  }, [invoice, seed, meta]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Timeline
          </span>
          <span className="tabular text-[11px] text-muted-foreground">
            {activities.length} events
          </span>
        </div>
        <div className="flex flex-col gap-0">
          {activities.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                    <Icon className="h-3 w-3" />
                  </span>
                  {i < activities.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-foreground">
                      {a.label}
                    </span>
                    <span className="tabular text-[11px] text-muted-foreground">
                      {formatDateTime(a.ts)}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{a.detail}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    by {a.actor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Release history (Task 15-d) */}
      {meta?.releaseLog && meta.releaseLog.length > 0 && (
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Release History
              </span>
            </div>
            <span className="tabular text-[11px] text-muted-foreground">
              {meta.releaseLog.length} release{meta.releaseLog.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Released", "Channel", "Recipients", "Actor", "Subject"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ${i === 3 || i === 4 ? "text-left" : i === 0 ? "text-left" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {meta.releaseLog.map((r: InvoiceReleaseLog) => (
                  <tr key={r.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-2 text-[12px] tabular text-foreground">
                      {formatDateTime(r.ts)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge variant="outline">{r.channel}</StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-foreground">
                      {r.recipientSummary}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-muted-foreground">
                      {r.actor}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-[200px]">
                      {r.subject ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Map an InvoiceActivityType to a timeline icon.
function activityIcon(
  type: InvoiceActivityEntry["type"],
): React.ComponentType<{ className?: string }> {
  switch (type) {
    case "created":
      return FileText;
    case "edited":
      return Pencil;
    case "customized":
      return Palette;
    case "assigned":
      return Users;
    case "released":
      return Send;
    case "payment":
      return Banknote;
    case "reminder":
      return Clock;
    case "status":
      return CheckCircle2;
    case "note":
      return FileText;
    default:
      return FileText;
  }
}

// ===== Design Tab (Task 15-d) =====
function DesignTab({
  invoice,
  meta,
  onCustomizeDesign,
}: {
  invoice: Invoice;
  meta?: InvoiceMeta;
  onCustomizeDesign?: (invoice: Invoice) => void;
}) {
  const config: InvoiceDesignConfig = meta?.designConfig ?? {
    template: "classic",
    pageFormat: "A4",
    orientation: "Portrait",
    letterhead: true,
    watermark: false,
    watermarkText: "DRAFT",
    accent: "monochrome",
    font: "sans",
    sections: {
      lineItems: true,
      totals: true,
      paymentTerms: true,
      gstBreakdown: true,
      tcs: false,
      tds: false,
      notes: true,
      signature: true,
    },
    footerMessage: "Thank you for your business.",
  };
  const tplMeta = INVOICE_TEMPLATES.find((t) => t.id === config.template);
  const pageMeta = PAGE_FORMATS.find((p) => p.id === config.pageFormat);
  const orientMeta = ORIENTATIONS.find((o) => o.id === config.orientation);
  const accentMeta = ACCENT_CHOICES.find((a) => a.id === config.accent);
  const fontMeta = FONT_CHOICES.find((f) => f.id === config.font);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DesignStat label="Template" value={tplMeta?.label ?? config.template} icon={<FileText className="h-3.5 w-3.5" />} />
        <DesignStat label="Page" value={`${pageMeta?.label ?? config.pageFormat} · ${orientMeta?.label ?? config.orientation}`} icon={<FileText className="h-3.5 w-3.5" />} />
        <DesignStat label="Accent" value={accentMeta?.label ?? config.accent} icon={<Palette className="h-3.5 w-3.5" />} />
        <DesignStat label="Font" value={fontMeta?.label ?? config.font} icon={<FileText className="h-3.5 w-3.5" />} />
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Current Design
            </span>
          </div>
          {onCustomizeDesign && (
            <Btn
              size="sm"
              variant="primary"
              icon={<Palette className="h-3.5 w-3.5" />}
              onClick={() => onCustomizeDesign(invoice)}
            >
              Customize Design
            </Btn>
          )}
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
          <DesignRow label="Template" value={tplMeta?.label ?? config.template} />
          <DesignRow label="Description" value={tplMeta?.description ?? "-"} />
          <DesignRow label="Page format" value={`${pageMeta?.label ?? config.pageFormat} (${pageMeta?.description ?? ""})`} />
          <DesignRow label="Orientation" value={orientMeta?.label ?? config.orientation} />
          <DesignRow label="Letterhead" value={config.letterhead ? "Shown" : "Hidden"} />
          <DesignRow
            label="Watermark"
            value={
              config.watermark
                ? `On - "${config.watermarkText}"`
                : "Off"
            }
          />
          <DesignRow label="Accent" value={accentMeta?.label ?? config.accent} />
          <DesignRow label="Font" value={fontMeta?.label ?? config.font} />
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sections
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[12px] sm:grid-cols-4">
            {([
              ["Line items", config.sections.lineItems],
              ["Totals", config.sections.totals],
              ["Payment terms", config.sections.paymentTerms],
              ["GST breakdown", config.sections.gstBreakdown],
              ["TCS", config.sections.tcs],
              ["TDS", config.sections.tds],
              ["Notes", config.sections.notes],
              ["Signature", config.sections.signature],
            ] as const).map(([label, on]) => (
              <span
                key={label}
                className={
                  "rounded-[2px] border px-2 py-1 text-[11px] " +
                  (on
                    ? "border-foreground/40 text-foreground"
                    : "border-border text-muted-foreground/60 line-through")
                }
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Footer message
          </div>
          <p className="text-[12px] text-foreground">
            {config.footerMessage || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DesignStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="mt-1 block text-[13px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function DesignRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

// ===== Inline assign-to picker (compact, on the Bill To strip) =====
function AssignToInline({
  invoice,
  selectedIds,
  onAssign,
}: {
  invoice: Invoice;
  selectedIds: string[];
  onAssign: (invoice: Invoice, contactIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const contacts = contactsForCustomer(invoice.customer);
  // Local draft initialized from props on mount. The parent remounts this
  // component (via `key`) whenever the assigned set changes, so we don't
  // need a useEffect to sync - the initial useState already reflects the
  // latest prop. (Avoids the react-hooks/set-state-in-effect rule.)
  const [draft, setDraft] = useState<string[]>(selectedIds);

  const toggle = (id: string) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const apply = () => {
    onAssign(invoice, draft);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1.5 text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
      >
        Manage assignees →
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-[5px] border border-border bg-background p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Pick assignees
        </span>
        <span className="tabular text-[10px] text-muted-foreground">
          {draft.length}/{contacts.length}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {contacts.map((c) => {
          const checked = draft.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={
                "flex items-center justify-between gap-2 rounded-[3px] border px-2 py-1 text-left transition-colors " +
                (checked
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:bg-accent/40")
              }
            >
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-foreground">
                  {c.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {c.role} · {c.email}
                </span>
              </div>
              {checked && <CheckCircle2 className="h-3 w-3 text-foreground" />}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <Btn size="xs" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Btn>
        <Btn size="xs" variant="primary" onClick={apply}>
          Apply
        </Btn>
      </div>
    </div>
  );
}

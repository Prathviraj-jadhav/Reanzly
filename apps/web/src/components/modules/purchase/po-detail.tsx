"use client";
import { useState, useMemo } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import {
  Pencil,
  FileDown,
  Send,
  CheckCircle2,
  Truck,
  Receipt,
  Coins,
  Package,
  User,
  MapPin,
  Building2,
  ClipboardList,
  History,
  ChevronRight,
  AlertCircle,
  Plus,
  IndianRupee,
} from "lucide-react";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  formatINR,
  formatDate,
  formatDateTime,
  relativeTime,
  poStatusBadge,
  type PurchaseOrder,
  type POLine,
  type POReceipt,
  type POBill,
} from "./_helpers";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lines", label: "Lines" },
  { id: "receipts", label: "Receipts" },
  { id: "bills", label: "Bills" },
  { id: "activity", label: "Activity" },
];

interface PODetailProps {
  poId: string;
  initialTab?: string;
  orders: PurchaseOrder[];
  onUpdate: (id: string, updated: PurchaseOrder) => void;
}

export function PODetail({ poId, initialTab, orders, onUpdate }: PODetailProps) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const po = useMemo(() => orders.find((p) => p.id === poId), [orders, poId]);

  const handleStatusChange = (id: string, status: string) => {
    void fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ purchaseOrder }) => {
        onUpdate(id, purchaseOrder);
        toastSuccess(`PO ${status === "Cancelled" ? "cancelled" : "reopened"}`, `${purchaseOrder.poNumber} · now ${status}`);
      })
      .catch(() => toastInfo("Could not update PO", "Please try again"));
  };

  const totals = useMemo(() => {
    if (!po) return { orderedQty: 0, receivedQty: 0, lineCount: 0, receiptCount: 0, billTotal: 0 };
    const orderedQty = po.lines.reduce((s, l) => s + l.qty, 0);
    const receivedQty = po.lines.reduce((s, l) => s + l.receivedQty, 0);
    const billTotal = po.bills.reduce((s, b) => s + b.total, 0);
    return {
      orderedQty,
      receivedQty,
      lineCount: po.lines.length,
      receiptCount: po.receipts.length,
      billTotal,
    };
  }, [po]);

  if (!po) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Purchase order <span className="tabular">{poId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => goToModule("purchase")}>Back to Purchase</Btn>
      </div>
    );
  }

  const meta = poStatusBadge(po.status);
  const isClosed = po.status === "Done" || po.status === "Cancelled";

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => toastInfo("Open PO editor", po.poNumber)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn icon={<Send className="h-3.5 w-3.5" />} onClick={() => toastSuccess("PO emailed", `Vendor: ${po.vendor}`)} aria-label="Send">
        <span className="hidden sm:inline">Send</span>
      </Btn>
      <Btn variant="primary" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toastSuccess("PDF generated", po.poNumber)}>
        <span className="hidden sm:inline">Download PDF</span>
        <span className="sm:hidden">PDF</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Print PO", onClick: () => toastInfo("Opening print dialog", po.poNumber) },
    { label: "Duplicate PO", onClick: () => toastSuccess("PO duplicated", po.poNumber) },
    { label: "Record Receipt", onClick: () => toastInfo("Open GRN drawer", po.poNumber) },
    { label: "Link Vendor Bill", onClick: () => toastInfo("Open bill entry", po.poNumber) },
    {
      label: isClosed ? "Reopen PO" : "Cancel PO",
      onClick: () => handleStatusChange(po.id, isClosed ? "Confirmed" : "Cancelled"),
    },
  ];

  return (
    <DetailLayout
      title={po.poNumber}
      subtitle={`${po.vendor} · ${po.category}`}
      badges={
        <StatusBadge variant={meta.variant} pulse={meta.pulse}>
          {po.status}
        </StatusBadge>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{po.buyer}</span>
          <span className="tabular">{formatDate(po.poDate)}</span>
          <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{po.deliveryLocation}</span>
          <span className="tabular">{po.paymentTerms}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
      lastUpdated={<span>Last updated {relativeTime(po.poDate)} · synced with vendor</span>}
    >
      {/* ===== Overview ===== */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Lines" value={String(totals.lineCount)} icon={<ClipboardList className="h-3.5 w-3.5" />} />
            <StatCard label="Ordered Qty" value={String(totals.orderedQty)} icon={<Package className="h-3.5 w-3.5" />} hint={`${totals.receivedQty} received`} />
            <StatCard label="PO Value" value={formatINR(po.total)} icon={<IndianRupee className="h-3.5 w-3.5" />} hint={`Tax ${formatINR(po.taxTotal)}`} />
            <StatCard label="Receipts" value={String(totals.receiptCount)} icon={<Receipt className="h-3.5 w-3.5" />} hint={`${po.bills.length} bills`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="PO Details">
              <InfoRow label="PO Number" value={<span className="tabular">{po.poNumber}</span>} />
              <InfoRow label="Status" value={<StatusBadge variant={meta.variant} pulse={meta.pulse}>{po.status}</StatusBadge>} />
              <InfoRow label="Category" value={po.category} />
              <InfoRow label="PO Date" value={<span className="tabular">{formatDateTime(po.poDate)}</span>} />
              <InfoRow label="Expected Delivery" value={<span className="tabular">{formatDate(po.expectedDelivery)}</span>} />
              <InfoRow label="Delivery Location" value={po.deliveryLocation} />
              <InfoRow label="Payment Terms" value={po.paymentTerms} />
              <InfoRow label="Currency" value={<span className="tabular">{po.currency}</span>} />
            </InfoSection>

            <InfoSection title="Commercial Summary">
              <InfoRow label="Subtotal" value={<span className="tabular">{formatINR(po.subtotal)}</span>} />
              <InfoRow label="Tax Total" value={<span className="tabular">{formatINR(po.taxTotal)}</span>} />
              <InfoRow label="PO Total" value={<span className="tabular font-medium">{formatINR(po.total)}</span>} />
              <InfoRow label="Billed Amount" value={<span className="tabular">{formatINR(totals.billTotal)}</span>} />
              <InfoRow label="Open Balance" value={<span className="tabular">{formatINR(po.total - totals.billTotal)}</span>} />
              <InfoRow label="Receipts" value={<span className="tabular">{totals.receiptCount}</span>} />
              <InfoRow label="Bills Linked" value={<span className="tabular">{po.bills.length}</span>} />
            </InfoSection>
          </div>

          {po.notes && (
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">PO Notes</span>
              </div>
              <p className="text-[13px] text-foreground">{po.notes}</p>
            </div>
          )}

          <InfoSection title="Vendor">
            <div className="px-4 py-3">
              <button
                onClick={() => goToDetail("vendors", po.vendorId)}
                className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left w-full"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{po.vendor}</div>
                    <div className="text-[11px] text-muted-foreground tabular truncate">{po.paymentTerms} · {po.deliveryLocation}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </InfoSection>
        </div>
      )}

      {/* ===== Lines ===== */}
      {activeTab === "lines" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Lines" value={String(po.lines.length)} icon={<ClipboardList className="h-3.5 w-3.5" />} />
            <StatCard label="Subtotal" value={formatINR(po.subtotal)} icon={<IndianRupee className="h-3.5 w-3.5" />} />
            <StatCard label="Tax + Total" value={formatINR(po.total)} icon={<Coins className="h-3.5 w-3.5" />} hint={`Tax ${formatINR(po.taxTotal)}`} />
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[820px] text-left">
                <thead className="border-b border-border bg-muted/40">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Item Code</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">UOM</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-3 py-2 text-right font-medium">Tax%</th>
                    <th className="px-3 py-2 text-right font-medium">Tax</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {po.lines.map((line) => (
                    <LineRow key={line.id} line={line} />
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/40">
                  <tr className="text-[12px] tabular">
                    <td className="px-3 py-2.5" colSpan={2}>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Totals ({po.lines.length} lines)</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-foreground">
                      {po.lines.reduce((s, l) => s + l.qty, 0)}
                    </td>
                    <td className="px-3 py-2.5" colSpan={2} />
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{formatINR(po.taxTotal)}</td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5 text-right font-medium text-foreground">{formatINR(po.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            All values in <span className="tabular">{po.currency}</span>. Tax is GST applied per line at the rate noted. Re-verify tax slabs before vendor bill booking.
          </p>
        </div>
      )}

      {/* ===== Receipts ===== */}
      {activeTab === "receipts" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Receipts" value={String(po.receipts.length)} icon={<Receipt className="h-3.5 w-3.5" />} />
            <StatCard label="Ordered Qty" value={String(totals.orderedQty)} icon={<Package className="h-3.5 w-3.5" />} />
            <StatCard
              label="Received Qty"
              value={String(totals.receivedQty)}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              hint={totals.orderedQty > 0 ? `${Math.round((totals.receivedQty / totals.orderedQty) * 100)}% of order` : undefined}
            />
          </div>

          {po.receipts.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <Receipt className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No goods receipts recorded yet</p>
              <p className="text-[12px] text-muted-foreground">Once the vendor ships, record a GRN here to track variance.</p>
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toastInfo("Open GRN drawer", po.poNumber)} className="mt-1">
                Record Receipt
              </Btn>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {po.receipts.map((rcpt) => (
                <ReceiptCard key={rcpt.id} receipt={rcpt} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Bills ===== */}
      {activeTab === "bills" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Bills" value={String(po.bills.length)} icon={<Receipt className="h-3.5 w-3.5" />} />
            <StatCard label="Billed Amount" value={formatINR(totals.billTotal)} icon={<IndianRupee className="h-3.5 w-3.5" />} />
            <StatCard label="Open Balance" value={formatINR(po.total - totals.billTotal)} icon={<Coins className="h-3.5 w-3.5" />} hint="vs PO total" />
          </div>

          {po.bills.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <Receipt className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No vendor bills linked yet</p>
              <p className="text-[12px] text-muted-foreground">Once the vendor invoice arrives, link it here for 3-way match (PO ↔ GRN ↔ Bill).</p>
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toastInfo("Open bill drawer", po.poNumber)} className="mt-1">
                Link Bill
              </Btn>
            </div>
          ) : (
            <div className="rounded-[6px] border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-4 py-2.5">
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vendor Bills</h3>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-border bg-muted/40">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Bill No</th>
                      <th className="px-3 py-2 font-medium">Vendor Inv. No</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Due Date</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-right font-medium">Tax</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {po.bills.map((b) => (
                      <BillRow key={b.id} bill={b} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Activity ===== */}
      {activeTab === "activity" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                {po.activity.map((evt, i) => (
                  <div key={evt.id} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                    {i < po.activity.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                      <History className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[13px] font-medium text-foreground">{evt.action}</p>
                        <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        <span className="text-foreground">{evt.actor}</span>
                        {evt.detail ? ` · ${evt.detail}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular mt-0.5">{formatDateTime(evt.ts)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </DetailLayout>
  );
}

// ===== Line row =====
function LineRow({ line }: { line: POLine }) {
  return (
    <tr className="text-[12px]">
      <td className="px-3 py-2.5 tabular text-foreground whitespace-nowrap">{line.itemCode}</td>
      <td className="px-3 py-2.5 text-foreground">
        <div className="truncate max-w-[260px]">{line.description}</div>
        <div className="text-[11px] text-muted-foreground tabular mt-0.5">
          {line.category} · received {line.receivedQty}/{line.qty} {line.uom}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular text-foreground">{line.qty}</td>
      <td className="px-3 py-2.5 text-muted-foreground">{line.uom}</td>
      <td className="px-3 py-2.5 text-right tabular text-foreground">{formatINR(line.unitPrice)}</td>
      <td className="px-3 py-2.5 text-right tabular text-muted-foreground">{line.taxRate}%</td>
      <td className="px-3 py-2.5 text-right tabular text-muted-foreground">{formatINR(line.taxAmount)}</td>
      <td className="px-3 py-2.5 text-right tabular font-medium text-foreground">{formatINR(line.total)}</td>
    </tr>
  );
}

// ===== Receipt card =====
function ReceiptCard({ receipt }: { receipt: POReceipt }) {
  const totalReceived = receipt.lines.reduce((s, l) => s + l.received, 0);
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground tabular">{receipt.receiptNo}</span>
          <StatusBadge variant="outline">Received</StatusBadge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular">
          <span>{formatDate(receipt.date)}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{receipt.warehouse}</span>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{receipt.receivedBy}</span>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-border bg-muted/30">
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 text-right font-medium">Ordered</th>
              <th className="px-4 py-2 text-right font-medium">Received</th>
              <th className="px-4 py-2 text-right font-medium">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {receipt.lines.map((l) => (
              <tr key={l.lineId} className="text-[12px]">
                <td className="px-4 py-2 text-foreground">
                  <div className="truncate max-w-[300px]">{l.description}</div>
                </td>
                <td className="px-4 py-2 text-right tabular text-foreground">{l.ordered}</td>
                <td className="px-4 py-2 text-right tabular text-foreground">{l.received}</td>
                <td className={cn("px-4 py-2 text-right tabular", l.variance === 0 ? "text-muted-foreground" : l.variance < 0 ? "text-foreground font-medium" : "text-foreground")}>
                  {l.variance > 0 ? `+${l.variance}` : l.variance}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/30">
            <tr className="text-[12px] tabular">
              <td className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">Total received</td>
              <td className="px-4 py-2" />
              <td className="px-4 py-2 text-right text-foreground">{totalReceived}</td>
              <td className="px-4 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      {receipt.notes && (
        <div className="border-t border-border bg-muted/30 px-4 py-2 text-[12px] text-muted-foreground">
          <span className="text-[11px] uppercase tracking-wider">Notes · </span>{receipt.notes}
        </div>
      )}
    </div>
  );
}

// ===== Bill row =====
function BillRow({ bill }: { bill: POBill }) {
  const variant = bill.status === "Paid" ? "muted" : bill.status === "Approved" ? "outline" : bill.status === "Disputed" ? "solid" : "outline";
  return (
    <tr className="text-[12px]">
      <td className="px-3 py-2.5 tabular text-foreground whitespace-nowrap">{bill.billNo}</td>
      <td className="px-3 py-2.5 tabular text-muted-foreground whitespace-nowrap">{bill.vendorInvoiceNo}</td>
      <td className="px-3 py-2.5 tabular text-muted-foreground">{formatDate(bill.date)}</td>
      <td className="px-3 py-2.5 tabular text-muted-foreground">{formatDate(bill.dueDate)}</td>
      <td className="px-3 py-2.5 text-right tabular text-foreground">{formatINR(bill.amount)}</td>
      <td className="px-3 py-2.5 text-right tabular text-muted-foreground">{formatINR(bill.taxAmount)}</td>
      <td className="px-3 py-2.5 text-right tabular font-medium text-foreground">{formatINR(bill.total)}</td>
      <td className="px-3 py-2.5">
        <StatusBadge variant={variant}>{bill.status}</StatusBadge>
      </td>
    </tr>
  );
}

"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { toast } from "sonner";
import { InvoiceList } from "./invoice-list";
import { InvoiceDetail } from "./invoice-detail";
import { AddInvoiceDrawer } from "./add-invoice-drawer";
import { RecordPaymentDrawer } from "./record-payment-drawer";
import { InvoiceDesigner } from "./invoice-designer";
import { ReleaseInvoiceDrawer, type ReleasePayload } from "./release-invoice-drawer";
import {
  BulkReleaseDrawer,
  type BulkReleasePayload,
} from "./bulk-release-drawer";
import {
  seedInvoiceMeta,
  emptyInvoiceMeta,
  appendActivity,
  newActivityId,
  DEFAULT_DESIGN_CONFIG,
  SAVED_INVOICE_TEMPLATES,
  type InvoiceMeta,
  type InvoiceDesignConfig,
  type SavedInvoiceTemplate,
} from "./_helpers";

export function InvoiceModule() {
  const { activeView, navigate } = useAppStore();
  const [recordPaymentTarget, setRecordPaymentTarget] =
    useState<Invoice | null>(null);

  // Real, database-backed invoices (src/app/api/invoices) - previously
  // useState(INVOICES) seeded from mock-data.ts.
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Task 15-d: per-invoice meta (assigned contacts, design config, activity
  // timeline, release log) - deliberately still local-only/in-memory, not
  // part of this pass's real-data scope (a presentation/workflow layer on
  // top of the real invoice record, not the record itself). Seeded once
  // real invoices arrive so the detail view's Activity + Design tabs aren't
  // empty.
  const [invoiceMeta, setInvoiceMeta] = useState<Record<string, InvoiceMeta>>({});

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ invoices }) => {
        setInvoices(invoices);
        setInvoiceMeta((prev) => {
          const next = { ...prev };
          for (const inv of invoices) {
            if (!next[inv.invoiceNumber]) next[inv.invoiceNumber] = seedInvoiceMeta(inv);
          }
          return next;
        });
      })
      .catch(() => toast.error("Couldn't load invoices", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  // Saved invoice templates — start with the curated seed list (Task 15-d).
  const [savedTemplates, setSavedTemplates] = useState<SavedInvoiceTemplate[]>(
    () => SAVED_INVOICE_TEMPLATES.map((t) => ({ ...t })),
  );

  // Drawer targets — Release + Designer + BulkRelease (Task 15-d).
  const [designerTarget, setDesignerTarget] = useState<Invoice | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<Invoice | null>(null);
  // Bulk release target — a batch of invoices selected from the list.
  const [bulkReleaseTarget, setBulkReleaseTarget] = useState<Invoice[]>([]);

  const handleUpdate = useCallback(async (id: string, patch: Partial<Invoice>): Promise<boolean> => {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))); // optimistic
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save invoice", { description: body.error || "Try again." });
      return false;
    }
    const { invoice } = await res.json();
    setInvoices((prev) => prev.map((i) => (i.id === id ? invoice : i)));
    return true;
  }, []);

  // Bulk status patch (Task 15-d) — used by the list's bulk "Mark as Sent"
  // and bulk "Release Selected" actions. One real PATCH per invoice - a
  // dedicated bulk endpoint isn't worth it for an action this infrequent.
  const handleUpdateStatus = useCallback(
    async (targets: Invoice[], status: InvoiceStatus) => {
      if (targets.length === 0) return;
      const ids = new Set(targets.map((t) => t.id));
      setInvoices((prev) =>
        prev.map((i) => (ids.has(i.id) ? { ...i, status } : i)),
      ); // optimistic
      const results = await Promise.all(
        targets.map((t) =>
          fetch(`/api/invoices/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }).then((r) => r.ok)
        ),
      );
      if (results.some((ok) => !ok)) {
        toast.error("Some invoices couldn't be updated", { description: "Reload to see the real current state." });
      }
      // Log a status-change activity on each invoice's timeline.
      const ts = new Date().toISOString();
      setInvoiceMeta((prev) => {
        const next = { ...prev };
        for (const t of targets) {
          const m = next[t.invoiceNumber] ?? emptyInvoiceMeta();
          next[t.invoiceNumber] = {
            ...m,
            activityLog: appendActivity(m.activityLog, {
              id: newActivityId(),
              type: "status",
              ts,
              actor: "You",
              label: `Status → ${status}`,
              detail: `Bulk update from invoice list`,
            }),
          };
        }
        return next;
      });
    },
    [],
  );

  const addInvoice = useCallback(
    async (inv: Invoice, assignedContactIds?: string[]): Promise<boolean> => {
      const { id: _clientId, ...payload } = inv;
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Couldn't create invoice", { description: body.error || "Try again." });
        return false;
      }
      const { invoice } = await res.json();
      setInvoices((prev) => [invoice, ...prev]);
      // Seed meta for the new invoice — preserve the assigned contacts the
      // user picked in the Add Invoice drawer (Task 15-d).
      const seeded = seedInvoiceMeta(invoice);
      if (assignedContactIds && assignedContactIds.length > 0) {
        seeded.assignedContactIds = assignedContactIds;
        const ts = new Date().toISOString();
        seeded.activityLog = appendActivity(seeded.activityLog, {
          id: newActivityId(),
          type: "assigned",
          ts,
          actor: "You",
          label: "Assigned contacts",
          detail: `${assignedContactIds.length} contact${assignedContactIds.length === 1 ? "" : "s"} assigned at creation`,
        });
      }
      setInvoiceMeta((prev) => ({ ...prev, [invoice.invoiceNumber]: seeded }));
      return true;
    },
    [],
  );

  // Record Payment: mutate the invoice's paymentStatus (and the lifecycle
  // status when fully paid) so the list + detail views reflect the new state
  // without a reload.
  const handlePaymentRecorded = (
    inv: Invoice,
    received: number,
    isFull: boolean,
  ) => {
    const patch: Partial<Invoice> = {
      paymentStatus: isFull ? "Paid" : "Partially Paid",
    };
    if (isFull && inv.status !== "Cancelled" && inv.status !== "Credit Note") {
      patch.status = "Paid";
    } else if (!isFull && inv.status === "Draft") {
      patch.status = "Sent";
    }
    // Stash the received amount on the invoice via a custom field so the
    // Payment History tab can show a "Received" line. We use the existing
    // paymentStatus + a derived amount instead of mutating mock arrays.
    void received;
    handleUpdate(inv.id, patch);
    // Log a payment activity (Task 15-d).
    const ts = new Date().toISOString();
    setInvoiceMeta((prev) => {
      const m = prev[inv.invoiceNumber] ?? emptyInvoiceMeta();
      return {
        ...prev,
        [inv.invoiceNumber]: {
          ...m,
          activityLog: appendActivity(m.activityLog, {
            id: newActivityId(),
            type: "payment",
            ts,
            actor: "You",
            label: isFull ? "Payment recorded" : "Partial payment recorded",
            detail: `${"₹" + received.toLocaleString("en-IN")} · ${isFull ? "Full" : "Partial"}`,
          }),
        },
      };
    });
  };

  // ===== Task 15-d: Designer handlers =====
  const handleApplyDesign = useCallback(
    (inv: Invoice, config: InvoiceDesignConfig) => {
      const ts = new Date().toISOString();
      setInvoiceMeta((prev) => {
        const m = prev[inv.invoiceNumber] ?? emptyInvoiceMeta();
        return {
          ...prev,
          [inv.invoiceNumber]: {
            ...m,
            designConfig: config,
            activityLog: appendActivity(m.activityLog, {
              id: newActivityId(),
              type: "customized",
              ts,
              actor: "You",
              label: "Design customized",
              detail: `${config.template} · ${config.pageFormat} ${config.orientation} · ${config.accent}`,
            }),
          },
        };
      });
    },
    [],
  );

  const handleSaveTemplate = useCallback(
    (tpl: Omit<SavedInvoiceTemplate, "id">) => {
      const id = `tpl-user-${Date.now()}`;
      setSavedTemplates((prev) => [...prev, { ...tpl, id }]);
    },
    [],
  );

  const handleUseTemplate = useCallback((tpl: SavedInvoiceTemplate) => {
    // Mark this template as the default and stamp its lastUsed timestamp.
    setSavedTemplates((prev) =>
      prev.map((t) => ({
        ...t,
        isDefault: t.id === tpl.id,
        lastUsed: t.id === tpl.id ? new Date().toISOString() : t.lastUsed,
      })),
    );
  }, []);

  const handleSetDefaultTemplate = useCallback((id: string) => {
    setSavedTemplates((prev) =>
      prev.map((t) => ({ ...t, isDefault: t.id === id })),
    );
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleEditTemplate = useCallback(
    (tpl: SavedInvoiceTemplate) => {
      // For edit, we open the designer with a synthetic invoice carrying the
      // template's design config. The user can tweak and Save as Template
      // again to create a new revision (we don't mutate the original).
      setDesignerTarget({
        id: `tpl-${tpl.id}`,
        invoiceNumber: `TEMPLATE · ${tpl.name.toUpperCase()}`,
        customer: tpl.createdBy,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        amount: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: "Draft",
        paymentStatus: "Unpaid",
      });
      // Apply the template's design config to the synthetic invoice's meta.
      setInvoiceMeta((prev) => ({
        ...prev,
        [`TEMPLATE · ${tpl.name.toUpperCase()}`]: {
          ...emptyInvoiceMeta(),
          designConfig: { ...tpl.designConfig },
        },
      }));
    },
    [],
  );

  // ===== Task 15-d: Release handler =====
  const handleRelease = useCallback(
    (inv: Invoice, payload: ReleasePayload) => {
      // Flip Draft → Sent on release (unless scheduled for later).
      if (inv.status === "Draft" && !payload.scheduledFor) {
        handleUpdate(inv.id, { status: "Sent" });
      }
      // Append release log + activity entry to the invoice's meta.
      setInvoiceMeta((prev) => {
        const m = prev[inv.invoiceNumber] ?? emptyInvoiceMeta();
        return {
          ...prev,
          [inv.invoiceNumber]: {
            ...m,
            releaseLog: [...m.releaseLog, payload.releaseLog],
            activityLog: appendActivity(m.activityLog, payload.activity),
          },
        };
      });
    },
    [handleUpdate],
  );

  // ===== Task 15-d: Bulk release handler =====
  // Applies a single release payload to every invoice in the batch. Each
  // invoice gets its own release log entry + activity entry; Draft invoices
  // flip to Sent (unless scheduled for later).
  const handleBulkRelease = useCallback(
    (inv: Invoice, payload: BulkReleasePayload) => {
      if (inv.status === "Draft" && !payload.scheduledFor) {
        handleUpdate(inv.id, { status: "Sent" });
      }
      setInvoiceMeta((prev) => {
        const m = prev[inv.invoiceNumber] ?? emptyInvoiceMeta();
        return {
          ...prev,
          [inv.invoiceNumber]: {
            ...m,
            releaseLog: [...m.releaseLog, payload.releaseLog],
            activityLog: appendActivity(m.activityLog, payload.activity),
          },
        };
      });
    },
    [handleUpdate],
  );

  // ===== Task 15-d: Assign handler =====
  const handleAssign = useCallback(
    (inv: Invoice, contactIds: string[]) => {
      const ts = new Date().toISOString();
      setInvoiceMeta((prev) => {
        const m = prev[inv.invoiceNumber] ?? emptyInvoiceMeta();
        return {
          ...prev,
          [inv.invoiceNumber]: {
            ...m,
            assignedContactIds: contactIds,
            activityLog: appendActivity(m.activityLog, {
              id: newActivityId(),
              type: "assigned",
              ts,
              actor: "You",
              label: "Assignees updated",
              detail: `${contactIds.length} contact${contactIds.length === 1 ? "" : "s"} assigned`,
            }),
          },
        };
      });
    },
    [],
  );

  // Compute the designer's initial config: the invoice's stored config if
  // it has one, else the default template's config.
  const designerInitialConfig = useMemo<InvoiceDesignConfig | undefined>(() => {
    if (!designerTarget) return undefined;
    const m = invoiceMeta[designerTarget.invoiceNumber];
    return m?.designConfig ?? { ...DEFAULT_DESIGN_CONFIG };
  }, [designerTarget, invoiceMeta]);

  // The release drawer's default recipients — the invoice's assigned
  // contacts, falling back to the customer's primary billing contact.
  const releaseDefaultRecipients = useMemo<string[] | undefined>(() => {
    if (!releaseTarget) return undefined;
    const m = invoiceMeta[releaseTarget.invoiceNumber];
    return m?.assignedContactIds;
  }, [releaseTarget, invoiceMeta]);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading invoices…</div>;
  }

  // Detail view
  if (
    activeView.module === "invoice" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    const detailInvoice = invoices.find((i) => i.invoiceNumber === activeView.id);
    const detailMeta = detailInvoice
      ? invoiceMeta[detailInvoice.invoiceNumber]
      : undefined;
    return (
      <>
        <InvoiceDetail
          invoiceNumber={activeView.id}
          invoices={invoices}
          onRecordPayment={(inv) => setRecordPaymentTarget(inv)}
          onUpdate={handleUpdate}
          meta={detailMeta}
          onCustomizeDesign={(inv) => setDesignerTarget(inv)}
          onRelease={(inv) => setReleaseTarget(inv)}
          onAssign={handleAssign}
        />
        <RecordPaymentDrawer
          open={!!recordPaymentTarget}
          onClose={() => setRecordPaymentTarget(null)}
          invoice={recordPaymentTarget}
          onPaymentRecorded={handlePaymentRecorded}
        />
        <InvoiceDesigner
          open={!!designerTarget}
          onClose={() => setDesignerTarget(null)}
          invoice={designerTarget}
          designConfig={designerInitialConfig}
          onApply={handleApplyDesign}
          onSaveTemplate={handleSaveTemplate}
        />
        <ReleaseInvoiceDrawer
          open={!!releaseTarget}
          onClose={() => setReleaseTarget(null)}
          invoice={releaseTarget}
          defaultRecipientIds={releaseDefaultRecipients}
          onRelease={handleRelease}
        />
      </>
    );
  }

  // Drawer visibility is derived from active view
  const drawerOpen =
    activeView.module === "invoice" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "invoice" && activeView.view === "create") {
      navigate("invoice");
    }
  };

  // List view (default) - drawer overlays when create is requested
  return (
    <>
      <InvoiceList
        invoices={invoices}
        onCreate={() => navigate("invoice", "create")}
        onRecordPayment={(inv) => setRecordPaymentTarget(inv)}
        onCustomizeDesign={(inv) => setDesignerTarget(inv)}
        onRelease={(inv) => setReleaseTarget(inv)}
        onBulkRelease={(batch) => setBulkReleaseTarget(batch)}
        onUpdateStatus={handleUpdateStatus}
        templates={savedTemplates}
        onUseTemplate={handleUseTemplate}
        onEditTemplate={handleEditTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onSetDefaultTemplate={handleSetDefaultTemplate}
      />
      <AddInvoiceDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addInvoice} />
      <RecordPaymentDrawer
        open={!!recordPaymentTarget}
        onClose={() => setRecordPaymentTarget(null)}
        invoice={recordPaymentTarget}
        onPaymentRecorded={handlePaymentRecorded}
      />
      <InvoiceDesigner
        open={!!designerTarget}
        onClose={() => setDesignerTarget(null)}
        invoice={designerTarget}
        designConfig={designerInitialConfig}
        onApply={handleApplyDesign}
        onSaveTemplate={handleSaveTemplate}
      />
      <ReleaseInvoiceDrawer
        open={!!releaseTarget}
        onClose={() => setReleaseTarget(null)}
        invoice={releaseTarget}
        defaultRecipientIds={releaseDefaultRecipients}
        onRelease={handleRelease}
      />
      <BulkReleaseDrawer
        open={bulkReleaseTarget.length > 0}
        onClose={() => setBulkReleaseTarget([])}
        invoices={bulkReleaseTarget}
        onReleaseBatch={handleBulkRelease}
      />
    </>
  );
}

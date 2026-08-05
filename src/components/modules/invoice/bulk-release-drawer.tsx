"use client";

import { useState, useEffect, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Send,
  Mail,
  MessageCircle,
  FileText,
  Clock,
  Calendar,
  Paperclip,
  Users,
  Truck,
  AlertCircle,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Invoice } from "@/lib/types";
import {
  contactsForCustomer,
  contactById,
  formatDate,
  formatINR,
  defaultReleaseSubject,
  type CustomerContact,
  type ReleaseChannel,
  type InvoiceReleaseLog,
  type InvoiceActivityEntry,
  newActivityId,
  appendActivity,
  type InvoiceMeta,
} from "./_helpers";

/**
 * BulkReleaseDrawer (Task 15-d)
 *
 * Applies the release flow to multiple invoices at once. Simplified vs the
 * single-invoice release drawer:
 *   • Recipients are deduped across the selected invoices' customers —
 *     finance user picks one shared set (typically the billing contacts).
 *   • Single channel + single email subject/body for the whole batch.
 *   • Schedule (now / later) applies to every invoice in the batch.
 *
 * On release:
 *   • Every Draft invoice flips to "Sent".
 *   • A release log + activity entry is appended to each invoice's meta.
 *   • A summary toast confirms the batch.
 *
 * The parent owns the per-invoice meta mutation (via onReleaseBatch).
 */
interface BulkReleaseDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The invoices selected when "Release Selected" was clicked. */
  invoices: Invoice[];
  /** Release a batch — called once per invoice. */
  onReleaseBatch?: (
    invoice: Invoice,
    payload: BulkReleasePayload,
  ) => void;
}

export interface BulkReleasePayload {
  channel: ReleaseChannel;
  recipientIds: string[];
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  attachments: ("PDF" | "Excel" | "Supporting")[];
  scheduledFor?: string;
  releaseLog: InvoiceReleaseLog;
  activity: InvoiceActivityEntry;
}

type ScheduleMode = "now" | "later";

export function BulkReleaseDrawer({
  open,
  onClose,
  invoices,
  onReleaseBatch,
}: BulkReleaseDrawerProps) {
  const [channel, setChannel] = useState<ReleaseChannel>("Email");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<("PDF" | "Excel" | "Supporting")[]>(["PDF"]);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [scheduledFor, setScheduledFor] = useState<string>(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  );

  // Re-seed the form whenever the drawer opens or the invoice selection
  // changes — defaults the recipient list to all billing-primary contacts
  // across the selected invoices' customers.
  useEffect(() => {
    if (!open) return;
    if (invoices.length === 0) return;
    setChannel("Email");
    // Dedupe contacts across all selected invoices. Default to the primary
    // billing contact per customer (so the user has a sensible starting set
    // but can still add operations / finance / owner contacts).
    const seen = new Set<string>();
    const defaultIds: string[] = [];
    for (const inv of invoices) {
      for (const c of contactsForCustomer(inv.customer)) {
        if (c.isPrimary && !seen.has(c.id)) {
          seen.add(c.id);
          defaultIds.push(c.id);
        }
      }
    }
    setRecipientIds(defaultIds);
    setCc("");
    setBcc("");
    // Use the first invoice as the subject template; the user can edit.
    setSubject(defaultReleaseSubject(invoices[0]));
    setBody(
      `Dear Customer,\n\nPlease find attached your invoices from Reanzly Logistics totaling ${formatINR(
        invoices.reduce((s, i) => s + i.totalAmount, 0),
      )} (incl. GST).\n\nPayment is due per the agreed terms. For any clarifications, reply to this email.\n\nWarm regards,\nAccounts Team · Reanzly Logistics Pvt. Ltd.`,
    );
    setAttachments(["PDF"]);
    setScheduleMode("now");
    setScheduledFor(
      new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    );
  }, [open, invoices]);

  // All contacts across the selected invoices' customers (deduped).
  const allContacts = useMemo<CustomerContact[]>(() => {
    const seen = new Set<string>();
    const list: CustomerContact[] = [];
    for (const inv of invoices) {
      for (const c of contactsForCustomer(inv.customer)) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          list.push(c);
        }
      }
    }
    return list;
  }, [invoices]);

  const toggleRecipient = (id: string) => {
    setRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAttachment = (a: "PDF" | "Excel" | "Supporting") => {
    setAttachments((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const draftInvoices = invoices.filter((i) => i.status === "Draft");
  const nonDraftInvoices = invoices.filter((i) => i.status !== "Draft");
  const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (invoices.length === 0) errs.push("No invoices selected");
    if (recipientIds.length === 0) errs.push("Select at least one recipient");
    if (channel === "Email" || channel === "Both") {
      if (!subject.trim()) errs.push("Email subject is required");
      if (!body.trim()) errs.push("Email body is required");
    }
    if (!attachments.includes("PDF")) errs.push("PDF attachment is required for release");
    if (scheduleMode === "later" && !scheduledFor) errs.push("Schedule date is required");
    return errs;
  }, [invoices.length, recipientIds, channel, subject, body, attachments, scheduleMode, scheduledFor]);

  const selectedContacts = recipientIds
    .map((id) => contactById(id))
    .filter(Boolean) as CustomerContact[];

  const handleRelease = () => {
    if (errors.length) {
      toast("Cannot release", { description: errors[0] });
      return;
    }
    if (invoices.length === 0) return;
    const ts = new Date().toISOString();
    const recipientSummary =
      selectedContacts.length === 0
        ? "no recipients"
        : selectedContacts.length === 1
          ? `${selectedContacts[0].name} (${selectedContacts[0].role})`
          : `${selectedContacts.length} contacts across ${invoices.length} invoices`;

    let releasedCount = 0;
    for (const inv of invoices) {
      const releaseLog: InvoiceReleaseLog = {
        id: `rel-bulk-${inv.id}-${Date.now()}`,
        ts,
        channel,
        recipientIds,
        recipientSummary,
        actor: "You",
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject: channel === "Email" || channel === "Both" ? subject : undefined,
        scheduledFor: scheduleMode === "later" ? new Date(scheduledFor).toISOString() : undefined,
      };
      const activity: InvoiceActivityEntry = {
        id: newActivityId(),
        type: "released",
        ts,
        actor: "You",
        label:
          scheduleMode === "later"
            ? "Bulk release scheduled"
            : "Invoice released (bulk)",
        detail: `${channel} → ${recipientSummary} · batch of ${invoices.length}`,
      };
      if (onReleaseBatch) {
        onReleaseBatch(inv, {
          channel,
          recipientIds,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject: channel === "Email" || channel === "Both" ? subject : undefined,
          body: channel === "Email" || channel === "Both" ? body : undefined,
          attachments,
          scheduledFor: scheduleMode === "later" ? new Date(scheduledFor).toISOString() : undefined,
          releaseLog,
          activity,
        });
      }
      releasedCount++;
    }
    toast.success(
      scheduleMode === "later"
        ? `Release scheduled for ${releasedCount} invoices`
        : `${releasedCount} invoices released`,
      {
        description: `${channel} → ${recipientSummary}`,
      },
    );
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Release {invoices.length} Invoices
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Bulk release · {formatINR(totalAmount)} total · {draftInvoices.length} Draft → Sent
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Batch summary strip */}
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <div className="grid grid-cols-3 gap-3 text-[12px]">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Invoices
              </div>
              <div className="tabular font-medium text-foreground">
                {invoices.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Draft → Sent
              </div>
              <div className="tabular text-foreground">
                {draftInvoices.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div className="tabular font-medium text-foreground">
                {formatINR(totalAmount)}
              </div>
            </div>
          </div>
          {nonDraftInvoices.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              <AlertCircle className="mr-1 inline h-3 w-3" />
              {nonDraftInvoices.length} invoice
              {nonDraftInvoices.length === 1 ? " is" : "s are"} already Sent /
              Paid — they will receive a re-send but their status won&apos;t change.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Recipients — deduped across selected invoices' customers */}
            <BulkReleaseSection
              icon={<Users className="h-4 w-4" />}
              label="Recipients"
              hint={`${selectedContacts.length} selected · ${allContacts.length} unique across batch`}
            >
              {allContacts.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  No contacts found for the selected invoices&apos; customers.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {allContacts.map((c) => {
                    const checked = recipientIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[5px] border px-3 py-2 transition-colors",
                          checked
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:bg-accent/40",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleRecipient(c.id)}
                        />
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-foreground">
                              {c.name}
                            </span>
                            <span className="text-[11px] tabular text-muted-foreground">
                              {c.email} · {c.customerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {c.isPrimary && (
                              <StatusBadge variant="solid">Primary</StatusBadge>
                            )}
                            <StatusBadge variant="outline">{c.role}</StatusBadge>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Recipients are deduped across the selected invoices&apos; customers.
                Each customer will only receive their own invoice PDF.
              </p>
            </BulkReleaseSection>

            {/* Channel */}
            <BulkReleaseSection icon={<Send className="h-4 w-4" />} label="Channel">
              <RadioGroup
                value={channel}
                onValueChange={(v) => setChannel(v as ReleaseChannel)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-5"
              >
                {([
                  { id: "Email", label: "Email", icon: Mail },
                  { id: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
                  { id: "Both", label: "Both", icon: Send },
                  { id: "Post", label: "Post", icon: Truck },
                  { id: "Manual", label: "Manual", icon: Check },
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-1 rounded-[5px] border px-2 py-2.5 transition-colors",
                        channel === opt.id
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:bg-accent/40",
                      )}
                    >
                      <RadioGroupItem value={opt.id} id={`bch-${opt.id}`} className="sr-only" />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-foreground">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </BulkReleaseSection>

            {/* Email content */}
            {(channel === "Email" || channel === "Both") && (
              <BulkReleaseSection icon={<Mail className="h-4 w-4" />} label="Email content">
                <div className="flex flex-col gap-3">
                  <div>
                    <Label className="mb-1.5 text-[12px]">Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-8 rounded-[5px] text-[12px]"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 text-[12px]">CC</Label>
                      <Input
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        placeholder="comma-separated"
                        className="h-8 rounded-[5px] text-[12px]"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 text-[12px]">BCC</Label>
                      <Input
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        placeholder="comma-separated"
                        className="h-8 rounded-[5px] text-[12px]"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 text-[12px]">Body</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="min-h-[120px] rounded-[5px] text-[12px] leading-relaxed"
                    />
                  </div>
                </div>
              </BulkReleaseSection>
            )}

            {/* Attachments */}
            <BulkReleaseSection
              icon={<Paperclip className="h-4 w-4" />}
              label="Attachments"
              hint="PDF required"
            >
              <div className="flex flex-col gap-1.5">
                <BulkAttachmentRow
                  label="Invoice PDFs"
                  hint="One per customer, always attached"
                  required
                  checked={attachments.includes("PDF")}
                  onToggle={() => toggleAttachment("PDF")}
                  disabled
                />
                <BulkAttachmentRow
                  label="Excel export"
                  hint="Combined line-items sheet"
                  checked={attachments.includes("Excel")}
                  onToggle={() => toggleAttachment("Excel")}
                />
                <BulkAttachmentRow
                  label="Supporting docs"
                  hint="POD, LR, e-Way bills (simulated)"
                  checked={attachments.includes("Supporting")}
                  onToggle={() => toggleAttachment("Supporting")}
                />
              </div>
            </BulkReleaseSection>

            {/* Schedule */}
            <BulkReleaseSection icon={<Calendar className="h-4 w-4" />} label="Schedule">
              <RadioGroup
                value={scheduleMode}
                onValueChange={(v) => setScheduleMode(v as ScheduleMode)}
                className="grid grid-cols-2 gap-2"
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[5px] border px-3 py-2 transition-colors",
                    scheduleMode === "now"
                      ? "border-foreground bg-foreground/5"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <RadioGroupItem value="now" id="bsch-now" />
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium text-foreground">
                    Send now
                  </span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[5px] border px-3 py-2 transition-colors",
                    scheduleMode === "later"
                      ? "border-foreground bg-foreground/5"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <RadioGroupItem value="later" id="bsch-later" />
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium text-foreground">
                    Schedule for later
                  </span>
                </label>
              </RadioGroup>
              {scheduleMode === "later" && (
                <div className="mt-2">
                  <Label className="mb-1.5 text-[12px]">Send at</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
              )}
            </BulkReleaseSection>

            {/* Batch preview */}
            <BulkReleaseSection
              icon={<Layers className="h-4 w-4" />}
              label="Batch preview"
              hint={`${invoices.length} rows`}
            >
              <div className="max-h-48 overflow-y-auto scrollbar-thin rounded-[5px] border border-border">
                <table className="w-full border-collapse text-[12px]">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="border-b border-border">
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Invoice</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Customer</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-accent/30">
                        <td className="px-2 py-1.5 tabular text-foreground">{inv.invoiceNumber}</td>
                        <td className="px-2 py-1.5 truncate text-foreground">{inv.customer}</td>
                        <td className="px-2 py-1.5 text-right tabular">{formatINR(inv.totalAmount)}</td>
                        <td className="px-2 py-1.5 tabular text-muted-foreground">{formatDate(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BulkReleaseSection>
          </div>
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
              {errors.length > 1 && (
                <span className="text-muted-foreground">
                  · {errors.length - 1} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary strip */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {channel} → {selectedContacts.length} recipient
            {selectedContacts.length === 1 ? "" : "s"} ·{" "}
            {scheduleMode === "later" ? "scheduled" : "now"}
          </span>
          <span className="flex items-center gap-2 text-[12px] tabular">
            <FileText className="h-3 w-3 text-muted-foreground" />
            {formatINR(totalAmount)}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <div className="flex items-center gap-2">
            <Btn
              variant="outline"
              onClick={() => {
                toast("Saved as draft", {
                  description: `Bulk release for ${invoices.length} invoices saved`,
                });
                onClose();
              }}
            >
              Save Draft
            </Btn>
            <Btn
              variant="primary"
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={handleRelease}
              disabled={invoices.length === 0 || errors.length > 0}
            >
              {scheduleMode === "later" ? "Schedule" : `Release ${invoices.length}`}
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Section wrapper =====
function BulkReleaseSection({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function BulkAttachmentRow({
  label,
  hint,
  checked,
  onToggle,
  required,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-[5px] border px-3 py-2 transition-colors",
        checked ? "border-foreground bg-foreground/5" : "border-border",
        disabled ? "opacity-70" : "cursor-pointer hover:bg-accent/40",
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox checked={checked} onCheckedChange={onToggle} disabled={disabled} />
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-foreground">
            {label}
            {required && (
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                (required)
              </span>
            )}
          </span>
          {hint && (
            <span className="text-[11px] text-muted-foreground">{hint}</span>
          )}
        </div>
      </div>
    </label>
  );
}

// Re-export the helper so callers can compose meta mutations cleanly.
export { appendActivity, newActivityId };
export type { InvoiceMeta };

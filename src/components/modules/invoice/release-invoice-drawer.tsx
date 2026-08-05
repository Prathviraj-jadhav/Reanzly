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
  defaultReleaseBody,
  type CustomerContact,
  type ReleaseChannel,
  type InvoiceReleaseLog,
  type InvoiceActivityEntry,
} from "./_helpers";

interface ReleaseInvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  /** Pre-selected contact IDs (typically the assigned contacts). */
  defaultRecipientIds?: string[];
  /** Fire when the invoice is released. */
  onRelease?: (
    invoice: Invoice,
    payload: ReleasePayload,
  ) => void;
}

export interface ReleasePayload {
  channel: ReleaseChannel;
  recipientIds: string[];
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  attachments: ("PDF" | "Excel" | "Supporting")[];
  scheduledFor?: string; // ISO, when "Later"
  releaseLog: InvoiceReleaseLog;
  activity: InvoiceActivityEntry;
}

type ScheduleMode = "now" | "later";

export function ReleaseInvoiceDrawer({
  open,
  onClose,
  invoice,
  defaultRecipientIds,
  onRelease,
}: ReleaseInvoiceDrawerProps) {
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

  // Re-seed the form whenever the drawer opens or the invoice changes.
  useEffect(() => {
    if (!open) return;
    if (!invoice) return;
    setChannel("Email");
    setRecipientIds(
      defaultRecipientIds && defaultRecipientIds.length > 0
        ? defaultRecipientIds
        : contactsForCustomer(invoice.customer)
            .filter((c) => c.isPrimary)
            .map((c) => c.id),
    );
    setCc("");
    setBcc("");
    setSubject(defaultReleaseSubject(invoice));
    setBody(defaultReleaseBody(invoice));
    setAttachments(["PDF"]);
    setScheduleMode("now");
    setScheduledFor(
      new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    );
  }, [open, invoice?.id, defaultRecipientIds, invoice]);

  const contacts = useMemo(
    () => (invoice ? contactsForCustomer(invoice.customer) : []),
    [invoice],
  );

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

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!invoice) return errs;
    if (recipientIds.length === 0) errs.push("Select at least one recipient");
    if (channel === "Email" || channel === "Both") {
      if (!subject.trim()) errs.push("Email subject is required");
      if (!body.trim()) errs.push("Email body is required");
    }
    if (!attachments.includes("PDF")) errs.push("PDF attachment is required for release");
    if (scheduleMode === "later" && !scheduledFor) errs.push("Schedule date is required");
    return errs;
  }, [invoice, recipientIds, channel, subject, body, attachments, scheduleMode, scheduledFor]);

  const selectedContacts = recipientIds
    .map((id) => contactById(id))
    .filter(Boolean) as CustomerContact[];

  const handleRelease = () => {
    if (errors.length) {
      toast("Cannot release", { description: errors[0] });
      return;
    }
    if (!invoice) return;
    const ts = new Date().toISOString();
    const recipientSummary =
      selectedContacts.length === 0
        ? "no recipients"
        : selectedContacts.length === 1
          ? `${selectedContacts[0].name} (${selectedContacts[0].role})`
          : `${selectedContacts.length} contacts at ${invoice.customer}`;
    const releaseLog: InvoiceReleaseLog = {
      id: `rel-${Date.now()}`,
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
      id: `act-rel-${Date.now()}`,
      type: "released",
      ts,
      actor: "You",
      label:
        scheduleMode === "later"
          ? "Release scheduled"
          : "Invoice released",
      detail: `${channel} → ${recipientSummary}${
        attachments.length > 1 ? ` · ${attachments.join(", ")}` : ""
      }`,
    };
    if (onRelease) {
      onRelease(invoice, {
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
    toast.success(
      scheduleMode === "later" ? "Release scheduled" : "Invoice released",
      {
        description: `${invoice.invoiceNumber} · ${channel} → ${recipientSummary}`,
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
              Release Invoice
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {invoice
                ? `${invoice.invoiceNumber} · ${invoice.customer} · ${formatINR(invoice.totalAmount)}`
                : "Select an invoice first"}
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

        {invoice && (
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Invoice
                </div>
                <div className="tabular font-medium text-foreground">
                  {invoice.invoiceNumber}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Due
                </div>
                <div className="tabular text-foreground">
                  {formatDate(invoice.dueDate)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </div>
                <div className="tabular font-medium text-foreground">
                  {formatINR(invoice.totalAmount)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Recipients */}
            <ReleaseSection
              icon={<Users className="h-4 w-4" />}
              label="Recipients"
              hint={`${selectedContacts.length} selected`}
            >
              {contacts.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  No contacts found for this customer.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {contacts.map((c) => {
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
                              {c.email} · {c.phone}
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
            </ReleaseSection>

            {/* Channel */}
            <ReleaseSection icon={<Send className="h-4 w-4" />} label="Channel">
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
                      <RadioGroupItem value={opt.id} id={`ch-${opt.id}`} className="sr-only" />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-foreground">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </ReleaseSection>

            {/* Email content (only for Email / Both) */}
            {(channel === "Email" || channel === "Both") && (
              <ReleaseSection icon={<Mail className="h-4 w-4" />} label="Email content">
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
                      className="min-h-[140px] rounded-[5px] text-[12px] leading-relaxed"
                    />
                  </div>
                </div>
              </ReleaseSection>
            )}

            {/* WhatsApp content */}
            {(channel === "WhatsApp" || channel === "Both") && (
              <ReleaseSection
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp message"
              >
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Short WhatsApp-friendly message"
                  className="min-h-[80px] rounded-[5px] text-[12px]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  PDF + payment link will be attached automatically.
                </p>
              </ReleaseSection>
            )}

            {/* Attachments */}
            <ReleaseSection
              icon={<Paperclip className="h-4 w-4" />}
              label="Attachments"
              hint="PDF required"
            >
              <div className="flex flex-col gap-1.5">
                <AttachmentRow
                  label="Invoice PDF"
                  hint="Always attached"
                  required
                  checked={attachments.includes("PDF")}
                  onToggle={() => toggleAttachment("PDF")}
                  disabled
                />
                <AttachmentRow
                  label="Excel export"
                  hint="Line items + totals as .xlsx"
                  checked={attachments.includes("Excel")}
                  onToggle={() => toggleAttachment("Excel")}
                />
                <AttachmentRow
                  label="Supporting docs"
                  hint="POD, LR, e-Way bill (simulated upload)"
                  checked={attachments.includes("Supporting")}
                  onToggle={() => toggleAttachment("Supporting")}
                />
              </div>
            </ReleaseSection>

            {/* Schedule */}
            <ReleaseSection icon={<Calendar className="h-4 w-4" />} label="Schedule">
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
                  <RadioGroupItem value="now" id="sch-now" />
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
                  <RadioGroupItem value="later" id="sch-later" />
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
            </ReleaseSection>
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
        {invoice && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {channel} → {selectedContacts.length} recipient
              {selectedContacts.length === 1 ? "" : "s"}
              {scheduleMode === "later" ? " · scheduled" : " · now"}
            </span>
            <span className="flex items-center gap-2 text-[12px] tabular">
              <FileText className="h-3 w-3 text-muted-foreground" />
              {formatINR(invoice.totalAmount)}
            </span>
          </div>
        )}

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
                  description: `${invoice?.invoiceNumber ?? ""} release draft saved`,
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
              disabled={!invoice || errors.length > 0}
            >
              {scheduleMode === "later" ? "Schedule" : "Release"}
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Section wrapper =====
function ReleaseSection({
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

function AttachmentRow({
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

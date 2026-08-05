"use client";

import { useMemo, useCallback } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ArrowLeft,
  Download,
  Printer,
  Pencil,
  Send,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  templateById,
  type GeneratedDocument,
  type LineItemRow,
  REANZLY_TAGLINE,
} from "./_data";
import {
  formatINR,
  formatDate,
  formatDateLong,
  formatINRWords,
} from "./_helpers";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useDocStudioStore } from "./_store";

interface DocumentPreviewProps {
  doc: GeneratedDocument;
  onBack: () => void;
  onEdit: () => void;
  // Toggle overrides stored at the preview level — when undefined, the doc.branding value is used
  reanzlyBrandedOverride?: boolean;
  onBrandedToggle?: (v: boolean) => void;
  // Compact mode hides the toolbar (used inside the builder's preview step)
  compact?: boolean;
}

export function DocumentPreview({
  doc,
  onBack,
  onEdit,
  reanzlyBrandedOverride,
  onBrandedToggle,
  compact = false,
}: DocumentPreviewProps) {
  const tpl = templateById(doc.templateId);
  const duplicate = useDocStudioStore((s) => s.duplicateDocument);
  const updateDocument = useDocStudioStore((s) => s.updateDocument);

  const branded = reanzlyBrandedOverride ?? doc.branding.reanzlyBranded;

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.add("printing");
    // Slight delay so the .printing class applies before print dialog
    setTimeout(() => {
      window.print();
      // Cleanup after print dialog closes (best-effort)
      setTimeout(() => {
        document.documentElement.classList.remove("printing");
      }, 300);
    }, 80);
  }, []);

  const handleDownload = useCallback(() => {
    toast("Opening print preview", {
      description: "Choose 'Save as PDF' in the destination to download.",
    });
    handlePrint();
  }, [handlePrint]);

  const handleDuplicate = useCallback(() => {
    const copy = duplicate(doc.id);
    if (copy) toast.success("Document duplicated", { description: copy.docNumber });
  }, [doc.id, duplicate]);

  const handleSend = useCallback(() => {
    updateDocument(doc.id, { status: "Sent" });
    toast.success("Marked as sent", { description: doc.docNumber });
  }, [doc.id, doc.docNumber, updateDocument]);

  return (
    <div className="flex flex-col gap-4">
      {!compact && (
        <>
          {/* Header toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-3 no-print">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={onBack}
                  className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-foreground hover:bg-accent transition-colors tap"
                  aria-label="Back to studio"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[12px] tabular text-foreground">{doc.docNumber}</span>
                <StatusBadge variant="outline">{tpl?.shortLabel ?? doc.templateId}</StatusBadge>
                <StatusBadge variant="solid">{doc.status}</StatusBadge>
              </div>
              <h2 className="text-[16px] font-medium tracking-tight text-foreground truncate">
                {doc.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Reanzly branding toggle */}
              <div className="flex items-center gap-2 rounded-[5px] border border-border px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-medium text-foreground">Created by Reanzly</span>
                  <span className="text-[10px] text-muted-foreground">
                    {branded ? "Branded" : "White-label"}
                  </span>
                </div>
                <Switch
                  checked={branded}
                  onCheckedChange={(v) => onBrandedToggle?.(v)}
                  aria-label="Toggle Created by Reanzly branding"
                />
              </div>

              <Btn variant="outline" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
                <span className="hidden sm:inline">Edit</span>
              </Btn>
              <Btn variant="outline" size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={handleDuplicate}>
                <span className="hidden sm:inline">Duplicate</span>
              </Btn>
              <Btn variant="outline" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={handleSend}>
                <span className="hidden sm:inline">Mark Sent</span>
              </Btn>
              <Btn variant="outline" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={handlePrint}>
                Print
              </Btn>
              <Btn variant="primary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={handleDownload}>
                Download PDF
              </Btn>
            </div>
          </div>
        </>
      )}

      {/* A4 page */}
      <div className="print-root">
        <A4Page doc={doc} branded={branded} />
      </div>
    </div>
  );
}

// ============================================================
//   A4Page — the actual printable A4 surface.
//   Renders a different body layout per template id.
// ============================================================
function A4Page({ doc, branded }: { doc: GeneratedDocument; branded: boolean }) {
  const tpl = templateById(doc.templateId);
  if (!tpl) return null;
  const Icon = tpl.icon;
  const b = doc.branding;

  const recipientBlock = (
    <div className="flex flex-col gap-1">
      <div className="a4-section-title">To</div>
      <div className="text-[11pt] font-medium">{doc.recipientName || "—"}</div>
      {doc.recipientOrg && <div className="text-[10.5pt]">{doc.recipientOrg}</div>}
      {doc.recipientAddress && (
        <div className="text-[10pt] print-muted whitespace-pre-line">{doc.recipientAddress}</div>
      )}
    </div>
  );

  return (
    <div className="a4-page relative">
      {/* Letterhead */}
      <header className="flex items-start justify-between border-b border-[var(--border)] pb-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--muted)] text-[14pt] font-semibold tracking-tight">
            {b.monogram}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-[15pt] font-semibold tracking-tight text-[var(--foreground)]">
              {b.companyName}
            </div>
            <div className="a4-meta">
              {b.addressLine1}{b.addressLine2 ? `, ${b.addressLine2}` : ""}
            </div>
            <div className="a4-meta">
              {b.city}, {b.state} - {b.pincode}
            </div>
            <div className="a4-meta">
              {b.phone} · {b.email} · {b.website}
            </div>
            {b.gstin && <div className="a4-meta">GSTIN: <span className="font-mono">{b.gstin}</span></div>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <div className="a4-eyebrow flex items-center gap-1.5">
            <Icon className="h-3 w-3" />
            {tpl.label}
          </div>
          <div className="text-[11pt] font-mono tabular text-[var(--foreground)]">{doc.docNumber}</div>
          <div className="a4-meta">Issued: {formatDateLong(doc.issuedAt ?? doc.createdAt)}</div>
          {doc.status === "Sent" && doc.updatedAt && (
            <div className="a4-meta">Sent: {formatDateLong(doc.updatedAt)}</div>
          )}
        </div>
      </header>

      {/* Title */}
      <div className="mb-5">
        <h1 className="a4-h1">{doc.title}</h1>
      </div>

      {/* Recipient + subject line */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {recipientBlock}
        <div className="flex flex-col gap-1 text-right">
          <div className="a4-section-title">Date</div>
          <div className="text-[11pt]">{formatDateLong(doc.issuedAt ?? doc.createdAt)}</div>
        </div>
      </div>

      {/* Body — per template */}
      <BodyRenderer doc={doc} tpl={tpl} />

      {/* Signature block */}
      <div className="a4-signature-block">
        <div className="flex flex-col gap-1">
          <div className="a4-section-title">For {b.companyName}</div>
          <div className="a4-sign-line" style={{ marginTop: 48 }}>
            <div className="font-medium">{b.signatoryName}</div>
            <div className="a4-meta">{b.signatoryTitle}</div>
          </div>
        </div>
        {doc.recipientName && (
          <div className="flex flex-col gap-1 text-right">
            <div className="a4-section-title">Accepted By</div>
            <div className="a4-sign-line" style={{ marginTop: 48 }}>
              <div className="font-medium">{doc.recipientName}</div>
              {doc.recipientOrg && <div className="a4-meta">{doc.recipientOrg}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Reanzly watermark */}
      {branded && (
        <div className="reanzly-watermark">
          {REANZLY_TAGLINE}
        </div>
      )}
    </div>
  );
}

// ============================================================
//   Body renderer — switches on template id to render the
//   appropriate body content + line item tables.
// ============================================================
function BodyRenderer({ doc, tpl }: { doc: GeneratedDocument; tpl: NonNullable<ReturnType<typeof templateById>> }) {
  const f = doc.fields;
  const b = doc.branding;

  // Generic line-item table renderer
  const lineItemTable = useMemo(() => {
    if (!tpl.lineItemsEnabled || !doc.lineItems || doc.lineItems.length === 0) return null;
    const cols = tpl.fields.find((fld) => fld.type === "lineitems")?.columns ?? [];

    // Determine column headers based on template type
    let headers: { label: string; cls?: string }[] = [];
    if (tpl.taxEnabled) {
      headers = [
        { label: "#" },
        { label: "Description" },
        { label: "HSN/SAC", cls: "num" },
        { label: "Qty", cls: "num" },
        { label: "Rate", cls: "num" },
        { label: "Amount", cls: "num" },
      ];
    } else if (tpl.id === "payslip") {
      // Payslip uses two tables (earnings/deductions) — handled separately below
      return null;
    } else if (tpl.id === "delivery-note") {
      headers = [
        { label: "#" },
        { label: "Item Description" },
        { label: "Qty", cls: "num" },
        { label: "Condition" },
      ];
    } else {
      // Offer letter / salary certificate / SLA — generic 2-column
      headers = [
        { label: "#" },
        { label: cols[0]?.label ?? "Description" },
        { label: cols[1]?.label ?? "Amount", cls: "num" },
      ];
    }

    return (
      <table className="a4-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={h.cls}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.lineItems.map((li, i) => (
            <tr key={li.id}>
              <td className="num">{i + 1}</td>
              <td>{li.description}</td>
              {tpl.taxEnabled && <td className="num">{li.hsn ?? "-"}</td>}
              {tpl.taxEnabled && <td className="num">{li.qty}</td>}
              {tpl.taxEnabled && <td className="num">{formatINR(li.rate)}</td>}
              {!tpl.taxEnabled && tpl.id !== "delivery-note" && (
                <td className="num">{formatINR(li.amount)}</td>
              )}
              {tpl.id === "delivery-note" && <td className="num">{li.qty}</td>}
              {tpl.id === "delivery-note" && <td>{li.description && ""}{(li as any).condition ?? "Good"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [doc.lineItems, tpl]);

  switch (tpl.id) {
    // ============ HR ============
    case "offer-letter": {
      const ctcMonthly = doc.lineItems?.reduce((s, i) => s + i.amount, 0) ?? 0;
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            Dear {doc.recipientName || "Candidate"},
          </BodyParagraph>
          <BodyParagraph>
            We are pleased to offer you the position of <strong>{f.position || "[Position]"}</strong>
            {f.department ? ` in the ${f.department} department` : ""} at <strong>{b.companyName}</strong>.
            Your employment will commence on <strong>{formatDateLong(f.joiningDate)}</strong>
            {f.location ? ` at our ${f.location} office` : ""}.
            {f.reportingTo ? ` You will report to ${f.reportingTo}.` : ""}
          </BodyParagraph>

          <BodyParagraph>
            The compensation package, on a Cost-to-Company basis, is detailed below.
            {f.ctcAnnual && <> The annual CTC is <strong>{formatINR(f.ctcAnnual)}</strong> ({formatINRWords(parseFloat(f.ctcAnnual))}).</>}
            {f.probation && ` Probation period: ${f.probation}.`}
            {f.noticePeriod && ` Notice period: ${f.noticePeriod}.`}
          </BodyParagraph>

          {doc.lineItems && doc.lineItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Compensation Breakdown (Monthly)</div>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Component</th>
                    <th className="num">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lineItems.map((li, i) => (
                    <tr key={li.id}>
                      <td className="num">{i + 1}</td>
                      <td>{li.description}</td>
                      <td className="num">{formatINR(li.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className="num" style={{ fontWeight: 600 }}>Total Monthly</td>
                    <td className="num" style={{ fontWeight: 600 }}>{formatINR(ctcMonthly)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {f.terms && (
            <BodyParagraph>
              <strong>Terms:</strong> {f.terms}
            </BodyParagraph>
          )}

          <BodyParagraph>
            Kindly confirm your acceptance by signing and returning a copy of this letter. We look forward to welcoming you to the team.
          </BodyParagraph>
        </div>
      );
    }

    case "experience-letter": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This is to certify that <strong>{f.employeeName || doc.recipientName}</strong>
            {f.employeeCode && <> (Employee Code: <span className="font-mono">{f.employeeCode}</span>)</>}
            {" "}was employed with <strong>{b.companyName}</strong> from <strong>{formatDateLong(f.startDate)}</strong> to <strong>{formatDateLong(f.endDate)}</strong>.
          </BodyParagraph>
          <BodyParagraph>
            {f.designation && <>During the tenure, the employee last held the designation of <strong>{f.designation}</strong>{f.department ? ` in the ${f.department} department` : ""}.</>}
          </BodyParagraph>
          <BodyParagraph>
            {f.conduct || "We found the employee's conduct, character and performance satisfactory during the period of employment."}
          </BodyParagraph>
          <BodyParagraph>
            We wish {f.employeeName || doc.recipientName} success in all future endeavours.
          </BodyParagraph>
        </div>
      );
    }

    case "relieving-letter": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This is to acknowledge the resignation submitted by <strong>{f.employeeName || doc.recipientName}</strong>
            {f.employeeCode && <> (Employee Code: <span className="font-mono">{f.employeeCode}</span>)</>}
            {" "}from the role of <strong>{f.designation}</strong>, effective <strong>{formatDateLong(f.lastWorkingDay)}</strong>.
          </BodyParagraph>
          <BodyParagraph>
            We confirm that the resignation has been accepted and that all statutory dues, salary, leave encashment and full & final settlement have been processed in accordance with company policy.
            All company assets, documents and access credentials have been returned and revoked.
          </BodyParagraph>
          <BodyParagraph>
            The employee is hereby relieved from all duties and responsibilities with effect from the close of business on <strong>{formatDateLong(f.lastWorkingDay)}</strong>.
          </BodyParagraph>
          {f.notes && <BodyParagraph>{f.notes}</BodyParagraph>}
          <BodyParagraph>
            We wish {f.employeeName || doc.recipientName} the very best in their future pursuits.
          </BodyParagraph>
        </div>
      );
    }

    case "salary-certificate": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This is to certify that <strong>{f.employeeName || doc.recipientName}</strong>
            {f.employeeCode && <> (Employee Code: <span className="font-mono">{f.employeeCode}</span>)</>}
            {f.designation && <>, holding the designation of <strong>{f.designation}</strong></>}
            {f.doj && <> since <strong>{formatDateLong(f.doj)}</strong></>}
            , is a {f.employmentType || "permanent"} employee of <strong>{b.companyName}</strong>.
          </BodyParagraph>
          <BodyParagraph>
            The salary particulars are as under:
          </BodyParagraph>
          <div className="grid grid-cols-3 gap-3 my-2">
            <StatBlock label="Gross Monthly" value={formatINR(f.grossMonthly)} />
            <StatBlock label="Net Monthly" value={formatINR(f.netMonthly)} />
            <StatBlock label="Annual CTC" value={formatINR(f.ctcAnnual)} />
          </div>

          {doc.lineItems && doc.lineItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Salary Breakdown (Monthly)</div>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Component</th>
                    <th className="num">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lineItems.map((li, i) => (
                    <tr key={li.id}>
                      <td className="num">{i + 1}</td>
                      <td>{li.description}</td>
                      <td className="num">{formatINR(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <BodyParagraph>
            This certificate is issued at the request of the employee for the purpose of <strong>{f.purpose || "general reference"}</strong> and is valid for 90 days from the date of issue. The information contained herein is confidential and is being shared solely for the stated purpose.
          </BodyParagraph>
        </div>
      );
    }

    // ============ Compliance ============
    case "training-certificate": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This is to certify that <strong>{f.traineeName || doc.recipientName}</strong>
            {f.traineeId && <> (ID: <span className="font-mono">{f.traineeId}</span>)</>}
            {" "}has successfully completed the <strong>{f.programName}</strong> training program conducted by <strong>{b.companyName}</strong>.
          </BodyParagraph>
          <BodyParagraph>
            Program duration: {f.duration || `${formatDateLong(f.startDate)} to ${formatDateLong(f.endDate)}`}.
            {f.trainer && ` Facilitator: ${f.trainer}.`}
          </BodyParagraph>
          {f.skillsCovered && (
            <BodyParagraph>
              <strong>Skills covered:</strong> {f.skillsCovered}
            </BodyParagraph>
          )}
          <BodyParagraph>
            The trainee has been assessed and is awarded a grade of <strong>{f.grade || "Pass"}</strong>.
          </BodyParagraph>
          <BodyParagraph>
            This certificate is issued based on the trainee&apos;s active participation, assessment scores and demonstrated proficiency in the program modules.
          </BodyParagraph>
        </div>
      );
    }

    case "driver-certificate": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This is to certify that <strong>{f.driverName || doc.recipientName}</strong>
            {f.driverCode && <> (Driver Code: <span className="font-mono">{f.driverCode}</span>)</>}
            , holder of Driving License No. <strong className="font-mono">{f.licenseNumber}</strong> (Class: {f.licenseClass || "-"})
            , has been verified and certified by <strong>{b.companyName}</strong> as fit and authorized to operate {f.vehicleCategory || "commercial"} vehicles.
          </BodyParagraph>
          <div className="grid grid-cols-2 gap-3 my-2">
            <StatBlock label="Valid From" value={formatDateLong(f.validFrom)} />
            <StatBlock label="Valid Until" value={formatDateLong(f.validUntil)} />
            {f.medicalFit && <StatBlock label="Medical Fitness Till" value={formatDateLong(f.medicalFit)} />}
            {f.certifiedBy && <StatBlock label="Certified By" value={f.certifiedBy} />}
          </div>
          {f.routes && (
            <BodyParagraph>
              <strong>Authorized routes / lanes:</strong> {f.routes}
            </BodyParagraph>
          )}
          <BodyParagraph>
            This certification is issued subject to periodic medical fitness review and adherence to the Motor Vehicles Act, 1988 and applicable state regulations. The driver is bound by the company&apos;s safety policy, hours-of-service regulations and route discipline during the validity period.
          </BodyParagraph>
        </div>
      );
    }

    case "noc": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This is to certify that <strong>{b.companyName}</strong> has No Objection to <strong>{f.subject}</strong> in respect of <strong>{doc.recipientName}</strong>
            {doc.recipientOrg ? ` (${doc.recipientOrg})` : ""}.
          </BodyParagraph>
          <BodyParagraph>
            The scope of this No Objection Certificate is limited to <strong>{f.scope}</strong> and is effective from <strong>{formatDateLong(f.effectiveDate)}</strong>.
            {f.validity && ` This certificate is valid for a period of ${f.validity} days from the date of issue.`}
          </BodyParagraph>
          {f.conditions && (
            <BodyParagraph>
              <strong>Conditions:</strong> {f.conditions}
            </BodyParagraph>
          )}
          <BodyParagraph>
            This NOC is issued at the request of the party and is subject to the applicable laws and regulations. The company reserves the right to revoke this certificate in case of any misrepresentation or breach of the stated conditions.
          </BodyParagraph>
        </div>
      );
    }

    // ============ Finance ============
    case "quotation": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            We thank you for your enquiry{f.customerRef ? ` (Ref: ${f.customerRef})` : ""} and are pleased to submit our quotation for the services detailed below. The rates quoted are valid for <strong>{f.validity || "30"} days</strong> from the date of issue.
            {f.deliveryLead && ` Expected delivery lead time: ${f.deliveryLead}.`}
          </BodyParagraph>

          {doc.lineItems && doc.lineItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Service Details</div>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th className="num">HSN/SAC</th>
                    <th className="num">Qty</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lineItems.map((li, i) => (
                    <tr key={li.id}>
                      <td className="num">{i + 1}</td>
                      <td>{li.description}</td>
                      <td className="num">{li.hsn ?? "-"}</td>
                      <td className="num">{li.qty}</td>
                      <td className="num">{formatINR(li.rate)}</td>
                      <td className="num">{formatINR(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {doc.subtotal !== undefined && (
            <div className="flex justify-end">
              <div className="flex flex-col gap-1 min-w-[280px]">
                <TotalRow label="Subtotal" value={formatINR(doc.subtotal ?? 0)} />
                <TotalRow label={`GST @ ${f.taxRate || 0}%`} value={formatINR(doc.taxAmount ?? 0)} />
                <TotalRow label="Grand Total" value={formatINR(doc.totalAmount ?? 0)} bold />
                <div className="text-[9pt] print-muted text-right italic">
                  ({formatINRWords(doc.totalAmount ?? 0)})
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="a4-section-title">Payment Terms</div>
              <div className="text-[10.5pt]">{paymentTermsLabel(f.paymentTerms)}</div>
            </div>
            {f.notes && (
              <div>
                <div className="a4-section-title">Notes</div>
                <div className="text-[10.5pt] print-muted">{f.notes}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "purchase-order": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            We are pleased to place a purchase order with <strong>{doc.recipientName}</strong>
            {doc.recipientOrg ? ` (${doc.recipientOrg})` : ""} for the goods/services listed below.
            {f.deliveryDate && <> Expected delivery by <strong>{formatDateLong(f.deliveryDate)}</strong>.</>}
          </BodyParagraph>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="a4-section-title">Delivery Address</div>
              <div className="text-[10.5pt] print-muted whitespace-pre-line">
                {f.deliveryAddress || b.companyName + ", " + b.addressLine1 + ", " + b.city + " - " + b.pincode}
              </div>
            </div>
            <div>
              <div className="a4-section-title">Payment Terms</div>
              <div className="text-[10.5pt]">{paymentTermsLabel(f.paymentTerms)}</div>
              <div className="a4-section-title mt-2">PO Date</div>
              <div className="text-[10.5pt]">{formatDateLong(f.poDate)}</div>
            </div>
          </div>

          {doc.lineItems && doc.lineItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Order Details</div>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Description</th>
                    <th className="num">HSN</th>
                    <th className="num">Qty</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lineItems.map((li, i) => (
                    <tr key={li.id}>
                      <td className="num">{i + 1}</td>
                      <td>{li.description}</td>
                      <td className="num">{li.hsn ?? "-"}</td>
                      <td className="num">{li.qty}</td>
                      <td className="num">{formatINR(li.rate)}</td>
                      <td className="num">{formatINR(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {doc.subtotal !== undefined && (
            <div className="flex justify-end">
              <div className="flex flex-col gap-1 min-w-[280px]">
                <TotalRow label="Subtotal" value={formatINR(doc.subtotal ?? 0)} />
                <TotalRow label={`GST @ ${f.taxRate || 0}%`} value={formatINR(doc.taxAmount ?? 0)} />
                <TotalRow label="Grand Total" value={formatINR(doc.totalAmount ?? 0)} bold />
                <div className="text-[9pt] print-muted text-right italic">
                  ({formatINRWords(doc.totalAmount ?? 0)})
                </div>
              </div>
            </div>
          )}

          {f.notes && (
            <BodyParagraph>
              <strong>Special Instructions:</strong> {f.notes}
            </BodyParagraph>
          )}
        </div>
      );
    }

    case "payslip": {
      // Split by id prefix: "e*" = earnings, "d*" = deductions.
      // Falls back to position-based split (first N = earnings) when ids aren't prefixed.
      const allItems = doc.lineItems ?? [];
      const hasEPrefix = allItems.some((li) => li.id.startsWith("e"));
      const hasDPrefix = allItems.some((li) => li.id.startsWith("d"));
      let earnings: LineItemRow[];
      let deductions: LineItemRow[];
      if (hasEPrefix || hasDPrefix) {
        earnings = allItems.filter((li) => li.id.startsWith("e"));
        deductions = allItems.filter((li) => li.id.startsWith("d"));
      } else {
        const splitAt = tpl.fields.find((f) => f.id === "earnings")?.defaultRows ?? 5;
        earnings = allItems.slice(0, splitAt);
        deductions = allItems.slice(splitAt);
      }
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="a4-section-title">Employee</div>
              <div className="text-[11pt] font-medium">{f.employeeName || doc.recipientName}</div>
              <div className="a4-meta font-mono">{f.employeeCode}</div>
              {f.designation && <div className="a4-meta">{f.designation}</div>}
            </div>
            <div className="text-right">
              <div className="a4-section-title">Pay Period</div>
              <div className="text-[11pt] font-medium">{f.payPeriod}</div>
              <div className="a4-meta">Paid on: {formatDateLong(f.payDate)}</div>
              <div className="a4-meta font-mono">{f.bankAccount}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBlock label="Working Days" value={f.workingDays ?? "-"} />
            <StatBlock label="Days Present" value={f.daysPresent ?? "-"} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Earnings</div>
              <table className="a4-table">
                <thead>
                  <tr><th>Component</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  {earnings.map((li) => (
                    <tr key={li.id}>
                      <td>{li.description}</td>
                      <td className="num">{formatINR(li.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Gross</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {formatINR(earnings.reduce((s, i) => s + i.amount, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Deductions</div>
              <table className="a4-table">
                <thead>
                  <tr><th>Component</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  {deductions.map((li) => (
                    <tr key={li.id}>
                      <td>{li.description}</td>
                      <td className="num">{formatINR(li.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total Deducted</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {formatINR(deductions.reduce((s, i) => s + i.amount, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[4px] border border-[var(--border)] bg-[var(--muted)] p-3 mt-2 flex items-center justify-between">
            <div className="text-[11pt] font-medium">Net Pay</div>
            <div className="text-[14pt] font-semibold tabular">{formatINR(f.netPay)}</div>
          </div>
          <div className="text-[9pt] print-muted text-right italic">
            ({formatINRWords(parseFloat(f.netPay || "0"))})
          </div>
        </div>
      );
    }

    // ============ Operations ============
    case "delivery-note": {
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            Goods as per the undermentioned details have been dispatched from <strong>{f.origin}</strong> to <strong>{f.destination}</strong>
            {f.vehicleNumber && <> via vehicle <strong className="font-mono">{f.vehicleNumber}</strong></>}
            {f.lrNumber && <> against LR No. <strong className="font-mono">{f.lrNumber}</strong></>}.
            Dispatched on <strong>{formatDateLong(f.dispatchDate)}</strong> and delivered on <strong>{formatDateLong(f.deliveryDate)}</strong>.
          </BodyParagraph>

          {doc.lineItems && doc.lineItems.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">Items Delivered</div>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Description</th>
                    <th className="num">Qty</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lineItems.map((li, i) => (
                    <tr key={li.id}>
                      <td className="num">{i + 1}</td>
                      <td>{li.description}</td>
                      <td className="num">{li.qty}</td>
                      <td>{(li as any).condition ?? "Good"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {f.remarks && (
            <BodyParagraph>
              <strong>Remarks:</strong> {f.remarks}
            </BodyParagraph>
          )}

          <BodyParagraph>
            Received by <strong>{f.receivedBy || "____________________"}</strong>
            {f.receiverContact ? ` (Contact: ${f.receiverContact})` : ""} in good condition unless otherwise noted above.
          </BodyParagraph>
        </div>
      );
    }

    // ============ Sales ============
    case "sla": {
      const slas = doc.lineItems ?? [];
      return (
        <div className="flex flex-col gap-4">
          <BodyParagraph>
            This Service Level Agreement (&quot;Agreement&quot;) is entered into between <strong>{b.companyName}</strong> (the &quot;Service Provider&quot;) and <strong>{doc.recipientName}</strong>
            {doc.recipientOrg ? ` (${doc.recipientOrg})` : ""} (the &quot;Client&quot;), effective from <strong>{formatDateLong(f.effectiveDate)}</strong>
            {f.termMonths && <> for an initial term of <strong>{f.termMonths} months</strong></>}.
          </BodyParagraph>

          {f.scope && (
            <BodyParagraph>
              <strong>Scope of Services.</strong> {f.scope}
            </BodyParagraph>
          )}
          {f.serviceHours && (
            <BodyParagraph>
              <strong>Service Hours.</strong> {f.serviceHours}
            </BodyParagraph>
          )}

          {slas.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="a4-section-title">SLA Matrix</div>
              <table className="a4-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service Parameter</th>
                    <th className="num">Target</th>
                    <th className="num">Penalty / Miss</th>
                  </tr>
                </thead>
                <tbody>
                  {slas.map((li, i) => (
                    <tr key={li.id}>
                      <td className="num">{i + 1}</td>
                      <td>{li.description}</td>
                      <td className="num">{li.qty}</td>
                      <td className="num">{formatINR(li.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {f.escalation && (
            <BodyParagraph>
              <strong>Escalation Matrix.</strong> {f.escalation}
            </BodyParagraph>
          )}
          {f.termination && (
            <BodyParagraph>
              <strong>Termination.</strong> {f.termination}
            </BodyParagraph>
          )}

          <BodyParagraph>
            This Agreement is governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts at Mumbai.
          </BodyParagraph>
        </div>
      );
    }

    default:
      return null;
  }
}

function BodyParagraph({ children }: { children: React.ReactNode }) {
  return <p className="text-[11pt] leading-relaxed text-[var(--foreground)]">{children}</p>;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-[var(--border)] p-2.5">
      <div className="text-[8pt] uppercase tracking-wider text-[var(--muted-foreground)]">{label}</div>
      <div className="text-[11pt] font-medium tabular">{value}</div>
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between text-[10.5pt]", bold && "border-t border-[var(--foreground)] pt-1.5 font-semibold")}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function paymentTermsLabel(code?: string): string {
  const map: Record<string, string> = {
    advance: "100% Advance",
    net7: "Net 7 days",
    net15: "Net 15 days",
    net30: "Net 30 days",
    net45: "Net 45 days",
    net60: "Net 60 days",
    cod: "Cash on Delivery",
    delivery: "Against Delivery",
  };
  return code ? (map[code] ?? code) : "Net 30 days";
}

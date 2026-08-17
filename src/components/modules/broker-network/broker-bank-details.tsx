"use client";

import { useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Banknote,
  Landmark,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Building2,
  Hash,
  FileText,
  Calendar,
  Wallet,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
} from "./_helpers";
import { useBrokerFinanceData, type BankDetailsDTO } from "./use-broker-finance-data";

/* ============================================================
   BrokerBankDetails - the broker's NACH-registered bank
   account for commission payouts. View + edit form + bank
   advice download.
   ============================================================ */

const EMPTY: BankDetailsDTO = {
  bankName: "", bankBranch: "", bankAccountName: "", bankAccountNumber: "",
  bankIfsc: "", nachUmr: "", nextPayoutDate: null, nextPayoutAmount: 0,
  brokerCode: "", companyName: "",
};

export function BrokerBankDetails() {
  const { ledger, settlements, bankDetails, updateBankDetails } = useBrokerFinanceData();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BankDetailsDTO>(EMPTY);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loadedBank, setLoadedBank] = useState(bankDetails);
  if (bankDetails !== loadedBank) {
    setLoadedBank(bankDetails);
    if (bankDetails) setForm(bankDetails);
  }

  const saved = bankDetails ?? EMPTY;

  // Real ledger/settlements come back oldest-first, so the latest balance
  // and latest payout are at the END of the array, not the start.
  const runningBalance = ledger.length ? ledger[ledger.length - 1].runningBalanceINR : 0;
  const debits = ledger.filter((e) => e.type === "Debit");
  const lastPayout = debits.length ? debits[debits.length - 1] : undefined;
  const pendingPayouts = settlements
    .filter((c) => c.status === "Approved")
    .reduce((s, c) => s + c.netPayableINR, 0);

  const save = async () => {
    const ok = await updateBankDetails(form);
    if (ok) {
      setEditing(false);
      toast.success("Bank details updated", {
        description: `${form.bankName} ****${(form.bankAccountNumber ?? "").slice(-4)} - NACH mandate re-verification may take up to 5 business days.`,
      });
    }
  };

  const cancel = () => {
    setForm(saved);
    setEditing(false);
  };

  const copyField = (field: string, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).then(
        () => {
          setCopiedField(field);
          toast.success(`${field} copied`);
          setTimeout(() => setCopiedField(null), 1500);
        },
        () => toast("Copy failed - copy manually"),
      );
    } else {
      toast("Copy unavailable - copy manually");
    }
  };

  const downloadAdvice = () => {
    toast.success("Bank advice (NACH) downloaded", {
      description: `${saved.bankAccountName} - ${saved.bankIfsc} - ${formatINR(saved.nextPayoutAmount)}`,
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Bank Details
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              NACH-registered bank account for commission payouts. Keep this current - failed NACH credits delay your settlement.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Bank</span>
                <span className="font-medium text-foreground">{saved.bankName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium text-foreground tabular">****{(saved.bankAccountNumber ?? "").slice(-4)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">NACH UMR</span>
                <span className="font-medium text-foreground tabular">{saved.nachUmr}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge variant="solid" pulse>
                  <ShieldCheck className="h-3 w-3" /> NACH Registered
                </StatusBadge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Btn variant="ghost" onClick={cancel}>Cancel</Btn>
                <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={save}>
                  Save changes
                </Btn>
              </>
            ) : (
              <>
                <Btn variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadAdvice}>
                  Bank advice
                </Btn>
                <Btn variant="primary" onClick={() => { setForm(saved); setEditing(true); }}>
                  Edit details
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Ledger balance" value={formatINRCompact(runningBalance)} hint="unpaid commission" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending payouts" value={formatINRCompact(pendingPayouts)} hint="approved, awaiting NACH" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Next payout" value={formatINR(saved.nextPayoutAmount)} hint={formatDate(saved.nextPayoutDate ?? undefined)} />
        <KpiTile icon={<Calendar className="h-3.5 w-3.5" />} label="Last payout" value={lastPayout ? formatINR(lastPayout.amountINR) : "-"} hint={lastPayout ? relativeTime(lastPayout.date) : "no payouts yet"} />
      </div>

      {/* Bank account card */}
      <SectionCard
        title="NACH-registered bank account"
        description="Commission payouts credit to this account via NACH. Verify the UMRN with your bank."
        icon={<Landmark className="h-4 w-4" />}
        action={
          !editing && (
            <Btn variant="outline" size="sm" onClick={() => { setForm(saved); setEditing(true); }}>
              Edit
            </Btn>
          )
        }
      >
        {!editing ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadField icon={Landmark} label="Bank name" value={saved.bankName ?? "-"} onCopy={() => copyField("Bank name", saved.bankName ?? "")} copied={copiedField === "Bank name"} />
            <ReadField icon={Building2} label="Branch" value={saved.bankBranch ?? "-"} onCopy={() => copyField("Branch", saved.bankBranch ?? "")} copied={copiedField === "Branch"} />
            <ReadField icon={FileText} label="Account name" value={saved.bankAccountName ?? "-"} onCopy={() => copyField("Account name", saved.bankAccountName ?? "")} copied={copiedField === "Account name"} />
            <ReadField icon={Hash} label="Account number" value={saved.bankAccountNumber ?? "-"} mono onCopy={() => copyField("Account number", saved.bankAccountNumber ?? "")} copied={copiedField === "Account number"} />
            <ReadField icon={Hash} label="IFSC" value={saved.bankIfsc ?? "-"} mono onCopy={() => copyField("IFSC", saved.bankIfsc ?? "")} copied={copiedField === "IFSC"} />
            <ReadField icon={Hash} label="NACH UMR" value={saved.nachUmr ?? "-"} mono onCopy={() => copyField("NACH UMR", saved.nachUmr ?? "")} copied={copiedField === "NACH UMR"} />
            <ReadField icon={Calendar} label="Next payout date" value={formatDate(saved.nextPayoutDate ?? undefined)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Bank name" required>
              <Input
                value={form.bankName ?? ""}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="h-9 rounded-[5px] text-[13px]"
              />
            </Field>
            <Field label="Branch">
              <Input
                value={form.bankBranch ?? ""}
                onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                className="h-9 rounded-[5px] text-[13px]"
              />
            </Field>
            <Field label="Account name" required>
              <Input
                value={form.bankAccountName ?? ""}
                onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                className="h-9 rounded-[5px] text-[13px]"
              />
            </Field>
            <Field label="Account number" required mono>
              <Input
                value={form.bankAccountNumber ?? ""}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                className="h-9 rounded-[5px] text-[13px] tabular"
              />
            </Field>
            <Field label="IFSC" required mono>
              <Input
                value={form.bankIfsc ?? ""}
                onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                className="h-9 rounded-[5px] text-[13px] tabular"
                maxLength={11}
              />
            </Field>
            <Field label="NACH UMR" mono hint="Mandate Unique Reference">
              <Input
                value={form.nachUmr ?? ""}
                onChange={(e) => setForm({ ...form, nachUmr: e.target.value })}
                className="h-9 rounded-[5px] text-[13px] tabular"
              />
            </Field>
          </div>
        )}
      </SectionCard>

      {/* Next payout + bank advice */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Next payout card */}
        <SectionCard
          title="Next payout"
          description="Scheduled NACH credit for approved commission cycles."
          icon={<Banknote className="h-4 w-4" />}
        >
          <div className="rounded-[6px] border border-border bg-muted/30 p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Amount
            </div>
            <div className="mt-1 text-[28px] font-medium tabular text-foreground">
              {formatINR(saved.nextPayoutAmount)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Scheduled for {formatDate(saved.nextPayoutDate ?? undefined)}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              NACH credits typically settle in 1-2 business days.
            </div>
          </div>
          <Btn
            variant="primary"
            block
            className="mt-3"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={downloadAdvice}
          >
            Download bank advice (NACH)
          </Btn>
        </SectionCard>

        {/* Payout history */}
        <SectionCard
          title="Recent payouts"
          description="Last 5 NACH credits to your registered account."
          icon={<Clock className="h-4 w-4" />}
          className="lg:col-span-2"
          flush
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Reference</th>
                  <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Account</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...debits].reverse().slice(0, 5).map((e, i) => (
                  <tr
                    key={e.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5 text-left text-muted-foreground">{formatDate(e.date)}</td>
                    <td className="px-4 py-2.5 text-left tabular text-foreground">{e.refId}</td>
                    <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground sm:table-cell">
                      {saved.bankName} ****{(saved.bankAccountNumber ?? "").slice(-4)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(e.amountINR)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant="muted">
                        <Check className="h-3 w-3" /> Settled
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {debits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                      No payouts yet. Run a settlement cycle to receive your first commission.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* NACH mandate info */}
      <SectionCard
        title="NACH mandate"
        description="Your NACH mandate authorises Reanzly to credit your registered bank account for commission payouts."
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoTile icon={Hash} label="UMR number" value={saved.nachUmr} hint="Mandate Unique Reference" />
          <InfoTile icon={Calendar} label="Registered on" value="12 Aug 2024" hint="Active for 31 years" />
          <InfoTile icon={Banknote} label="Max debit per cycle" value="₹10,00,000" hint="auto-scaling" />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-[5px] border border-border bg-muted/30 p-3">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Changes to your bank account require NACH re-verification (up to 5 business days). Payouts to the old account continue until the new mandate is verified. Contact <span className="font-medium text-foreground">broker-support@reanzly.com</span> for help.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

/* ===== Local UI helpers ===== */

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function ReadField({
  icon: Icon,
  label,
  value,
  mono,
  onCopy,
  copied,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="tap flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
      <div className={"mt-1 text-[14px] font-medium text-foreground " + (mono ? "tabular" : "")}>
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  mono,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className={"text-[12px] font-medium text-foreground " + (mono ? "tabular" : "")}>
          {label}
          {required && <span className="ml-0.5 text-foreground">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-[14px] font-medium tabular text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

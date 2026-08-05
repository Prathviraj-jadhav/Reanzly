"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  FileText,
  ArrowDownCircle,
  Scale,
  X,
  Calendar,
  Pencil,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useLedgerStore } from "@/lib/store/ledger-store";
import type { Account, JournalEntry, EntryStatus } from "./_data";
import {
  FieldLabel,
  formatINR,
  formatAmt,
  formatDate,
  formatShortDate,
  todayISO,
  entryStatusVariant,
} from "./_helpers";

/* ============================================================
   Journal view.
   - KPI strip: total entries, posted, drafts, total debit volume
   - DataTable: voucher no, date, narration, debit, credit, status
   - New Entry drawer: date, narration, multi-line editor with
     running Dr/Cr footer that must show "Balanced" before Save
   - Edit / Delete entry
   ============================================================ */

export function JournalView() {
  const entries = useLedgerStore((s) => s.entries);
  const accounts = useLedgerStore((s) => s.accounts);
  const addEntry = useLedgerStore((s) => s.addEntry);
  const updateEntry = useLedgerStore((s) => s.updateEntry);
  const deleteEntry = useLedgerStore((s) => s.deleteEntry);

  const [newOpen, setNewOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [deleteEntryState, setDeleteEntryState] = useState<JournalEntry | null>(null);

  // Account lookup map - resolves names for line items
  const accountMap = useMemo(() => {
    const m: Record<string, Account> = {};
    for (const a of accounts) m[a.id] = a;
    return m;
  }, [accounts]);

  // KPIs
  const kpis = useMemo(() => {
    let posted = 0;
    let drafts = 0;
    let totalDebit = 0;
    for (const e of entries) {
      if (e.status === "Posted") {
        posted += 1;
        totalDebit += e.lines.reduce((s, l) => s + (l.debit || 0), 0);
      } else drafts += 1;
    }
    return { total: entries.length, posted, drafts, totalDebit };
  }, [entries]);

  const columns: Column<JournalEntry>[] = [
    {
      key: "voucherNo",
      header: "Voucher",
      sortable: true,
      sortValue: (e) => e.voucherNo,
      width: "120px",
      sticky: true,
      render: (e) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] font-medium text-foreground">{e.voucherNo}</span>
          <span className="text-[11px] text-muted-foreground">{formatShortDate(e.date)}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (e) => e.date,
      hideOnMobile: true,
      render: (e) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(e.date)}</span>
      ),
    },
    {
      key: "narration",
      header: "Narration",
      sortable: true,
      sortValue: (e) => e.narration.toLowerCase(),
      render: (e) => {
        const lines = e.lines.length;
        return (
          <div className="min-w-0">
            <div className="truncate text-[13px] text-foreground">{e.narration}</div>
            <div className="text-[11px] text-muted-foreground tabular">
              {lines} line{lines === 1 ? "" : "s"} · {e.createdBy}
            </div>
          </div>
        );
      },
    },
    {
      key: "debit",
      header: "Debit",
      sortable: true,
      sortValue: (e) => e.lines.reduce((s, l) => s + (l.debit || 0), 0),
      align: "right",
      hideOnMobile: true,
      render: (e) => {
        const d = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
        return (
          <span className={cn("tabular text-[13px]", d > 0 ? "text-foreground" : "text-muted-foreground")}>
            {d > 0 ? formatAmt(d) : "-"}
          </span>
        );
      },
    },
    {
      key: "credit",
      header: "Credit",
      sortable: true,
      sortValue: (e) => e.lines.reduce((s, l) => s + (l.credit || 0), 0),
      align: "right",
      hideOnMobile: true,
      render: (e) => {
        const c = e.lines.reduce((s, l) => s + (l.credit || 0), 0);
        return (
          <span className={cn("tabular text-[13px]", c > 0 ? "text-foreground" : "text-muted-foreground")}>
            {c > 0 ? formatAmt(c) : "-"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: "96px",
      render: (e) => {
        const v = entryStatusVariant(e.status);
        return (
          <StatusBadge variant={v.variant} pulse={v.pulse}>
            {e.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions: { label: string; onClick: (e: JournalEntry) => void; destructive?: boolean }[] = [
    {
      label: "Edit",
      onClick: (e) => setEditEntry(e),
    },
    {
      label: "Post",
      onClick: (e) => {
        if (e.status !== "Draft") return;
        updateEntry(e.id, { status: "Posted" });
        toast.success("Entry posted", {
          description: `${e.voucherNo} is now posted and affects account balances.`,
        });
      },
    },
    {
      label: "Delete",
      onClick: (e) => setDeleteEntryState(e),
      destructive: true,
    },
  ];

  const confirmDelete = () => {
    if (!deleteEntryState) return;
    deleteEntry(deleteEntryState.id);
    toast.success("Entry deleted", {
      description: `${deleteEntryState.voucherNo} removed from the journal.`,
    });
    setDeleteEntryState(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiTile label="Total Entries" value={String(kpis.total)} icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiTile label="Posted" value={String(kpis.posted)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiTile label="Drafts" value={String(kpis.drafts)} icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiTile label="Debit Volume" value={formatINR(kpis.totalDebit)} icon={<ArrowDownCircle className="h-3.5 w-3.5" />} />
      </div>

      <SectionCard
        title="Journal Entries"
        description="Double-entry vouchers - every entry must balance (Dr == Cr) before posting."
        icon={<Scale className="h-4 w-4" />}
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOpen(true)}>
            New Entry
          </Btn>
        }
        flush
      >
        <DataTable
          data={entries}
          columns={columns}
          searchKeys={["voucherNo", "narration", "createdBy"]}
          searchPlaceholder="Search by voucher, narration or creator…"
          rowActions={rowActions}
          onRowClick={(e) => setEditEntry(e)}
          pageSize={25}
          initialSort={{ key: "voucherNo", dir: "desc" }}
          expandable={{
            render: (e) => <EntryLineItems entry={e} accountMap={accountMap} />,
          }}
        />
      </SectionCard>

      <EntryDrawer
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSave={(data) => {
          try {
            addEntry(data);
            toast.success("Entry saved", {
              description: `${data.voucherNo ?? "New voucher"} created with ${data.lines.length} line item${data.lines.length === 1 ? "" : "s"}.`,
            });
            setNewOpen(false);
          } catch (err) {
            toast.error("Cannot save entry", {
              description: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }}
      />

      <EntryDrawer
        key={editEntry?.id ?? "none"}
        open={!!editEntry}
        entry={editEntry ?? undefined}
        onClose={() => setEditEntry(null)}
        onSave={(data) => {
          if (editEntry) {
            updateEntry(editEntry.id, data);
            toast.success("Entry updated", {
              description: `${editEntry.voucherNo} saved.`,
            });
          }
          setEditEntry(null);
        }}
      />

      <AlertDialog open={!!deleteEntryState} onOpenChange={(o) => !o && setDeleteEntryState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete journal entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">{deleteEntryState?.voucherNo}</span>{" "}
              from the journal. Account balances will be recomputed from the remaining entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-[5px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   Expandable line-items panel inside the data table
   ============================================================ */
function EntryLineItems({
  entry,
  accountMap,
}: {
  entry: JournalEntry;
  accountMap: Record<string, Account>;
}) {
  return (
    <div className="bg-muted/20 px-4 py-3">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Account</th>
              <th className="py-1.5 px-3 font-medium text-right">Debit</th>
              <th className="py-1.5 pl-3 font-medium text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((l, i) => {
              const acc = accountMap[l.accountId];
              return (
                <tr key={i} className="border-t border-border">
                  <td className="py-1.5 pr-3">
                    <span className="tabular text-[11px] text-muted-foreground">{acc?.code ?? "?"}</span>
                    <span className="ml-2 text-foreground">{acc?.name ?? "Unknown account"}</span>
                  </td>
                  <td className="py-1.5 px-3 text-right tabular text-foreground">
                    {l.debit > 0 ? formatAmt(l.debit) : "-"}
                  </td>
                  <td className="py-1.5 pl-3 text-right tabular text-foreground">
                    {l.credit > 0 ? formatAmt(l.credit) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="py-1.5 pr-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Total
              </td>
              <td className="py-1.5 px-3 text-right tabular font-medium text-foreground">
                {formatAmt(entry.lines.reduce((s, l) => s + (l.debit || 0), 0))}
              </td>
              <td className="py-1.5 pl-3 text-right tabular font-medium text-foreground">
                {formatAmt(entry.lines.reduce((s, l) => s + (l.credit || 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   Entry drawer - add / edit, with line-item editor
   ============================================================ */

interface DraftLine {
  accountId: string;
  debit: string;
  credit: string;
}

interface EntryDrawerProps {
  open: boolean;
  onClose: () => void;
  entry?: JournalEntry;
  onSave: (data: Omit<JournalEntry, "id" | "createdAt">) => void;
}

function EntryDrawer({ open, onClose, entry, onSave }: EntryDrawerProps) {
  const accounts = useLedgerStore((s) => s.accounts);

  const [date, setDate] = useState<string>(
    entry?.date ? entry.date.slice(0, 10) : todayISO(),
  );
  const [narration, setNarration] = useState(entry?.narration ?? "");
  const [status, setStatus] = useState<EntryStatus>(entry?.status ?? "Posted");
  const [createdBy, setCreatedBy] = useState(entry?.createdBy ?? "Accountant · Geeta");
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (entry && entry.lines.length > 0) {
      return entry.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit ? String(l.debit) : "",
        credit: l.credit ? String(l.credit) : "",
      }));
    }
    return [
      { accountId: "", debit: "", credit: "" },
      { accountId: "", debit: "", credit: "" },
    ];
  });

  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  // When the user types into debit, clear credit and vice versa (Tally-like UX).
  const setDebit = (idx: number, val: string) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? { ...l, debit: val, credit: val && l.credit ? "" : l.credit }
          : l,
      ),
    );
  };
  const setCredit = (idx: number, val: string) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? { ...l, credit: val, debit: val && l.debit ? "" : l.debit }
          : l,
      ),
    );
  };

  const addLine = () =>
    setLines((prev) => [...prev, { accountId: "", debit: "", credit: "" }]);
  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  // Running totals + balanced check
  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    for (const l of lines) {
      dr += Number(l.debit) || 0;
      cr += Number(l.credit) || 0;
    }
    return {
      debit: Math.round(dr),
      credit: Math.round(cr),
      diff: Math.round(dr - cr),
      balanced: Math.abs(dr - cr) < 0.5 && dr > 0,
    };
  }, [lines]);

  // Validation: every line needs an account + either debit xor credit
  const valid = useMemo(() => {
    if (!narration.trim()) return false;
    if (lines.length < 2) return false;
    if (!totals.balanced) return false;
    for (const l of lines) {
      if (!l.accountId) return false;
      const d = Number(l.debit) || 0;
      const c = Number(l.credit) || 0;
      if (d > 0 && c > 0) return false;
      if (d === 0 && c === 0) return false;
    }
    return true;
  }, [narration, lines, totals]);

  const handleSave = () => {
    if (!valid) {
      toast.error("Cannot save entry", {
        description: !narration.trim()
          ? "Narration is required."
          : !totals.balanced
            ? `Entry is out of balance by ${formatINR(Math.abs(totals.diff))}.`
            : "Each line needs an account with either a debit or a credit.",
      });
      return;
    }
    onSave({
      voucherNo: entry?.voucherNo ?? "",
      date: new Date(date).toISOString(),
      narration: narration.trim(),
      status,
      createdBy,
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: Math.round(Number(l.debit) || 0),
        credit: Math.round(Number(l.credit) || 0),
      })),
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {entry ? "Edit Journal Entry" : "New Journal Entry"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {entry
                ? `${entry.voucherNo} - update lines, narration or status.`
                : "Double-entry voucher - debits must equal credits before posting."}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Voucher meta */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Voucher Details
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>Status</FieldLabel>
                  <Select value={status} onValueChange={(v) => setStatus(v as EntryStatus)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Posted">Posted - affects balances</SelectItem>
                      <SelectItem value="Draft">Draft - pending review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Narration</FieldLabel>
                  <Textarea
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    placeholder="e.g. Freight bill - Bharat Logistics, Mumbai to Pune, INV-02031"
                    className="min-h-[64px] rounded-[5px] text-[13px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel hint="optional">Created by</FieldLabel>
                  <Input
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    placeholder="Accountant · Geeta"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Line items editor */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Line Items
                  </span>
                </div>
                <Btn variant="outline" size="xs" icon={<Plus className="h-3 w-3" />} onClick={addLine} type="button">
                  Add line
                </Btn>
              </div>

              {/* Header row (desktop only) */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_32px] gap-2 px-1 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <span>Account</span>
                <span className="text-right">Debit (₹)</span>
                <span className="text-right">Credit (₹)</span>
                <span></span>
              </div>

              <div className="flex flex-col gap-1.5">
                {lines.map((l, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_32px] gap-2 items-start"
                  >
                    <div className="min-w-0">
                      <Select
                        value={l.accountId}
                        onValueChange={(v) => updateLine(i, { accountId: v })}
                      >
                        <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                          <SelectValue placeholder="Select account…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px]">
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="tabular text-[11px] text-muted-foreground">{a.code}</span>
                              <span className="ml-1.5">{a.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={l.debit}
                      onChange={(e) => setDebit(i, e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular text-right"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={l.credit}
                      onChange={(e) => setCredit(i, e.target.value)}
                      placeholder="0"
                      className="h-8 rounded-[5px] text-[13px] tabular text-right"
                    />
                    <button
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 2}
                      className="flex h-8 w-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Remove line"
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals footer */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_32px] gap-2 border-t-2 border-border pt-2">
                <div className="flex items-center">
                  <StatusBadge variant={totals.balanced ? "solid" : "outline"} pulse={!totals.balanced}>
                    {totals.balanced ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Balanced
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" /> Out of balance
                      </>
                    )}
                  </StatusBadge>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Debit</div>
                  <div className="tabular text-[14px] font-medium text-foreground">
                    {formatAmt(totals.debit)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Credit</div>
                  <div className="tabular text-[14px] font-medium text-foreground">
                    {formatAmt(totals.credit)}
                  </div>
                </div>
                <div></div>
              </div>

              {/* Balance bar */}
              <div className="mt-2 flex items-center justify-between rounded-[5px] border border-border bg-background px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  Difference
                </span>
                <span
                  className={cn(
                    "tabular text-[13px] font-medium",
                    totals.balanced ? "text-foreground" : "text-foreground",
                  )}
                >
                  {totals.diff === 0 ? formatINR(0) : formatINR(totals.diff)}
                </span>
              </div>

              {/* Helper presets */}
              {!entry && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Quick templates:</span>
                  <PresetButton
                    label="Receipt (Customer)"
                    onClick={() => {
                      setLines([
                        { accountId: "acc-bank-hdfc", debit: "50000", credit: "" },
                        { accountId: "acc-ar", debit: "", credit: "50000" },
                      ]);
                      setNarration("Receipt - customer NEFT settlement against freight invoice");
                    }}
                  />
                  <PresetButton
                    label="Fuel fill"
                    onClick={() => {
                      setLines([
                        { accountId: "acc-fuel-exp", debit: "15000", credit: "" },
                        { accountId: "acc-gst-input", debit: "2700", credit: "" },
                        { accountId: "acc-bank-hdfc", debit: "", credit: "17700" },
                      ]);
                      setNarration("Diesel fill - HP pump, vehicle refuel");
                    }}
                  />
                  <PresetButton
                    label="Salary payout"
                    onClick={() => {
                      setLines([
                        { accountId: "acc-driver-sal", debit: "42000", credit: "" },
                        { accountId: "acc-bank-hdfc", debit: "", credit: "42000" },
                      ]);
                      setNarration("Driver salary payout - bank transfer");
                    }}
                  />
                  <PresetButton
                    label="Vendor bill"
                    onClick={() => {
                      setLines([
                        { accountId: "acc-maint", debit: "12000", credit: "" },
                        { accountId: "acc-gst-input", debit: "2160", credit: "" },
                        { accountId: "acc-ap", debit: "", credit: "14160" },
                      ]);
                      setNarration("Workshop bill - clutch + brake overhaul");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Scale className="h-3.5 w-3.5" />
            <span>
              Dr: <span className="tabular text-foreground font-medium">{formatINR(totals.debit)}</span>
              {" · "}Cr: <span className="tabular text-foreground font-medium">{formatINR(totals.credit)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={onClose} type="button">
              Cancel
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={handleSave}
              icon={entry ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              type="button"
            >
              {entry ? "Save changes" : "Save entry"}
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 items-center rounded-[3px] border border-border bg-background px-2 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {label}
    </button>
  );
}

/* ============================================================
   KPI tile helper
   ============================================================ */
function KpiTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <span className="text-[19px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}

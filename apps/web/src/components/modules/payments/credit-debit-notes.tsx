"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { SearchInput } from "@/components/shared/toolbar";
import {
  useFinOpsStore,
  NOTE_REASONS,
  type CreditDebitNote,
  type CreditDebitType,
  type NoteReason,
} from "@/lib/store/financial-ops-store";
import { INVOICES } from "@/lib/mock-data";
import {
  Plus,
  ChevronDown,
  X,
  Check,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  Clock,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { FieldLabel, formatINR, formatDate, formatDateTime, relativeTime } from "./_helpers";

interface CreditDebitNotesProps {
  onBack: () => void;
}

function noteStatusVariant(status: CreditDebitNote["status"]): "solid" | "outline" | "muted" | "dot" {
  if (status === "Approved") return "solid";
  if (status === "Submitted") return "outline";
  if (status === "Rejected") return "muted";
  return "muted";
}

export function CreditDebitNotes({ onBack }: CreditDebitNotesProps) {
  const notes = useFinOpsStore((s) => s.notes);
  const addNote = useFinOpsStore((s) => s.addNote);
  const setNoteStatus = useFinOpsStore((s) => s.setNoteStatus);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [reasonFilter, setReasonFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditDebitNote | null>(null);

  const filtered = useMemo(() => {
    let result = notes;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.number.toLowerCase().includes(q) ||
          n.party.toLowerCase().includes(q) ||
          n.against.toLowerCase().includes(q) ||
          n.reason.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) result = result.filter((n) => typeFilter.has(n.type));
    if (reasonFilter.size > 0) result = result.filter((n) => reasonFilter.has(n.reason));
    if (statusFilter.size > 0) result = result.filter((n) => statusFilter.has(n.status));
    return result;
  }, [notes, search, typeFilter, reasonFilter, statusFilter]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const totalCredit = notes.filter((n) => n.type === "Credit" && n.status === "Approved").reduce((s, n) => s + n.amount, 0);
  const totalDebit = notes.filter((n) => n.type === "Debit" && n.status === "Approved").reduce((s, n) => s + n.amount, 0);
  const pendingCount = notes.filter((n) => n.status === "Submitted" || n.status === "Draft").length;

  const columns: Column<CreditDebitNote>[] = [
    {
      key: "number",
      header: "Number",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.number,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.number}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "90px",
      sortValue: (r) => r.type,
      render: (r) => {
        const Icon = r.type === "Credit" ? ArrowDownRight : ArrowUpRight;
        return (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground">
            <Icon className="h-3.5 w-3.5" />
            {r.type}
          </span>
        );
      },
    },
    {
      key: "party",
      header: "Party",
      sortable: true,
      sortValue: (r) => r.party,
      render: (r) => <span className="text-[12px] text-foreground">{r.party}</span>,
    },
    {
      key: "against",
      header: "Against",
      width: "150px",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.against || "-"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className={cn("tabular text-[13px] font-medium text-foreground")}>
          {r.type === "Credit" ? "+" : "−"} {formatINR(r.amount)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.reason,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.reason}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={noteStatusVariant(r.status)}>{r.status}</StatusBadge>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (n: CreditDebitNote) => setSelectedNote(n) },
    { label: "Edit", onClick: (n: CreditDebitNote) => toast("Edit note", { description: n.number }) },
    {
      label: "Approve",
      onClick: (n: CreditDebitNote) => {
        if (n.status === "Submitted" || n.status === "Draft") {
          setNoteStatus(n.id, "Approved");
          toast.success("Note approved", { description: n.number });
        } else {
          toast("Cannot approve", { description: `Status is ${n.status}` });
        }
      },
    },
    {
      label: "Reject",
      onClick: (n: CreditDebitNote) => {
        if (n.status !== "Rejected") {
          setNoteStatus(n.id, "Rejected");
          toast(`Note ${n.number} rejected`);
        }
      },
      destructive: true,
    },
  ];

  const typeLabel =
    typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const reasonLabel =
    reasonFilter.size === 0 ? "All" : reasonFilter.size === 1 ? Array.from(reasonFilter)[0] : `${reasonFilter.size} selected`;
  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit / Debit Notes"
        description="Adjustments against invoices, trips, and advances - rate difference, short delivery, damage, service issues."
        meta={[
          { label: "Total Notes", value: notes.length },
          { label: "Credit (approved)", value: formatINR(totalCredit) },
          { label: "Debit (approved)", value: formatINR(totalDebit) },
          { label: "Pending", value: String(pendingCount) },
        ]}
        showBack
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDrawerOpen(true)}>
            Create Note
          </Btn>
        }
      />

      {/* Hidden back handler - PageHeader back button uses navigateBack via useAppStore,
          so we wire a small button row to call onBack if user wants to return to payments list */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 self-start text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Payments
      </button>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch}
            placeholder="Search number, party, against, reason…" className="max-w-[260px]" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["Credit", "Debit"] as CreditDebitType[]).map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
              {typeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Reason:</span>
                <span className="max-w-[120px] truncate">{reasonLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by reason</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {NOTE_REASONS.map((r) => (
                <DropdownMenuCheckboxItem key={r} checked={reasonFilter.has(r)} onCheckedChange={() => toggle(reasonFilter, setReasonFilter, r)} className="text-[13px]">
                  {r}
                </DropdownMenuCheckboxItem>
              ))}
              {reasonFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setReasonFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Draft", "Submitted", "Approved", "Rejected"].map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "note" : "notes"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(n) => setSelectedNote(n)}
          rowActions={rowActions}
          emptyTitle="No credit/debit notes yet"
          emptyDescription="Create your first note to track invoice adjustments."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDrawerOpen(true)}>
              Create Note
            </Btn>
          }
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {notes.length} notes · Credit (+) reduces receivable · Debit (−) reduces payable · audit trail per note
      </p>

      <CreateNoteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreate={(n) => {
          addNote(n);
          toast.success("Note created", { description: `${n.type} · ${formatINR(n.amount)}` });
          setDrawerOpen(false);
        }}
      />

      {selectedNote && (
        <NoteDetailSheet
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   Create Note Drawer
   ============================================================ */
interface CreateNoteDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreate: (n: Omit<CreditDebitNote, "id" | "number" | "createdAt" | "updatedAt">) => void;
}

function CreateNoteDrawer({ open, onClose, onCreate }: CreateNoteDrawerProps) {
  const [type, setType] = useState<CreditDebitType>("Credit");
  const [party, setParty] = useState("");
  const [against, setAgainst] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<NoteReason>("Rate Difference");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [adjustmentReference, setAdjustmentReference] = useState("");

  const submit = () => {
    if (!party.trim()) {
      toast("Party is required");
      return;
    }
    if (!against.trim()) {
      toast("Against (invoice/trip) is required");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast("Amount must be greater than zero");
      return;
    }
    onCreate({
      type,
      party,
      against,
      amount: Number(amount),
      reason,
      date: new Date(date).toISOString(),
      remarks,
      adjustmentReference,
      status: "Submitted",
      createdBy: "Current user",
    });
    // reset
    setType("Credit");
    setParty("");
    setAgainst("");
    setAmount("");
    setReason("Rate Difference");
    setRemarks("");
    setAdjustmentReference("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Create Credit / Debit Note
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Adjustment against an invoice, trip, or advance.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 rounded-[5px] border border-border p-1">
              {(["Credit", "Debit"] as CreditDebitType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-[12px] font-medium transition-colors",
                    type === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "Credit" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  {t}
                </button>
              ))}
            </div>

            <div>
              <FieldLabel required>Party</FieldLabel>
              <SavageInput category="name" value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder="Customer / vendor name" />
            </div>

            <div>
              <FieldLabel required hint="autocomplete invoice">Against (Invoice / Trip)</FieldLabel>
              <Select value={against} onValueChange={setAgainst}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="Search invoice number…" /></SelectTrigger>
                <SelectContent>
                  {INVOICES.slice(0, 20).map((i) => (
                    <SelectItem key={i.id} value={i.invoiceNumber}>
                      {i.invoiceNumber} · {i.customer} · {formatINR(i.totalAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required hint="₹">Amount</FieldLabel>
                <SavageInput category="amount" type="number" value={amount}
                  onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <FieldLabel required>Reason</FieldLabel>
                <Select value={reason} onValueChange={(v) => setReason(v as NoteReason)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTE_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground" />
            </div>

            <div>
              <FieldLabel hint="optional">Adjustment Reference</FieldLabel>
              <SavageInput category="consignmentNumber" value={adjustmentReference}
                onChange={(e) => setAdjustmentReference(e.target.value)}
                placeholder="ADJ-2024-001" />
            </div>

            <div>
              <FieldLabel>Remarks</FieldLabel>
              <SavageTextarea category="remarks" rows={3} value={remarks}
                onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={submit}>
            Create Note
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Note Detail Sheet (audit trail)
   ============================================================ */
function NoteDetailSheet({ note, onClose }: { note: CreditDebitNote; onClose: () => void }) {
  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight tabular">{note.number}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {note.type} · {note.reason} · {note.party}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-3">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Amount</span>
                <StatusBadge variant={noteStatusVariant(note.status)}>{note.status}</StatusBadge>
              </div>
              <div className="mt-1 tabular text-[24px] font-medium text-foreground">
                {note.type === "Credit" ? "+" : "−"} {formatINR(note.amount)}
              </div>
            </div>

            <DetailRow icon={<User className="h-3.5 w-3.5" />} label="Party" value={note.party} />
            <DetailRow icon={<FileText className="h-3.5 w-3.5" />} label="Against" value={note.against} mono />
            <DetailRow icon={<Receipt className="h-3.5 w-3.5" />} label="Reason" value={note.reason} />
            <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Date" value={formatDate(note.date)} mono />
            <DetailRow icon={<FileText className="h-3.5 w-3.5" />} label="Adjustment Ref" value={note.adjustmentReference || "-"} mono />

            {note.remarks && (
              <div className="rounded-[6px] border border-border bg-card p-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Remarks</div>
                <p className="mt-1 text-[13px] text-foreground whitespace-pre-wrap">{note.remarks}</p>
              </div>
            )}

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Audit Trail</div>
              <div className="flex flex-col gap-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="text-foreground">{note.createdBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created At</span>
                  <span className="tabular text-foreground">{formatDateTime(note.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Modified</span>
                  <span className="tabular text-foreground">{relativeTime(note.updatedAt)} · {formatDateTime(note.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-foreground">{note.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

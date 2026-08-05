"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { SectionCard } from "@/components/shared/section-card";
import {
  Download,
  ChevronDown,
  Receipt,
  Gift,
  CheckCircle2,
  Clock,
  Ban,
  Fuel,
  Plane,
  Utensils,
  Phone,
  BookOpen,
  Stethoscope,
  Truck,
  PartyPopper,
  UserPlus,
  Plus,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  REIMBURSEMENTS,
  BONUSES,
  REIMB_TYPES,
  BONUS_TYPES,
  EMPLOYEES,
  type Reimbursement,
  type ReimbStatus,
  type Bonus,
  type BonusStatus,
  type ReimbType,
  type BonusType,
  type Department,
  formatINR,
  formatINRCompact,
  formatDate,
  formatMonthYear,
  reimbStatusBadge,
  bonusStatusBadge,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
  FieldLabel,
} from "./_helpers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REIMB_ICON: Record<ReimbType, typeof Fuel> = {
  Fuel: Fuel,
  Travel: Plane,
  Food: Utensils,
  Mobile: Phone,
  Stationery: BookOpen,
  Medical: Stethoscope,
};
const BONUS_ICON: Record<BonusType, typeof Gift> = {
  Performance: Gift,
  "Trip Incentive": Truck,
  Festival: PartyPopper,
  Retention: CheckCircle2,
  Referral: UserPlus,
};

export function ReimbursementsTab() {
  const [mode, setMode] = useState<"reimb" | "bonus">("reimb");
  const [reimbRows, setReimbRows] = useState<Reimbursement[]>(REIMBURSEMENTS);
  const [bonusRows, setBonusRows] = useState<Bonus[]>(BONUSES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<Reimbursement | Bonus | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filteredReimb = useMemo(() => {
    let r = reimbRows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.empName.toLowerCase().includes(q) ||
          s.empCode.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    return r;
  }, [reimbRows, search, statusFilter, typeFilter]);

  const filteredBonus = useMemo(() => {
    let r = bonusRows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.empName.toLowerCase().includes(q) ||
          s.empCode.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    return r;
  }, [bonusRows, search, statusFilter, typeFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  // Reset filters when switching modes
  const switchMode = (m: "reimb" | "bonus") => {
    setMode(m);
    setStatusFilter(new Set());
    setTypeFilter(new Set());
    setSearch("");
    setView(null);
  };

  const updateReimbStatus = (id: string, status: ReimbStatus) => {
    setReimbRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              approvedDate: status !== "Pending" ? new Date().toISOString() : r.approvedDate,
              approvedBy: status !== "Pending" ? "Reena Mehta" : r.approvedBy,
              paidDate: status === "Paid" ? new Date().toISOString() : r.paidDate,
            }
          : r,
      ),
    );
  };
  const updateBonusStatus = (id: string, status: BonusStatus) => {
    setBonusRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              approvedDate: status !== "Pending" ? new Date().toISOString() : r.approvedDate,
              approvedBy: status !== "Pending" ? "Vikram Kapoor" : r.approvedBy,
              paidDate: status === "Paid" ? new Date().toISOString() : r.paidDate,
            }
          : r,
      ),
    );
  };

  // KPIs
  const reimbPending = reimbRows.filter((r) => r.status === "Pending").length;
  const reimbApproved = reimbRows.filter((r) => r.status === "Approved").length;
  const reimbPaid = reimbRows.filter((r) => r.status === "Paid").length;
  const reimbRejected = reimbRows.filter((r) => r.status === "Rejected").length;
  const reimbTotalAmount = reimbRows.filter((r) => r.status !== "Rejected").reduce((s, r) => s + r.amount, 0);

  const bonusPending = bonusRows.filter((r) => r.status === "Pending").length;
  const bonusApproved = bonusRows.filter((r) => r.status === "Approved").length;
  const bonusPaid = bonusRows.filter((r) => r.status === "Paid").length;
  const bonusCancelled = bonusRows.filter((r) => r.status === "Cancelled").length;
  const bonusTotalAmount = bonusRows.filter((r) => r.status !== "Cancelled").reduce((s, r) => s + r.amount, 0);

  // Columns: Reimbursements
  const reimbColumns: Column<Reimbursement>[] = [
    {
      key: "empName",
      header: "Employee",
      sortable: true,
      sortValue: (r) => r.empName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[10px] font-medium text-background">
            {r.empName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-foreground">{r.empName}</div>
            <div className="tabular text-[11px] text-muted-foreground">{r.empCode} · {r.department}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.type,
      render: (r) => {
        const Icon = REIMB_ICON[r.type];
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] text-foreground">{r.type}</span>
          </div>
        );
      },
    },
    {
      key: "month",
      header: "Month",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.month,
      render: (r) => <span className="text-[12px] text-muted-foreground">{formatMonthYear(r.month)}</span>,
    },
    {
      key: "description",
      header: "Description",
      sortable: false,
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-muted-foreground truncate">{r.description}</span>,
    },
    {
      key: "receipts",
      header: "Receipts",
      sortable: true,
      align: "right",
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => r.receipts,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.receipts}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.amount,
      render: (r) => <span className="tabular text-[13px] font-medium text-foreground">{formatINR(r.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = reimbStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  // Columns: Bonus
  const bonusColumns: Column<Bonus>[] = [
    {
      key: "empName",
      header: "Employee",
      sortable: true,
      sortValue: (r) => r.empName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[10px] font-medium text-background">
            {r.empName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-foreground">{r.empName}</div>
            <div className="tabular text-[11px] text-muted-foreground">{r.empCode} · {r.department}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.type,
      render: (r) => {
        const Icon = BONUS_ICON[r.type];
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] text-foreground">{r.type}</span>
          </div>
        );
      },
    },
    {
      key: "month",
      header: "Month",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.month,
      render: (r) => <span className="text-[12px] text-muted-foreground">{formatMonthYear(r.month)}</span>,
    },
    {
      key: "tripsCount",
      header: "Trips",
      sortable: true,
      align: "right",
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => r.tripsCount ?? 0,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.tripsCount ?? "-"}</span>,
    },
    {
      key: "description",
      header: "Description",
      sortable: false,
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-muted-foreground truncate">{r.description}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.amount,
      render: (r) => <span className="tabular text-[13px] font-medium text-foreground">{formatINR(r.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = bonusStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const reimbRowActions: { label: string; onClick: (s: Reimbursement) => void }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    {
      label: "Approve",
      onClick: (s) => {
        if (s.status !== "Pending") { toast("Reimbursement already processed", { description: s.code }); return; }
        updateReimbStatus(s.id, "Approved");
        toast.success(`Reimbursement approved`, { description: s.code });
      },
    },
    {
      label: "Reject",
      onClick: (s) => {
        if (s.status !== "Pending") { toast("Reimbursement already processed", { description: s.code }); return; }
        updateReimbStatus(s.id, "Rejected");
        toast(`Reimbursement rejected`, { description: s.code });
      },
    },
    {
      label: "Mark Paid",
      onClick: (s) => {
        if (s.status !== "Approved") { toast("Reimbursement must be Approved first", { description: s.code }); return; }
        updateReimbStatus(s.id, "Paid");
        toast.success(`Reimbursement paid`, { description: s.code });
      },
    },
    { label: "Print Voucher", onClick: (s) => toast("Generating PDF", { description: s.code }) },
  ];

  const bonusRowActions: { label: string; onClick: (s: Bonus) => void }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    {
      label: "Approve",
      onClick: (s) => {
        if (s.status !== "Pending") { toast("Bonus already processed", { description: s.code }); return; }
        updateBonusStatus(s.id, "Approved");
        toast.success(`Bonus approved`, { description: s.code });
      },
    },
    {
      label: "Cancel",
      onClick: (s) => {
        if (s.status !== "Pending") { toast("Bonus already processed", { description: s.code }); return; }
        updateBonusStatus(s.id, "Cancelled");
        toast(`Bonus cancelled`, { description: s.code });
      },
    },
    {
      label: "Mark Paid",
      onClick: (s) => {
        if (s.status !== "Approved") { toast("Bonus must be Approved first", { description: s.code }); return; }
        updateBonusStatus(s.id, "Paid");
        toast.success(`Bonus paid`, { description: s.code });
      },
    },
    { label: "Print Letter", onClick: (s) => toast("Generating PDF", { description: s.code }) },
  ];

  const reimbBulkActions = [
    {
      label: "Approve Selected",
      onClick: (sel: Reimbursement[]) => {
        sel.forEach((s) => s.status === "Pending" && updateReimbStatus(s.id, "Approved"));
        toast.success(`${sel.length} reimbursement${sel.length === 1 ? "" : "s"} approved`);
      },
    },
    { label: "Export", onClick: (sel: Reimbursement[]) => toast(`${sel.length} reimbursement${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];
  const bonusBulkActions = [
    {
      label: "Approve Selected",
      onClick: (sel: Bonus[]) => {
        sel.forEach((s) => s.status === "Pending" && updateBonusStatus(s.id, "Approved"));
        toast.success(`${sel.length} bonus${sel.length === 1 ? "" : "es"} approved`);
      },
    },
    { label: "Export", onClick: (sel: Bonus[]) => toast(`${sel.length} bonus${sel.length === 1 ? "" : "es"} exported`, { description: "CSV file generated" }) },
  ];

  const statusOptions = mode === "reimb" ? ["Pending", "Approved", "Rejected", "Paid"] : ["Pending", "Approved", "Cancelled", "Paid"];
  const typeOptions = mode === "reimb" ? REIMB_TYPES : BONUS_TYPES;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Reimbursements & Bonus</h2>
          <p className="text-[12px] text-muted-foreground">
            {mode === "reimb"
              ? `${filteredReimb.length} of ${reimbRows.length} reimbursements · ${reimbPending} pending · ${reimbApproved} approved · ${reimbPaid} paid · ${reimbRejected} rejected`
              : `${filteredBonus.length} of ${bonusRows.length} bonuses · ${bonusPending} pending · ${bonusApproved} approved · ${bonusPaid} paid · ${bonusCancelled} cancelled`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-[6px] border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => switchMode("reimb")}
              className={"flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors tap " + (mode === "reimb" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Receipt className="h-3.5 w-3.5" /> Reimbursements
            </button>
            <button
              onClick={() => switchMode("bonus")}
              className={"flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors tap " + (mode === "bonus" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Gift className="h-3.5 w-3.5" /> Bonus & Incentives
            </button>
          </div>
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>{mode === "reimb" ? "New Reimbursement" : "New Bonus"}</Btn>
        </div>
      </div>

      {/* KPI strip */}
      {mode === "reimb" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</span><Receipt className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{reimbRows.length}</span>
            <span className="text-[11px] text-muted-foreground tabular">reimbursements</span>
          </div>
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{reimbPending}</span>
            <span className="text-[11px] text-muted-foreground tabular">awaiting review</span>
          </div>
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Paid</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{reimbPaid}</span>
            <span className="text-[11px] text-muted-foreground tabular">credited to employees</span>
          </div>
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Amount</span><Banknote className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(reimbTotalAmount)}</span>
            <span className="text-[11px] text-muted-foreground tabular">excl. rejected</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</span><Gift className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{bonusRows.length}</span>
            <span className="text-[11px] text-muted-foreground tabular">bonuses + incentives</span>
          </div>
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{bonusPending}</span>
            <span className="text-[11px] text-muted-foreground tabular">awaiting approval</span>
          </div>
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Paid</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{bonusPaid}</span>
            <span className="text-[11px] text-muted-foreground tabular">disbursed</span>
          </div>
          <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Amount</span><Banknote className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(bonusTotalAmount)}</span>
            <span className="text-[11px] text-muted-foreground tabular">excl. cancelled</span>
          </div>
        </div>
      )}

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder={mode === "reimb" ? "Search reimbursement, employee, code..." : "Search bonus, employee, code..."} className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {typeOptions.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)} className="text-[13px]">{t}</DropdownMenuCheckboxItem>
              ))}
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
              {statusOptions.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {mode === "reimb" ? filteredReimb.length : filteredBonus.length} records
          </div>
        </div>
        {mode === "reimb" ? (
          <DataTable
            data={filteredReimb}
            columns={reimbColumns}
            onRowClick={(s) => setView(s)}
            rowActions={reimbRowActions}
            bulkActions={reimbBulkActions}
            emptyTitle="No reimbursements"
            emptyDescription="Employees have not submitted any reimbursements yet."
            initialSort={{ key: "submittedDate", dir: "desc" }}
          />
        ) : (
          <DataTable
            data={filteredBonus}
            columns={bonusColumns}
            onRowClick={(s) => setView(s)}
            rowActions={bonusRowActions}
            bulkActions={bonusBulkActions}
            emptyTitle="No bonuses"
            emptyDescription="Create a bonus or incentive for an employee."
            initialSort={{ key: "amount", dir: "desc" }}
          />
        )}
      </div>

      {/* Type-wise breakdown */}
      <SectionCard title={mode === "reimb" ? "Reimbursements by Type" : "Bonus by Type"} description="Distribution across categories" icon={mode === "reimb" ? <Receipt className="h-4 w-4" /> : <Gift className="h-4 w-4" />} flush>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
          {typeOptions.map((t) => {
            const matching = mode === "reimb"
              ? reimbRows.filter((r) => r.type === t)
              : bonusRows.filter((r) => r.type === t);
            const total = matching.reduce((s, r) => s + r.amount, 0);
            const Icon = mode === "reimb" ? REIMB_ICON[t as ReimbType] : BONUS_ICON[t as BonusType];
            return (
              <div key={t} className="bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular">{matching.length}</span>
                </div>
                <div className="mt-1 text-[12px] font-medium text-foreground">{t}</div>
                <div className="text-[11px] tabular text-muted-foreground">{formatINRCompact(total)}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <DetailDrawer
        open={!!view}
        record={view}
        mode={mode}
        onClose={() => setView(null)}
        onUpdate={(status) => {
          if (!view) return;
          if (mode === "reimb") updateReimbStatus((view as Reimbursement).id, status as ReimbStatus);
          else updateBonusStatus((view as Bonus).id, status as BonusStatus);
          setView(null);
        }}
      />

      <AddDrawer
        open={addOpen}
        mode={mode}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => {
          if (mode === "reimb") {
            const newRec: Reimbursement = {
              id: `rmb-${String(reimbRows.length + 1).padStart(3, "0")}`,
              code: `RZ-RMB-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(reimbRows.length + 1).padStart(3, "0")}`,
              empCode: payload.empCode,
              empName: payload.empName,
              designation: payload.designation,
              department: payload.department,
              month: payload.month,
              type: payload.type as ReimbType,
              amount: payload.amount,
              status: "Pending",
              submittedDate: new Date().toISOString(),
              description: payload.description,
              receipts: payload.receipts ?? 1,
              meta: payload.meta,
            };
            setReimbRows((prev) => [newRec, ...prev]);
            toast.success(`Reimbursement created`, { description: newRec.code });
          } else {
            const newRec: Bonus = {
              id: `bnr-${String(bonusRows.length + 1).padStart(3, "0")}`,
              code: `RZ-BNS-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(bonusRows.length + 1).padStart(3, "0")}`,
              empCode: payload.empCode,
              empName: payload.empName,
              designation: payload.designation,
              department: payload.department,
              month: payload.month,
              type: payload.type as BonusType,
              amount: payload.amount,
              status: "Pending",
              description: payload.description,
              tripsCount: payload.tripsCount,
              perTripAmount: payload.perTripAmount,
            };
            setBonusRows((prev) => [newRec, ...prev]);
            toast.success(`Bonus created`, { description: newRec.code });
          }
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function DetailDrawer({
  open,
  record,
  mode,
  onClose,
  onUpdate,
}: {
  open: boolean;
  record: Reimbursement | Bonus | null;
  mode: "reimb" | "bonus";
  onClose: () => void;
  onUpdate: (status: string) => void;
}) {
  if (!record) return null;
  const isReimb = mode === "reimb";
  const r = record as Reimbursement;
  const b = record as Bonus;
  const m = isReimb ? reimbStatusBadge(r.status) : bonusStatusBadge(b.status);
  const Icon = isReimb ? REIMB_ICON[r.type] : BONUS_ICON[b.type];
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{isReimb ? r.code : b.code}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">{isReimb ? r.empName : b.empName}</span> · {isReimb ? r.type : b.type} · {formatMonthYear(isReimb ? r.month : b.month)}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{isReimb ? r.status : b.status}</StatusBadge>
            <SheetCloseBtn onClose={onClose} />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Amount hero */}
          <div className="rounded-[6px] border border-foreground bg-foreground text-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-background/70">{isReimb ? "Reimbursement Amount" : "Bonus Amount"}</div>
                <div className="text-[24px] font-medium leading-none tracking-tight tabular">{formatINR(isReimb ? r.amount : b.amount)}</div>
              </div>
              <Icon className="h-8 w-8 text-background/40" />
            </div>
          </div>

          {/* Trip incentive breakdown */}
          {!isReimb && b.type === "Trip Incentive" && b.tripsCount && b.perTripAmount && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Trip Incentive Computation</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Trips completed</span>
                  <span className="tabular text-foreground">{b.tripsCount}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Per-trip incentive</span>
                  <span className="tabular text-foreground">{formatINR(b.perTripAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px] border-t border-border pt-1.5">
                  <span className="font-medium text-foreground">Total incentive</span>
                  <span className="tabular font-medium text-foreground">{formatINR(b.amount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="Employee" value={isReimb ? r.empName : b.empName} />
            <DetailField label="Emp Code" value={isReimb ? r.empCode : b.empCode} mono />
            <DetailField label="Designation" value={isReimb ? r.designation : b.designation} />
            <DetailField label="Department" value={isReimb ? r.department : b.department} />
            <DetailField label={isReimb ? "Reimbursement Type" : "Bonus Type"} value={isReimb ? r.type : b.type} />
            <DetailField label="Pay Month" value={formatMonthYear(isReimb ? r.month : b.month)} mono />
            {isReimb && (
              <>
                <DetailField label="Submitted" value={formatDate(r.submittedDate)} mono />
                <DetailField label="Approved" value={r.approvedDate ? formatDate(r.approvedDate) : "-"} mono />
                <DetailField label="Approved By" value={r.approvedBy ?? "-"} />
                <DetailField label="Receipts" value={String(r.receipts)} mono />
              </>
            )}
            {!isReimb && (
              <>
                <DetailField label="Approved" value={b.approvedDate ? formatDate(b.approvedDate) : "-"} mono />
                <DetailField label="Approved By" value={b.approvedBy ?? "-"} />
                <DetailField label="Paid" value={b.paidDate ? formatDate(b.paidDate) : "-"} mono />
                <DetailField label="Status" value={b.status} />
              </>
            )}
          </div>

          <div className="mt-4">
            <SectionTitle>Description</SectionTitle>
            <div className="rounded-[6px] border border-border bg-card px-4 py-3">
              <p className="text-[12.5px] text-foreground">{isReimb ? r.description : b.description}</p>
              {isReimb && r.meta && (
                <div className="mt-2 border-t border-border pt-2 text-[11.5px] text-muted-foreground">Meta: {r.meta}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={() => toast("Generating PDF", { description: isReimb ? r.code : b.code })}>Print {isReimb ? "Voucher" : "Letter"}</Btn>
          <div className="flex items-center gap-2">
            {(isReimb ? r.status === "Pending" : b.status === "Pending") && (
              <>
                <Btn variant="ghost" icon={<Ban className="h-3.5 w-3.5" />} onClick={() => onUpdate(isReimb ? "Rejected" : "Cancelled")}>
                  {isReimb ? "Reject" : "Cancel"}
                </Btn>
                <Btn variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onUpdate("Approved")}>Approve</Btn>
              </>
            )}
            {(isReimb ? r.status === "Approved" : b.status === "Approved") && (
              <Btn variant="primary" icon={<Banknote className="h-3.5 w-3.5" />} onClick={() => onUpdate("Paid")}>Mark Paid</Btn>
            )}
            {(isReimb ? r.status === "Paid" : b.status === "Paid") && (
              <Btn variant="ghost" onClick={onClose}>Close</Btn>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AddDrawer({
  open,
  mode,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "reimb" | "bonus";
  onClose: () => void;
  onSave: (payload: {
    empCode: string;
    empName: string;
    designation: string;
    department: Department;
    month: string;
    type: string;
    amount: number;
    description: string;
    receipts?: number;
    meta?: string;
    tripsCount?: number;
    perTripAmount?: number;
  }) => void;
}) {
  const [empCode, setEmpCode] = useState("");
  const [type, setType] = useState(mode === "reimb" ? "Fuel" : "Performance");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receipts, setReceipts] = useState("1");
  const [meta, setMeta] = useState("");
  const [tripsCount, setTripsCount] = useState("");
  const [perTripAmount, setPerTripAmount] = useState("");

  // derive employee from empCode using EMPLOYEES
  const emp = useMemo(() => EMP_LOOKUP.find((e) => e.code === empCode), [empCode]);
  const computedAmount = type === "Trip Incentive" && tripsCount && perTripAmount ? String(Number(tripsCount) * Number(perTripAmount)) : amount;

  const handleSubmit = () => {
    if (!emp) { toast("Select an employee"); return; }
    if (!description) { toast("Description is required"); return; }
    if (type !== "Trip Incentive" && !amount) { toast("Amount is required"); return; }
    onSave({
      empCode: emp.code,
      empName: emp.name,
      designation: emp.desig,
      department: emp.dept,
      month,
      type,
      amount: Number(computedAmount) || 0,
      description,
      receipts: mode === "reimb" ? Number(receipts) : undefined,
      meta: mode === "reimb" ? meta : undefined,
      tripsCount: type === "Trip Incentive" ? Number(tripsCount) : undefined,
      perTripAmount: type === "Trip Incentive" ? Number(perTripAmount) : undefined,
    });
    // reset
    setEmpCode(""); setType(mode === "reimb" ? "Fuel" : "Performance"); setMonth(new Date().toISOString().slice(0, 7));
    setAmount(""); setDescription(""); setReceipts("1"); setMeta(""); setTripsCount(""); setPerTripAmount("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{mode === "reimb" ? "New Reimbursement" : "New Bonus"}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{mode === "reimb" ? "Submit a new reimbursement claim" : "Issue a bonus or incentive"}</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel required>Employee</FieldLabel>
              <Select value={empCode} onValueChange={setEmpCode}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {EMP_LOOKUP.map((e) => (
                    <SelectItem key={e.code} value={e.code}>
                      <span className="tabular text-[11px] text-muted-foreground mr-2">{e.code}</span>
                      {e.name} · {e.desig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Type</FieldLabel>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(mode === "reimb" ? REIMB_TYPES : BONUS_TYPES).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Pay Month</FieldLabel>
              <Input value={month} onChange={(e) => setMonth(e.target.value)} type="month" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            {type === "Trip Incentive" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Trips Completed</FieldLabel>
                  <Input value={tripsCount} onChange={(e) => setTripsCount(e.target.value)} type="number" placeholder="e.g. 12" className="h-8 rounded-[5px] text-[13px] tabular" />
                </div>
                <div>
                  <FieldLabel required>Per Trip (INR)</FieldLabel>
                  <Input value={perTripAmount} onChange={(e) => setPerTripAmount(e.target.value)} type="number" placeholder="e.g. 250" className="h-8 rounded-[5px] text-[13px] tabular" />
                </div>
              </div>
            )}
            {type !== "Trip Incentive" && (
              <div>
                <FieldLabel required>Amount (INR)</FieldLabel>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="e.g. 2500" className="h-8 rounded-[5px] text-[13px] tabular" />
              </div>
            )}
            {type === "Trip Incentive" && computedAmount && (
              <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                Computed amount: <span className="tabular font-medium text-foreground">INR {Number(computedAmount).toLocaleString("en-IN")}</span>
              </div>
            )}
            {mode === "reimb" && (
              <>
                <div>
                  <FieldLabel hint="defaults to 1">Receipts Count</FieldLabel>
                  <Input value={receipts} onChange={(e) => setReceipts(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
                </div>
                <div>
                  <FieldLabel>Meta (route / context)</FieldLabel>
                  <Input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="e.g. Mumbai-Pune-Mumbai" className="h-8 rounded-[5px] text-[13px]" />
                </div>
              </>
            )}
            <div>
              <FieldLabel required>Description</FieldLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={mode === "reimb" ? "Describe the expense..." : "Reason for bonus..."} className="min-h-[80px] rounded-[5px] text-[13px]" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Create</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Local lookup using EMPLOYEES exported from _helpers
const EMP_LOOKUP = EMPLOYEES;

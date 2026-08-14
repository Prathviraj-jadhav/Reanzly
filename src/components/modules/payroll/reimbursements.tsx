"use client";

import { useEffect, useMemo, useState } from "react";
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
  REIMB_TYPES,
  BONUS_TYPES,
  type Reimbursement,
  type ReimbStatus,
  type Bonus,
  type BonusStatus,
  type ReimbType,
  type BonusType,
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

interface EmployeePickerRow {
  id: string;
  code: string;
  name: string;
  designation: string;
  department: string;
}

export function ReimbursementsTab() {
  const [mode, setMode] = useState<"reimb" | "bonus">("reimb");
  const [reimbRows, setReimbRows] = useState<Reimbursement[]>([]);
  const [bonusRows, setBonusRows] = useState<Bonus[]>([]);
  const [employees, setEmployees] = useState<EmployeePickerRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<Reimbursement | Bonus | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/payroll/reimbursements").then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch("/api/payroll/bonuses").then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch("/api/payroll/employees").then((r) => (r.ok ? r.json() : { employees: [] })),
    ])
      .then(([reimbRes, bonusRes, empRes]) => {
        setReimbRows(reimbRes.reimbursements);
        setBonusRows(bonusRes.bonuses);
        setEmployees(empRes.employees ?? []);
      })
      .catch(() => toast.error("Couldn't load reimbursements & bonuses", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

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

  const REIMB_ACTION: Record<ReimbStatus, string | null> = { Pending: null, Approved: "approve", Rejected: "reject", Paid: "mark-paid" };
  const BONUS_ACTION: Record<BonusStatus, string | null> = { Pending: null, Approved: "approve", Cancelled: "cancel", Paid: "mark-paid" };

  const updateReimbStatus = async (id: string, status: ReimbStatus): Promise<boolean> => {
    const action = REIMB_ACTION[status];
    if (!action) return false;
    try {
      const res = await fetch(`/api/payroll/reimbursements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: undefined }));
        toast.error(error || "Couldn't update reimbursement", { description: "Try again." });
        return false;
      }
      const { reimbursement } = await res.json();
      setReimbRows((prev) => prev.map((r) => (r.id === id ? reimbursement : r)));
      return true;
    } catch {
      toast.error("Couldn't update reimbursement", { description: "Try again." });
      return false;
    }
  };
  const updateBonusStatus = async (id: string, status: BonusStatus): Promise<boolean> => {
    const action = BONUS_ACTION[status];
    if (!action) return false;
    try {
      const res = await fetch(`/api/payroll/bonuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: undefined }));
        toast.error(error || "Couldn't update bonus", { description: "Try again." });
        return false;
      }
      const { bonus } = await res.json();
      setBonusRows((prev) => prev.map((r) => (r.id === id ? bonus : r)));
      return true;
    } catch {
      toast.error("Couldn't update bonus", { description: "Try again." });
      return false;
    }
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
      onClick: async (s) => {
        if (s.status !== "Pending") { toast("Reimbursement already processed", { description: s.code }); return; }
        if (await updateReimbStatus(s.id, "Approved")) toast.success(`Reimbursement approved`, { description: s.code });
      },
    },
    {
      label: "Reject",
      onClick: async (s) => {
        if (s.status !== "Pending") { toast("Reimbursement already processed", { description: s.code }); return; }
        if (await updateReimbStatus(s.id, "Rejected")) toast(`Reimbursement rejected`, { description: s.code });
      },
    },
    {
      label: "Mark Paid",
      onClick: async (s) => {
        if (s.status !== "Approved") { toast("Reimbursement must be Approved first", { description: s.code }); return; }
        if (await updateReimbStatus(s.id, "Paid")) toast.success(`Reimbursement paid`, { description: s.code });
      },
    },
    { label: "Print Voucher", onClick: (s) => toast("Generating PDF", { description: s.code }) },
  ];

  const bonusRowActions: { label: string; onClick: (s: Bonus) => void }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    {
      label: "Approve",
      onClick: async (s) => {
        if (s.status !== "Pending") { toast("Bonus already processed", { description: s.code }); return; }
        if (await updateBonusStatus(s.id, "Approved")) toast.success(`Bonus approved`, { description: s.code });
      },
    },
    {
      label: "Cancel",
      onClick: async (s) => {
        if (s.status !== "Pending") { toast("Bonus already processed", { description: s.code }); return; }
        if (await updateBonusStatus(s.id, "Cancelled")) toast(`Bonus cancelled`, { description: s.code });
      },
    },
    {
      label: "Mark Paid",
      onClick: async (s) => {
        if (s.status !== "Approved") { toast("Bonus must be Approved first", { description: s.code }); return; }
        if (await updateBonusStatus(s.id, "Paid")) toast.success(`Bonus paid`, { description: s.code });
      },
    },
    { label: "Print Letter", onClick: (s) => toast("Generating PDF", { description: s.code }) },
  ];

  const reimbBulkActions = [
    {
      label: "Approve Selected",
      onClick: async (sel: Reimbursement[]) => {
        const targets = sel.filter((s) => s.status === "Pending");
        const results = await Promise.all(targets.map((s) => updateReimbStatus(s.id, "Approved")));
        const okCount = results.filter(Boolean).length;
        if (okCount > 0) toast.success(`${okCount} reimbursement${okCount === 1 ? "" : "s"} approved`);
      },
    },
    { label: "Export", onClick: (sel: Reimbursement[]) => toast(`${sel.length} reimbursement${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];
  const bonusBulkActions = [
    {
      label: "Approve Selected",
      onClick: async (sel: Bonus[]) => {
        const targets = sel.filter((s) => s.status === "Pending");
        const results = await Promise.all(targets.map((s) => updateBonusStatus(s.id, "Approved")));
        const okCount = results.filter(Boolean).length;
        if (okCount > 0) toast.success(`${okCount} bonus${okCount === 1 ? "" : "es"} approved`);
      },
    },
    { label: "Export", onClick: (sel: Bonus[]) => toast(`${sel.length} bonus${sel.length === 1 ? "" : "es"} exported`, { description: "CSV file generated" }) },
  ];

  const statusOptions = mode === "reimb" ? ["Pending", "Approved", "Rejected", "Paid"] : ["Pending", "Approved", "Cancelled", "Paid"];
  const typeOptions = mode === "reimb" ? REIMB_TYPES : BONUS_TYPES;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading reimbursements & bonuses…</div>;
  }

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
        onUpdate={async (status) => {
          if (!view) return;
          const ok = mode === "reimb"
            ? await updateReimbStatus((view as Reimbursement).id, status as ReimbStatus)
            : await updateBonusStatus((view as Bonus).id, status as BonusStatus);
          if (ok) setView(null);
        }}
      />

      <AddDrawer
        open={addOpen}
        mode={mode}
        employees={employees}
        onClose={() => setAddOpen(false)}
        onSave={async (payload) => {
          try {
            if (mode === "reimb") {
              const res = await fetch("/api/payroll/reimbursements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  employeeId: payload.employeeId,
                  type: payload.type,
                  month: payload.month,
                  amount: payload.amount,
                  description: payload.description,
                  receipts: payload.receipts,
                }),
              });
              if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: undefined }));
                toast.error(error || "Couldn't create reimbursement", { description: "Try again." });
                return;
              }
              const { reimbursement } = await res.json();
              setReimbRows((prev) => [reimbursement, ...prev]);
              toast.success(`Reimbursement created`, { description: reimbursement.code });
            } else {
              const res = await fetch("/api/payroll/bonuses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  employeeId: payload.employeeId,
                  type: payload.type,
                  month: payload.month,
                  amount: payload.amount,
                  description: payload.description,
                  tripsCount: payload.tripsCount,
                  perTripAmount: payload.perTripAmount,
                }),
              });
              if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: undefined }));
                toast.error(error || "Couldn't create bonus", { description: "Try again." });
                return;
              }
              const { bonus } = await res.json();
              setBonusRows((prev) => [bonus, ...prev]);
              toast.success(`Bonus created`, { description: bonus.code });
            }
            setAddOpen(false);
          } catch {
            toast.error(mode === "reimb" ? "Couldn't create reimbursement" : "Couldn't create bonus", { description: "Try again." });
          }
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
  employees,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "reimb" | "bonus";
  employees: EmployeePickerRow[];
  onClose: () => void;
  onSave: (payload: {
    employeeId: string;
    month: string;
    type: string;
    amount: number;
    description: string;
    receipts?: number;
    tripsCount?: number;
    perTripAmount?: number;
  }) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState(mode === "reimb" ? "Fuel" : "Performance");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receipts, setReceipts] = useState("1");
  const [tripsCount, setTripsCount] = useState("");
  const [perTripAmount, setPerTripAmount] = useState("");

  const emp = useMemo(() => employees.find((e) => e.id === employeeId), [employees, employeeId]);
  const computedAmount = type === "Trip Incentive" && tripsCount && perTripAmount ? String(Number(tripsCount) * Number(perTripAmount)) : amount;

  const handleSubmit = () => {
    if (!emp) { toast("Select an employee"); return; }
    if (!description) { toast("Description is required"); return; }
    if (type !== "Trip Incentive" && !amount) { toast("Amount is required"); return; }
    onSave({
      employeeId: emp.id,
      month,
      type,
      amount: Number(computedAmount) || 0,
      description,
      receipts: mode === "reimb" ? Number(receipts) : undefined,
      tripsCount: type === "Trip Incentive" ? Number(tripsCount) : undefined,
      perTripAmount: type === "Trip Incentive" ? Number(perTripAmount) : undefined,
    });
    // reset
    setEmployeeId(""); setType(mode === "reimb" ? "Fuel" : "Performance"); setMonth(new Date().toISOString().slice(0, 7));
    setAmount(""); setDescription(""); setReceipts("1"); setTripsCount(""); setPerTripAmount("");
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
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="tabular text-[11px] text-muted-foreground mr-2">{e.code}</span>
                      {e.name} · {e.designation}
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
              <div>
                <FieldLabel hint="defaults to 1">Receipts Count</FieldLabel>
                <Input value={receipts} onChange={(e) => setReceipts(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
              </div>
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

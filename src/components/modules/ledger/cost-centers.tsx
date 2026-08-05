"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Truck,
  User,
  Route,
  Building2,
  Layers,
  TrendingUp,
  TrendingDown,
  Target,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useLedgerTallyStore } from "@/lib/store/ledger-tally-store";
import type {
  CostCenter,
  CostCenterCategory,
  Budget,
  BudgetPeriod,
} from "@/components/modules/ledger/_tally-data";
import {
  FieldLabel,
  formatINR,
  formatINRCompact,
  formatPct,
  DetailRow,
} from "./_helpers";

/* ============================================================
   CostCentersView - Tally cost-centre profitability tracker
   plus an internal "Budgets & Variance" tab.

   Tabs:
     • Cost Centres  - list grouped by category (vehicle/driver/
                       route/branch/department) with revenue,
                       expense and net P&L
     • Budgets       - per-account / per-cost-centre budgeted vs
                       actual, with variance % and progress bar

   Strict monochrome Swiss - no colors. Tabular numerals.
   ============================================================ */

const CATEGORY_ICON: Record<CostCenterCategory, typeof Truck> = {
  Vehicle: Truck,
  Driver: User,
  Route: Route,
  Branch: Building2,
  Department: Layers,
};

const CATEGORY_OPTIONS: CostCenterCategory[] = [
  "Vehicle",
  "Driver",
  "Route",
  "Branch",
  "Department",
];

const PERIOD_OPTIONS: BudgetPeriod[] = ["Monthly", "Quarterly", "Annual"];

function catVariant(cat: CostCenterCategory): "solid" | "outline" | "muted" {
  switch (cat) {
    case "Vehicle":
      return "solid";
    case "Driver":
      return "outline";
    case "Route":
      return "outline";
    case "Branch":
      return "muted";
    case "Department":
      return "muted";
    default:
      return "outline";
  }
}

export function CostCentersView() {
  return (
    <Tabs defaultValue="cost-centers" className="flex flex-col gap-3">
      <TabsList className="self-start">
        <TabsTrigger value="cost-centers">Cost Centres</TabsTrigger>
        <TabsTrigger value="budgets">Budgets & Variance</TabsTrigger>
      </TabsList>

      <TabsContent value="cost-centers">
        <CostCenterList />
      </TabsContent>
      <TabsContent value="budgets">
        <BudgetList />
      </TabsContent>
    </Tabs>
  );
}

/* ============================================================
   Cost Centre List
   ============================================================ */
function CostCenterList() {
  const costCenters = useLedgerTallyStore((s) => s.costCenters);
  const addCostCenter = useLedgerTallyStore((s) => s.addCostCenter);
  const updateCostCenter = useLedgerTallyStore((s) => s.updateCostCenter);
  const deleteCostCenter = useLedgerTallyStore((s) => s.deleteCostCenter);

  const [newOpen, setNewOpen] = useState(false);
  const [editCC, setEditCC] = useState<CostCenter | null>(null);
  const [deleteCC, setDeleteCC] = useState<CostCenter | null>(null);
  const [activeCategory, setActiveCategory] = useState<CostCenterCategory | "All">("All");

  const filtered = useMemo(
    () => (activeCategory === "All" ? costCenters : costCenters.filter((c) => c.category === activeCategory)),
    [costCenters, activeCategory],
  );

  // Summary KPIs
  const summary = useMemo(() => {
    let totalRev = 0;
    let totalExp = 0;
    let active = 0;
    let profitable = 0;
    for (const c of costCenters) {
      totalRev += c.revenue;
      totalExp += c.expense;
      if (c.active) active += 1;
      if (c.revenue - c.expense > 0) profitable += 1;
    }
    return { totalRev, totalExp, net: totalRev - totalExp, active, profitable };
  }, [costCenters]);

  const columns: Column<CostCenter>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      sortValue: (r) => r.code,
      width: "120px",
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.code}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = CATEGORY_ICON[r.category];
            return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
          })()}
          <span className="text-[12px] text-foreground">{r.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (r) => r.category,
      width: "120px",
      render: (r) => <StatusBadge variant={catVariant(r.category)}>{r.category}</StatusBadge>,
    },
    {
      key: "revenue",
      header: "Revenue",
      sortable: true,
      align: "right",
      sortValue: (r) => r.revenue,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.revenue)}</span>,
    },
    {
      key: "expense",
      header: "Expense",
      sortable: true,
      align: "right",
      sortValue: (r) => r.expense,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.expense)}</span>,
    },
    {
      key: "net",
      header: "Net P&L",
      sortable: true,
      align: "right",
      sortValue: (r) => r.revenue - r.expense,
      width: "130px",
      render: (r) => {
        const net = r.revenue - r.expense;
        return (
          <span
            className={cn(
              "tabular text-[12px] font-medium inline-flex items-center gap-1",
              net >= 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatINR(net)}
          </span>
        );
      },
    },
    {
      key: "active",
      header: "Status",
      sortable: true,
      width: "100px",
      sortValue: (r) => (r.active ? "1" : "0"),
      render: (r) => (
        <StatusBadge variant={r.active ? "solid" : "muted"}>
          {r.active ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
  ];

  const rowActions = [
    { label: "View / Edit", onClick: (c: CostCenter) => setEditCC(c) },
    {
      label: "Delete",
      onClick: (c: CostCenter) => setDeleteCC(c),
      destructive: true,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total Revenue" value={formatINRCompact(summary.totalRev)} hint="all cost centres" />
        <KpiTile label="Total Expense" value={formatINRCompact(summary.totalExp)} hint="all cost centres" />
        <KpiTile
          label="Net Profitability"
          value={formatINRCompact(summary.net)}
          hint={`${summary.profitable} profitable`}
        />
        <KpiTile label="Active Centres" value={String(summary.active)} hint={`of ${costCenters.length} total`} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Category:</span>
        {(["All", ...CATEGORY_OPTIONS] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "h-7 rounded-[5px] border px-2.5 text-[11px] font-medium transition-colors",
              activeCategory === cat
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {cat}
          </button>
        ))}
        <div className="flex-1" />
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOpen(true)}>
          New Cost Centre
        </Btn>
      </div>

      {/* Table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(c) => setEditCC(c)}
          emptyTitle="No cost centres"
          emptyDescription="Add your first cost centre to track profitability."
          initialSort={{ key: "net", dir: "desc" }}
        />
      </div>

      {newOpen && (
        <CostCenterForm
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onSave={(c) => {
            addCostCenter(c);
            toast.success("Cost centre created", { description: c.name });
            setNewOpen(false);
          }}
        />
      )}

      {editCC && (
        <CostCenterForm
          open={!!editCC}
          onClose={() => setEditCC(null)}
          costCenter={editCC}
          onSave={(c) => {
            updateCostCenter(editCC.id, c);
            toast.success("Cost centre updated", { description: c.name });
            setEditCC(null);
          }}
        />
      )}

      {deleteCC && (
        <AlertDialog open={true} onOpenChange={(o) => !o && setDeleteCC(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete cost centre?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deleteCC.name}</strong> ({deleteCC.code}).
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteCostCenter(deleteCC.id);
                  toast(`Deleted ${deleteCC.name}`);
                  setDeleteCC(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function CostCenterForm({
  open,
  onClose,
  costCenter,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  costCenter?: CostCenter;
  onSave: (c: Omit<CostCenter, "id">) => void;
}) {
  const [code, setCode] = useState(costCenter?.code ?? "");
  const [name, setName] = useState(costCenter?.name ?? "");
  const [category, setCategory] = useState<CostCenterCategory>(costCenter?.category ?? "Vehicle");
  const [active, setActive] = useState(costCenter?.active ?? true);
  const [revenue, setRevenue] = useState(String(costCenter?.revenue ?? 0));
  const [expense, setExpense] = useState(String(costCenter?.expense ?? 0));
  const [notes, setNotes] = useState(costCenter?.notes ?? "");

  const handleSubmit = () => {
    if (!code.trim() || !name.trim()) {
      toast("Cannot save", { description: "Code and name are required" });
      return;
    }
    onSave({
      code: code.trim(),
      name: name.trim(),
      category,
      active,
      revenue: Number(revenue) || 0,
      expense: Number(expense) || 0,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-[16px] font-medium tracking-tight">
            {costCenter ? "Edit Cost Centre" : "New Cost Centre"}
          </SheetTitle>
          <SheetDescription className="text-[12px] text-muted-foreground">
            Track profitability by vehicle, driver, route, branch or department.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Code</FieldLabel>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VH-06"
                className="h-8 text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel required>Category</FieldLabel>
              <Select value={category} onValueChange={(v) => setCategory(v as CostCenterCategory)}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MH 12 AB 7892 · Tata Ace"
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <FieldLabel hint="₹">Revenue</FieldLabel>
              <Input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="h-8 text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel hint="₹">Expense</FieldLabel>
              <Input
                type="number"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                className="h-8 text-[13px] tabular"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-[13px]"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="cc-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <label htmlFor="cc-active" className="text-[12px] text-foreground">Active (in use)</label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>
            {costCenter ? "Save Changes" : "Create Cost Centre"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Budget List - per-account / per-cost-centre budget vs actual
   ============================================================ */
function BudgetList() {
  const budgets = useLedgerTallyStore((s) => s.budgets);
  const addBudget = useLedgerTallyStore((s) => s.addBudget);
  const updateBudget = useLedgerTallyStore((s) => s.updateBudget);
  const deleteBudget = useLedgerTallyStore((s) => s.deleteBudget);

  const [newOpen, setNewOpen] = useState(false);
  const [editB, setEditB] = useState<Budget | null>(null);
  const [scopeFilter, setScopeFilter] = useState<"All" | "Account" | "Cost Centre">("All");

  const filtered = useMemo(
    () => (scopeFilter === "All" ? budgets : budgets.filter((b) => b.scope === scopeFilter)),
    [budgets, scopeFilter],
  );

  const summary = useMemo(() => {
    let totalBud = 0;
    let totalAct = 0;
    let overBudget = 0;
    for (const b of budgets) {
      totalBud += b.budgeted;
      totalAct += b.actual;
      if (b.actual > b.budgeted && b.budgeted > 0) overBudget += 1;
    }
    const variance = totalBud - totalAct;
    return { totalBud, totalAct, variance, overBudget };
  }, [budgets]);

  const columns: Column<Budget>[] = [
    {
      key: "accountOrCostCentre",
      header: "Account / Cost Centre",
      sortable: true,
      sortValue: (r) => r.accountOrCostCentre,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[12px] text-foreground">{r.accountOrCostCentre}</span>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      sortable: true,
      sortValue: (r) => r.scope,
      width: "120px",
      render: (r) => (
        <StatusBadge variant={r.scope === "Account" ? "outline" : "muted"}>{r.scope}</StatusBadge>
      ),
    },
    {
      key: "period",
      header: "Period",
      sortable: true,
      sortValue: (r) => r.period + r.periodLabel,
      width: "120px",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12px] text-foreground">{r.period}</span>
          <span className="text-[11px] tabular text-muted-foreground">{r.periodLabel}</span>
        </div>
      ),
    },
    {
      key: "budgeted",
      header: "Budgeted",
      sortable: true,
      align: "right",
      sortValue: (r) => r.budgeted,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.budgeted)}</span>,
    },
    {
      key: "actual",
      header: "Actual",
      sortable: true,
      align: "right",
      sortValue: (r) => r.actual,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(r.actual)}</span>,
    },
    {
      key: "variance",
      header: "Variance",
      sortable: true,
      align: "right",
      sortValue: (r) => r.budgeted - r.actual,
      width: "140px",
      render: (r) => {
        const v = r.budgeted - r.actual;
        const pct = r.budgeted > 0 ? (v / r.budgeted) * 100 : 0;
        const over = v < 0;
        return (
          <div className="flex flex-col items-end">
            <span
              className={cn(
                "tabular text-[12px] font-medium",
                over ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {v >= 0 ? "+" : "-"}{formatINR(Math.abs(v))}
            </span>
            <span className="tabular text-[10px] text-muted-foreground">{formatPct(pct)}</span>
          </div>
        );
      },
    },
    {
      key: "progress",
      header: "Used",
      width: "100px",
      render: (r) => {
        const pct = r.budgeted > 0 ? Math.min(100, (r.actual / r.budgeted) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "absolute inset-y-0 left-0",
                  pct >= 100 ? "bg-foreground" : "bg-muted-foreground",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular text-[10px] text-muted-foreground w-8 text-right">{formatPct(pct, 0)}</span>
          </div>
        );
      },
    },
  ];

  const rowActions = [
    { label: "Edit", onClick: (b: Budget) => setEditB(b) },
    {
      label: "Delete",
      onClick: (b: Budget) => {
        deleteBudget(b.id);
        toast(`Budget ${b.accountOrCostCentre} deleted`);
      },
      destructive: true,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Total Budget" value={formatINRCompact(summary.totalBud)} hint={`${budgets.length} budgets`} />
        <KpiTile label="Total Actual" value={formatINRCompact(summary.totalAct)} hint="period to date" />
        <KpiTile
          label="Variance"
          value={formatINRCompact(summary.variance)}
          hint={summary.variance >= 0 ? "under budget" : "over budget"}
        />
        <KpiTile
          label="Over Budget"
          value={String(summary.overBudget)}
          hint="accounts exceeding limit"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Scope:</span>
        {(["All", "Account", "Cost Centre"] as const).map((sc) => (
          <button
            key={sc}
            onClick={() => setScopeFilter(sc)}
            className={cn(
              "h-7 rounded-[5px] border px-2.5 text-[11px] font-medium transition-colors",
              scopeFilter === sc
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {sc}
          </button>
        ))}
        <div className="flex-1" />
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOpen(true)}>
          New Budget
        </Btn>
      </div>

      {/* Table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(b) => setEditB(b)}
          emptyTitle="No budgets yet"
          emptyDescription="Set a budget per account or cost centre to track variance."
          initialSort={{ key: "variance", dir: "asc" }}
        />
      </div>

      {newOpen && (
        <BudgetForm
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onSave={(b) => {
            addBudget(b);
            toast.success("Budget created", { description: b.accountOrCostCentre });
            setNewOpen(false);
          }}
        />
      )}

      {editB && (
        <BudgetForm
          open={!!editB}
          onClose={() => setEditB(null)}
          budget={editB}
          onSave={(b) => {
            updateBudget(editB.id, b);
            toast.success("Budget updated", { description: b.accountOrCostCentre });
            setEditB(null);
          }}
        />
      )}
    </div>
  );
}

function BudgetForm({
  open,
  onClose,
  budget,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  budget?: Budget;
  onSave: (b: Omit<Budget, "id">) => void;
}) {
  const [accountOrCostCentre, setAcc] = useState(budget?.accountOrCostCentre ?? "");
  const [scope, setScope] = useState<Budget["scope"]>(budget?.scope ?? "Account");
  const [scopeId, setScopeId] = useState(budget?.scopeId ?? "");
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? "Monthly");
  const [periodLabel, setPeriodLabel] = useState(budget?.periodLabel ?? "");
  const [budgeted, setBudgeted] = useState(String(budget?.budgeted ?? 0));
  const [actual, setActual] = useState(String(budget?.actual ?? 0));
  const [committed, setCommitted] = useState(String(budget?.committed ?? 0));

  const handleSubmit = () => {
    if (!accountOrCostCentre.trim() || !periodLabel.trim()) {
      toast("Cannot save", { description: "Account/Cost Centre and Period label are required" });
      return;
    }
    onSave({
      accountOrCostCentre: accountOrCostCentre.trim(),
      scope,
      scopeId: scopeId.trim(),
      period,
      periodLabel: periodLabel.trim(),
      budgeted: Number(budgeted) || 0,
      actual: Number(actual) || 0,
      committed: Number(committed) || 0,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-[16px] font-medium tracking-tight">
            {budget ? "Edit Budget" : "New Budget"}
          </SheetTitle>
          <SheetDescription className="text-[12px] text-muted-foreground">
            Set a budgeted amount and compare against actuals.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel required>Account / Cost Centre label</FieldLabel>
              <Input
                value={accountOrCostCentre}
                onChange={(e) => setAcc(e.target.value)}
                placeholder="Fuel & Diesel Expense"
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <FieldLabel>Scope</FieldLabel>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as Budget["scope"])}
              >
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Account">Account</SelectItem>
                  <SelectItem value="Cost Centre">Cost Centre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint="optional">Scope ID</FieldLabel>
              <Input
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                placeholder="acc-fuel-exp"
                className="h-8 text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel>Period</FieldLabel>
              <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Period Label</FieldLabel>
              <Input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Oct 2024"
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <FieldLabel required hint="₹">Budgeted</FieldLabel>
              <Input
                type="number"
                value={budgeted}
                onChange={(e) => setBudgeted(e.target.value)}
                className="h-8 text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel hint="₹">Actual</FieldLabel>
              <Input
                type="number"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                className="h-8 text-[13px] tabular"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel hint="₹ optional">Committed (PO signed)</FieldLabel>
              <Input
                type="number"
                value={committed}
                onChange={(e) => setCommitted(e.target.value)}
                className="h-8 text-[13px] tabular"
              />
            </div>
          </div>

          <div className="mt-4 rounded-[6px] border border-border bg-card p-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
            <DetailRow
              label="Variance"
              value={formatINR((Number(budgeted) || 0) - (Number(actual) || 0))}
              mono
            />
            <div className="mt-2">
              <DetailRow
                label="Used %"
                value={
                  (Number(budgeted) || 0) > 0
                    ? formatPct(((Number(actual) || 0) / (Number(budgeted) || 0)) * 100, 0)
                    : "-"
                }
                mono
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>
            {budget ? "Save Changes" : "Create Budget"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Shared KpiTile
   ============================================================ */
function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular text-[18px] font-medium leading-none tracking-tight text-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

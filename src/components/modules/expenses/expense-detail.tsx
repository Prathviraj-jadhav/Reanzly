"use client";
import { useState, useEffect } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { Expense, Vehicle, Trip } from "@/lib/types";
import {
  Receipt,
  Banknote,
  Truck,
  Calendar,
  User,
  FileText,
  Pencil,
  Route,
  Image as ImageIcon,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  formatINR,
  relativeTime,
  receiptStatusBadge,
} from "./_helpers";
import { EditExpenseDrawer } from "./edit-expense-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "approval", label: "Approval Workflow" },
  { id: "recurring", label: "Recurring" },
  { id: "linked", label: "Linked Records" },
  { id: "receipt", label: "Receipt" },
];

interface ExpenseDetailProps {
  expenseId: string;
  expenses: Expense[];
  onUpdate: (id: string, data: Partial<Expense>) => Promise<boolean>;
}

export function ExpenseDetail({ expenseId, expenses, onUpdate: onUpdateReal }: ExpenseDetailProps) {
  const { navigate, navigateDetail } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const expense = expenses.find((e) => e.id === expenseId);
  const [editing, setEditing] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/trips").then((r) => (r.ok ? r.json() : { trips: [] })),
    ]).then(([v, t]) => {
      setVehicles(v.vehicles ?? []);
      setTrips(t.trips ?? []);
    });
  }, []);

  const handleUpdate = (id: string, data: Partial<Expense>) => {
    onUpdateReal(id, data);
  };

  const vehicle = expense ? vehicles.find((v) => v.name === expense.vehicle) : undefined;
  const trip = expense ? trips.find((t) => t.tripId === expense.trip) : undefined;

  if (!expense) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Expense <span className="tabular">{expenseId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("expenses")}>
          Back to Expenses
        </Btn>
      </div>
    );
  }

  const actions = (
    <>
      <Btn
        icon={<Pencil className="h-3.5 w-3.5" />}
        onClick={() => setEditing(true)}
      >
        Edit
      </Btn>
      <Btn
        variant="primary"
        icon={<Check className="h-3.5 w-3.5" />}
        onClick={() => toast.success("Expense approved", { description: expense.description })}
      >
        Approve
      </Btn>
    </>
  );

  const quickActions = [
    {
      label: "Delete",
      onClick: () => {
        toast(`Deleted expense`, { description: expense.description });
        navigate("expenses");
      },
    },
    {
      label: "Duplicate",
      onClick: () => toast("Expense duplicated", { description: expense.description }),
    },
    {
      label: "Mark as Paid",
      onClick: () => toast.success("Marked as paid", { description: expense.description }),
    },
    {
      label: "Export Receipt",
      onClick: () => toast("Receipt exported", { description: expense.description }),
    },
  ];

  const receiptMeta = receiptStatusBadge(expense.receiptStatus);

  return (
    <DetailLayout
      title={expense.description}
      subtitle={`Logged ${formatDate(expense.date)} · ${expense.submittedBy}`}
      badges={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="outline">{expense.category}</StatusBadge>
          <StatusBadge variant={receiptMeta.variant}>
            {expense.receiptStatus}
          </StatusBadge>
        </div>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {formatINR(expense.amount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(expense.date)}
          </span>
          {expense.vehicle && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {expense.vehicle}
            </span>
          )}
          {expense.trip && (
            <span className="inline-flex items-center gap-1">
              <Route className="h-3 w-3" />
              <button
                onClick={() => navigateDetail("trips", expense.trip!)}
                className="text-foreground underline-offset-2 hover:underline"
              >
                {expense.trip}
              </button>
            </span>
          )}
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {activeTab === "overview" && <OverviewTab expense={expense} />}
      {activeTab === "approval" && <ApprovalWorkflowTab expense={expense} />}
      {activeTab === "recurring" && <RecurringExpensesTab expense={expense} />}
      {activeTab === "linked" && (
        <LinkedTab expense={expense} vehicle={vehicle} trip={trip} />
      )}
      {activeTab === "receipt" && <ReceiptTab expense={expense} />}

      <EditExpenseDrawer
        open={editing}
        expense={expense}
        onClose={() => setEditing(false)}
        onUpdate={handleUpdate}
      />
    </DetailLayout>
  );
}

// ===== Overview Tab =====
function OverviewTab({ expense }: { expense: Expense }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Amount"
          value={formatINR(expense.amount)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Payment Mode"
          value={expense.paymentMode}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Receipt"
          value={expense.receiptStatus}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="Submitted"
          value={relativeTime(expense.date)}
          icon={<User className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Expense Details">
          <InfoRow label="Category" value={expense.category} />
          <InfoRow label="Description" value={expense.description} />
          <InfoRow label="Amount" value={formatINR(expense.amount)} mono />
          <InfoRow label="Payment Mode" value={expense.paymentMode} />
          <InfoRow label="Date" value={formatDate(expense.date)} mono />
          <InfoRow label="Submitted By" value={expense.submittedBy} />
          <InfoRow
            label="Receipt Status"
            value={
              <StatusBadge variant={expense.receiptStatus === "Attached" ? "outline" : "muted"}>
                {expense.receiptStatus}
              </StatusBadge>
            }
          />
        </InfoSection>

        <InfoSection title="Linked Entities">
          <InfoRow
            label="Vehicle"
            value={
              expense.vehicle ? (
                <span className="tabular">{expense.vehicle}</span>
              ) : (
                "-"
              )
            }
          />
          <InfoRow
            label="Trip"
            value={
              expense.trip ? (
                <span className="tabular">{expense.trip}</span>
              ) : (
                "-"
              )
            }
          />
          <InfoRow
            label="Reference"
            value={expense.paymentMode === "Cheque" ? "CHQ-002847" : expense.id}
            mono
          />
          <InfoRow label="Approval Status" value={<StatusBadge variant="outline">Approved</StatusBadge>} />
          <InfoRow label="Approver" value="Reena Mehta" />
          <InfoRow label="Approved On" value={formatDate(expense.date)} mono />
        </InfoSection>
      </div>

      <InfoSection title="Notes">
        <div className="py-2 text-[13px] text-muted-foreground">
          {expense.description}. Auto-categorised as{" "}
          <span className="text-foreground">{expense.category}</span> based on
          vendor and trip context. Submitted via driver mobile app.
        </div>
      </InfoSection>
    </div>
  );
}

// ===== Approval Workflow Tab =====
// 4-stage workflow: Submitted -> Manager Approve -> Finance Approve -> Paid.
// Deterministic per-expense: current stage derived from expense.id seed.
function ApprovalWorkflowTab({ expense }: { expense: Expense }) {
  const seed = parseInt(expense.id.replace(/\D/g, "")) || 1;
  const [currentStage, setCurrentStage] = useState<number>(Math.min(3, Math.floor(seed / 7) % 4));

  const stages = [
    {
      id: 0,
      label: "Submitted",
      icon: <FileText className="h-3.5 w-3.5" />,
      actor: expense.submittedBy,
      role: "Submitter",
      ts: expense.date,
      note: `Expense ${expense.id} · ${expense.category} · ${formatINR(expense.amount)}`,
    },
    {
      id: 1,
      label: "Manager Approved",
      icon: <User className="h-3.5 w-3.5" />,
      actor: ["Rohit Sharma", "Vikram Deshmukh", "Anil Reddy"][seed % 3],
      role: "Reporting Manager",
      ts: currentStage >= 1 ? new Date(new Date(expense.date).getTime() + 4 * 3600000).toISOString() : undefined,
      note: "Approved pending finance review · receipt verified",
    },
    {
      id: 2,
      label: "Finance Approved",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      actor: "Reena Mehta",
      role: "Accounts Manager",
      ts: currentStage >= 2 ? new Date(new Date(expense.date).getTime() + 8 * 3600000).toISOString() : undefined,
      note: "GL coded · cost centre assigned · budget verified",
    },
    {
      id: 3,
      label: "Paid",
      icon: <Banknote className="h-3.5 w-3.5" />,
      actor: "Reena Mehta",
      role: "Accounts Manager",
      ts: currentStage >= 3 ? new Date(new Date(expense.date).getTime() + 24 * 3600000).toISOString() : undefined,
      note: `${expense.paymentMode} · NEFT reference NEFT-${(seed * 7919).toString().slice(0, 8)} · cleared`,
    },
  ];

  const progressPct = Math.round((currentStage / (stages.length - 1)) * 100);
  const nextStage = stages[currentStage + 1];
  const isComplete = currentStage === stages.length - 1;

  const approverActions = [
    { id: 1, label: "Manager: Approve", role: "Reporting Manager" },
    { id: 2, label: "Finance: Approve", role: "Accounts Manager" },
    { id: 3, label: "Mark as Paid", role: "Accounts Manager" },
  ];

  const handleAdvance = () => {
    if (currentStage >= stages.length - 1) return;
    const next = stages[currentStage + 1];
    setCurrentStage((s) => Math.min(stages.length - 1, s + 1));
    toast.success(`Workflow advanced to ${next.label}`, {
      description: `${next.actor} · ${next.role}`,
    });
  };

  const handleReject = () => {
    toast.error("Expense rejected", { description: "Returned to submitter for revision" });
  };

  const handleReset = () => {
    setCurrentStage(0);
    toast("Workflow reset to Submitted");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Progress header */}
      <SectionCard
        title="Approval Workflow"
        description="4-stage workflow: Submitted -> Manager Approve -> Finance Approve -> Paid."
        icon={<CheckCircle2 className="h-4 w-4" />}
        badge={
          <StatusBadge variant={isComplete ? "solid" : "outline"} pulse={!isComplete}>
            {isComplete ? "Completed" : `Stage ${currentStage + 1} of 4`}
          </StatusBadge>
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-baseline justify-between text-[11px]">
              <span className="text-muted-foreground">Progress</span>
              <span className="tabular font-medium text-foreground">{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isComplete ? (
              <>
                <Btn size="sm" variant="ghost" icon={<AlertCircle className="h-3.5 w-3.5" />} onClick={handleReject}>
                  Reject
                </Btn>
                <Btn size="sm" variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleAdvance}>
                  {nextStage ? `Advance to ${nextStage.label}` : "Approve"}
                </Btn>
              </>
            ) : (
              <Btn size="sm" variant="outline" onClick={handleReset}>
                Reset Workflow
              </Btn>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Horizontal stepper */}
      <SectionCard title="Workflow Stages" icon={<FileText className="h-4 w-4" />}>
        <div className="flex items-stretch py-2">
          {stages.map((stage, i) => {
            const reached = i <= currentStage;
            const active = i === currentStage;
            const done = i < currentStage;
            return (
              <div key={stage.id} className="relative flex flex-1 flex-col items-center">
                {/* Left connector */}
                {i > 0 && (
                  <div className={cn("absolute left-0 right-1/2 top-[14px] h-px", reached ? "bg-foreground" : "bg-border")} />
                )}
                {/* Right connector */}
                {i < stages.length - 1 && (
                  <div className={cn("absolute left-1/2 right-0 top-[14px] h-px", currentStage > i ? "bg-foreground" : "bg-border")} />
                )}
                <div
                  className={cn(
                    "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium tabular transition-colors",
                    reached ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground",
                    active && "ring-2 ring-foreground/15 ring-offset-2 ring-offset-card",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn(
                  "mt-1.5 whitespace-nowrap text-[11px]",
                  active ? "font-medium text-foreground" : reached ? "text-foreground" : "text-muted-foreground",
                )}>
                  {stage.label}
                </span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">{stage.role}</span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Vertical timeline */}
      <SectionCard title="Approval Timeline" description="Each stage's actor, timestamp, and note." flush bodyClassName="px-4 py-2">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          return (
            <div key={stage.id} className="relative flex gap-3 py-3">
              {!isLast && (
                <div className={cn("absolute left-[11px] top-9 bottom-0 w-px", stage.ts ? "bg-foreground" : "bg-border")} />
              )}
              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  stage.ts ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground",
                )}
              >
                {stage.ts ? <Check className="h-3 w-3" /> : stage.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[13px] font-medium", stage.ts ? "text-foreground" : "text-muted-foreground")}>
                      {stage.label}
                    </span>
                    {stage.ts ? (
                      <StatusBadge variant="outline"><Check className="h-2.5 w-2.5" /> Done</StatusBadge>
                    ) : (
                      <StatusBadge variant="muted">Pending</StatusBadge>
                    )}
                  </div>
                  {stage.ts && (
                    <span className="text-[11px] tabular text-muted-foreground">
                      {formatDate(stage.ts)} · {relativeTime(stage.ts)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{stage.note}</p>
                {stage.ts && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">by {stage.actor} · {stage.role}</p>
                )}
              </div>
            </div>
          );
        })}
      </SectionCard>

      {/* Approver chain reference */}
      <SectionCard title="Approver Chain" description="Standard approval matrix for expense routing.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {approverActions.map((a) => (
            <div key={a.id} className="rounded-[5px] border border-border bg-background px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Stage {a.id + 1}</span>
                <span className="text-[10px] text-muted-foreground">{a.role}</span>
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-foreground">{a.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[5px] border border-dashed border-border bg-background px-3 py-2.5 text-[11px] text-muted-foreground">
          <AlertCircle className="mb-1 inline h-3 w-3" /> Expenses above Rs 25,000 require an additional Director approval. This expense is {expense.amount > 25000 ? "above" : "below"} the threshold.
        </div>
      </SectionCard>
    </div>
  );
}

// ===== Recurring Expenses Tab =====
// Mock data for existing recurring expense schedules linked to this expense's
// category / vehicle / vendor, plus a setup form stub.
function RecurringExpensesTab({ expense }: { expense: Expense }) {
  const seed = parseInt(expense.id.replace(/\D/g, "")) || 1;

  // Mock recurring schedules - 5 entries derived from expense context.
  const recurringSchedules = [
    {
      id: `rec-${seed}-1`,
      name: "Monthly Fuel Card Auto-Topup",
      category: "Fuel",
      amount: 45000,
      frequency: "Monthly",
      nextRun: new Date(Date.now() + 5 * 86400000).toISOString(),
      lastRun: new Date(Date.now() - 25 * 86400000).toISOString(),
      vendor: "IndianOil XTRAPOWER",
      status: "Active",
      autoApprove: true,
      runsCompleted: 14,
    },
    {
      id: `rec-${seed}-2`,
      name: "Toll FASTag Auto-Recharge",
      category: "Toll",
      amount: 5000,
      frequency: "Weekly",
      nextRun: new Date(Date.now() + 2 * 86400000).toISOString(),
      lastRun: new Date(Date.now() - 5 * 86400000).toISOString(),
      vendor: "ICICI FASTag",
      status: "Active",
      autoApprove: true,
      runsCompleted: 47,
    },
    {
      id: `rec-${seed}-3`,
      name: "Quarterly Insurance Premium",
      category: "Insurance",
      amount: 28000,
      frequency: "Quarterly",
      nextRun: new Date(Date.now() + 42 * 86400000).toISOString(),
      lastRun: new Date(Date.now() - 48 * 86400000).toISOString(),
      vendor: "ICICI Lombard",
      status: "Active",
      autoApprove: false,
      runsCompleted: 6,
    },
    {
      id: `rec-${seed}-4`,
      name: "Monthly Driver Salary Allowance",
      category: "Driver Allowance",
      amount: 18000,
      frequency: "Monthly",
      nextRun: new Date(Date.now() + 12 * 86400000).toISOString(),
      lastRun: new Date(Date.now() - 18 * 86400000).toISOString(),
      vendor: "Payroll Cycle",
      status: "Active",
      autoApprove: true,
      runsCompleted: 9,
    },
    {
      id: `rec-${seed}-5`,
      name: "PUC Renewal - Annual",
      category: "PUC",
      amount: 1200,
      frequency: "Yearly",
      nextRun: new Date(Date.now() + 95 * 86400000).toISOString(),
      lastRun: new Date(Date.now() - 270 * 86400000).toISOString(),
      vendor: "Authorised PUC Centre",
      status: "Paused",
      autoApprove: false,
      runsCompleted: 2,
    },
  ];

  const totalAnnual = recurringSchedules
    .filter((r) => r.status === "Active")
    .reduce((s, r) => {
      const mult = r.frequency === "Weekly" ? 52 : r.frequency === "Monthly" ? 12 : r.frequency === "Quarterly" ? 4 : 1;
      return s + r.amount * mult;
    }, 0);

  const [setupOpen, setSetupOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: expense.category,
    amount: "",
    frequency: "Monthly",
    vendor: "",
    autoApprove: false,
    startDate: new Date().toISOString().slice(0, 10),
  });

  const handleSetup = () => {
    if (!form.name || !form.amount) {
      toast.error("Name and amount are required");
      return;
    }
    toast.success("Recurring schedule created", {
      description: `${form.name} · ${form.frequency} · ${formatINR(Number(form.amount))}`,
    });
    setSetupOpen(false);
    setForm({ ...form, name: "", amount: "", vendor: "" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active Schedules" value={recurringSchedules.filter((r) => r.status === "Active").length} icon={<Calendar className="h-4 w-4" />} />
        <StatCard label="Total Annual Spend" value={formatINR(totalAnnual)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Auto-Approve" value={recurringSchedules.filter((r) => r.autoApprove).length} icon={<Check className="h-4 w-4" />} />
        <StatCard label="Paused" value={recurringSchedules.filter((r) => r.status === "Paused").length} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Setup form */}
      <SectionCard
        title="Create Recurring Schedule"
        description="Automate repeat expenses with a schedule + auto-approval rules."
        icon={<Calendar className="h-4 w-4" />}
        action={
          <Btn size="sm" variant="outline" icon={setupOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} onClick={() => setSetupOpen((o) => !o)}>
            {setupOpen ? "Cancel" : "New Schedule"}
          </Btn>
        }
      >
        {setupOpen && (
          <div className="border-b border-border pb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Schedule Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Monthly Fleet Insurance"
                  className="h-8 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Fuel", "Toll", "Maintenance", "Driver Allowance", "Permit Fee", "Repair", "PUC", "Tyre", "Insurance", "Misc"].map((c) => (
                      <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Amount</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Weekly", "Monthly", "Quarterly", "Yearly"].map((f) => (
                      <SelectItem key={f} value={f} className="text-[13px]">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Vendor / Payee</Label>
                <Input
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="e.g. IndianOil XTRAPOWER"
                  className="h-8 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <Label className="mb-1.5 text-[12px] text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setForm({ ...form, autoApprove: !form.autoApprove })}
                className={cn(
                  "flex h-5 w-9 items-center rounded-full border transition-colors",
                  form.autoApprove ? "border-foreground bg-foreground" : "border-border bg-muted",
                )}
              >
                <span className={cn(
                  "h-3.5 w-3.5 rounded-full bg-background transition-transform",
                  form.autoApprove ? "translate-x-4" : "translate-x-0.5",
                )} />
              </button>
              <span className="text-[12px] text-muted-foreground">Auto-approve each run (skip manager approval)</span>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Btn size="sm" variant="ghost" onClick={() => setSetupOpen(false)}>Cancel</Btn>
              <Btn size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={handleSetup}>
                Create Schedule
              </Btn>
            </div>
          </div>
        )}
        {!setupOpen && (
          <p className="text-[12px] text-muted-foreground">
            Click "New Schedule" to set up a recurring expense. Existing schedules are listed below.
          </p>
        )}
      </SectionCard>

      {/* Active recurring schedules */}
      <SectionCard
        title="Active Recurring Schedules"
        description="All schedules - active and paused."
        icon={<Calendar className="h-4 w-4" />}
        flush
        bodyClassName="divide-y divide-border max-h-[480px] overflow-y-auto scrollbar-thin"
      >
        {recurringSchedules.map((r) => {
          const mult = r.frequency === "Weekly" ? 52 : r.frequency === "Monthly" ? 12 : r.frequency === "Quarterly" ? 4 : 1;
          const annual = r.amount * mult;
          return (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-foreground">{r.name}</span>
                    <StatusBadge variant={r.status === "Active" ? "outline" : "muted"}>{r.status}</StatusBadge>
                    {r.autoApprove && (
                      <StatusBadge variant="solid">Auto-Approve</StatusBadge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{r.category}</span>
                    <span>·</span>
                    <span>{r.vendor}</span>
                    <span>·</span>
                    <span className="tabular">{r.frequency}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] tabular text-muted-foreground">
                    <span>Next: {formatDate(r.nextRun)}</span>
                    <span>Last: {formatDate(r.lastRun)}</span>
                    <span>Runs: {r.runsCompleted}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] tabular font-medium text-foreground">{formatINR(r.amount)}</div>
                  <div className="text-[10px] tabular text-muted-foreground">~{formatINR(annual)}/yr</div>
                  <div className="mt-1 flex items-center gap-1">
                    <Btn size="sm" variant="ghost" onClick={() => toast(`Paused ${r.name}`)}>
                      Pause
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => toast(`Editing ${r.name}`)}>
                      Edit
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </SectionCard>
    </div>
  );
}

// ===== Linked Tab =====
function LinkedTab({
  expense,
  vehicle,
  trip,
}: {
  expense: Expense;
  vehicle?: import("@/lib/types").Vehicle;
  trip?: import("@/lib/types").Trip;
}) {
  const { navigateDetail } = useAppStore();

  return (
    <div className="flex flex-col gap-4">
      {/* Vehicle card */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Vehicle
            </span>
          </div>
          {vehicle && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => navigateDetail("vehicles", vehicle.id)}
            >
              Open Vehicle
            </Btn>
          )}
        </div>
        {vehicle ? (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label="Vehicle Name" value={vehicle.name} />
            <InfoRow label="License Plate" value={vehicle.licensePlate} mono />
            <InfoRow label="Type" value={vehicle.type} />
            <InfoRow label="Make / Model" value={`${vehicle.make} ${vehicle.model}`} />
            <InfoRow label="Group" value={vehicle.group} />
            <InfoRow label="Status" value={<StatusBadge variant={vehicle.status === "Active" ? "solid" : "outline"}>{vehicle.status}</StatusBadge>} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Truck className="h-6 w-6 text-muted-foreground" />
            <p className="text-[12px] text-muted-foreground">
              No vehicle linked to this expense.
            </p>
          </div>
        )}
      </div>

      {/* Trip card */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Trip
            </span>
          </div>
          {trip && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => navigateDetail("trips", trip.tripId)}
            >
              Open Trip
            </Btn>
          )}
        </div>
        {trip ? (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label="Trip ID" value={trip.tripId} mono />
            <InfoRow label="LR Number" value={trip.lrNumber} mono />
            <InfoRow
              label="Route"
              value={
                <span>
                  {trip.origin} <span className="text-muted-foreground">→</span>{" "}
                  {trip.destination}
                </span>
              }
            />
            <InfoRow label="Customer" value={trip.customer} />
            <InfoRow label="Driver" value={trip.driverName} />
            <InfoRow label="Freight" value={formatINR(trip.freightAmount)} mono />
            <InfoRow label="Distance" value={`${trip.distanceKm.toLocaleString("en-IN")} km`} mono />
            <InfoRow label="Status" value={<StatusBadge variant="outline">{trip.status}</StatusBadge>} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Route className="h-6 w-6 text-muted-foreground" />
            <p className="text-[12px] text-muted-foreground">
              No trip linked to this expense.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Receipt Tab =====
function ReceiptTab({ expense }: { expense: Expense }) {
  const hasReceipt = expense.receiptStatus === "Attached";
  // Deterministic receipt metadata based on expense id
  const seed = parseInt(expense.id.replace(/\D/g, "")) || 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Status"
          value={expense.receiptStatus}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="Amount"
          value={formatINR(expense.amount)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="File Type"
          value={hasReceipt ? "PDF / JPEG" : "-"}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Size"
          value={hasReceipt ? `${(seed % 4) + 1}.${seed % 9} MB` : "-"}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Receipt Preview
            </span>
          </div>
          {hasReceipt && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => toast("Downloading receipt", { description: expense.description })}
            >
              Download
            </Btn>
          )}
        </div>
        {hasReceipt ? (
          <div className="p-6">
            {/* Mock receipt preview */}
            <div className="mx-auto max-w-md rounded-[6px] border border-border bg-background p-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border bg-muted">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-foreground">
                      {expense.category} Receipt
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular">
                      receipt-{expense.id}.pdf
                    </p>
                  </div>
                </div>
                <span className="rounded-[3px] bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background tabular">
                  {formatDate(expense.date)}
                </span>
              </div>
              <div className="space-y-2 py-3 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="text-foreground">
                    {["Indian Oil", "HPCL", "BPCL", "Toll Plaza", "Workshop"][seed % 5]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="text-foreground tabular">
                    {expense.vehicle || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #</span>
                  <span className="text-foreground tabular">
                    INV-{String(seed * 7919).slice(0, 6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground tabular">
                    {formatDate(expense.date)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-[12px] font-medium">
                    <span>Total</span>
                    <span className="tabular">{formatINR(expense.amount)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
                Digitally signed · Reanzly Logistics
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <span className="text-muted-foreground">
              <AlertCircle className="h-6 w-6" />
            </span>
            <p className="text-[14px] font-medium text-foreground">
              No receipt attached
            </p>
            <p className="text-[12px] text-muted-foreground">
              The submitter did not attach a receipt. Request one to verify this
              expense.
            </p>
            <Btn
              variant="outline"
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() =>
                toast.success("Receipt request sent", {
                  description: `Requested from ${expense.submittedBy}`,
                })
              }
            >
              Request Receipt
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

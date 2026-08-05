"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  X,
  Plus,
  Calendar,
  Sun,
  ChevronRight,
  Coffee,
  CheckCircle2,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useHrStore } from "./_store";
import {
  HR_BRANCHES,
  LEAVE_TYPES,
  LEAVE_WORKFLOW_STEPS,
  type LeaveRequest,
  type LeaveType,
  type CompOffRequest,
} from "./_data";
import {
  formatDate,
  relativeTime,
  leaveStatusBadge,
  compOffStatusBadge,
  LEAVE_TYPE_FULL,
  FieldLabel,
} from "./_helpers";

export function Leave() {
  const employees = useHrStore((s) => s.employees);
  const requests = useHrStore((s) => s.leaveRequests);
  const holidays = useHrStore((s) => s.holidays);
  const compOffs = useHrStore((s) => s.compOffRequests);
  const setLeaveStatus = useHrStore((s) => s.setLeaveStatus);
  const setCompOffStatus = useHrStore((s) => s.setCompOffStatus);
  const addLeaveRequest = useHrStore((s) => s.addLeaveRequest);

  const [tab, setTab] = useState<"requests" | "balance" | "calendar" | "compoff">("requests");
  const [createOpen, setCreateOpen] = useState(false);
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

  const pending = requests.filter((r) => r.status === "Pending" || r.status === "Manager Approved");
  const processed = requests.filter((r) => r.status === "Approved" || r.status === "Rejected" || r.status === "Cancelled");

  // Aggregated leave balance (all active employees)
  const balances = useMemo(() => {
    return employees
      .filter((e) => e.status === "Active" || e.status === "On Leave")
      .map((e) => ({
        emp: e,
        cl: e.leaveBalance.cl,
        sl: e.leaveBalance.sl,
        pl: e.leaveBalance.pl,
        ml: e.leaveBalance.ml,
        total: e.leaveBalance.cl + e.leaveBalance.sl + e.leaveBalance.pl + e.leaveBalance.ml,
      }));
  }, [employees]);

  const totalCL = balances.reduce((s, b) => s + b.cl, 0);
  const totalSL = balances.reduce((s, b) => s + b.sl, 0);
  const totalPL = balances.reduce((s, b) => s + b.pl, 0);
  const pendingCompOffs = compOffs.filter((c) => c.status === "Pending").length;

  const managerApprove = (r: LeaveRequest) => {
    setLeaveStatus(r.id, "Manager Approved");
    toast.success("Manager approved", { description: `${r.empName} · forwarded to HR` });
  };
  const hrApprove = (r: LeaveRequest) => {
    setLeaveStatus(r.id, "Approved");
    toast.success("HR approved", { description: `${r.empName} · ${r.leaveType} (${r.days}d)` });
  };
  const reject = (r: LeaveRequest) => {
    setLeaveStatus(r.id, "Rejected");
    setRejecting(null);
    toast.success("Leave rejected", { description: `${r.empName} · ${r.leaveType}` });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Pending Requests" value={String(pending.length)} />
        <KpiMini label="Total CL Balance" value={String(totalCL)} />
        <KpiMini label="Total SL Balance" value={String(totalSL)} />
        <KpiMini label="Total PL Balance" value={String(totalPL)} />
      </div>

      {/* Workflow stepper - explains the approval flow */}
      <SectionCard
        title="Approval Workflow"
        description="Apply → Manager → HR → Notify"
        icon={<ChevronRight className="h-4 w-4" />}
        flush
        bodyClassName="px-4 py-3"
      >
        <div className="flex items-center justify-between gap-1">
          {LEAVE_WORKFLOW_STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[10px] tabular font-medium text-foreground">
                    {s.id}
                  </span>
                  <span className="text-[12px] font-medium text-foreground">{s.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-8 truncate">{s.owner}</span>
              </div>
              {i < LEAVE_WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Sub-tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
          {[
            { id: "requests", label: "Requests" },
            { id: "balance", label: "Balances" },
            { id: "calendar", label: "Calendar" },
            { id: "compoff", label: "Comp-Off" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "rounded-[3px] px-3 py-1.5 text-[12px] font-medium transition-colors tap",
                tab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.id === "requests" && pending.length > 0 && (
                <span className="ml-1.5 tabular">({pending.length})</span>
              )}
              {t.id === "compoff" && pendingCompOffs > 0 && (
                <span className="ml-1.5 tabular">({pendingCompOffs})</span>
              )}
            </button>
          ))}
        </div>
        <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
          Apply Leave
        </Btn>
      </div>

      {tab === "requests" && (
        <div className="flex flex-col gap-4">
          <SectionCard
            title="Pending Approvals"
            description={`${pending.length} awaiting review`}
            icon={<CalendarDays className="h-4 w-4" />}
            flush
            bodyClassName="p-0"
          >
            <div className="divide-y divide-border">
              {pending.length === 0 ? (
                <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                  No pending requests. All caught up.
                </div>
              ) : (
                pending.map((r) => (
                  <LeaveRow
                    key={r.id}
                    r={r}
                    onManagerApprove={managerApprove}
                    onHrApprove={hrApprove}
                    onReject={() => setRejecting(r)}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Processed Requests"
            description={`${processed.length} reviewed`}
            icon={<Check className="h-4 w-4" />}
            flush
            bodyClassName="p-0"
          >
            <div className="divide-y divide-border">
              {processed.map((r) => <LeaveRow key={r.id} r={r} readOnly />)}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "balance" && (
        <SectionCard
          title="Leave Balances"
          description="Per-employee entitlement vs consumed"
          icon={<CalendarDays className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  {["Employee", "CL", "SL", "PL", "ML", "Total", "Used YTD"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.map(({ emp, cl, sl, pl, ml, total }) => {
                  // Mock YTD used count
                  const used = 12 - cl + 12 - sl + 15 - pl;
                  return (
                    <tr key={emp.id} className="hover:bg-accent/30">
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-foreground">{emp.name}</span>
                          <span className="font-mono text-[10px] tabular text-muted-foreground">{emp.empCode} · {emp.designation}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2"><BalanceCell value={cl} max={12} /></td>
                      <td className="px-3 py-2"><BalanceCell value={sl} max={12} /></td>
                      <td className="px-3 py-2"><BalanceCell value={pl} max={15} /></td>
                      <td className="px-3 py-2"><BalanceCell value={ml} max={84} /></td>
                      <td className="px-3 py-2 text-[12px] tabular font-medium text-foreground">{total}</td>
                      <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{used}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === "calendar" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Upcoming Leaves"
            description="Who's off in next 30 days"
            icon={<Calendar className="h-4 w-4" />}
            flush
            bodyClassName="p-0"
          >
            <div className="divide-y divide-border">
              {requests
                .filter((r) => r.status === "Approved" && new Date(r.from).getTime() > Date.now() - 86400000)
                .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
                .slice(0, 10)
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <div className="text-[12.5px] font-medium text-foreground">{r.empName}</div>
                      <div className="text-[10.5px] text-muted-foreground">{LEAVE_TYPE_FULL[r.leaveType]} · {r.days}d</div>
                    </div>
                    <div className="text-right text-[11px] tabular text-muted-foreground">
                      <div>{formatDate(r.from)}</div>
                      <div>→ {formatDate(r.to)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Holiday Calendar"
            description="Declared holidays across branches"
            icon={<Sun className="h-4 w-4" />}
            flush
            bodyClassName="p-0"
          >
            <div className="max-h-[60vh] divide-y divide-border overflow-y-auto scrollbar-thin">
              {holidays
                .slice()
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <div className="text-[12.5px] font-medium text-foreground">{h.name}</div>
                      <div className="text-[10.5px] text-muted-foreground">
                        {h.branches.length === HR_BRANCHES.length ? "All branches" : h.branches.join(", ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] tabular text-foreground">{formatDate(h.date)}</div>
                      <StatusBadge variant="muted">{h.type}</StatusBadge>
                    </div>
                  </div>
                ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "compoff" && (
        <CompOffView
          compOffs={compOffs}
          onApprove={(c) => {
            setCompOffStatus(c.id, "Approved");
            toast.success("Comp-off approved", { description: `${c.empName} · earned 1 day` });
          }}
          onReject={(c) => {
            setCompOffStatus(c.id, "Rejected");
            toast.success("Comp-off rejected", { description: `${c.empName}` });
          }}
        />
      )}

      <ApplyLeaveDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onApply={(r) => {
          addLeaveRequest(r);
          setCreateOpen(false);
          toast.success("Leave applied", { description: `${r.empName} · ${r.leaveType} (${r.days}d)` });
        }}
        nextId={requests.length + 1}
      />

      <AlertDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-medium">Reject leave request?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px]">
              {rejecting && (
                <>
                  <strong>{rejecting.empName}</strong> · {LEAVE_TYPE_FULL[rejecting.leaveType]} for {rejecting.days} day{rejecting.days === 1 ? "" : "s"} from {formatDate(rejecting.from)} to {formatDate(rejecting.to)}.
                  <br />
                  Reason: {rejecting.reason}
                </>
              )}
              <br />
              This action cannot be undone. The employee will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejecting && reject(rejecting)}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-[5px]"
            >
              Reject Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeaveRow({
  r,
  onManagerApprove,
  onHrApprove,
  onReject,
  readOnly,
}: {
  r: LeaveRequest;
  onManagerApprove?: (r: LeaveRequest) => void;
  onHrApprove?: (r: LeaveRequest) => void;
  onReject?: () => void;
  readOnly?: boolean;
}) {
  const { variant, pulse } = leaveStatusBadge(r.status);
  return (
    <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground">
          {r.empName.split(" ").slice(0, 2).map((p) => p[0]).join("")}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{r.empName}</span>
            <StatusBadge variant="outline" className="font-mono">{r.empCode}</StatusBadge>
            <StatusBadge variant="muted">{LEAVE_TYPE_FULL[r.leaveType]}</StatusBadge>
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            {formatDate(r.from)} → {formatDate(r.to)} · {r.days} day{r.days === 1 ? "" : "s"}
          </div>
          <div className="mt-1 max-w-md text-[11.5px] text-foreground">{r.reason}</div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">
            Applied {relativeTime(r.appliedOn)} · Approver: {r.approver}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!readOnly && r.status === "Pending" ? (
          <>
            <Btn variant="primary" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onManagerApprove?.(r)}>
              Manager Approve
            </Btn>
            <Btn variant="outline" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={onReject}>
              Reject
            </Btn>
          </>
        ) : !readOnly && r.status === "Manager Approved" ? (
          <>
            <Btn variant="primary" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onHrApprove?.(r)}>
              HR Approve
            </Btn>
            <Btn variant="outline" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={onReject}>
              Reject
            </Btn>
          </>
        ) : (
          <StatusBadge variant={variant} pulse={pulse}>
            {r.status}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Comp-off View
// ============================================================
function CompOffView({
  compOffs,
  onApprove,
  onReject,
}: {
  compOffs: ReturnType<typeof useHrStore.getState>["compOffRequests"];
  onApprove: (c: CompOffRequest) => void;
  onReject: (c: CompOffRequest) => void;
}) {
  const pending = compOffs.filter((c) => c.status === "Pending");
  const reviewed = compOffs.filter((c) => c.status !== "Pending");
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Pending Comp-Off Requests"
        description={`${pending.length} awaiting review`}
        icon={<Coffee className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {pending.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No pending comp-off requests.
            </div>
          ) : (
            pending.map((c) => (
              <CompOffRow key={c.id} c={c} onApprove={onApprove} onReject={onReject} />
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Reviewed Comp-Offs"
        description={`${reviewed.length} processed`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {reviewed.map((c) => <CompOffRow key={c.id} c={c} readOnly />)}
        </div>
      </SectionCard>
    </div>
  );
}

function CompOffRow({
  c,
  onApprove,
  onReject,
  readOnly,
}: {
  c: CompOffRequest;
  onApprove?: (c: CompOffRequest) => void;
  onReject?: (c: CompOffRequest) => void;
  readOnly?: boolean;
}) {
  const { variant, pulse } = compOffStatusBadge(c.status);
  return (
    <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground">
          {c.empName.split(" ").slice(0, 2).map((p) => p[0]).join("")}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{c.empName}</span>
            <StatusBadge variant="outline" className="font-mono">{c.empCode}</StatusBadge>
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            Worked on: <span className="tabular">{formatDate(c.workedOn)}</span> · Comp-off on: <span className="tabular">{formatDate(c.compOffOn)}</span>
          </div>
          <div className="mt-1 max-w-md text-[11.5px] text-foreground">{c.reason}</div>
          <div className="mt-1 text-[10.5px] text-muted-foreground">
            Applied {relativeTime(c.appliedOn)}
            {c.approvedOn && ` · Approved ${relativeTime(c.approvedOn)}`}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!readOnly && c.status === "Pending" ? (
          <>
            <Btn variant="primary" size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onApprove?.(c)}>
              Approve
            </Btn>
            <Btn variant="outline" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={() => onReject?.(c)}>
              Reject
            </Btn>
          </>
        ) : (
          <StatusBadge variant={variant} pulse={pulse}>{c.status}</StatusBadge>
        )}
      </div>
    </div>
  );
}

function BalanceCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", pct > 50 ? "bg-foreground" : "bg-muted-foreground")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] tabular text-foreground">{value}</span>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

function ApplyLeaveDialog({
  open,
  onClose,
  onApply,
  nextId,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (r: LeaveRequest) => void;
  nextId: number;
}) {
  const employees = useHrStore((s) => s.employees);
  const [form, setForm] = useState({
    empId: "",
    leaveType: "CL" as LeaveType,
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const days = useMemo(() => {
    const f = new Date(form.from);
    const t = new Date(form.to);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return 0;
    return Math.max(1, Math.ceil((t.getTime() - f.getTime()) / 86400000) + 1);
  }, [form.from, form.to]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = () => {
    const emp = employees.find((e) => e.id === form.empId);
    if (!emp) {
      toast.error("Select an employee");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const r: LeaveRequest = {
      id: `lr-${Date.now()}`,
      empId: emp.id,
      empName: emp.name,
      empCode: emp.empCode,
      designation: emp.designation,
      leaveType: form.leaveType,
      from: new Date(form.from).toISOString(),
      to: new Date(form.to).toISOString(),
      days,
      reason: form.reason.trim(),
      approver: emp.reportingTo,
      status: "Pending",
      appliedOn: new Date().toISOString(),
    };
    void nextId;
    onApply(r);
    setForm({ empId: "", leaveType: "CL", from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), reason: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium tracking-tight">
            Apply for Leave
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Submit a leave request on behalf of an employee.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FieldLabel required>Employee</FieldLabel>
            <Select value={form.empId} onValueChange={(v) => update("empId", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue placeholder="Select employee…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {employees
                  .filter((e) => e.status === "Active" || e.status === "On Leave")
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} · {e.empCode}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Leave Type</FieldLabel>
            <Select value={form.leaveType} onValueChange={(v) => update("leaveType", v as LeaveType)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEAVE_TYPE_FULL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel hint="days">Duration</FieldLabel>
            <Input value={String(days)} disabled className="h-8 text-[13px] tabular" />
          </div>
          <div>
            <FieldLabel required>From</FieldLabel>
            <Input type="date" value={form.from} onChange={(e) => update("from", e.target.value)} className="h-8 text-[13px]" />
          </div>
          <div>
            <FieldLabel required>To</FieldLabel>
            <Input type="date" value={form.to} onChange={(e) => update("to", e.target.value)} className="h-8 text-[13px]" />
          </div>
          <div className="col-span-2">
            <FieldLabel required>Reason</FieldLabel>
            <Textarea value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="e.g. Personal urgent work" rows={3} className="text-[13px]" />
          </div>
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit}>
            Submit Request
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

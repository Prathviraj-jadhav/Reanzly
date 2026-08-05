"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  UserMinus,
  FileText,
  Banknote,
  CheckCircle2,
  Circle,
  ChevronRight,
  CalendarClock,
  ClipboardList,
  Package,
  MessageSquare,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
  type ExitRequest,
  type ExitStatus,
  type Employee,
} from "./_data";
import {
  formatDate,
  relativeTime,
  tenure,
  initials,
  formatINR,
  exitStatusBadge,
} from "./_helpers";

const EXIT_WORKFLOW: { id: ExitStatus; label: string; owner: string }[] = [
  { id: "Resignation Submitted", label: "Submit", owner: "Employee" },
  { id: "Manager Reviewed", label: "Mgr Review", owner: "Manager" },
  { id: "HR Reviewed", label: "HR Review", owner: "HR" },
  { id: "Notice Period", label: "Notice", owner: "Employee" },
  { id: "No-Dues Pending", label: "No-Dues", owner: "Multi" },
  { id: "No-Dues Cleared", label: "Cleared", owner: "System" },
  { id: "F&F Pending", label: "F&F", owner: "Finance" },
  { id: "F&F Settled", label: "Settled", owner: "Finance" },
  { id: "Exited", label: "Exited", owner: "System" },
];

export function Exit({
  onIssueRelieving,
  onIssueExperience,
}: {
  onIssueRelieving?: (employee: Employee) => void;
  onIssueExperience?: (employee: Employee) => void;
} = {}) {
  const exits = useHrStore((s) => s.exitRequests);
  const employees = useHrStore((s) => s.employees);
  const setExitStatus = useHrStore((s) => s.setExitStatus);
  const setExitInterviewNotes = useHrStore((s) => s.setExitInterviewNotes);
  const clearNoDues = useHrStore((s) => s.clearNoDues);
  const [selected, setSelected] = useState<ExitRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [interviewModal, setInterviewModal] = useState<ExitRequest | null>(null);

  const filtered = useMemo(
    () => exits.filter((e) => statusFilter === "All" || e.status === statusFilter),
    [exits, statusFilter],
  );

  const pendingCount = exits.filter((e) => e.status !== "Exited" && e.status !== "F&F Settled").length;
  const noticePeriodCount = exits.filter((e) => e.status === "Notice Period").length;
  const noDuesPendingCount = exits.filter((e) => e.status === "No-Dues Pending").length;
  const fnfPendingCount = exits.filter((e) => e.status === "F&F Pending").length;
  const totalFnfAmount = exits.reduce((s, e) => s + (e.fnfAmount || 0), 0);

  const columns: Column<ExitRequest>[] = [
    {
      key: "empName",
      header: "Employee",
      sortable: true,
      sortValue: (r) => r.empName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
            {initials(r.empName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">{r.empCode} · {r.designation}</span>
          </div>
        </div>
      ),
    },
    {
      key: "reasonCategory",
      header: "Reason",
      sortable: true,
      sortValue: (r) => r.reasonCategory,
      hideOnMobile: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12px] text-foreground">{r.reasonCategory}</span>
          <span className="text-[10.5px] text-muted-foreground truncate max-w-[220px]">{r.reason}</span>
        </div>
      ),
    },
    {
      key: "lastWorkingDay",
      header: "LWD",
      sortable: true,
      sortValue: (r) => r.lastWorkingDay,
      hideOnMobile: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[11.5px] tabular text-foreground">{formatDate(r.lastWorkingDay)}</span>
          <span className="text-[10.5px] tabular text-muted-foreground">{tenure(r.doj)} tenure</span>
        </div>
      ),
    },
    {
      key: "fnfAmount",
      header: "F&F",
      sortable: true,
      sortValue: (r) => r.fnfAmount || 0,
      align: "right",
      hideOnMobile: true,
      render: (r) =>
        r.fnfAmount ? (
          <span className="text-[12px] tabular font-medium text-foreground">{formatINR(r.fnfAmount)}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const { variant, pulse } = exitStatusBadge(r.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Active Exits" value={String(pendingCount)} icon={<UserMinus className="h-3.5 w-3.5" />} />
        <KpiMini label="In Notice Period" value={String(noticePeriodCount)} icon={<CalendarClock className="h-3.5 w-3.5" />} />
        <KpiMini label="No-Dues Pending" value={String(noDuesPendingCount)} icon={<ClipboardList className="h-3.5 w-3.5" />} />
        <KpiMini label="F&F Pending" value={String(fnfPendingCount)} sub={`Total: ${formatINR(totalFnfAmount)}`} icon={<Banknote className="h-3.5 w-3.5" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            Exit Requests · {filtered.length}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Resignations, notice period, no-dues, and full &amp; final settlement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
          <Btn variant="primary" icon={<UserMinus className="h-3.5 w-3.5" />} onClick={() => toast.info("New Exit", { description: "Open the resignation intake form." })}>
            New Exit
          </Btn>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchKeys={["empCode", "empName", "designation", "reason", "reasonCategory"]}
        searchPlaceholder="Search by employee, reason…"
        onRowClick={(r) => setSelected(r)}
        rowActions={[
          { label: "View Details", onClick: (r) => setSelected(r) },
          { label: "Schedule Interview", onClick: (r) => setInterviewModal(r) },
          {
            label: "Issue Relieving Letter",
            onClick: (r) => {
              const emp = employees.find((e) => e.id === r.empId);
              if (emp && onIssueRelieving) onIssueRelieving(emp);
              else toast.info("Open Issuances", { description: "Switch to the Issuances tab to issue documents." });
            },
          },
          {
            label: "Issue Experience Letter",
            onClick: (r) => {
              const emp = employees.find((e) => e.id === r.empId);
              if (emp && onIssueExperience) onIssueExperience(emp);
              else toast.info("Open Issuances", { description: "Switch to the Issuances tab to issue documents." });
            },
          },
          { label: "Download Relieving Letter", onClick: (r) => toast.success("Letter generated", { description: `${r.empName} · relieving letter` }) },
        ]}
        pageSize={15}
        emptyTitle="No exit requests"
        emptyDescription="Active exits will show up here."
      />

      <ExitDetailDrawer
        request={selected}
        onClose={() => setSelected(null)}
        onAdvance={(status) => {
          if (!selected) return;
          setExitStatus(selected.id, status);
          setSelected({ ...selected, status });
          toast.success("Exit advanced", { description: `${selected.empName} → ${status}` });
        }}
        onClearNoDues={(idx) => {
          if (!selected) return;
          clearNoDues(selected.id, idx);
          const updatedNoDues = selected.noDues.map((d, i) =>
            i === idx ? { ...d, cleared: true, clearedOn: new Date().toISOString() } : d,
          );
          const allCleared = updatedNoDues.every((d) => d.cleared);
          setSelected({
            ...selected,
            noDues: updatedNoDues,
            status: allCleared && selected.status === "No-Dues Pending" ? "No-Dues Cleared" : selected.status,
          });
          toast.success("No-dues cleared", { description: selected.noDues[idx].item });
        }}
        onScheduleInterview={() => {
          if (selected) {
            setInterviewModal(selected);
          }
        }}
        onIssueRelieving={
          onIssueRelieving && selected
            ? () => {
                const emp = employees.find((e) => e.id === selected.empId);
                if (emp) onIssueRelieving(emp);
              }
            : undefined
        }
        onIssueExperience={
          onIssueExperience && selected
            ? () => {
                const emp = employees.find((e) => e.id === selected.empId);
                if (emp) onIssueExperience(emp);
              }
            : undefined
        }
      />

      <InterviewModal
        request={interviewModal}
        onClose={() => setInterviewModal(null)}
        onSave={(notes) => {
          if (interviewModal) {
            setExitInterviewNotes(interviewModal.id, notes);
            toast.success("Exit interview saved", { description: interviewModal.empName });
            setInterviewModal(null);
          }
        }}
      />
    </div>
  );
}

function ExitDetailDrawer({
  request,
  onClose,
  onAdvance,
  onClearNoDues,
  onScheduleInterview,
  onIssueRelieving,
  onIssueExperience,
}: {
  request: ExitRequest | null;
  onClose: () => void;
  onAdvance: (status: ExitStatus) => void;
  onClearNoDues: (idx: number) => void;
  onScheduleInterview: () => void;
  onIssueRelieving?: () => void;
  onIssueExperience?: () => void;
}) {
  if (!request) {
    return (
      <Sheet open={false} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="p-0" showCloseButton={false} />
      </Sheet>
    );
  }

  const currentStepIdx = EXIT_WORKFLOW.findIndex((s) => s.id === request.status);
  const clearedNoDues = request.noDues.filter((d) => d.cleared).length;
  const returnedAssets = request.assetsReturned.filter((a) => a.returned).length;

  return (
    <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge variant="outline" className="font-mono">{request.empCode}</StatusBadge>
              <StatusBadge {...exitStatusBadge(request.status)}>{request.status}</StatusBadge>
            </div>
            <SheetClose asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            </SheetClose>
          </div>
          <SheetTitle className="text-[18px] font-medium tracking-tight">{request.empName}</SheetTitle>
          <SheetDescription className="text-[12.5px]">
            {request.designation} · {request.branch} · Tenure {tenure(request.doj)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          {/* Workflow stepper */}
          <div className="flex items-center justify-between gap-1">
            {EXIT_WORKFLOW.map((s, i) => {
              const isDone = i < currentStepIdx;
              const isActive = i === currentStepIdx;
              return (
                <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[9px] tabular",
                      isActive && "border-foreground bg-foreground text-background",
                      isDone && "border-foreground bg-foreground text-background",
                      !isActive && !isDone && "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={cn("text-[9px] text-center", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Resignation details */}
          <SectionCard
            title="Resignation Details"
            icon={<FileText className="h-3.5 w-3.5" />}
            className="mt-4"
            bodyClassName="p-3"
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
              <InfoRow label="Resignation Date" value={formatDate(request.resignationDate)} mono />
              <InfoRow label="Last Working Day" value={formatDate(request.lastWorkingDay)} mono />
              <InfoRow label="Reason Category" value={request.reasonCategory} />
              <InfoRow label="DOJ" value={formatDate(request.doj)} mono />
              <div className="col-span-2 mt-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason</div>
                <div className="text-[12px] text-foreground">{request.reason}</div>
              </div>
              {request.managerApprovedOn && <InfoRow label="Manager Approved" value={relativeTime(request.managerApprovedOn)} mono />}
              {request.hrApprovedOn && <InfoRow label="HR Approved" value={relativeTime(request.hrApprovedOn)} mono />}
              {request.rehireEligible !== undefined && (
                <InfoRow label="Rehire Eligible" value={request.rehireEligible ? "Yes" : "No"} />
              )}
            </div>
          </SectionCard>

          {/* No-dues checklist */}
          <SectionCard
            title="No-Dues Checklist"
            description={`${clearedNoDues}/${request.noDues.length} cleared`}
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            className="mt-3"
            bodyClassName="p-3"
            action={
              request.status === "No-Dues Pending" ? (
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    // Clear all in sequence
                    request.noDues.forEach((d, idx) => {
                      if (!d.cleared) onClearNoDues(idx);
                    });
                  }}
                >
                  Clear All
                </Btn>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-1.5">
              {request.noDues.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-[5px] border border-border p-2.5">
                  <button
                    onClick={() => !d.cleared && onClearNoDues(i)}
                    disabled={d.cleared}
                    className="shrink-0 text-muted-foreground hover:text-foreground tap disabled:opacity-50"
                    aria-label="Toggle cleared"
                  >
                    {d.cleared ? <CheckCircle2 className="h-4 w-4 text-foreground" /> : <Circle className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-[12px]", d.cleared ? "text-muted-foreground line-through" : "text-foreground")}>
                      {d.item}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">
                      Owner: {d.owner}
                      {d.clearedOn && <span> · {relativeTime(d.clearedOn)}</span>}
                    </div>
                  </div>
                  <StatusBadge variant={d.cleared ? "muted" : "outline"} pulse={!d.cleared}>
                    {d.cleared ? "Cleared" : "Pending"}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Asset return */}
          <SectionCard
            title="Asset Return"
            description={`${returnedAssets}/${request.assetsReturned.length} returned`}
            icon={<Package className="h-3.5 w-3.5" />}
            className="mt-3"
            bodyClassName="p-3"
          >
            {request.assetsReturned.length === 0 ? (
              <div className="text-[12px] text-muted-foreground">No assets assigned.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {request.assetsReturned.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-[5px] border border-border p-2.5">
                    {a.returned ? <CheckCircle2 className="h-3.5 w-3.5 text-foreground" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                    <div className="flex-1">
                      <div className="text-[12px] text-foreground">{a.name}</div>
                      <div className="font-mono text-[10.5px] tabular text-muted-foreground">{a.refNo}</div>
                    </div>
                    <StatusBadge variant={a.returned ? "muted" : "outline"}>{a.returned ? "Returned" : "Pending"}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* F&F */}
          <SectionCard
            title="Full & Final Settlement"
            icon={<Banknote className="h-3.5 w-3.5" />}
            className="mt-3"
            bodyClassName="p-3"
            action={
              request.status === "F&F Pending" ? (
                <Btn
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  onClick={() => onAdvance("F&F Settled")}
                >
                  Mark Settled
                </Btn>
              ) : undefined
            }
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
              <InfoRow label="F&F Amount" value={request.fnfAmount ? formatINR(request.fnfAmount) : "-"} mono />
              <InfoRow label="Settled On" value={request.fnfSettledOn ? formatDate(request.fnfSettledOn) : "-"} mono />
              <div className="col-span-2 mt-1 rounded-[5px] border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                Includes: notice pay recovery, leave encashment, bonus/incentive dues, outstanding advance, asset deductions.
              </div>
            </div>
          </SectionCard>

          {/* Exit interview */}
          <SectionCard
            title="Exit Interview"
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            className="mt-3"
            bodyClassName="p-3"
            action={
              !request.interviewCompleted && request.status !== "Resignation Submitted" ? (
                <Btn variant="outline" size="sm" icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={onScheduleInterview}>
                  Schedule
                </Btn>
              ) : undefined
            }
          >
            {request.interviewCompleted ? (
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notes</div>
                <p className="text-[12px] text-foreground">{request.exitInterviewNotes || "No notes recorded."}</p>
              </div>
            ) : request.interviewScheduled ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Scheduled for <span className="tabular text-foreground">{formatDate(request.interviewScheduled)}</span>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground">Not scheduled.</div>
            )}
          </SectionCard>
        </div>

        {/* Footer action - advance to next status */}
        <SheetFooter className="border-t border-border px-5 py-3">
          <div className="flex w-full flex-col gap-2">
            {(onIssueRelieving || onIssueExperience) && (
              <div className="flex flex-wrap items-center gap-2">
                {onIssueRelieving && (
                  <Btn
                    variant="outline"
                    size="sm"
                    icon={<FileText className="h-3.5 w-3.5" />}
                    onClick={onIssueRelieving}
                  >
                    Issue Relieving Letter
                  </Btn>
                )}
                {onIssueExperience && (
                  <Btn
                    variant="outline"
                    size="sm"
                    icon={<FileText className="h-3.5 w-3.5" />}
                    onClick={onIssueExperience}
                  >
                    Issue Experience Letter
                  </Btn>
                )}
              </div>
            )}
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Current: <span className="font-medium text-foreground">{request.status}</span>
              </span>
              {currentStepIdx < EXIT_WORKFLOW.length - 1 && (
                <Btn
                  variant="primary"
                  size="sm"
                  iconRight={<ChevronRight className="h-3.5 w-3.5" />}
                  onClick={() => onAdvance(EXIT_WORKFLOW[currentStepIdx + 1].id)}
                >
                  Advance to {EXIT_WORKFLOW[currentStepIdx + 1].label}
                </Btn>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InterviewModal({
  request,
  onClose,
  onSave,
}: {
  request: ExitRequest | null;
  onClose: () => void;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  return (
    <AlertDialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px] font-medium">Exit Interview · {request?.empName}</AlertDialogTitle>
          <AlertDialogDescription className="text-[12.5px]">
            Capture feedback on reason for leaving, work environment, manager effectiveness, and rehire potential.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cited better compensation elsewhere. Open to re-hire if pay parity improves. Suggested flexible shift options."
            rows={5}
            className="text-[13px]"
          />
          <div className="rounded-[5px] border border-border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            Once saved, the exit interview is marked as completed. Notes will be visible on the employee's exit record.
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onSave(notes)}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-[5px]"
          >
            Save Interview
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

function StatusFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = ["All", "Resignation Submitted", "Notice Period", "No-Dues Pending", "F&F Pending", "Exited"];
  return (
    <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-[3px] px-2.5 py-1.5 text-[11.5px] font-medium transition-colors tap",
            value === o ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function KpiMini({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tabular text-foreground">{value}</span>
      {sub && <span className="text-[10.5px] text-muted-foreground tabular truncate">{sub}</span>}
    </div>
  );
}

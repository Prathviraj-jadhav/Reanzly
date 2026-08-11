"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ATTENDANCE_SUMMARIES,
  HOLIDAYS,
  COMPLIANCE_ITEMS,
  PERFORMANCE_REVIEWS,
  PIPS,
  ONBOARDING_PLANS,
  EXIT_REQUESTS,
  ATTENDANCE_REGS,
  INTERVIEWS,
  OFFER_LETTERS,
  DOC_REQUESTS,
  COMPOFF_REQUESTS,
  ISSUANCES,
  type Employee,
  type AttendanceRecord,
  type MonthlyAttendanceSummary,
  type LeaveRequest,
  type LeaveStatus,
  type Holiday,
  type Payslip,
  type PayrollRun,
  type PayrollStatus,
  type ComplianceItem,
  type Position,
  type Candidate,
  type CandidateStage,
  type Designation,
  type Department,
  type EmploymentType,
  type EmployeeStatus,
  type DocType,
  type LeaveType,
  type AttendanceMark,
  type PerformanceReview,
  type ReviewStatus,
  type Rating,
  type PIP,
  type OnboardingPlan,
  type OnboardingStatus,
  type ExitRequest,
  type ExitStatus,
  type AttendanceReg,
  type RegStatus,
  type Interview,
  type OfferLetter,
  type OfferStatus,
  type DocumentRequest,
  type CompOffRequest,
  type ReviewCycle,
  type OnboardingTask,
  type Issuance,
  type IssuanceStatus,
} from "./_data";

// ============================================================
// HR store - persisted Zustand slice.
// Store name: `reanzly-hr`
// ============================================================

interface HrState {
  employees: Employee[];
  attendanceDaily: AttendanceRecord[];
  attendanceSummaries: MonthlyAttendanceSummary[];
  attendanceRegs: AttendanceReg[];
  leaveRequests: LeaveRequest[];
  compOffRequests: CompOffRequest[];
  holidays: Holiday[];
  payslips: Payslip[];
  payrollRuns: PayrollRun[];
  compliance: ComplianceItem[];
  positions: Position[];
  interviews: Interview[];
  offers: OfferLetter[];
  performanceReviews: PerformanceReview[];
  pips: PIP[];
  onboardingPlans: OnboardingPlan[];
  exitRequests: ExitRequest[];
  docRequests: DocumentRequest[];
  issuances: Issuance[];

  // Real, database-backed (employees/attendanceDaily/leaveRequests/
  // positions/payslips/payrollRuns) - GET /api/hr/{employees,attendance,
  // leave,positions,payslips,payroll-runs} on hydrate(). Everything else in
  // this state is still the original Zustand+localStorage mock slice
  // (attendanceSummaries/attendanceRegs/compOffRequests/holidays/
  // compliance/interviews/offers/performanceReviews/pips/onboardingPlans/
  // exitRequests/docRequests/issuances) - real schema doesn't exist for
  // these yet, flagged as the next real-data pass rather than silently
  // left inconsistent. Recent-activity/audit trail is real now - see
  // /api/audit-log and useAuditLog(), not stored here.
  loaded: boolean;
  hydrate: () => Promise<void>;

  // Employee mutations
  addEmployee: (e: Partial<Employee>) => Promise<Employee | null>;
  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<boolean>;

  // Attendance mutations
  markAttendance: (r: Partial<AttendanceRecord> & { empId: string }) => Promise<AttendanceRecord | null>;

  // Leave mutations
  addLeaveRequest: (r: Partial<LeaveRequest> & { empId: string }) => Promise<LeaveRequest | null>;
  setLeaveStatus: (id: string, status: LeaveStatus) => Promise<boolean>;

  // Comp-off mutations
  setCompOffStatus: (id: string, status: CompOffRequest["status"]) => void;

  // Payroll mutations
  runPayroll: (month: string) => Promise<PayrollRun | null>;
  setPayslipStatus: (id: string, status: PayrollStatus) => Promise<boolean>;
  approvePayrollRun: (id: string) => Promise<boolean>;
  disbursePayrollRun: (id: string) => Promise<boolean>;

  // Position/candidate mutations
  addPosition: (p: Partial<Position>) => Promise<Position | null>;
  addCandidate: (positionId: string, c: Partial<Candidate>) => Promise<boolean>;
  setCandidateStage: (positionId: string, candidateId: string, stage: CandidateStage) => Promise<boolean>;

  // Performance mutations
  setReviewStatus: (id: string, status: ReviewStatus, rating?: Rating, comments?: string) => void;
  addPip: (p: PIP) => void;
  setPipStatus: (id: string, status: PIP["status"]) => void;

  // Onboarding mutations
  setOnboardingTaskStatus: (planId: string, taskId: string, status: OnboardingStatus) => void;
  addOnboardingPlan: (p: OnboardingPlan) => void;

  // Exit mutations
  setExitStatus: (id: string, status: ExitStatus) => void;
  setExitInterviewNotes: (id: string, notes: string) => void;
  clearNoDues: (id: string, itemIndex: number) => void;

  // Attendance regularization mutations
  setRegStatus: (id: string, status: RegStatus, reviewerComments?: string) => void;

  // Offer letter mutations
  setOfferStatus: (id: string, status: OfferStatus) => void;

  // Document request mutations
  setDocRequestStatus: (id: string, status: DocumentRequest["status"]) => void;

  // Issuance (document issuance) mutations
  addIssuance: (i: Issuance) => void;
  updateIssuanceStatus: (id: string, status: IssuanceStatus) => void;
  revokeIssuance: (id: string) => void;

  reset: () => void;
}

// Employees/attendanceDaily/leaveRequests/payslips/payrollRuns/positions
// are real now - start empty and are populated by hydrate(), not seeded
// from mock-data. Everything else here is still the original mock seed.
const SEED = {
  attendanceSummaries: ATTENDANCE_SUMMARIES,
  attendanceRegs: ATTENDANCE_REGS,
  compOffRequests: COMPOFF_REQUESTS,
  holidays: HOLIDAYS,
  compliance: COMPLIANCE_ITEMS,
  interviews: INTERVIEWS,
  offers: OFFER_LETTERS,
  performanceReviews: PERFORMANCE_REVIEWS,
  pips: PIPS,
  onboardingPlans: ONBOARDING_PLANS,
  exitRequests: EXIT_REQUESTS,
  docRequests: DOC_REQUESTS,
  issuances: ISSUANCES,
};

function nowIso() {
  return new Date().toISOString();
}

async function postJSON<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
async function patchJSON(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch {
    return false;
  }
}
// Like patchJSON but returns the parsed response body - used where the
// caller needs the server's real computed result (e.g. payroll approve/
// disburse return the updated run), not just a success boolean.
async function patchAction<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const useHrStore = create<HrState>()(
  persist(
    (set, get) => ({
      ...SEED,
      employees: [],
      attendanceDaily: [],
      leaveRequests: [],
      payslips: [],
      payrollRuns: [],
      positions: [],
      loaded: false,

      hydrate: async () => {
        try {
          const [emp, att, leave, pos, slips, runs] = await Promise.all([
            fetch("/api/hr/employees").then((r) => (r.ok ? r.json() : { employees: [] })),
            fetch("/api/hr/attendance").then((r) => (r.ok ? r.json() : { attendance: [] })),
            fetch("/api/hr/leave").then((r) => (r.ok ? r.json() : { leaveRequests: [] })),
            fetch("/api/hr/positions").then((r) => (r.ok ? r.json() : { positions: [] })),
            fetch("/api/hr/payslips").then((r) => (r.ok ? r.json() : { payslips: [] })),
            fetch("/api/hr/payroll-runs").then((r) => (r.ok ? r.json() : { payrollRuns: [] })),
          ]);
          set({
            employees: emp.employees ?? [],
            attendanceDaily: att.attendance ?? [],
            leaveRequests: leave.leaveRequests ?? [],
            positions: pos.positions ?? [],
            payslips: slips.payslips ?? [],
            payrollRuns: runs.payrollRuns ?? [],
            loaded: true,
          });
        } catch {
          set({ loaded: true });
        }
      },

      addEmployee: async (e) => {
        const res = await postJSON<{ employee: Employee }>("/api/hr/employees", e);
        if (!res) return null;
        set((s) => ({ employees: [res.employee, ...s.employees] }));
        return res.employee;
      },
      updateEmployee: async (id, patch) => {
        const ok = await patchJSON(`/api/hr/employees/${id}`, patch);
        if (ok) {
          set((s) => ({
            employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          }));
        }
        return ok;
      },

      markAttendance: async (r) => {
        const res = await postJSON<{ record: AttendanceRecord }>("/api/hr/attendance", r);
        if (!res) return null;
        set((s) => ({
          attendanceDaily: [res.record, ...s.attendanceDaily.filter((x) => !(x.empId === res.record.empId && x.date === res.record.date))],
        }));
        return res.record;
      },

      addLeaveRequest: async (r) => {
        const res = await postJSON<{ leaveRequest: LeaveRequest }>("/api/hr/leave", r);
        if (!res) return null;
        set((s) => ({ leaveRequests: [res.leaveRequest, ...s.leaveRequests] }));
        return res.leaveRequest;
      },
      setLeaveStatus: async (id, status) => {
        const ok = await patchJSON(`/api/hr/leave/${id}`, { status });
        if (ok) {
          set((s) => ({
            leaveRequests: s.leaveRequests.map((r) => (r.id === id ? { ...r, status, reviewedOn: nowIso() } : r)),
          }));
        }
        return ok;
      },

      setCompOffStatus: (id, status) =>
        set((s) => ({
          compOffRequests: s.compOffRequests.map((r) =>
            r.id === id ? { ...r, status, approvedOn: status === "Approved" ? nowIso() : r.approvedOn } : r,
          ),
        })),

      runPayroll: async (month) => {
        const res = await postJSON<{ payrollRun: PayrollRun }>("/api/hr/payroll-runs", { month });
        if (!res) return null;
        set((s) => ({ payrollRuns: [res.payrollRun, ...s.payrollRuns] }));
        // Refresh payslips so the new run's real slips show up immediately.
        const slipsRes = await fetch(`/api/hr/payslips?month=${encodeURIComponent(month)}`).then((r) => (r.ok ? r.json() : null));
        if (slipsRes) set((s) => ({ payslips: [...slipsRes.payslips, ...s.payslips.filter((p) => p.month !== month)] }));
        return res.payrollRun;
      },
      setPayslipStatus: async (id, status) => {
        const ok = await patchJSON(`/api/hr/payslips/${id}`, { status });
        if (ok) set((s) => ({ payslips: s.payslips.map((p) => (p.id === id ? { ...p, status } : p)) }));
        return ok;
      },
      approvePayrollRun: async (id) => {
        const res = await patchAction<{ payrollRun: PayrollRun }>(`/api/hr/payroll-runs/${id}`, { action: "approve" });
        if (!res) return false;
        set((s) => ({
          payrollRuns: s.payrollRuns.map((r) => (r.id === id ? res.payrollRun : r)),
          payslips: s.payslips.map((p) => (p.month === res.payrollRun.month ? { ...p, status: "Approved" as PayrollStatus } : p)),
        }));
        return true;
      },
      disbursePayrollRun: async (id) => {
        const res = await patchAction<{ payrollRun: PayrollRun }>(`/api/hr/payroll-runs/${id}`, { action: "disburse" });
        if (!res) return false;
        set((s) => ({
          payrollRuns: s.payrollRuns.map((r) => (r.id === id ? res.payrollRun : r)),
          payslips: s.payslips.map((p) => (p.month === res.payrollRun.month ? { ...p, status: "Paid" as PayrollStatus } : p)),
        }));
        return true;
      },

      addPosition: async (p) => {
        const res = await postJSON<{ position: Position }>("/api/hr/positions", p);
        if (!res) return null;
        set((s) => ({ positions: [res.position, ...s.positions] }));
        return res.position;
      },
      addCandidate: async (positionId, c) => {
        const res = await postJSON<{ candidate: Candidate }>("/api/hr/candidates", { ...c, positionId });
        if (!res) return false;
        set((s) => ({
          positions: s.positions.map((p) =>
            p.id === positionId ? { ...p, candidates: [res.candidate, ...p.candidates] } : p,
          ),
        }));
        return true;
      },
      setCandidateStage: async (positionId, candidateId, stage) => {
        const ok = await patchJSON(`/api/hr/candidates/${candidateId}`, { stage });
        if (ok) {
          set((s) => ({
            positions: s.positions.map((p) =>
              p.id === positionId
                ? { ...p, candidates: p.candidates.map((c) => (c.id === candidateId ? { ...c, stage } : c)) }
                : p,
            ),
          }));
        }
        return ok;
      },

      setReviewStatus: (id, status, rating, comments) =>
        set((s) => ({
          performanceReviews: s.performanceReviews.map((r) => {
            if (r.id !== id) return r;
            const patch: Partial<PerformanceReview> = { status };
            if (status === "Self-Review" && rating) patch.selfRating = rating;
            if (status === "Self-Review" && comments) patch.selfComments = comments;
            if (status === "Manager Review" && rating) patch.managerRating = rating;
            if (status === "Manager Review" && comments) patch.managerComments = comments;
            if (status === "HR Review" && comments) patch.hrComments = comments;
            if (status === "Completed" && rating) patch.finalRating = rating;
            if (status === "Self-Review") patch.selfSubmittedOn = nowIso();
            if (status === "Manager Review") patch.managerReviewedOn = nowIso();
            if (status === "HR Review" || status === "Completed") patch.hrReviewedOn = nowIso();
            return { ...r, ...patch };
          }),
        })),
      addPip: (p) => set((s) => ({ pips: [p, ...s.pips] })),
      setPipStatus: (id, status) =>
        set((s) => ({ pips: s.pips.map((p) => (p.id === id ? { ...p, status } : p)) })),

      setOnboardingTaskStatus: (planId, taskId, status) =>
        set((s) => ({
          onboardingPlans: s.onboardingPlans.map((plan) => {
            if (plan.id !== planId) return plan;
            const tasks = plan.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status,
                    completedOn: status === "Completed" ? nowIso() : undefined,
                  }
                : t,
            );
            const done = tasks.filter((t) => t.status === "Completed").length;
            const progress = Math.round((done / tasks.length) * 100);
            const nextStatus: OnboardingPlan["status"] =
              progress === 100 ? "Completed" : progress > 50 ? "In Progress" : plan.status;
            return { ...plan, tasks, progress, status: nextStatus };
          }),
        })),
      addOnboardingPlan: (p) => set((s) => ({ onboardingPlans: [p, ...s.onboardingPlans] })),

      setExitStatus: (id, status) =>
        set((s) => ({
          exitRequests: s.exitRequests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      setExitInterviewNotes: (id, notes) =>
        set((s) => ({
          exitRequests: s.exitRequests.map((r) =>
            r.id === id ? { ...r, exitInterviewNotes: notes, interviewCompleted: true } : r,
          ),
        })),
      clearNoDues: (id, itemIndex) =>
        set((s) => ({
          exitRequests: s.exitRequests.map((r) => {
            if (r.id !== id) return r;
            const noDues = r.noDues.map((d, i) =>
              i === itemIndex ? { ...d, cleared: true, clearedOn: nowIso() } : d,
            );
            const allCleared = noDues.every((d) => d.cleared);
            return {
              ...r,
              noDues,
              status: allCleared && r.status === "No-Dues Pending" ? ("No-Dues Cleared" as ExitStatus) : r.status,
            };
          }),
        })),

      setRegStatus: (id, status, reviewerComments) =>
        set((s) => ({
          attendanceRegs: s.attendanceRegs.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  reviewedOn: nowIso(),
                  reviewedBy: r.reviewedBy || "HR",
                  reviewerComments: reviewerComments || r.reviewerComments,
                }
              : r,
          ),
        })),

      setOfferStatus: (id, status) =>
        set((s) => ({
          offers: s.offers.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  acceptedOn: status === "Accepted" ? nowIso() : o.acceptedOn,
                  declinedOn: status === "Declined" ? nowIso() : o.declinedOn,
                }
              : o,
          ),
        })),

      setDocRequestStatus: (id, status) =>
        set((s) => ({
          docRequests: s.docRequests.map((d) =>
            d.id === id
              ? { ...d, status, receivedOn: status === "Received" ? nowIso() : d.receivedOn }
              : d,
          ),
        })),

      // ===== Issuance mutations =====
      addIssuance: (i) => set((s) => ({ issuances: [i, ...s.issuances] })),
      updateIssuanceStatus: (id, status) =>
        set((s) => ({
          issuances: s.issuances.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status,
                  eSignPending: status === "Sent" ? i.eSignPending : status === "E-Signed" ? false : i.eSignPending,
                }
              : i,
          ),
        })),
      revokeIssuance: (id) =>
        set((s) => ({
          issuances: s.issuances.map((i) =>
            i.id === id ? { ...i, status: "Revoked" as IssuanceStatus, eSignPending: false } : i,
          ),
        })),

      reset: () => set({ ...SEED }),
    }),
    {
      name: "reanzly-hr",
      version: 6,
      // Real, hydrated fields are never persisted to localStorage - they're
      // always refetched from the database on mount, so a stale cached copy
      // would just be dead weight (and could briefly show outdated data
      // before hydrate() overwrites it). Only the still-mock Tier-2 slices
      // keep the original persist-to-localStorage behaviour.
      partialize: (s) => ({
        attendanceSummaries: s.attendanceSummaries,
        attendanceRegs: s.attendanceRegs,
        compOffRequests: s.compOffRequests,
        holidays: s.holidays,
        compliance: s.compliance,
        interviews: s.interviews,
        offers: s.offers,
        performanceReviews: s.performanceReviews,
        pips: s.pips,
        onboardingPlans: s.onboardingPlans,
        exitRequests: s.exitRequests,
        docRequests: s.docRequests,
        issuances: s.issuances,
      }),
    },
  ),
);

export type {
  Employee,
  AttendanceRecord,
  MonthlyAttendanceSummary,
  LeaveRequest,
  LeaveStatus,
  Holiday,
  Payslip,
  PayrollRun,
  PayrollStatus,
  ComplianceItem,
  Position,
  Candidate,
  CandidateStage,
  Designation,
  Department,
  EmploymentType,
  EmployeeStatus,
  DocType,
  LeaveType,
  AttendanceMark,
  PerformanceReview,
  ReviewStatus,
  Rating,
  PIP,
  OnboardingPlan,
  OnboardingStatus,
  OnboardingTask,
  ExitRequest,
  ExitStatus,
  AttendanceReg,
  RegStatus,
  Interview,
  OfferLetter,
  OfferStatus,
  DocumentRequest,
  CompOffRequest,
  ReviewCycle,
  Issuance,
  IssuanceStatus,
};

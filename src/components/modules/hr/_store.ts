"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EMPLOYEES,
  ATTENDANCE_SUMMARIES,
  DAILY_ATTENDANCE,
  LEAVE_REQUESTS,
  HOLIDAYS,
  PAYROLL_RUNS,
  PAYSLIPS,
  COMPLIANCE_ITEMS,
  POSITIONS,
  PERFORMANCE_REVIEWS,
  PIPS,
  ONBOARDING_PLANS,
  EXIT_REQUESTS,
  ATTENDANCE_REGS,
  INTERVIEWS,
  OFFER_LETTERS,
  DOC_REQUESTS,
  COMPOFF_REQUESTS,
  AUDIT_LOG,
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
  type AuditEntry,
  type AuditAction,
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
  auditLog: AuditEntry[];

  // Employee mutations
  addEmployee: (e: Employee) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;

  // Leave mutations
  addLeaveRequest: (r: LeaveRequest) => void;
  setLeaveStatus: (id: string, status: LeaveStatus) => void;

  // Comp-off mutations
  setCompOffStatus: (id: string, status: CompOffRequest["status"]) => void;

  // Payroll mutations
  setPayslipStatus: (id: string, status: PayrollStatus) => void;
  approvePayrollRun: (id: string) => void;
  disbursePayrollRun: (id: string) => void;

  // Position mutations
  addPosition: (p: Position) => void;
  setCandidateStage: (positionId: string, candidateId: string, stage: CandidateStage) => void;

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

  // Audit log
  logAudit: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;

  reset: () => void;
}

const SEED = {
  employees: EMPLOYEES,
  attendanceDaily: DAILY_ATTENDANCE,
  attendanceSummaries: ATTENDANCE_SUMMARIES,
  attendanceRegs: ATTENDANCE_REGS,
  leaveRequests: LEAVE_REQUESTS,
  compOffRequests: COMPOFF_REQUESTS,
  holidays: HOLIDAYS,
  payslips: PAYSLIPS,
  payrollRuns: PAYROLL_RUNS,
  compliance: COMPLIANCE_ITEMS,
  positions: POSITIONS,
  interviews: INTERVIEWS,
  offers: OFFER_LETTERS,
  performanceReviews: PERFORMANCE_REVIEWS,
  pips: PIPS,
  onboardingPlans: ONBOARDING_PLANS,
  exitRequests: EXIT_REQUESTS,
  docRequests: DOC_REQUESTS,
  issuances: ISSUANCES,
  auditLog: AUDIT_LOG,
};

function nowIso() {
  return new Date().toISOString();
}

function pushAudit(state: HrState, entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry[] {
  const next: AuditEntry = {
    ...entry,
    id: `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: nowIso(),
  };
  return [next, ...state.auditLog].slice(0, 200);
}

export const useHrStore = create<HrState>()(
  persist(
    (set, get) => ({
      ...SEED,

      addEmployee: (e) =>
        set((s) => ({
          employees: [e, ...s.employees],
          auditLog: pushAudit(s, {
            action: "create",
            entity: "Employee",
            entityId: e.empCode,
            description: `Added new employee ${e.name} (${e.designation})`,
            user: "hr@reanzly.in",
          }),
        })),
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          auditLog: pushAudit(s, {
            action: "update",
            entity: "Employee",
            entityId: id,
            description: `Updated employee profile fields: ${Object.keys(patch).join(", ")}`,
            user: "hr@reanzly.in",
          }),
        })),

      addLeaveRequest: (r) =>
        set((s) => ({
          leaveRequests: [r, ...s.leaveRequests],
          auditLog: pushAudit(s, {
            action: "create",
            entity: "LeaveRequest",
            entityId: r.id,
            description: `Leave request submitted by ${r.empName} (${r.leaveType}, ${r.days}d)`,
            user: `${r.empCode}@reanzly.in`,
          }),
        })),
      setLeaveStatus: (id, status) =>
        set((s) => {
          const req = s.leaveRequests.find((r) => r.id === id);
          return {
            leaveRequests: s.leaveRequests.map((r) =>
              r.id === id
                ? { ...r, status, reviewedOn: nowIso() }
                : r,
            ),
            auditLog: req
              ? pushAudit(s, {
                  action: status === "Approved" ? "approve" : status === "Rejected" ? "reject" : "status_change",
                  entity: "LeaveRequest",
                  entityId: id,
                  description: `Leave ${status.toLowerCase()} for ${req.empName} (${req.leaveType})`,
                  user: "hr@reanzly.in",
                })
              : s.auditLog,
          };
        }),

      setCompOffStatus: (id, status) =>
        set((s) => ({
          compOffRequests: s.compOffRequests.map((r) =>
            r.id === id ? { ...r, status, approvedOn: status === "Approved" ? nowIso() : r.approvedOn } : r,
          ),
        })),

      setPayslipStatus: (id, status) =>
        set((s) => ({
          payslips: s.payslips.map((p) => (p.id === id ? { ...p, status } : p)),
        })),
      approvePayrollRun: (id) =>
        set((s) => ({
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === id ? { ...r, status: "Approved" as PayrollStatus, approvedOn: nowIso() } : r,
          ),
          payslips: s.payslips.map((p) =>
            p.month === s.payrollRuns.find((r) => r.id === id)?.month
              ? { ...p, status: "Approved" as PayrollStatus }
              : p,
          ),
          auditLog: pushAudit(s, {
            action: "approve",
            entity: "PayrollRun",
            entityId: id,
            description: `Payroll run approved`,
            user: "hr@reanzly.in",
          }),
        })),
      disbursePayrollRun: (id) =>
        set((s) => ({
          payrollRuns: s.payrollRuns.map((r) =>
            r.id === id ? { ...r, status: "Paid" as PayrollStatus, disbursedOn: nowIso() } : r,
          ),
          payslips: s.payslips.map((p) =>
            p.month === s.payrollRuns.find((r) => r.id === id)?.month
              ? { ...p, status: "Paid" as PayrollStatus }
              : p,
          ),
          auditLog: pushAudit(s, {
            action: "status_change",
            entity: "PayrollRun",
            entityId: id,
            description: `Payroll disbursed`,
            user: "hr@reanzly.in",
          }),
        })),

      addPosition: (p) => set((s) => ({ positions: [p, ...s.positions] })),
      setCandidateStage: (positionId, candidateId, stage) =>
        set((s) => ({
          positions: s.positions.map((p) =>
            p.id === positionId
              ? {
                  ...p,
                  candidates: p.candidates.map((c) =>
                    c.id === candidateId ? { ...c, stage } : c,
                  ),
                }
              : p,
          ),
        })),

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
          auditLog: pushAudit(s, {
            action: "status_change",
            entity: "PerformanceReview",
            entityId: id,
            description: `Review advanced to ${status}`,
            user: "hr@reanzly.in",
          }),
        })),
      addPip: (p) =>
        set((s) => ({
          pips: [p, ...s.pips],
          auditLog: pushAudit(s, {
            action: "create",
            entity: "PIP",
            entityId: p.id,
            description: `PIP initiated for ${p.empName}`,
            user: "hr@reanzly.in",
          }),
        })),
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
          auditLog: pushAudit(s, {
            action: "status_change",
            entity: "ExitRequest",
            entityId: id,
            description: `Exit advanced to ${status}`,
            user: "hr@reanzly.in",
          }),
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
          auditLog: pushAudit(s, {
            action: status === "Approved" ? "approve" : "reject",
            entity: "AttendanceReg",
            entityId: id,
            description: `Regularization ${status.toLowerCase()}`,
            user: "hr@reanzly.in",
          }),
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
      addIssuance: (i) =>
        set((s) => ({
          issuances: [i, ...s.issuances],
          auditLog: pushAudit(s, {
            action: "create",
            entity: "Issuance",
            entityId: i.documentId,
            description: `Issued ${i.type} for ${i.employeeName} (${i.status})`,
            user: i.issuedBy,
          }),
        })),
      updateIssuanceStatus: (id, status) =>
        set((s) => {
          const found = s.issuances.find((i) => i.id === id);
          return {
            issuances: s.issuances.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status,
                    eSignPending: status === "Sent" ? i.eSignPending : status === "E-Signed" ? false : i.eSignPending,
                  }
                : i,
            ),
            auditLog: found
              ? pushAudit(s, {
                  action: "status_change",
                  entity: "Issuance",
                  entityId: found.documentId,
                  description: `Issuance ${found.type} → ${status}`,
                  user: "hr@reanzly.in",
                })
              : s.auditLog,
          };
        }),
      revokeIssuance: (id) =>
        set((s) => {
          const found = s.issuances.find((i) => i.id === id);
          return {
            issuances: s.issuances.map((i) =>
              i.id === id ? { ...i, status: "Revoked" as IssuanceStatus, eSignPending: false } : i,
            ),
            auditLog: found
              ? pushAudit(s, {
                  action: "status_change",
                  entity: "Issuance",
                  entityId: found.documentId,
                  description: `Revoked issuance ${found.type} for ${found.employeeName}`,
                  user: "hr@reanzly.in",
                })
              : s.auditLog,
          };
        }),

      logAudit: (entry) => set((s) => ({ auditLog: pushAudit(s, entry) })),

      reset: () => set({ ...SEED }),
    }),
    {
      name: "reanzly-hr",
      version: 4,
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
  AuditEntry,
  AuditAction,
  ReviewCycle,
  Issuance,
  IssuanceStatus,
};

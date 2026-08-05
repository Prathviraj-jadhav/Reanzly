"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
  Briefcase,
  ShieldCheck,
  Banknote,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Droplet,
  Truck,
  Upload,
  Download,
  Star,
  Award,
  X,
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
} from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import { useHrStore } from "./_store";
import {
  HR_BRANCHES,
  HR_CITIES,
  DESIGNATIONS,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  DOC_TYPES,
  type Employee,
  type Designation,
  type Department,
  type EmploymentType,
} from "./_data";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  tenure,
  employeeStatusBadge,
  initials,
  FieldLabel,
  ADD_EMPLOYEE_STEPS,
  stars,
  ratingMeta,
  reviewStatusBadge,
} from "./_helpers";

export function Employees() {
  const employees = useHrStore((s) => s.employees);
  const addEmployee = useHrStore((s) => s.addEmployee);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;
  const noticeCount = employees.filter((e) => e.status === "Notice").length;
  const driverCount = employees.filter((e) => e.designation === "Driver").length;

  const columns: Column<Employee>[] = [
    {
      key: "empCode",
      header: "Employee",
      sortable: true,
      sortValue: (e) => e.empCode,
      render: (e) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground">
            {initials(e.name)}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">{e.name}</span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">{e.empCode}</span>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      sortValue: (e) => e.designation,
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] text-foreground">{e.designation}</span>
          <span className="text-[11px] text-muted-foreground">{e.department}</span>
        </div>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      sortable: true,
      sortValue: (e) => e.branch,
      hideOnMobile: true,
      render: (e) => <span className="text-[12px] text-foreground">{e.branch}</span>,
    },
    {
      key: "employmentType",
      header: "Type",
      sortable: true,
      sortValue: (e) => e.employmentType,
      hideOnMobile: true,
      render: (e) => <StatusBadge variant="muted">{e.employmentType}</StatusBadge>,
    },
    {
      key: "doj",
      header: "DOJ",
      sortable: true,
      sortValue: (e) => e.doj,
      hideOnMobile: true,
      render: (e) => (
        <div className="flex flex-col">
          <span className="text-[11.5px] tabular text-foreground">{formatDate(e.doj)}</span>
          <span className="text-[10.5px] tabular text-muted-foreground">{tenure(e.doj)}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (e) => e.status,
      render: (e) => {
        const { variant, pulse } = employeeStatusBadge(e.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {e.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "esiPf",
      header: "ESI/PF",
      sortable: false,
      hideOnMobile: true,
      align: "center",
      render: (e) => (
        <div className="flex items-center justify-center gap-1.5">
          <StatusBadge variant={e.esiEnrolled ? "solid" : "muted"}>ESI</StatusBadge>
          <StatusBadge variant={e.pfEnrolled ? "solid" : "muted"}>PF</StatusBadge>
        </div>
      ),
    },
    {
      key: "ctcAnnual",
      header: "CTC",
      sortable: true,
      sortValue: (e) => e.ctcAnnual,
      align: "right",
      hideOnMobile: true,
      render: (e) => (
        <span className="text-[12px] tabular font-medium text-foreground">
          {formatINRCompact(e.ctcAnnual)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Total Employees" value={String(employees.length)} icon={<User className="h-3.5 w-3.5" />} />
        <KpiMini label="Active" value={String(activeCount)} icon={<Check className="h-3.5 w-3.5" />} />
        <KpiMini label="On Leave / Notice" value={`${onLeaveCount} / ${noticeCount}`} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiMini label="Drivers" value={String(driverCount)} icon={<Truck className="h-3.5 w-3.5" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            Employees · {employees.length}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Drivers, helpers, mechanics, and office staff across all branches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => toast.info("Bulk Import", { description: "Drag a CSV with employee records to begin." })}>
            <span className="hidden sm:inline">Bulk Import</span>
          </Btn>
          <Btn variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast.success("Export started", { description: `${employees.length} employees · CSV download will begin shortly.` })}>
            <span className="hidden sm:inline">Export CSV</span>
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
            Add Employee
          </Btn>
        </div>
      </div>

      <DataTable
        data={employees}
        columns={columns}
        searchKeys={["empCode", "name", "phone", "email", "branch"]}
        searchPlaceholder="Search by code, name, phone…"
        filters={[
          {
            label: "Designation",
            options: ["All", ...DESIGNATIONS],
            accessor: (e) => e.designation,
          },
          {
            label: "Department",
            options: ["All", ...DEPARTMENTS],
            accessor: (e) => e.department,
          },
          {
            label: "Branch",
            options: ["All", ...HR_BRANCHES],
            accessor: (e) => e.branch,
          },
          {
            label: "Type",
            options: ["All", ...EMPLOYMENT_TYPES],
            accessor: (e) => e.employmentType,
          },
          {
            label: "Status",
            options: ["All", ...EMPLOYEE_STATUSES],
            accessor: (e) => e.status,
          },
        ]}
        onRowClick={(e) => setSelected(e)}
        rowActions={[
          { label: "View Profile", onClick: (e) => setSelected(e) },
          {
            label: "Mark On Leave",
            onClick: (e) => toast.success("Status updated", { description: `${e.name} → On Leave` }),
          },
          {
            label: "Send Message",
            onClick: (e) => toast.success("Message drafted", { description: `To ${e.phone}` }),
          },
          {
            label: "Issue Letter",
            onClick: (e) => toast.success("Letter drafted", { description: `${e.name} · experience letter` }),
          },
          {
            label: "Download CSV",
            onClick: (e) => toast.success("Row exported", { description: `${e.empCode} · ${e.name}` }),
          },
        ]}
        bulkActions={[
          {
            label: "Export Selected",
            onClick: (rows) => toast.success("Export started", { description: `${rows.length} employees selected` }),
          },
          {
            label: "Mark Active",
            onClick: (rows) => toast.success("Status updated", { description: `${rows.length} employees marked Active` }),
          },
          {
            label: "Send Notification",
            onClick: (rows) => toast.success("Notification queued", { description: `${rows.length} recipients` }),
          },
        ]}
        pageSize={20}
      />

      <EmployeeDetailDrawer
        employee={selected}
        onClose={() => setSelected(null)}
      />

      <AddEmployeeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onAdd={(e) => {
          addEmployee(e);
          setCreateOpen(false);
          toast.success("Employee added", { description: `${e.name} · ${e.empCode}` });
        }}
        nextCode={employees.length + 1}
      />
    </div>
  );
}

function KpiMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
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
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

// ============================================================
// Employee Detail Drawer
// ============================================================
function EmployeeDetailDrawer({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const summaries = useHrStore((s) => s.attendanceSummaries);
  const reviews = useHrStore((s) => s.performanceReviews);
  const leaveRequests = useHrStore((s) => s.leaveRequests);

  // Compute attendance summary for this employee (last 3 months)
  const empSummaries = employee
    ? summaries.filter((s) => s.empId === employee.id)
    : [];
  const totalPresent = empSummaries.reduce((s, m) => s + m.present, 0);
  const totalAbsent = empSummaries.reduce((s, m) => s + m.absent, 0);
  const totalLeave = empSummaries.reduce((s, m) => s + m.leave, 0);
  const totalOT = empSummaries.reduce((s, m) => s + m.otHours, 0);
  const totalLate = empSummaries.reduce((s, m) => s + m.lateCount, 0);
  const attendancePct = totalPresent + totalAbsent + totalLeave > 0
    ? Math.round((totalPresent / (totalPresent + totalAbsent + totalLeave)) * 100)
    : 0;

  // Performance reviews for this employee
  const empReviews = employee
    ? reviews.filter((r) => r.empId === employee.id)
    : [];

  // Recent leave requests for this employee
  const empLeaves = employee
    ? leaveRequests.filter((l) => l.empId === employee.id).slice(0, 5)
    : [];

  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {employee && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge variant="outline" className="font-mono">
                    {employee.empCode}
                  </StatusBadge>
                  <StatusBadge {...employeeStatusBadge(employee.status)}>
                    {employee.status}
                  </StatusBadge>
                  <StatusBadge variant="muted">{employee.employmentType}</StatusBadge>
                </div>
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">
                {employee.name}
              </SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {employee.designation} · {employee.department} · {employee.branch}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Contact details */}
              <div className="grid grid-cols-2 gap-2">
                <Tile icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={employee.phone} mono />
                <Tile icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={employee.email} />
                <Tile icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={employee.address} />
                <Tile icon={<Calendar className="h-3.5 w-3.5" />} label="DOJ / Tenure" value={`${formatDate(employee.doj)} · ${tenure(employee.doj)}`} />
                <Tile icon={<Calendar className="h-3.5 w-3.5" />} label="DOB" value={formatDate(employee.dob)} />
                <Tile icon={<Droplet className="h-3.5 w-3.5" />} label="Blood Group" value={employee.bloodGroup} />
                <Tile icon={<User className="h-3.5 w-3.5" />} label="Gender" value={employee.gender} />
                <Tile icon={<User className="h-3.5 w-3.5" />} label="Emergency" value={employee.emergencyContact} mono />
              </div>

              {/* Compensation */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatBox label="Annual CTC" value={formatINRCompact(employee.ctcAnnual)} />
                <StatBox label="Basic / mo" value={formatINR(employee.basicMonthly)} />
                <StatBox label="HRA / mo" value={formatINR(employee.hraMonthly)} />
              </div>

              {/* Attendance Summary - new */}
              <SectionCard
                title="Attendance Summary"
                description="Last 3 months aggregated"
                icon={<Calendar className="h-3.5 w-3.5" />}
                className="mt-3"
                bodyClassName="p-3"
              >
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="Present" value={String(totalPresent)} />
                  <StatBox label="Absent" value={String(totalAbsent)} />
                  <StatBox label="Leave" value={String(totalLeave)} />
                  <StatBox label="OT Hours" value={String(totalOT)} />
                  <StatBox label="Late Ins" value={String(totalLate)} />
                  <StatBox label="Attend. %" value={`${attendancePct}%`} />
                </div>
                {empSummaries.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Monthly Breakdown
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {empSummaries.slice(0, 3).map((m, i) => {
                        const total = m.present + m.absent + m.leave + m.halfDay;
                        const pct = total > 0 ? Math.round((m.present / total) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="w-20 shrink-0 text-muted-foreground tabular">M-{empSummaries.length - i}</span>
                            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-24 shrink-0 text-right tabular text-foreground">
                              {m.present}/{total} · {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Performance History - new */}
              <SectionCard
                title="Performance History"
                description={`${empReviews.length} review${empReviews.length === 1 ? "" : "s"} on file`}
                icon={<Star className="h-3.5 w-3.5" />}
                className="mt-3"
                bodyClassName="p-3"
              >
                {empReviews.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground">No reviews initiated yet.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {empReviews.map((r) => {
                      const meta = r.finalRating ? ratingMeta(r.finalRating) : null;
                      const sb = reviewStatusBadge(r.status);
                      return (
                        <div key={r.id} className="rounded-[5px] border border-border p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-medium text-foreground">{r.cycle}</span>
                              <span className="font-mono text-[10px] tabular text-muted-foreground">{r.period}</span>
                            </div>
                            <StatusBadge variant={sb.variant} pulse={sb.pulse}>{r.status}</StatusBadge>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                            {r.finalRating ? (
                              <>
                                <span className="tabular text-foreground">{stars(r.finalRating)}</span>
                                <span className="tabular text-muted-foreground">{r.finalRating}/5</span>
                                {meta && <span className="text-muted-foreground">· {meta.label}</span>}
                              </>
                            ) : (
                              <span className="text-muted-foreground">In progress · {r.kras.length} KRAs</span>
                            )}
                          </div>
                          {r.managerComments && (
                            <p className="mt-1.5 text-[11.5px] text-foreground line-clamp-2">
                              &ldquo;{r.managerComments}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Statutory */}
              <SectionCard
                title="Statutory & Bank"
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                className="mt-3"
                bodyClassName="p-3"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                  <InfoRow label="ESI Enrolled" value={employee.esiEnrolled ? "Yes" : "No"} />
                  {employee.esiNo && <InfoRow label="ESI No" value={employee.esiNo} mono />}
                  <InfoRow label="PF Enrolled" value={employee.pfEnrolled ? "Yes" : "No"} />
                  {employee.uan && <InfoRow label="UAN" value={employee.uan} mono />}
                  <InfoRow label="Aadhaar" value={employee.aadhaar} mono />
                  <InfoRow label="PAN" value={employee.pan} mono />
                  <InfoRow label="Bank" value={employee.bankName} />
                  <InfoRow label="Account" value={employee.bankAccount} mono />
                  <InfoRow label="IFSC" value={employee.bankIfsc} mono />
                  <InfoRow label="Reporting To" value={employee.reportingTo} />
                </div>
              </SectionCard>

              {/* Leave Balance */}
              <SectionCard
                title="Leave Balance"
                icon={<Calendar className="h-3.5 w-3.5" />}
                className="mt-3"
                bodyClassName="p-3"
              >
                <div className="grid grid-cols-4 gap-2">
                  <LeaveBox label="CL" value={employee.leaveBalance.cl} />
                  <LeaveBox label="SL" value={employee.leaveBalance.sl} />
                  <LeaveBox label="PL" value={employee.leaveBalance.pl} />
                  <LeaveBox label="ML" value={employee.leaveBalance.ml} />
                </div>
                {empLeaves.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Recent Leave Requests
                    </div>
                    <div className="flex flex-col gap-1">
                      {empLeaves.map((l) => {
                        const sb = leaveStatusBadgeLocal(l.status);
                        return (
                          <div key={l.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono tabular text-muted-foreground">{l.leaveType}</span>
                            <span className="flex-1 truncate text-foreground">{formatDate(l.from)} → {formatDate(l.to)} · {l.days}d</span>
                            <StatusBadge variant={sb.variant} pulse={sb.pulse}>{l.status}</StatusBadge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Documents */}
              <SectionCard
                title="Documents"
                description={`${employee.documents.length} on file`}
                icon={<FileText className="h-3.5 w-3.5" />}
                className="mt-3"
                bodyClassName="p-0"
              >
                <div className="divide-y divide-border">
                  {employee.documents.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <div className="text-[12.5px] font-medium text-foreground">{d.type}</div>
                        {d.refNo && (
                          <div className="font-mono text-[10.5px] tabular text-muted-foreground">
                            {d.refNo}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {d.expiry && (
                          <StatusBadge variant="muted">
                            {relativeTime(d.expiry)}
                          </StatusBadge>
                        )}
                        <StatusBadge variant={d.verified ? "solid" : "outline"}>
                          {d.verified ? "Verified" : "Pending"}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Skills + Performance snapshot */}
              {employee.skills && employee.skills.length > 0 && (
                <SectionCard
                  title="Skills & Compensation History"
                  icon={<Star className="h-3.5 w-3.5" />}
                  className="mt-3"
                  bodyClassName="p-3"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {employee.skills.map((s, i) => (
                      <StatusBadge key={i} variant="muted">{s}</StatusBadge>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <StatBox label="Last Rating" value={employee.lastRating ? `${employee.lastRating}/5` : "-"} />
                    <StatBox label="Last Increment" value={employee.lastIncrementPct ? `+${employee.lastIncrementPct}%` : "-"} />
                    <StatBox label="Increment On" value={employee.lastIncrementDate ? formatDate(employee.lastIncrementDate) : "-"} />
                  </div>
                </SectionCard>
              )}

              {/* Assets */}
              {employee.assetsAssigned && employee.assetsAssigned.length > 0 && (
                <SectionCard
                  title="Assets Assigned"
                  description={`${employee.assetsAssigned.length} item(s)`}
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  className="mt-3"
                  bodyClassName="p-0"
                >
                  <div className="divide-y divide-border">
                    {employee.assetsAssigned.map((a, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5">
                        <div>
                          <div className="text-[12.5px] font-medium text-foreground">{a.name}</div>
                          <div className="font-mono text-[10.5px] tabular text-muted-foreground">{a.refNo}</div>
                        </div>
                        <div className="text-[10.5px] tabular text-muted-foreground">
                          Issued {formatDate(a.issuedOn)}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Probation */}
              {employee.probationEndDate && (
                <div className="mt-3 rounded-[5px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Award className="h-3.5 w-3.5" />
                    <span className="font-medium">Probation Period Active</span>
                  </div>
                  <div className="mt-1">
                    Probation ends on <span className="tabular text-foreground">{formatDate(employee.probationEndDate)}</span>. Confirmation review due in {Math.max(0, Math.ceil((new Date(employee.probationEndDate).getTime() - Date.now()) / 86400000))} days.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Local leave status badge mapper (avoids circular dep with _helpers leaveStatusBadge signature mismatch)
function leaveStatusBadgeLocal(status: string): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  if (status === "Pending") return { variant: "outline", pulse: true };
  if (status === "Manager Approved") return { variant: "outline" };
  if (status === "Approved") return { variant: "solid" };
  return { variant: "muted" };
}

function Tile({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[5px] border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-muted/30 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[15px] font-medium tabular text-foreground">{value}</div>
    </div>
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

function LeaveBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[5px] border border-border p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[18px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

// ============================================================
// Add Employee - Multi-step dialog (Progressive Disclosure)
// ============================================================
function AddEmployeeDialog({
  open,
  onClose,
  onAdd,
  nextCode,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (e: Employee) => void;
  nextCode: number;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "Male" as "Male" | "Female",
    dob: "",
    bloodGroup: "O+",
    city: HR_CITIES[0],
    address: "",
    emergencyContact: "",
    designation: "Driver" as Designation,
    department: "Operations" as Department,
    branch: HR_BRANCHES[0],
    employmentType: "Permanent" as EmploymentType,
    doj: new Date().toISOString().slice(0, 10),
    ctcAnnual: "420000",
    reportingTo: "",
    esiEnrolled: true,
    pfEnrolled: true,
    aadhaar: "",
    pan: "",
    uan: "",
    esiNo: "",
    bankName: "HDFC Bank",
    bankAccount: "",
    bankIfsc: "HDFC0000",
    docsVerified: false,
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const stepErrors = useMemo(() => {
    const errors: Record<number, string[]> = {};
    const s1: string[] = [];
    if (!form.name.trim()) s1.push("Name required");
    if (!form.phone.trim()) s1.push("Phone required");
    if (s1.length) errors[1] = s1;
    const s2: string[] = [];
    if (!form.designation) s2.push("Designation required");
    if (!form.ctcAnnual || Number(form.ctcAnnual) < 100000) s2.push("CTC must be ≥ ₹1L");
    if (s2.length) errors[2] = s2;
    const s4: string[] = [];
    if (!form.bankAccount.trim()) s4.push("Bank account required");
    if (s4.length) errors[4] = s4;
    return errors;
  }, [form]);

  const canNext = stepErrors[step] === undefined;
  const totalErrors = Object.values(stepErrors).reduce((s, a) => s + a.length, 0);

  const submit = () => {
    if (totalErrors > 0) {
      toast.error("Form has errors", { description: "Fix highlighted fields." });
      return;
    }
    const ctc = Number(form.ctcAnnual);
    const emp: Employee = {
      id: `emp-${Date.now()}`,
      empCode: `GP${String(nextCode).padStart(4, "0")}`,
      name: form.name.trim(),
      designation: form.designation,
      department: form.department,
      branch: form.branch,
      employmentType: form.employmentType,
      status: "Active",
      doj: new Date(form.doj).toISOString(),
      phone: form.phone.trim(),
      email: form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, ".")}@reanzly.in`,
      city: form.city,
      gender: form.gender,
      dob: form.dob ? new Date(form.dob).toISOString() : new Date().toISOString(),
      bloodGroup: form.bloodGroup,
      address: form.address || "-",
      emergencyContact: form.emergencyContact || form.phone,
      esiEnrolled: form.esiEnrolled,
      pfEnrolled: form.pfEnrolled,
      uan: form.uan || undefined,
      esiNo: form.esiNo || undefined,
      aadhaar: form.aadhaar || "XXXX-XXXX-XXXX",
      pan: form.pan || "-",
      bankName: form.bankName,
      bankAccount: form.bankAccount,
      bankIfsc: form.bankIfsc,
      ctcAnnual: ctc,
      basicMonthly: Math.round((ctc * 0.4) / 12),
      hraMonthly: Math.round((ctc * 0.4 * 0.4) / 12),
      documents: [
        { type: "Aadhaar", verified: form.docsVerified, refNo: form.aadhaar || undefined },
        { type: "PAN", verified: form.docsVerified, refNo: form.pan || undefined },
        { type: "Photo", verified: form.docsVerified },
        ...(form.designation === "Driver"
          ? [
              { type: "Driving Licence" as const, verified: form.docsVerified, expiry: new Date(Date.now() + 365 * 86400000).toISOString() },
              { type: "Medical Fitness" as const, verified: form.docsVerified, expiry: new Date(Date.now() + 180 * 86400000).toISOString() },
            ]
          : []),
      ],
      leaveBalance: { cl: 12, sl: 12, pl: 15, ml: form.gender === "Female" ? 84 : 0 },
      reportingTo: form.reportingTo || "Kuldeep Singh (Branch Mgr)",
    };
    onAdd(emp);
    setStep(1);
    setForm({
      ...form,
      name: "",
      phone: "",
      email: "",
      address: "",
      aadhaar: "",
      pan: "",
      uan: "",
      esiNo: "",
      bankAccount: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium tracking-tight">
            Add New Employee
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            5-step onboarding · Step {step} of 5 · {totalErrors} field issue{totalErrors === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper - clickable */}
        <div className="flex items-center justify-between gap-1 px-1">
          {ADD_EMPLOYEE_STEPS.map((s, i) => {
            const isDone = step > s.id;
            const isActive = step === s.id;
            const hasErr = !!stepErrors[s.id];
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (s.id < step || canNext) setStep(s.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-[5px] px-2 py-1.5 text-[12px] font-medium transition-colors tap",
                    isActive
                      ? "bg-foreground text-background"
                      : isDone
                        ? "text-foreground hover:bg-accent"
                        : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] tabular",
                      isActive
                        ? "border-background bg-background text-foreground"
                        : isDone
                          ? "border-foreground bg-foreground text-background"
                          : hasErr
                            ? "border-foreground bg-background text-foreground"
                            : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="h-2.5 w-2.5" /> : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < ADD_EMPLOYEE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1",
                      step > s.id ? "bg-foreground" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldLabel required>Full Name</FieldLabel>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Rajesh Sharma" className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel required>Phone</FieldLabel>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98XXX XXXXX" className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@reanzly.in" className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <Select value={form.gender} onValueChange={(v) => update("gender", v as "Male" | "Female")}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>DOB</FieldLabel>
                <Input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel>Blood Group</FieldLabel>
                <Select value={form.bloodGroup} onValueChange={(v) => update("bloodGroup", v)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <Select value={form.city} onValueChange={(v) => update("city", v)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HR_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <FieldLabel>Address</FieldLabel>
                <Textarea value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Residential address" rows={2} className="text-[13px]" />
              </div>
              <div className="col-span-2">
                <FieldLabel>Emergency Contact</FieldLabel>
                <Input value={form.emergencyContact} onChange={(e) => update("emergencyContact", e.target.value)} placeholder="+91 98XXX XXXXX" className="h-8 text-[13px]" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Designation</FieldLabel>
                <Select value={form.designation} onValueChange={(v) => update("designation", v as Designation)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Department</FieldLabel>
                <Select value={form.department} onValueChange={(v) => update("department", v as Department)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Branch</FieldLabel>
                <Select value={form.branch} onValueChange={(v) => update("branch", v)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HR_BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Employment Type</FieldLabel>
                <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v as EmploymentType)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Date of Joining</FieldLabel>
                <Input type="date" value={form.doj} onChange={(e) => update("doj", e.target.value)} className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel required hint="₹/yr">Annual CTC</FieldLabel>
                <Input type="number" value={form.ctcAnnual} onChange={(e) => update("ctcAnnual", e.target.value)} placeholder="e.g. 420000" className="h-8 text-[13px]" />
              </div>
              <div className="col-span-2">
                <FieldLabel>Reporting To</FieldLabel>
                <Input value={form.reportingTo} onChange={(e) => update("reportingTo", e.target.value)} placeholder="e.g. Kuldeep Singh (Branch Mgr)" className="h-8 text-[13px]" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex items-center justify-between rounded-[5px] border border-border p-3">
                <div>
                  <div className="text-[13px] font-medium text-foreground">ESI Enrolled</div>
                  <div className="text-[11px] text-muted-foreground">Employee State Insurance (mandatory if CTC &lt; ₹7.5L)</div>
                </div>
                <Switch checked={form.esiEnrolled} onCheckedChange={(v) => update("esiEnrolled", v)} />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded-[5px] border border-border p-3">
                <div>
                  <div className="text-[13px] font-medium text-foreground">PF Enrolled</div>
                  <div className="text-[11px] text-muted-foreground">Provident Fund (12% employee + 12% employer)</div>
                </div>
                <Switch checked={form.pfEnrolled} onCheckedChange={(v) => update("pfEnrolled", v)} />
              </div>
              <div>
                <FieldLabel>Aadhaar Number</FieldLabel>
                <Input value={form.aadhaar} onChange={(e) => update("aadhaar", e.target.value)} placeholder="XXXX-XXXX-XXXX" className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel>PAN</FieldLabel>
                <Input value={form.pan} onChange={(e) => update("pan", e.target.value)} placeholder="ABCDE1234F" className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel hint="if PF enrolled">UAN</FieldLabel>
                <Input value={form.uan} onChange={(e) => update("uan", e.target.value)} placeholder="10XXXXXXXX" className="h-8 text-[13px]" />
              </div>
              <div>
                <FieldLabel hint="if ESI enrolled">ESI No</FieldLabel>
                <Input value={form.esiNo} onChange={(e) => update("esiNo", e.target.value)} placeholder="ESI/XXXXXXXX" className="h-8 text-[13px]" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldLabel>Bank Name</FieldLabel>
                <Select value={form.bankName} onValueChange={(v) => update("bankName", v)}>
                  <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Punjab National Bank", "Bank of Baroda"].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <FieldLabel required>Account Number</FieldLabel>
                <Input value={form.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} placeholder="XXXXXXXXXX" className="h-8 text-[13px]" />
              </div>
              <div className="col-span-2">
                <FieldLabel>IFSC Code</FieldLabel>
                <Input value={form.bankIfsc} onChange={(e) => update("bankIfsc", e.target.value)} placeholder="HDFC0000XXX" className="h-8 text-[13px]" />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-3">
              <div className="rounded-[5px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
                Document collection will be tracked post-onboarding. Driver roles require DL + Medical + Police Verification.
              </div>
              <div className="flex items-center justify-between rounded-[5px] border border-border p-3">
                <div>
                  <div className="text-[13px] font-medium text-foreground">Mark collected documents as verified</div>
                  <div className="text-[11px] text-muted-foreground">Toggle on if physical copies verified</div>
                </div>
                <Switch checked={form.docsVerified} onCheckedChange={(v) => update("docsVerified", v)} />
              </div>
              <div className="rounded-[5px] border border-border p-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Onboarding Summary
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                  <InfoRow label="Name" value={form.name || "-"} />
                  <InfoRow label="Phone" value={form.phone || "-"} />
                  <InfoRow label="Designation" value={form.designation} />
                  <InfoRow label="Branch" value={form.branch} />
                  <InfoRow label="Type" value={form.employmentType} />
                  <InfoRow label="CTC" value={form.ctcAnnual ? `₹${Number(form.ctcAnnual).toLocaleString("en-IN")}` : "-"} />
                  <InfoRow label="ESI" value={form.esiEnrolled ? "Yes" : "No"} />
                  <InfoRow label="PF" value={form.pfEnrolled ? "Yes" : "No"} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          {step > 1 && (
            <Btn variant="outline" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Back
            </Btn>
          )}
          {step < 5 ? (
            <Btn
              variant="primary"
              iconRight={<ChevronRight className="h-3.5 w-3.5" />}
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(5, s + 1))}
            >
              Continue
            </Btn>
          ) : (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={submit}>
              Save Employee
            </Btn>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

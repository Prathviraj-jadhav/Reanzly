"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Star,
  Eye,
  Send,
  CheckCircle2,
  Ban,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/toolbar";
import { useSuperadminStore } from "./_store";
import {
  INTERNAL_ROLES,
  DEPARTMENTS,
  internalRoleById,
  departmentById,
  type InternalStaff,
  type InternalRoleId,
  type DepartmentId,
  type AdminSubView,
} from "./_data";
import { userStatusVariant, relativeTime, formatDate } from "./_helpers";

/* ============================================================
   InternalTeamView - Reanzly internal staff + RBAC matrix.
   ------------------------------------------------------------
   Layout: KPI strip (4 tiles) -> split main.
     • left  - staff list (DataTable) with row actions +
               "Invite staff" dialog
     • right - role permission matrix (RBAC grid) sticky

   Read-only mode: when `canAccess("internal-team") === "read"`,
   the invite button is hidden and role/status/delete actions
   are disabled.

   Strict monochrome Swiss design system. 6px radius max,
   hairline borders, tabular nums, no emojis, no emdashes.
   ============================================================ */

// 12 AdminSubView ids -> short header labels for the matrix columns.
const SUB_VIEW_COLUMNS: { id: AdminSubView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "organizations", label: "Orgs" },
  { id: "users", label: "Users" },
  { id: "billing", label: "Billing" },
  { id: "tickets", label: "Tickets" },
  { id: "broadcasts", label: "Broadcasts" },
  { id: "automations", label: "Auto" },
  { id: "sync", label: "Sync" },
  { id: "backups", label: "Backups" },
  { id: "internal-team", label: "Team" },
  { id: "audit", label: "Audit" },
  { id: "settings", label: "Settings" },
];

export function InternalTeamView() {
  const staff = useSuperadminStore((s) => s.internalStaff);
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const canAccess = useSuperadminStore((s) => s.canAccess);
  const readOnly = canAccess("internal-team") === "read";

  const kpis = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === "Active").length;
    const invited = staff.filter((s) => s.status === "Invited").length;
    const suspended = staff.filter((s) => s.status === "Suspended").length;
    return { total, active, invited, suspended };
  }, [staff]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip - 4 tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={<UsersIcon className="h-3.5 w-3.5" />} label="Total staff" value={kpis.total} hint={`${INTERNAL_ROLES.length} roles defined`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Active" value={kpis.active} hint={`${kpis.total > 0 ? Math.round((kpis.active / kpis.total) * 100) : 0}% of headcount`} />
        <KpiTile icon={<Send className="h-3.5 w-3.5" />} label="Invited" value={kpis.invited} hint="pending acceptance" />
        <KpiTile icon={<Ban className="h-3.5 w-3.5" />} label="Suspended" value={kpis.suspended} hint={kpis.suspended === 0 ? "none" : "needs review"} alert={kpis.suspended > 0} />
      </div>

      {/* Main split: staff list (left) + RBAC matrix (right) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_440px]">
        <StaffListSection staff={staff} currentStaffId={currentStaff?.id} readOnly={readOnly} />
        <RolePermissionMatrix />
      </div>
    </div>
  );
}

/* ── Small presentational primitives ─────────────────────── */
function KpiTile({ icon, label, value, hint, alert }: { icon: React.ReactNode; label: string; value: number; hint?: string; alert?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={alert ? "text-foreground" : "text-muted-foreground"}>{icon}</span>
      </div>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function DeptChip({ id }: { id: DepartmentId }) {
  const d = departmentById(id);
  if (!d) return null;
  return (
    <span className="inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0 text-[10px] font-medium text-foreground leading-[14px]">
      {d.label}
    </span>
  );
}

/* ============================================================
   StaffListSection - DataTable with row actions.
   ============================================================ */
function StaffListSection({ staff, currentStaffId, readOnly }: { staff: InternalStaff[]; currentStaffId?: string; readOnly: boolean }) {
  const setStaffStatus = useSuperadminStore((s) => s.setStaffStatus);
  const setStaffRole = useSuperadminStore((s) => s.setStaffRole);
  const deleteStaff = useSuperadminStore((s) => s.deleteStaff);

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<InternalStaff | null>(null);
  const [roleStaff, setRoleStaff] = useState<InternalStaff | null>(null);
  const [deleteRow, setDeleteRow] = useState<InternalStaff | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase().trim();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.roleId.toLowerCase().includes(q),
    );
  }, [staff, search]);

  const columns: Column<InternalStaff>[] = [
    {
      key: "name", header: "Staff", sortable: true, sticky: true, sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-foreground truncate max-w-[180px]">{r.name}</span>
            {r.id === currentStaffId && (
              <span className="rounded-[3px] border border-foreground bg-foreground px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-background leading-[12px]">You</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground tabular truncate max-w-[200px]">{r.email}</span>
        </div>
      ),
    },
    {
      key: "role", header: "Role", sortable: true, width: "150px", sortValue: (r) => r.roleId,
      render: (r) => {
        const role = internalRoleById(r.roleId);
        if (!role) return <span className="text-[11px] text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <StatusBadge variant={r.roleId === "superadmin" || r.roleId === "security-officer" ? "solid" : "outline"}>{role.label}</StatusBadge>
            {role.canApproveHighImpact && <Star className="h-3 w-3 text-foreground" fill="currentColor" />}
          </div>
        );
      },
    },
    {
      key: "departments", header: "Departments", width: "180px", hideOnMobile: true,
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {r.departments.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">-</span>
          ) : (
            <>
              {r.departments.slice(0, 3).map((d) => <DeptChip key={d} id={d} />)}
              {r.departments.length > 3 && (
                <span className="text-[10px] text-muted-foreground tabular self-center">+{r.departments.length - 3}</span>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, width: "110px", sortValue: (r) => r.status,
      render: (r) => { const v = userStatusVariant(r.status); return <StatusBadge variant={v.variant} pulse={v.pulse}>{r.status}</StatusBadge>; },
    },
    {
      key: "twoFactor", header: "2FA", sortable: true, width: "60px", align: "center", hideOnMobile: true,
      sortValue: (r) => (r.twoFactor ? "1" : "0"),
      render: (r) => r.twoFactor ? <ShieldCheck className="h-3.5 w-3.5 text-foreground inline" /> : <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground inline" />,
    },
    {
      key: "lastActive", header: "Last active", sortable: true, width: "120px", hideOnMobile: true, sortValue: (r) => r.lastActive ?? "",
      render: (r) => <span className="text-[11px] text-muted-foreground tabular">{r.lastActive ? relativeTime(r.lastActive) : "-"}</span>,
    },
    {
      key: "invitedAt", header: "Invited", sortable: true, width: "110px", hideOnMobile: true, sortValue: (r) => r.invitedAt,
      render: (r) => <span className="text-[11px] text-muted-foreground tabular">{formatDate(r.invitedAt)}</span>,
    },
  ];

  const rowActions = readOnly
    ? [{ label: "View profile", onClick: (s: InternalStaff) => setViewStaff(s) }]
    : [
        { label: "View profile", onClick: (s: InternalStaff) => setViewStaff(s) },
        {
          label: "Activate",
          onClick: (s: InternalStaff) => {
            if (s.status !== "Active") { setStaffStatus(s.id, "Active"); toast.success("Staff activated", { description: s.email }); }
          },
        },
        {
          label: "Suspend", destructive: true,
          onClick: (s: InternalStaff) => {
            if (s.status !== "Suspended") { setStaffStatus(s.id, "Suspended"); toast.success("Staff suspended", { description: s.email }); }
          },
        },
        { label: "Change role", onClick: (s: InternalStaff) => setRoleStaff(s) },
        { label: "Delete", onClick: (s: InternalStaff) => setDeleteRow(s), destructive: true },
      ];

  return (
    <section className="flex flex-col gap-2 rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <UsersIcon className="h-3.5 w-3.5 text-foreground" />
          <h3 className="text-[13px] font-medium text-foreground">Internal staff</h3>
          <span className="text-[11px] text-muted-foreground tabular">· {filtered.length} shown</span>
        </div>
        <div className="flex-1" />
        <SearchInput value={search} onChange={setSearch} placeholder="Search staff - name, email, role…" className="max-w-[240px]" />
        {!readOnly && (
          <Btn variant="primary" size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(true)}>
            Invite staff
          </Btn>
        )}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowActions={rowActions}
        emptyTitle="No staff found"
        emptyDescription={readOnly ? "Adjust your search to see staff." : "Invite your first internal staff member."}
        emptyAction={
          readOnly ? undefined : (
            <Btn variant="primary" size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(true)}>
              Invite staff
            </Btn>
          )
        }
        initialSort={{ key: "name", dir: "asc" }}
        pageSize={25}
        stickyFirstColumn
      />

      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{filtered.length} of {staff.length} staff · {staff.filter((s) => s.status === "Active").length} active</span>
        <span className="text-[11px] text-muted-foreground tabular">2FA: {staff.filter((s) => s.twoFactor).length}/{staff.length}</span>
      </div>

      {/* Dialogs */}
      <StaffFormDialog mode="invite" open={inviteOpen} onClose={() => setInviteOpen(false)} />
      {viewStaff && (
        <ViewStaffDialog staff={viewStaff} isYou={viewStaff.id === currentStaffId} onClose={() => setViewStaff(null)} />
      )}
      {roleStaff && (
        <StaffFormDialog
          mode="change-role"
          staff={roleStaff}
          open
          onClose={() => setRoleStaff(null)}
          onSubmit={(roleId, departments) => {
            setStaffRole(roleStaff.id, roleId, departments);
            toast.success("Role updated", {
              description: `${roleStaff.email} -> ${internalRoleById(roleId)?.label ?? roleId}`,
            });
          }}
        />
      )}
      {deleteRow && (
        <AlertDialog open onOpenChange={(o) => !o && setDeleteRow(null)}>
          <AlertDialogContent className="rounded-[6px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[15px]">Remove staff member?</AlertDialogTitle>
              <AlertDialogDescription className="text-[12px]">
                {deleteRow.name} ({deleteRow.email}) will lose all access immediately. This action is logged in the audit trail and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  deleteStaff(deleteRow.id);
                  toast.success("Staff removed", { description: deleteRow.email });
                  setDeleteRow(null);
                }}
              >
                Remove staff
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}

/* ============================================================
   ViewStaffDialog - read-only staff details.
   ============================================================ */
function ViewStaffDialog({ staff, isYou, onClose }: { staff: InternalStaff; isYou: boolean; onClose: () => void }) {
  const role = internalRoleById(staff.roleId);
  const perms = role ? Object.values(role.permissions) : [];
  const writeCount = perms.filter((v) => v === "write").length;
  const readCount = perms.filter((v) => v === "read").length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[480px] p-0 gap-0 rounded-[6px]">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-[15px] flex items-center gap-2">
            <Eye className="h-4 w-4" /> Staff profile
            {isYou && <span className="rounded-[3px] border border-foreground bg-foreground px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-background">You</span>}
          </DialogTitle>
          <DialogDescription className="text-[12px]">Internal team member details and access summary.</DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Name" value={staff.name} />
            <Detail label="Status" value={<StatusBadge variant={userStatusVariant(staff.status).variant}>{staff.status}</StatusBadge>} />
            <Detail label="Email" value={staff.email} mono />
            <Detail label="Phone" value={staff.phone || "-"} mono />
            <Detail label="Role" value={(
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-foreground">{role?.label ?? staff.roleId}</span>
                {role?.canApproveHighImpact && <Star className="h-3 w-3 text-foreground" fill="currentColor" />}
              </div>
            )} />
            <Detail label="2FA" value={staff.twoFactor ? "Enabled" : "Disabled"} />
            <Detail label="Last active" value={staff.lastActive ? relativeTime(staff.lastActive) : "-"} mono />
            <Detail label="Invited" value={formatDate(staff.invitedAt)} mono />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Departments</div>
            <div className="flex flex-wrap gap-1">
              {staff.departments.length === 0
                ? <span className="text-[11px] text-muted-foreground">None assigned</span>
                : staff.departments.map((d) => <DeptChip key={d} id={d} />)}
            </div>
          </div>

          {staff.portfolioOrgIds && staff.portfolioOrgIds.length > 0 && (
            <div className="text-[12px] text-foreground">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio</span>
              <span className="ml-2 tabular">{staff.portfolioOrgIds.length} org(s) assigned</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-[5px] border border-border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Write access</div>
              <div className="text-[15px] tabular font-medium text-foreground">{writeCount} views</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Read access</div>
              <div className="text-[15px] tabular font-medium text-foreground">{readCount} views</div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border">
          <Btn variant="outline" onClick={onClose}>Close</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}

/* ============================================================
   StaffFormDialog - shared by Invite + Change role flows.
   ------------------------------------------------------------
   mode = "invite"        - collects name/email/phone/role/depts/portfolio
   mode = "change-role"   - only role/depts/portfolio (staff already exists)
   On submit, calls onSubmit(roleId, departments, portfolioOrgIds?).
   ============================================================ */
function StaffFormDialog({
  mode, staff, open, onClose, onSubmit,
}: {
  mode: "invite" | "change-role";
  staff?: InternalStaff;
  open: boolean;
  onClose: () => void;
  onSubmit?: (roleId: InternalRoleId, departments: DepartmentId[], portfolioOrgIds?: string[]) => void;
}) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const inviteStaff = useSuperadminStore((s) => s.inviteStaff);

  const isInvite = mode === "invite";
  const initialRole: InternalRoleId = staff?.roleId ?? "support-agent";
  const initialDepts: Set<DepartmentId> = new Set(staff?.departments ?? internalRoleById(initialRole)?.departments ?? []);
  const initialOrgs: Set<string> = new Set(staff?.portfolioOrgIds ?? []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState<InternalRoleId>(initialRole);
  const [departments, setDepartments] = useState<Set<DepartmentId>>(initialDepts);
  const [portfolioOrgIds, setPortfolioOrgIds] = useState<Set<string>>(initialOrgs);
  const [submitting, setSubmitting] = useState(false);

  const role = internalRoleById(roleId);
  const isAccountManager = roleId === "account-manager";

  const onRoleChange = (next: InternalRoleId) => {
    setRoleId(next);
    const r = internalRoleById(next);
    if (r) setDepartments(new Set(r.departments));
  };

  const toggle = <T,>(set: Set<T>, setFn: (s: Set<T>) => void, val: T) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const handleSubmit = () => {
    if (isInvite) {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        toast("Missing fields", { description: "Name, email and phone are required" });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast("Invalid email", { description: "Enter a valid email address" });
        return;
      }
      setSubmitting(true);
      setTimeout(() => {
        const id = inviteStaff({
          name: name.trim(), email: email.trim(), phone: phone.trim(), roleId,
          departments: Array.from(departments),
          portfolioOrgIds: isAccountManager ? Array.from(portfolioOrgIds) : undefined,
        });
        setSubmitting(false);
        toast.success("Invite sent", { description: `${email} -> ${role?.label ?? roleId} (id ${id})` });
        setName(""); setEmail(""); setPhone("");
        onClose();
      }, 350);
    } else {
      onSubmit?.(roleId, Array.from(departments), isAccountManager ? Array.from(portfolioOrgIds) : undefined);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[560px] p-0 gap-0 rounded-[6px] flex flex-col max-h-[92vh]">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-[15px] flex items-center gap-2">
            {isInvite ? <UserPlus className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {isInvite ? "Invite staff" : `Change role - ${staff?.name ?? ""}`}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {isInvite
              ? "Send an invite to a new Reanzly internal team member. They will receive a signup link valid for 7 days."
              : "Pick a new role and adjust departments. Department defaults come from the role definition."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
          {isInvite && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 text-[12px] font-medium text-foreground">Name <span className="text-foreground">*</span></Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sachin Kulkarni" className="h-9 rounded-[5px]" />
                </div>
                <div>
                  <Label className="mb-1 text-[12px] font-medium text-foreground">Phone <span className="text-foreground">*</span></Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98220 14582" className="h-9 rounded-[5px] tabular" />
                </div>
              </div>
              <div>
                <Label className="mb-1 text-[12px] font-medium text-foreground">Email <span className="text-foreground">*</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sachin.k@reanzly.com" className="h-9 rounded-[5px]" />
              </div>
            </>
          )}

          {/* Role radio chips */}
          <div>
            <Label className="mb-1.5 text-[12px] font-medium text-foreground">Role</Label>
            <RadioGroup value={roleId} onValueChange={(v) => onRoleChange(v as InternalRoleId)} className="grid grid-cols-2 gap-1.5">
              {INTERNAL_ROLES.map((r) => (
                <label key={r.id} className={cn(
                  "flex items-center gap-2 rounded-[5px] border px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors tap",
                  roleId === r.id ? "border-foreground bg-foreground/5 text-foreground" : "border-border bg-background text-foreground hover:bg-accent",
                )}>
                  <RadioGroupItem value={r.id} id={`role-${mode}-${r.id}`} className="h-3.5 w-3.5" />
                  <span className="truncate">{r.label}</span>
                  {r.canApproveHighImpact && <Star className="h-3 w-3 ml-auto text-foreground" fill="currentColor" />}
                </label>
              ))}
            </RadioGroup>
            {role && <p className="text-[11px] text-muted-foreground mt-1.5">{role.summary}</p>}
          </div>

          {/* Department checkboxes */}
          <div>
            <Label className="mb-1.5 text-[12px] font-medium text-foreground">Departments</Label>
            <div className="grid grid-cols-2 gap-1.5 rounded-[5px] border border-border p-2">
              {DEPARTMENTS.map((d) => (
                <label key={d.id} className="flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-[12px] text-foreground cursor-pointer hover:bg-accent transition-colors">
                  <Checkbox checked={departments.has(d.id)} onCheckedChange={() => toggle(departments, setDepartments, d.id)} className="h-3.5 w-3.5" />
                  <span className="truncate">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Portfolio orgs - only for account-manager */}
          {isAccountManager && (
            <div>
              <Label className="mb-1.5 text-[12px] font-medium text-foreground">Portfolio orgs <span className="text-muted-foreground font-normal">(account manager)</span></Label>
              <div className="grid grid-cols-1 gap-1 max-h-[180px] overflow-y-auto scrollbar-thin rounded-[5px] border border-border p-1.5">
                {orgs.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-[12px] text-foreground cursor-pointer hover:bg-accent transition-colors">
                    <Checkbox checked={portfolioOrgIds.has(o.id)} onCheckedChange={() => toggle(portfolioOrgIds, setPortfolioOrgIds, o.id)} className="h-3.5 w-3.5" />
                    <span className="truncate">{o.brandName}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular shrink-0">{o.id}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{portfolioOrgIds.size} org(s) selected</p>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border flex-row justify-between">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={isInvite ? <Send className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />} loading={submitting} onClick={handleSubmit}>
            {isInvite ? "Send invite" : "Save role"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   RolePermissionMatrix - RBAC grid (8 roles x 12 sub-views).
   Cells: W = write (solid), R = read (outlined), blank = none.
   Sticky first column + sticky header row. Each role row is
   followed by a departments row showing department chips.
   ============================================================ */
function RolePermissionMatrix() {
  const internalStaff = useSuperadminStore((s) => s.internalStaff);
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const switchRole = useSuperadminStore((s) => s.switchRole);

  // Count active staff per role for the matrix header column.
  const staffByRole = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of internalStaff) {
      map[s.roleId] = (map[s.roleId] ?? 0) + 1;
    }
    return map;
  }, [internalStaff]);

  return (
    <section className="flex flex-col rounded-[6px] border border-border bg-card overflow-hidden xl:sticky xl:top-2 xl:self-start">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
          <h3 className="text-[13px] font-medium text-foreground">Role permission matrix</h3>
        </div>
        <span className="text-[10px] text-muted-foreground tabular">{INTERNAL_ROLES.length} roles · {SUB_VIEW_COLUMNS.length} views</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        <LegendChip cls="bg-foreground text-background" label="W" text="write" />
        <LegendChip cls="border border-border bg-background text-foreground" label="R" text="read-only" />
        <LegendChip cls="bg-muted text-muted-foreground" label="·" text="no access" />
        <div className="ml-auto flex items-center gap-1">
          <Star className="h-3 w-3 text-foreground" fill="currentColor" />
          can approve high-impact
        </div>
      </div>

      {/* Switch hint */}
      <div className="border-b border-border bg-muted/20 px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Click <span className="font-medium text-foreground">Switch</span> on any role row to
          preview the panel from that role. Your name and audit trail stay the same.
        </p>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-thin max-h-[560px] overflow-y-auto">
        <table className="border-collapse text-[11px] min-w-[640px] w-full">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-card border-b border-r border-border px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[140px]">Role</th>
              {SUB_VIEW_COLUMNS.map((c) => (
                <th key={c.id} className="border-b border-border px-0 py-1.5 text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground min-w-[36px]" title={c.label}>
                  <span className="block max-w-[40px] mx-auto truncate">{c.label}</span>
                </th>
              ))}
              <th className="border-b border-l border-border px-2 py-1.5 text-right text-[9px] font-medium uppercase tracking-wider text-muted-foreground min-w-[96px]">Staff · Switch</th>
            </tr>
          </thead>
          <tbody>
            {INTERNAL_ROLES.map((r) => (
              <RoleMatrixRows
                key={r.id}
                role={r}
                staffCount={staffByRole[r.id] ?? 0}
                isCurrent={currentStaff?.roleId === r.id}
                onSwitch={() => switchRole(r.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LegendChip({ cls, label, text }: { cls: string; label: string; text: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-medium", cls)}>{label}</span>
      {text}
    </div>
  );
}

function RoleMatrixRows({
  role,
  staffCount,
  isCurrent,
  onSwitch,
}: {
  role: (typeof INTERNAL_ROLES)[number];
  staffCount: number;
  isCurrent: boolean;
  onSwitch: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-accent/20">
        <td className="sticky left-0 z-10 bg-card border-r border-border px-2 py-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-medium text-foreground truncate max-w-[110px]">{role.label}</span>
            {role.canApproveHighImpact && <Star className="h-3 w-3 text-foreground shrink-0" fill="currentColor" />}
            {isCurrent && (
              <span className="rounded-[2px] bg-foreground px-1 py-0 text-[8px] font-medium uppercase tracking-wider text-background leading-[10px]">
                You
              </span>
            )}
          </div>
        </td>
        {SUB_VIEW_COLUMNS.map((c) => {
          const level = role.permissions[c.id] ?? "none";
          return (
            <td key={c.id} className="px-0 py-1 text-center">
              <div
                className={cn(
                  "mx-auto inline-flex h-[28px] w-[28px] items-center justify-center rounded-[3px] text-[10px] font-medium uppercase",
                  level === "write" && "bg-foreground text-background",
                  level === "read" && "border border-foreground/60 bg-background text-foreground",
                  level === "none" && "bg-muted text-muted-foreground",
                )}
                title={`${role.label} · ${c.label}: ${level}`}
              >
                {level === "write" ? "W" : level === "read" ? "R" : ""}
              </div>
            </td>
          );
        })}
        <td className="border-l border-border px-2 py-1">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] text-muted-foreground tabular">{staffCount}</span>
            {isCurrent ? (
              <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Current
              </span>
            ) : (
              <button
                type="button"
                onClick={onSwitch}
                className="tap rounded-[3px] border border-foreground/40 bg-foreground/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                Switch
              </button>
            )}
          </div>
        </td>
      </tr>
      <tr className="hover:bg-accent/20">
        <td className="sticky left-0 z-10 bg-card border-r border-border px-2 py-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Departments</span>
        </td>
        <td colSpan={SUB_VIEW_COLUMNS.length} className="px-2 py-1">
          <div className="flex flex-wrap gap-1">
            {role.departments.length === 0
              ? <span className="text-[10px] text-muted-foreground">none</span>
              : role.departments.map((d) => <DeptChip key={d} id={d} />)}
          </div>
        </td>
        <td className="border-l border-border px-2 py-1">
          <span className="text-[9px] text-muted-foreground tabular">
            {Object.values(role.permissions).filter((v) => v === "write").length}w · {Object.values(role.permissions).filter((v) => v === "read").length}r
          </span>
        </td>
      </tr>
    </>
  );
}

export default InternalTeamView;

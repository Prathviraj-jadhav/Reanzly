"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  ChevronDown,
  Download,
  UserPlus,
  Send,
  Ban,
  CheckCircle2,
  Trash2,
  Grid3x3,
  List,
  ShieldCheck,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { SearchInput, BtnGroup, BtnGroupItem } from "@/components/shared/toolbar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useSuperadminStore } from "./_store";
import { MODULES, ROLES, type User, type Org, type ModuleAccessLevel } from "./_data";
import { relativeTime, userStatusVariant, accessLevelVariant } from "./_helpers";

/* ============================================================
   UsersView - cross-tenant users list + invite dialog +
   permission matrix view for a selected org.

   Two display modes (Jakob's Law: familiar admin patterns):
     • list   - DataTable of all users across tenants
     • matrix - grid of users × modules with read/write/none
   ============================================================ */
export function UsersView() {
  const users = useSuperadminStore((s) => s.users);
  const orgs = useSuperadminStore((s) => s.orgs);
  const hasHydrated = useSuperadminStore((s) => s.hasHydrated);
  const suspendUser = useSuperadminStore((s) => s.suspendUser);
  const activateUser = useSuperadminStore((s) => s.activateUser);
  const resendInvite = useSuperadminStore((s) => s.resendInvite);
  const deleteUser = useSuperadminStore((s) => s.deleteUser);

  const [mode, setMode] = useState<"list" | "matrix">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [matrixOrgId, setMatrixOrgId] = useState<string>(orgs[0]?.id ?? "");
  const [inviteOpen, setInviteOpen] = useState(false);

  // KPIs (Miller's Law: max 5)
  const kpis = useMemo(() => {
    const active = users.filter((u) => u.status === "Active").length;
    const invited = users.filter((u) => u.status === "Invited").length;
    const suspended = users.filter((u) => u.status === "Suspended").length;
    const twofa = users.filter((u) => u.twoFactor).length;
    return { total: users.length, active, invited, suspended, twofa };
  }, [users]);

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.brandName ?? "-";

  // Filter for list view
  const filtered = useMemo(() => {
    let result = users.filter((u) => u.orgId !== "internal");
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) result = result.filter((u) => statusFilter.has(u.status));
    if (orgFilter) result = result.filter((u) => u.orgId === orgFilter);
    return result;
  }, [users, search, statusFilter, orgFilter]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-medium text-foreground truncate max-w-[200px]">{r.name}</span>
          <span className="text-[11px] text-muted-foreground tabular truncate max-w-[200px]">{r.email}</span>
          <span className="text-[10px] text-muted-foreground tabular">{r.phone}</span>
        </div>
      ),
    },
    {
      key: "org",
      header: "Organization",
      sortable: true,
      sortValue: (r) => orgName(r.orgId),
      render: (r) => (
        <span className="text-[12px] text-foreground truncate max-w-[180px] block">
          {orgName(r.orgId)}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.role,
      render: (r) => (
        <StatusBadge variant={r.role === "Owner" || r.role === "Org Admin" ? "solid" : "outline"}>
          {r.role}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const v = userStatusVariant(r.status);
        return <StatusBadge variant={v.variant} pulse={v.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "lastActive",
      header: "Last active",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.lastActive ?? "",
      render: (r) => (
        <span className="text-[11px] text-muted-foreground tabular">
          {r.lastActive ? relativeTime(r.lastActive) : "-"}
        </span>
      ),
    },
    {
      key: "twoFactor",
      header: "2FA",
      sortable: true,
      width: "70px",
      align: "center",
      hideOnMobile: true,
      sortValue: (r) => (r.twoFactor ? "1" : "0"),
      render: (r) => (
        <span className={cn("text-[11px] tabular", r.twoFactor ? "text-foreground" : "text-muted-foreground")}>
          {r.twoFactor ? "On" : "Off"}
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Resend invite",
      onClick: (u: User) => {
        if (u.status === "Invited") {
          resendInvite(u.id);
          toast.success("Invite resent", { description: u.email });
        } else {
          toast("Nothing to resend", { description: `Status is ${u.status}` });
        }
      },
    },
    {
      label: "Activate",
      onClick: (u: User) => {
        if (u.status !== "Active") {
          activateUser(u.id);
          toast.success("User activated", { description: u.email });
        }
      },
    },
    {
      label: "Suspend",
      onClick: (u: User) => {
        if (u.status !== "Suspended") {
          suspendUser(u.id);
          toast.success("User suspended", { description: u.email });
        }
      },
      destructive: true,
    },
    {
      label: "Delete",
      onClick: (u: User) => {
        deleteUser(u.id);
        toast.success("User deleted", { description: u.email });
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Suspend",
      onClick: (rows: User[]) => {
        rows.forEach((r) => suspendUser(r.id));
        toast.success(`${rows.length} user${rows.length === 1 ? "" : "s"} suspended`);
      },
    },
    {
      label: "Resend invite",
      onClick: (rows: User[]) => {
        const c = rows.filter((r) => r.status === "Invited").length;
        rows.forEach((r) => r.status === "Invited" && resendInvite(r.id));
        toast.success(`${c} invite${c === 1 ? "" : "s"} resent`);
      },
    },
    {
      label: "Export",
      onClick: (rows: User[]) =>
        toast(`${rows.length} user${rows.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
  ];

  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const orgLabel = orgFilter ? orgName(orgFilter) : "All orgs";

  // Matrix view data
  const matrixOrg = orgs.find((o) => o.id === matrixOrgId);
  const matrixUsers = users.filter((u) => u.orgId === matrixOrgId);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Users" value={kpis.total} icon={<UserPlus className="h-4 w-4" />} delta={`${kpis.active} active`} trend="up" />
        <KpiCard label="Active" value={kpis.active} icon={<CheckCircle2 className="h-4 w-4" />} trend="up" />
        <KpiCard label="Invited" value={kpis.invited} icon={<Send className="h-4 w-4" />} delta="pending acceptance" trend="flat" />
        <KpiCard label="Suspended" value={kpis.suspended} icon={<Ban className="h-4 w-4" />} trend="down" invertDelta />
        <KpiCard label="2FA Enabled" value={kpis.twofa} icon={<ShieldCheck className="h-4 w-4" />} delta={`${kpis.total > 0 ? ((kpis.twofa / kpis.total) * 100).toFixed(0) : 0}%`} trend="up" />
      </div>

      {/* View toggle + filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <BtnGroup>
          <BtnGroupItem active={mode === "list"} onClick={() => setMode("list")}>
            <List className="h-3 w-3 inline mr-1" />
            List
          </BtnGroupItem>
          <BtnGroupItem active={mode === "matrix"} onClick={() => setMode("matrix")}>
            <Grid3x3 className="h-3 w-3 inline mr-1" />
            <span className="hidden sm:inline">Permission Matrix</span>
            <span className="sm:hidden">Matrix</span>
          </BtnGroupItem>
        </BtnGroup>

        {mode === "list" ? (
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search users - name, email, role, phone…"
              className="max-w-[280px]"
            />
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
                {["Active", "Invited", "Suspended", "Pending"].map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFilter.has(s)}
                    onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)}
                    className="text-[13px]"
                  >
                    {s}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">
                      Clear filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <span className="text-muted-foreground">Org:</span>
                  <span className="max-w-[120px] truncate">{orgLabel}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-[300px] overflow-y-auto">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by org</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setOrgFilter("")} className="text-[12px]">
                  All orgs
                </DropdownMenuItem>
                {orgs.map((o) => (
                  <DropdownMenuItem key={o.id} onClick={() => setOrgFilter(o.id)} className="text-[12px]">
                    {o.brandName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <span className="text-[12px] text-muted-foreground">Org:</span>
            <Select value={matrixOrgId} onValueChange={setMatrixOrgId}>
              <SelectTrigger className="h-8 w-full sm:w-[260px] rounded-[5px]">
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.brandName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="flex-1" />
        <Btn
          variant="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setInviteOpen(true)}
        >
          Invite User
        </Btn>
      </div>

      {/* List view */}
      {mode === "list" && (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          {!hasHydrated ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading users…</div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              onRowClick={() => undefined}
              rowActions={rowActions}
              bulkActions={bulkActions}
              emptyTitle="No users match"
              emptyDescription="Try adjusting your search or filters."
              emptyAction={
                <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setInviteOpen(true)}>
                  Invite User
                </Btn>
              }
              initialSort={{ key: "name", dir: "asc" }}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {filtered.length} of {users.length} users · {kpis.active} active · {kpis.invited} invited
            </span>
            <span className="tabular text-[12px] text-muted-foreground">
              2FA: {kpis.twofa}/{kpis.total}
            </span>
          </div>
        </div>
      )}

      {/* Matrix view */}
      {mode === "matrix" && (
        <PermissionMatrix org={matrixOrg} users={matrixUsers} />
      )}

      {/* Invite dialog */}
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

/* ============================================================
   PermissionMatrix - grid of users × modules.
   Each cell cycles read → write → none → read (Hick's Law:
   3 options per cell keeps the choice small).
   ============================================================ */
function PermissionMatrix({ org, users }: { org?: Org; users: User[] }) {
  const setModuleAccess = useSuperadminStore((s) => s.setModuleAccess);
  const cycle = (userId: string, moduleId: string, current: ModuleAccessLevel) => {
    const next: ModuleAccessLevel = current === "read" ? "write" : current === "write" ? "none" : "read";
    setModuleAccess(userId, moduleId, next);
  };
  // Show only modules enabled for this org + always show core ones
  const visibleModules = MODULES;

  if (!org) return null;

  return (
    <SectionCard
      title={`Permission matrix · ${org.brandName}`}
      description="Click a cell to cycle Read → Write → None. Owners and Admins implicitly have write access everywhere."
      icon={<Grid3x3 className="h-4 w-4" />}
      badge={<StatusBadge variant="muted">{users.length} users · {visibleModules.length} modules</StatusBadge>}
      flush
    >
      {users.length === 0 ? (
        <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
          No users in this org yet. Invite one to start configuring permissions.
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-[12px] min-w-[800px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="sticky left-0 bg-muted/30 z-10 text-left px-3 py-2 font-medium text-muted-foreground border-b border-r border-border min-w-[180px]">
                  User · Role
                </th>
                {visibleModules.map((m) => (
                  <th
                    key={m.id}
                    className="text-center px-1.5 py-2 font-medium text-muted-foreground border-b border-border min-w-[80px]"
                    title={m.label}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] truncate max-w-[80px]">{m.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isAdmin = u.role === "Owner" || u.role === "Org Admin";
                return (
                  <tr key={u.id} className="hover:bg-accent/20">
                    <td className="sticky left-0 bg-card z-10 px-3 py-2 border-r border-border">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-medium text-foreground truncate">{u.name}</span>
                        <span className="text-[10px] text-muted-foreground">{u.role}</span>
                      </div>
                    </td>
                    {visibleModules.map((m) => {
                      const level: ModuleAccessLevel = isAdmin ? "write" : (u.access[m.id] ?? "none");
                      const v = accessLevelVariant(level);
                      return (
                        <td key={m.id} className="text-center px-1.5 py-1.5 border-border">
                          <button
                            onClick={() => !isAdmin && cycle(u.id, m.id, level)}
                            disabled={isAdmin}
                            className={cn(
                              "inline-flex h-7 w-[58px] items-center justify-center rounded-[4px] border text-[10px] font-medium uppercase tracking-wider transition-colors",
                              v.variant === "solid" && "border-foreground bg-foreground text-background",
                              v.variant === "outline" && "border-border bg-background text-foreground hover:bg-accent",
                              v.variant === "muted" && "border-transparent bg-muted text-muted-foreground",
                              isAdmin && "cursor-not-allowed opacity-80",
                            )}
                          >
                            {level === "write" ? "W" : level === "read" ? "R" : "-"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-7 items-center justify-center rounded-[3px] border-foreground bg-foreground text-background text-[9px]">W</span>
          Write
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-7 items-center justify-center rounded-[3px] border border-border bg-background text-foreground text-[9px]">R</span>
          Read
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-7 items-center justify-center rounded-[3px] bg-muted text-muted-foreground text-[9px]">-</span>
          None
        </div>
        <div className="flex-1" />
        <span>Click any cell to cycle access level</span>
      </div>
    </SectionCard>
  );
}

/* ============================================================
   InviteUserDialog - invite a user to any org with role &
   initial module access.
   ============================================================ */
function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const inviteUser = useSuperadminStore((s) => s.inviteUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [role, setRole] = useState(ROLES[1]);
  const [access, setAccess] = useState<Record<string, ModuleAccessLevel>>(() =>
    MODULES.reduce((acc, m) => {
      acc[m.id] = m.defaultOn ? "write" : "none";
      return acc;
    }, {} as Record<string, ModuleAccessLevel>),
  );
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setOrgId(orgs[0]?.id ?? "");
    setRole(ROLES[1]);
    setAccess(
      MODULES.reduce((acc, m) => {
        acc[m.id] = m.defaultOn ? "write" : "none";
        return acc;
      }, {} as Record<string, ModuleAccessLevel>),
    );
  };

  const handleSubmit = () => {
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
      inviteUser({ name, email, phone, orgId, role, access });
      setSubmitting(false);
      toast.success("Invite sent", { description: `${email} → ${orgs.find((o) => o.id === orgId)?.brandName}` });
      reset();
      onClose();
    }, 400);
  };

  const toggleAccess = (mId: string) => {
    setAccess((s) => {
      const next: ModuleAccessLevel = s[mId] === "none" ? "read" : s[mId] === "read" ? "write" : "none";
      return { ...s, [mId]: next };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[560px] p-0 gap-0 rounded-[6px] flex flex-col max-h-[92vh]">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle className="text-[16px]">Invite User</DialogTitle>
          <DialogDescription className="text-[12px]">
            Send an invite to a new user. They will receive an email with a signup link valid for 7 days.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Name <span className="text-foreground">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sachin Kulkarni" className="h-9 rounded-[5px]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Phone <span className="text-foreground">*</span></label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98220 14582" className="h-9 rounded-[5px] tabular" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Email <span className="text-foreground">*</span></label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sachin.k@orgname.in" className="h-9 rounded-[5px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Organization</label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.brandName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">
              Module access - click to cycle Read → Write → None
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 rounded-[5px] border border-border p-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
              {MODULES.map((m) => {
                const level = access[m.id] ?? "none";
                const v = accessLevelVariant(level);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleAccess(m.id)}
                    className={cn(
                      "flex items-center justify-between gap-1 rounded-[4px] border px-2 py-1.5 text-[11px] transition-colors",
                      v.variant === "solid" && "border-foreground bg-foreground text-background",
                      v.variant === "outline" && "border-border bg-background text-foreground hover:bg-accent",
                      v.variant === "muted" && "border-transparent bg-muted text-muted-foreground",
                    )}
                  >
                    <span className="truncate">{m.label}</span>
                    <span className="uppercase text-[9px] tabular">
                      {level === "write" ? "W" : level === "read" ? "R" : "-"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border flex-row justify-between">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            icon={<Send className="h-3.5 w-3.5" />}
            loading={submitting}
            onClick={handleSubmit}
          >
            Send invite
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

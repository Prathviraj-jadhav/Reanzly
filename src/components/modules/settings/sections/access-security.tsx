"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Edit3, KeyRound, Ban, Trash2, Eye, X, Check, ShieldCheck, UserPlus,
} from "lucide-react";
import {
  USERS_MOCK, ROLES_MOCK, PERMISSION_MODULES, PERMISSION_ACTIONS,
  relativeTime, type UserRow, type RoleRow,
} from "../_helpers";

export function AccessSecuritySection() {
  const [users, setUsers] = useState<UserRow[]>(USERS_MOCK);
  const [roles, setRoles] = useState<RoleRow[]>(ROLES_MOCK);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [tab, setTab] = useState<"users" | "roles" | "security">("users");

  const updateUser = (id: string, patch: Partial<UserRow>) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  };

  const handleRowAction = (action: string, user: UserRow) => {
    switch (action) {
      case "view":
        toast("View user", { description: `${user.name} · ${user.role}` });
        break;
      case "edit":
        toast("Edit user", { description: user.name });
        break;
      case "reset":
        toast.success("Reset link sent", { description: `${user.email} will receive a password reset email.` });
        break;
      case "deactivate":
        updateUser(user.id, { status: user.status === "Suspended" ? "Active" : "Suspended" });
        toast(user.status === "Suspended" ? "User reactivated" : "User deactivated", { description: user.name });
        break;
      case "delete":
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        toast("User deleted", { description: user.name });
        break;
    }
  };

  const openRoleEditor = (role: RoleRow | null) => {
    setEditingRole(role);
    setRoleEditorOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Access & Roles</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Manage users, roles, and module-level permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "users" ? (
            <Btn variant="primary" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setAddUserOpen(true)}>
              Add User
            </Btn>
          ) : tab === "roles" ? (
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openRoleEditor(null)}>
              Create Role
            </Btn>
          ) : null}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 border-b border-border">
        {(["users", "roles", "security"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "relative px-3 py-2 text-[13px] transition-colors capitalize " +
              (tab === t ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")
            }
          >
            {t === "users" ? `Users (${users.length})` : t === "roles" ? `Roles (${roles.length})` : "Security"}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Branch</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Active</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border bg-background text-[11px] font-medium text-foreground">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-[13px] font-medium text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground tabular">{u.email}</td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground">{u.role}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={u.status === "Active" ? "outline" : u.status === "Invited" ? "muted" : "solid"}>
                        {u.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground">{u.branch}</td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{relativeTime(u.lastActive)}</td>
                    <td className="px-4 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{u.name}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleRowAction("view", u)}><Eye className="h-3.5 w-3.5 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction("edit", u)}><Edit3 className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRowAction("reset", u)}><KeyRound className="h-3.5 w-3.5 mr-2" /> Reset Password</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRowAction("deactivate", u)}>
                            <Ban className="h-3.5 w-3.5 mr-2" /> {u.status === "Suspended" ? "Reactivate" : "Deactivate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-foreground font-medium" onClick={() => handleRowAction("delete", u)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles tab */}
      {tab === "roles" && (
        <div className="flex flex-col gap-4">
          {/* Roles list */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {roles.map((r) => (
              <div key={r.id} className="group flex flex-col gap-2 rounded-[6px] border border-border bg-card p-4 hover:border-foreground/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[14px] font-medium text-foreground">{r.name}</h3>
                        {r.isSystem && <StatusBadge variant="muted" className="text-[10px]">System</StatusBadge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{r.usersCount} user{r.usersCount !== 1 ? "s" : ""} assigned</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openRoleEditor(r)}>
                        <Edit3 className="h-3.5 w-3.5 mr-2" /> {r.isSystem ? "View Permissions" : "Edit Role"}
                      </DropdownMenuItem>
                      {!r.isSystem && (
                        <>
                          <DropdownMenuItem onClick={() => toast("Duplicate role", { description: r.name + " (copy)" })}>
                            <Plus className="h-3.5 w-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-foreground font-medium" onClick={() => {
                            setRoles((prev) => prev.filter((rr) => rr.id !== r.id));
                            toast("Role deleted", { description: r.name });
                          }}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{r.description}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {PERMISSION_MODULES.slice(0, 8).map((m) => {
                    const perms = r.permissions[m] || [];
                    if (perms.length === 0) return null;
                    return (
                      <span key={m} className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {m}
                      </span>
                    );
                  })}
                  {Object.values(r.permissions).filter((p) => p.length > 0).length > 8 && (
                    <span className="text-[10px] text-muted-foreground">+{Object.values(r.permissions).filter((p) => p.length > 0).length - 8} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Record Sets */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Record Sets</h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <RecordSetItem name="Mumbai Branch Records" scope="Branch: Mumbai HQ" shared="3 roles" />
              <RecordSetItem name="Owner Financial Scope" scope="Company-wide financial" shared="1 role" />
              <RecordSetItem name="Field Operations Read-Only" scope="Trips + Vehicles" shared="2 roles" />
              <RecordSetItem name="Vendor Management Scope" scope="Vendors + Purchase Orders" shared="1 role" />
            </div>
          </div>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && <SecurityTab />}

      <AddUserSheet open={addUserOpen} onClose={() => setAddUserOpen(false)} onAdd={(u) => {
        setUsers((prev) => [{ ...u, id: "u" + (prev.length + 1), lastActive: "-" }, ...prev]);
        setAddUserOpen(false);
      }} branches={[...new Set(USERS_MOCK.map((u) => u.branch))]} roles={roles.map((r) => r.name)} />
      <RoleEditorSheet
        open={roleEditorOpen}
        role={editingRole}
        onClose={() => { setRoleEditorOpen(false); setEditingRole(null); }}
        onSave={(role) => {
          if (editingRole) {
            setRoles((prev) => prev.map((r) => r.id === role.id ? role : r));
            toast.success("Role updated", { description: role.name });
          } else {
            setRoles((prev) => [...prev, { ...role, id: "role-" + Date.now() }]);
            toast.success("Role created", { description: role.name });
          }
          setRoleEditorOpen(false);
          setEditingRole(null);
        }}
      />
    </div>
  );
}

function RecordSetItem({ name, scope, shared }: { name: string; scope: string; shared: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{name}</div>
        <div className="text-[11px] text-muted-foreground">{scope}</div>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{shared}</span>
    </div>
  );
}

// ===== Security tab (IP whitelist, API keys, audit log) =====
function SecurityTab() {
  const [ipEntries, setIpEntries] = useState<{ id: string; cidr: string; label: string; addedAt: string }[]>([
    { id: "ip1", cidr: "103.21.58.0/24", label: "Mumbai HQ", addedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: "ip2", cidr: "49.36.84.12/32", label: "Pune Office", addedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
    { id: "ip3", cidr: "0.0.0.0/0", label: "Mobile drivers (any)", addedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  ]);
  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [ipWhitelistOn, setIpWhitelistOn] = useState(true);

  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; createdAt: string; lastUsed: string; scopes: string[] }[]>([
    { id: "k1", name: "Operations Webhook", prefix: "rz_live_8f2a", createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), lastUsed: new Date(Date.now() - 0.2 * 86400000).toISOString(), scopes: ["trips:read", "vehicles:read"] },
    { id: "k2", name: "Rean SLM Brain", prefix: "rz_live_b7c1", createdAt: new Date(Date.now() - 18 * 86400000).toISOString(), lastUsed: new Date(Date.now() - 2 * 86400000).toISOString(), scopes: ["trips:read", "invoices:read", "expenses:read"] },
    { id: "k3", name: "Finance Export (read-only)", prefix: "rz_live_a3e9", createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), lastUsed: "-", scopes: ["invoices:read", "payments:read"] },
  ]);
  const [auditLog] = useState<{ id: string; actor: string; action: string; target: string; ip: string; ts: string }[]>([
    { id: "a1", actor: "Vikram Deshmukh", action: "Updated role permissions", target: "Role: Fleet Manager", ip: "103.21.58.42", ts: new Date(Date.now() - 0.1 * 86400000).toISOString() },
    { id: "a2", actor: "Rohit Sharma", action: "Invited user", target: "imran@reanzly.in", ip: "103.21.58.42", ts: new Date(Date.now() - 0.4 * 86400000).toISOString() },
    { id: "a3", actor: "Reena Mehta", action: "Reset password", target: "geeta@reanzly.in", ip: "49.36.84.12", ts: new Date(Date.now() - 1.2 * 86400000).toISOString() },
    { id: "a4", actor: "System", action: "Revoked session", target: "iPad Air (Bengaluru)", ip: "157.32.14.88", ts: new Date(Date.now() - 2.5 * 86400000).toISOString() },
    { id: "a5", actor: "Vikram Deshmukh", action: "Created API key", target: "Finance Export", ip: "103.21.58.42", ts: new Date(Date.now() - 4 * 86400000).toISOString() },
    { id: "a6", actor: "Pooja Iyer", action: "Added IP to whitelist", target: "0.0.0.0/0", ip: "103.21.58.42", ts: new Date(Date.now() - 5 * 86400000).toISOString() },
  ]);

  const addIp = () => {
    if (!newIp.trim()) {
      toast("CIDR required", { description: "Enter an IPv4 CIDR like 103.21.58.0/24" });
      return;
    }
    setIpEntries((prev) => [{ id: "ip" + Date.now(), cidr: newIp.trim(), label: newIpLabel.trim() || "Unlabeled", addedAt: new Date().toISOString() }, ...prev]);
    toast.success("IP added to whitelist", { description: `${newIp.trim()} - ${newIpLabel.trim() || "Unlabeled"}` });
    setNewIp(""); setNewIpLabel("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* IP whitelist */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">IP Whitelist</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{ipWhitelistOn ? "Enforced" : "Disabled"}</span>
            <Switch checked={ipWhitelistOn} onCheckedChange={(v) => { setIpWhitelistOn(v); toast(v ? "IP whitelist enforced" : "IP whitelist disabled"); }} className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted" />
          </div>
        </div>
        <div className={"p-4 " + (ipWhitelistOn ? "" : "opacity-40 pointer-events-none")}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="CIDR (e.g. 103.21.58.0/24)" className="h-8 rounded-[5px] text-[13px] tabular" />
            <Input value={newIpLabel} onChange={(e) => setNewIpLabel(e.target.value)} placeholder="Label (e.g. Mumbai HQ)" className="h-8 rounded-[5px] text-[13px]" />
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={addIp}>Add</Btn>
          </div>
          <div className="mt-3 divide-y divide-border rounded-[5px] border border-border">
            {ipEntries.map((ip) => (
              <div key={ip.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium tabular">{ip.cidr}</div>
                  <div className="text-[11px] text-muted-foreground">{ip.label} - added {relativeTime(ip.addedAt)}</div>
                </div>
                <button
                  onClick={() => {
                    setIpEntries((prev) => prev.filter((x) => x.id !== ip.id));
                    toast("IP removed", { description: ip.cidr });
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Remove IP"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">When enabled, login attempts from IPs outside this list are blocked. The 0.0.0.0/0 entry allows any IP (use with caution).</p>
        </div>
      </div>

      {/* API keys */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">API Keys</h3>
          </div>
          <Btn size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Create API key", { description: "Choose scopes - the secret is shown once." })}>New Key</Btn>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Prefix</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Scopes</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Used</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="w-10 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-accent/30 transition-colors group">
                  <td className="px-4 py-2 text-[13px] font-medium text-foreground">{k.name}</td>
                  <td className="px-4 py-2 text-[12px] font-mono tabular text-muted-foreground">{k.prefix}...</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span key={s} className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[12px] text-muted-foreground">{k.lastUsed === "-" ? "-" : relativeTime(k.lastUsed)}</td>
                  <td className="px-4 py-2 text-[12px] text-muted-foreground">{relativeTime(k.createdAt)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => {
                        setApiKeys((prev) => prev.filter((x) => x.id !== k.id));
                        toast("API key revoked", { description: `${k.name} (${k.prefix}...)` });
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
                      aria-label="Revoke key"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Audit Log</h3>
          </div>
          <Btn size="sm" variant="ghost" onClick={() => toast("Export audit log", { description: "CSV - last 90 days." })}>Export</Btn>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Actor</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Target</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">IP</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLog.map((row) => (
                <tr key={row.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2 text-[12px] font-medium text-foreground">{row.actor}</td>
                  <td className="px-4 py-2 text-[12px] text-foreground">{row.action}</td>
                  <td className="px-4 py-2 text-[12px] text-muted-foreground">{row.target}</td>
                  <td className="px-4 py-2 text-[12px] tabular text-muted-foreground">{row.ip}</td>
                  <td className="px-4 py-2 text-[12px] text-muted-foreground">{relativeTime(row.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          Showing {auditLog.length} of {auditLog.length} entries. Retained 90 days. Exportable for compliance review.
        </div>
      </div>
    </div>
  );
}

// ===== Add User Sheet =====
function AddUserSheet({ open, onClose, onAdd, branches, roles }: {
  open: boolean;
  onClose: () => void;
  onAdd: (u: UserRow) => void;
  branches: string[];
  roles: string[];
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(roles[0] || "");
  const [branch, setBranch] = useState(branches[0] || "");
  const [jobTitle, setJobTitle] = useState("");

  const reset = () => {
    setStep(1); setName(""); setEmail(""); setPhone(""); setJobTitle("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAdd = () => {
    onAdd({
      id: "u-temp",
      name: name || "New User",
      email: email || "new.user@reanzly.in",
      role,
      status: "Invited",
      branch,
      lastActive: "-",
    });
    reset();
  };

  const canAdvance1 = name.trim() && email.trim() && phone.trim();
  const canAdvance2 = role && branch;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Add New User</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Follows employee onboarding flow. Sends invite email upon completion.
            </SheetDescription>
          </div>
          <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        {/* Stepper */}
        <div className="border-b border-border px-5 py-3 flex items-center gap-2">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <span className={"flex h-5 w-5 items-center justify-center rounded-full border text-[11px] tabular font-medium " + (step >= s ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>
                {step > s ? <Check className="h-3 w-3" /> : s}
              </span>
              {i < 2 && <div className={"h-px w-8 " + (step > s ? "bg-foreground" : "bg-border")} />}
            </div>
          ))}
          <span className="ml-2 text-[12px] text-muted-foreground">{["Personal", "Role & Branch", "Review"][step - 1]}</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-4">
          {step === 1 && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-[12px] font-medium text-foreground mb-1 block">Full Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Imran Sheikh" className="h-8 rounded-[5px] text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground mb-1 block">Email *</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="imran@reanzly.in" className="h-8 rounded-[5px] text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground mb-1 block">Phone *</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXX XXXXX" className="h-8 rounded-[5px] text-[13px] tabular" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground mb-1 block">Job Title</label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Dispatcher" className="h-8 rounded-[5px] text-[13px]" />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-[12px] font-medium text-foreground mb-1 block">Role *</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground mb-1 block">Branch *</label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-[5px] border border-border bg-accent/30 p-3 text-[11px] text-muted-foreground">
                An invitation email will be sent to <span className="text-foreground font-medium">{email || "the user"}</span> with onboarding instructions.
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="rounded-[6px] border border-border bg-card p-4">
              <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Review & Send Invite</h4>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <ReviewRow label="Name" value={name} />
                <ReviewRow label="Email" value={email} mono />
                <ReviewRow label="Phone" value={phone} mono />
                <ReviewRow label="Job Title" value={jobTitle || "-"} />
                <ReviewRow label="Role" value={role} />
                <ReviewRow label="Branch" value={branch} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : handleClose}>
            {step === 1 ? "Cancel" : "Back"}
          </Btn>
          {step < 3 ? (
            <Btn variant="primary" onClick={() => setStep(step + 1)} disabled={step === 1 ? !canAdvance1 : !canAdvance2}>
              Continue
            </Btn>
          ) : (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Send Invite
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={"text-[13px] text-foreground " + (mono ? "tabular" : "")}>{value || "-"}</span>
    </div>
  );
}

// ===== Role Editor Sheet =====
function RoleEditorSheet({ open, role, onClose, onSave }: {
  open: boolean;
  role: RoleRow | null;
  onClose: () => void;
  onSave: (r: RoleRow) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, ("View" | "Create" | "Edit" | "Delete" | "Export" | "Manage")[]>>({});
  const [isSystem, setIsSystem] = useState(false);

  // Sync when role changes
  if (open && role && name !== role.name) {
    setName(role.name);
    setDescription(role.description);
    setPermissions(JSON.parse(JSON.stringify(role.permissions)));
    setIsSystem(role.isSystem);
  }
  if (!open && name) {
    setTimeout(() => { setName(""); setDescription(""); setPermissions({}); setIsSystem(false); }, 0);
  }

  const togglePerm = (module: string, action: typeof PERMISSION_ACTIONS[number]) => {
    if (isSystem && action === "Manage") {
      // Allow viewing only for system roles
    }
    setPermissions((prev) => {
      const cur = prev[module] || [];
      const next = cur.includes(action) ? cur.filter((a) => a !== action) : [...cur, action];
      return { ...prev, [module]: next };
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast("Role name required");
      return;
    }
    onSave({
      id: role?.id || "",
      name,
      description: description || "Custom role.",
      usersCount: role?.usersCount || 0,
      isSystem,
      permissions,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {role ? (isSystem ? `View Role: ${role.name}` : `Edit Role: ${role.name}`) : "Create Role"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Configure module-level permissions. {isSystem && "System roles are read-only."}
            </SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Role Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isSystem} placeholder="e.g. Workshop Lead" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSystem} placeholder="What can this role do?" className="h-8 rounded-[5px] text-[13px]" />
            </div>
          </div>

          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Permissions Matrix</h3>
              <span className="text-[11px] text-muted-foreground tabular">{PERMISSION_MODULES.length} modules</span>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground sticky left-0 bg-card">Module</th>
                    {PERMISSION_ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-16">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PERMISSION_MODULES.map((m) => (
                    <tr key={m} className="hover:bg-accent/20 transition-colors">
                      <td className="px-3 py-2 text-[12px] text-foreground font-medium sticky left-0 bg-card">{m}</td>
                      {PERMISSION_ACTIONS.map((a) => {
                        const checked = (permissions[m] || []).includes(a);
                        return (
                          <td key={a} className="px-3 py-2 text-center">
                            <Switch
                              checked={checked}
                              onCheckedChange={() => togglePerm(m, a)}
                              disabled={isSystem}
                              className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          {!isSystem && (
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSave}>
              {role ? "Save Role" : "Create Role"}
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

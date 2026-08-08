"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useSuperadminStore } from "./_store";
import { INTERNAL_ROLES, internalRoleById, type InternalRoleId } from "./_data";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Check,
  Building2,
  Users,
  Cpu,
  CreditCard,
  UserCheck,
  ShieldAlert,
  Code2,
  Fingerprint,
  KeyRound,
  Activity,
} from "lucide-react";

/* ============================================================
   AdminLogin - Reanzly internal-team sign-in (admin.reanzly.com)
   ------------------------------------------------------------
   A completely separate, full-screen premium login. Two-step flow:
     Step 1: Pick your role (8 role chips with live access preview)
     Step 2: Enter credentials (email + password), 2FA hint, sign in

   Strict monochrome Swiss design. No emojis, no emdashes.
   ============================================================ */

const ROLE_ICON: Record<InternalRoleId, typeof Building2> = {
  superadmin: ShieldCheck,
  "support-lead": UserCheck,
  "support-agent": Users,
  "account-manager": Building2,
  "billing-specialist": CreditCard,
  "onboarding-specialist": Cpu,
  "security-officer": ShieldAlert,
  developer: Code2,
  "sales-executive": Activity,
  "customer-success": UserCheck,
  "engineering-lead": Code2,
  "marketing-lead": Fingerprint,
  "legal-officer": ShieldAlert,
  "finance-controller": CreditCard,
  "product-manager": Cpu,
};

/** Demo logins - shown on the AdminLogin screen so testers and internal team
 *  members can one-tap sign in. Password is the same for all: "reanzly-admin".
 *  These are demo accounts only - not real credentials. Production uses
 *  NextAuth + 2FA enforced for all internal roles.
 */
const DEMO_PASSWORD = "reanzly-admin";

const DEMO_ACCOUNTS: { roleId: InternalRoleId; email: string; name: string; department: string }[] = [
  { roleId: "superadmin", email: "anand.kumar@reanzly.com", name: "Anand Kumar", department: "Leadership" },
  { roleId: "engineering-lead", email: "vivek.iyer@reanzly.com", name: "Vivek Iyer", department: "Engineering" },
  { roleId: "developer", email: "arjun.desai@reanzly.com", name: "Arjun Desai", department: "Engineering" },
  { roleId: "support-lead", email: "rohit.mehra@reanzly.com", name: "Rohit Mehra", department: "Support" },
  { roleId: "support-agent", email: "kavya.nair@reanzly.com", name: "Kavya Nair", department: "Support" },
  { roleId: "customer-success", email: "priya.sharma@reanzly.com", name: "Priya Sharma", department: "Customer Success" },
  { roleId: "account-manager", email: "meera.iyer@reanzly.com", name: "Meera Iyer", department: "Account Mgmt" },
  { roleId: "sales-executive", email: "rahul.verma@reanzly.com", name: "Rahul Verma", department: "Sales" },
  { roleId: "billing-specialist", email: "neha.gupta@reanzly.com", name: "Neha Gupta", department: "Billing" },
  { roleId: "finance-controller", email: "suresh.bhat@reanzly.com", name: "Suresh Bhat", department: "Finance" },
  { roleId: "onboarding-specialist", email: "anita.rao@reanzly.com", name: "Anita Rao", department: "Onboarding" },
  { roleId: "security-officer", email: "sanjay.rao@reanzly.com", name: "Sanjay Rao", department: "Security" },
  { roleId: "legal-officer", email: "deepa.menon@reanzly.com", name: "Deepa Menon", department: "Legal" },
  { roleId: "marketing-lead", email: "karan.kapoor@reanzly.com", name: "Karan Kapoor", department: "Marketing" },
  { roleId: "product-manager", email: "isha.patel@reanzly.com", name: "Isha Patel", department: "Product" },
];

const SUB_VIEWS_LABEL: Record<string, string> = {
  overview: "Overview",
  organizations: "Organizations",
  users: "Users",
  billing: "Billing",
  sync: "Sync",
  backups: "Backups",
  tickets: "Tickets",
  broadcasts: "Broadcasts",
  automations: "Automations",
  "internal-team": "Team",
  audit: "Audit",
  settings: "Settings",
};

export function AdminLogin() {
  const adminLogin = useSuperadminStore((s) => s.adminLogin);
  const logout = useAppStore((s) => s.logout);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<InternalRoleId | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = roleId ? internalRoleById(roleId) : null;

  function pickRole(id: InternalRoleId) {
    setRoleId(id);
    // Pre-fill email if a demo account matches this role.
    const demo = DEMO_ACCOUNTS.find((d) => d.roleId === id);
    if (demo && !email) setEmail(demo.email);
    setError(null);
    setStep(2);
  }

  function backToRoles() {
    setStep(1);
    setError(null);
  }

  // True one-tap sign in: pick the demo account and immediately call
  // adminLogin. No extra "Continue" + "Sign in" clicks required.
  function pickDemo(demoRoleId: InternalRoleId, demoEmail: string) {
    setRoleId(demoRoleId);
    setEmail(demoEmail);
    setPassword("reanzly-admin");
    setError(null);
    setBusy(true);
    setTimeout(() => {
      adminLogin(demoEmail.trim(), demoRoleId);
      setBusy(false);
    }, 350);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!roleId) {
      setError("Pick your role first.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    if (!password.trim()) {
      setError("Password cannot be empty.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      adminLogin(email.trim(), roleId);
      setBusy(false);
    }, 450);
  }

  function handleBackToOrgLogin() {
    // Clear app-store auth so the user returns to the org-level login screen.
    logout();
  }

  function handleBackToWebsite() {
    // Reset all auth state and return to the public marketing site.
    logout();
    // The store's logout() resets isAuthenticated=false which causes AppShell
    // to render <LandingSite /> (marketingView defaults to "landing" when
    // not authenticated and not in auth mode).
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Top utility bar */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <button
          onClick={handleBackToOrgLogin}
          className="tap flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background/80 px-2.5 text-[11px] font-medium text-muted-foreground backdrop-blur hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to org login
        </button>
        <button
          onClick={handleBackToWebsite}
          className="tap flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background/80 px-2.5 text-[11px] font-medium text-muted-foreground backdrop-blur hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to website
        </button>
      </div>

      <div className="flex min-h-screen w-full">
        {/* ── Left brand panel ── */}
        <aside className="hidden lg:flex lg:w-[460px] xl:w-[520px] flex-col justify-between bg-foreground text-background p-10 xl:p-14 relative overflow-hidden">
          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-background text-[14px] font-bold text-foreground">
              RZ
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-semibold tracking-tight">Reanzly</span>
              <span className="rounded-[4px] border border-background/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background/70">
                Internal
              </span>
            </div>
          </div>

          <div className="relative flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-background/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background/70">
                admin.reanzly.com
              </span>
            </div>
            <h1 className="text-[36px] xl:text-[44px] font-semibold leading-[1.04] tracking-tight">
              The control plane for the logistics operating system.
            </h1>
            <p className="text-[14px] leading-relaxed text-background/70 max-w-[400px]">
              Onboard tenants, route support tickets to the right department,
              broadcast announcements, personalise automation recipes per role,
              and connect Tally, CRMs, ERPs and AI providers through one
              monochrome command center.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <BrandStat label="Tenants onboarded" value="12" />
              <BrandStat label="Monthly revenue" value="Rs 8.4 L" />
              <BrandStat label="Open tickets" value="9" />
              <BrandStat label="Internal staff" value="9" />
            </div>
          </div>

          <div className="relative flex flex-col gap-2 text-[11px] text-background/60">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              <span>DPDP + GDPR compliant. Row-level tenant isolation.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint className="h-3 w-3" />
              <span>2FA enforced for all internal roles.</span>
            </div>
            <div className="tabular mt-1">admin.reanzly.com · v3.2 · Production</div>
          </div>
        </aside>

        {/* ── Right form panel ── */}
        <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[480px]">
            {/* Mobile brand header */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-foreground text-[13px] font-bold text-background">
                RZ
              </span>
              <span className="text-[15px] font-semibold tracking-tight">Reanzly</span>
              <span className="ml-1 rounded-[3px] border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Internal
              </span>
            </div>

            {step === 1 && (
              <Step1RolePicker
                roleId={roleId}
                onPick={pickRole}
                onPickDemo={pickDemo}
                onContinue={() => {
                  if (!roleId) {
                    setError("Pick a role to continue.");
                    return;
                  }
                  setStep(2);
                }}
                error={error}
                busy={busy}
              />
            )}

            {step === 2 && role && (
              <Step2Credentials
                role={role}
                roleId={roleId!}
                email={email}
                password={password}
                showPw={showPw}
                busy={busy}
                error={error}
                onEmail={setEmail}
                onPassword={setPassword}
                onTogglePw={() => setShowPw((p) => !p)}
                onBack={backToRoles}
                onSubmit={submit}
              />
            )}

            <p className="mt-8 text-center text-[11px] text-muted-foreground">
              Need access? Ask{" "}
              <span className="text-foreground font-medium">anand.kumar@reanzly.com</span>{" "}
              to invite you.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// Step 1: Role picker
// ============================================================
function Step1RolePicker({
  roleId,
  onPick,
  onPickDemo,
  onContinue,
  error,
  busy,
}: {
  roleId: InternalRoleId | null;
  onPick: (id: InternalRoleId) => void;
  onPickDemo: (roleId: InternalRoleId, email: string) => void;
  onContinue: () => void;
  error: string | null;
  busy: boolean;
}) {
  const [hovered, setHovered] = useState<InternalRoleId | null>(null);
  const previewRole = hovered ?? roleId;
  const role = previewRole ? internalRoleById(previewRole) : null;
  const accessibleViews = role
    ? Object.entries(role.permissions).filter(([, v]) => v !== "none")
    : [];
  const writeViews = accessibleViews.filter(([, v]) => v === "write").length;
  const readViews = accessibleViews.filter(([, v]) => v === "read").length;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background tabular">
            1
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Step 1 of 2
          </span>
        </div>
        <h2 className="text-[24px] font-semibold tracking-tight">Pick your role</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Each role has a different permission matrix. Hover to preview access.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {INTERNAL_ROLES.map((r) => {
          const Icon = ROLE_ICON[r.id];
          const active = r.id === roleId;
          const isHover = r.id === hovered;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "tap group relative flex flex-col gap-2 rounded-[6px] border p-3 text-left transition-all",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground/40 hover:bg-accent/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-[5px] border",
                    active
                      ? "border-background/30 bg-background/10 text-background"
                      : "border-border bg-muted/30 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {active && <Check className="h-4 w-4 text-background" />}
              </div>
              <div className="min-w-0">
                <div className={cn("text-[12.5px] font-medium leading-tight", active ? "text-background" : "text-foreground")}>
                  {r.label}
                </div>
                <div className={cn("text-[10px] mt-0.5 leading-tight line-clamp-2", active ? "text-background/70" : "text-muted-foreground")}>
                  {r.summary}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Access preview */}
      {role && (
        <div className="rounded-[6px] border border-border bg-card p-3.5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-foreground">{role.label}</span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground tabular">
                {writeViews} write · {readViews} read
              </span>
            </div>
            <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Preview
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
            {role.summary}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {accessibleViews.map(([view, level]) => (
              <span
                key={view}
                className={cn(
                  "rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium tabular",
                  level === "write"
                    ? "border-foreground/40 bg-foreground/5 text-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {SUB_VIEWS_LABEL[view] ?? view}
              </span>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Departments
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.departments.map((d) => (
                <span
                  key={d}
                  className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-[5px] border border-foreground/30 bg-foreground/5 px-3 py-2 text-[12px] text-foreground mb-4">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="tap flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>

      {/* Demo accounts - one-tap sign in for the Reanzly internal team.
          Each card shows the role, name, department, email and the shared
          demo password. Hover reveals an arrow → one click signs in. */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Demo accounts · one-tap sign in
          </span>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground tabular">
            pwd: <code className="rounded-[3px] bg-muted px-1 py-0.5 text-[10px] font-mono">{DEMO_PASSWORD}</code>
          </span>
        </div>
        <div className="max-h-[280px] overflow-y-auto rounded-[6px] border border-border bg-background/50 p-1.5">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((d) => {
              const r = internalRoleById(d.roleId)!;
              const Icon = ROLE_ICON[d.roleId];
              return (
                <button
                  key={d.email}
                  type="button"
                  disabled={busy}
                  onClick={() => onPickDemo(d.roleId, d.email)}
                  className="tap group flex items-center gap-2 rounded-[5px] border border-border bg-background px-2 py-2 text-left hover:bg-accent hover:border-foreground/30 transition-colors disabled:opacity-60"
                  title={`${r.label} · ${d.email}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-foreground/[0.06] text-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11.5px] font-medium text-foreground truncate">{r.label}</span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 shrink-0">
                        {d.department}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular truncate">
                      {d.name} · {d.email}
                    </div>
                  </div>
                  {busy ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-2.5 w-2.5" />
          {DEMO_ACCOUNTS.length} demo accounts across {new Set(DEMO_ACCOUNTS.map((d) => d.department)).size} departments. Production enforces NextAuth + 2FA.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Step 2: Credentials
// ============================================================
function Step2Credentials({
  role,
  roleId,
  email,
  password,
  showPw,
  busy,
  error,
  onEmail,
  onPassword,
  onTogglePw,
  onBack,
  onSubmit,
}: {
  role: NonNullable<ReturnType<typeof internalRoleById>>;
  roleId: InternalRoleId;
  email: string;
  password: string;
  showPw: boolean;
  busy: boolean;
  error: string | null;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onTogglePw: () => void;
  onBack: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  const Icon = ROLE_ICON[roleId];
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="tap mb-5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Change role
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background tabular">
            2
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Step 2 of 2
          </span>
        </div>
        <h2 className="text-[24px] font-semibold tracking-tight">Sign in</h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Enter your Reanzly work credentials to access the admin panel.
        </p>
      </div>

      {/* Selected role chip */}
      <div className="flex items-center gap-2.5 rounded-[6px] border border-foreground/30 bg-foreground/5 px-3 py-2.5 mb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-foreground text-background">
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-foreground">{role.label}</div>
          <div className="text-[10px] text-muted-foreground">
            {role.departments.length} department{role.departments.length === 1 ? "" : "s"} ·{" "}
            {Object.values(role.permissions).filter((v) => v === "write").length} write access
          </div>
        </div>
        <Check className="h-4 w-4 text-foreground" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* Email */}
        <div>
          <label className="text-[12px] font-medium text-foreground mb-1.5 block">
            Work email
          </label>
          <div className="relative flex h-11 items-center">
            <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              placeholder="you@reanzly.com"
              className="h-11 w-full rounded-[6px] border border-border bg-background pl-10 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-[12px] font-medium text-foreground">Password</label>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Forgot?
            </button>
          </div>
          <div className="relative flex h-11 items-center">
            <Lock className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => onPassword(e.target.value)}
              placeholder="any password works in demo"
              className="h-11 w-full rounded-[6px] border border-border bg-background pl-10 pr-11 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 tabular"
            />
            <button
              type="button"
              onClick={onTogglePw}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors tap"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 2FA hint */}
        <div className="flex items-center gap-2.5 rounded-[6px] border border-dashed border-border bg-muted/20 px-3 py-2.5">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-foreground">Two-factor authentication</div>
            <div className="text-[10px] text-muted-foreground">
              You will be asked for a 6-digit code from your authenticator app.
            </div>
          </div>
          <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Enforced
          </span>
        </div>

        {error && (
          <div className="rounded-[5px] border border-foreground/30 bg-foreground/5 px-3 py-2 text-[12px] text-foreground">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="tap flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying credentials...
            </>
          ) : (
            <>
              Sign in as {role.label}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span>All sign-ins are recorded in the audit log.</span>
      </div>
    </div>
  );
}

function BrandStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-background/15 px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-background/60">
        {label}
      </span>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular">{value}</span>
    </div>
  );
}

export default AdminLogin;

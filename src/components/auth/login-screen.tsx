"use client";

import { useEffect, useState } from "react";
import { useAppStore, type PortalType } from "@/lib/store/app-store";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import { pick } from "@/lib/content/savage-placeholders";
import { cn } from "@/lib/utils";
import {
  Truck,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Lock,
  Mail,
  Check,
  Building2,
  Users,
  Globe,
  Handshake,
  ChevronRight,
  KeyRound,
} from "lucide-react";

/* ============================================================
   LoginScreen - AUTH-2 redesign
   • Split-screen: black brand panel (desktop) + form panel
   • 4-portal selector (Admin / App / Driver / Vendor)
     maps to admin/app/driver/vendor.reanzly.com
   • Sign-in form with show/hide password, remember me,
     forgot password, primary CTA "Sign in to {portal}"
   • Quick role chips per portal (single chip for Admin /
     Driver / Vendor, 5 chips for App)
   • "Don't have an account? Create one" → flips authMode
     to "signup" (handled by app-shell routing)
   • Trust line: ShieldCheck + "DPDP + GDPR compliant.
     Row-level tenant isolation."
   Monochrome Swiss design system. No hues, no shadows.
   ============================================================ */

// Savage placeholders - gentle roasts for typos & bad logins.
const EMAIL_PLACEHOLDERS = [
  "you@reanzly.in - not your personal Gmail",
  "work email, the one your boss pays for",
  "we promise not to email you newsletters",
  "the email ops actually has on file",
  "no, 'admin@admin.com' won't work. try.",
];
const PASSWORD_PLACEHOLDERS = [
  "not 'password'. we checked.",
  "the one you wrote on a sticky note",
  "8+ chars, ideally not your pet's name",
  "something you'll forget by friday",
  "uppercase, lowercase, a number, a prayer",
];

// Portal definitions - each subdomain maps to a product surface.
// admin.reanzly.com   → superadmin (Reanzly internal team)
// app.reanzly.com     → app        (organisation users)
// driver.reanzly.com  → driver     (field drivers)
// vendor.reanzly.com  → vendor     (vendors / customers - tracking)
// broker.reanzly.com  → broker     (freight brokers - own panel)
const PORTALS: {
  id: PortalType;
  label: string;
  domain: string;
  icon: typeof Building2;
  blurb: string;
  roles: string[]; // role archetype ids valid for this portal
}[] = [
  {
    id: "superadmin",
    label: "Admin",
    domain: "admin.reanzly.com",
    icon: Building2,
    blurb: "Reanzly internal team - onboard tenants, manage billing, backups & platform health.",
    roles: ["superadmin"],
  },
  {
    id: "app",
    label: "App",
    domain: "app.reanzly.com",
    icon: Users,
    blurb: "Organisation users - the full logistics operating system across every department.",
    roles: ["owner", "ops-manager", "fleet-manager", "finance-manager", "dispatcher"],
  },
  {
    id: "driver",
    label: "Driver",
    domain: "driver.reanzly.com",
    icon: Truck,
    blurb: "Field drivers - job orders, capture, POD, offline-first. Mobile only.",
    roles: ["driver"],
  },
  {
    id: "vendor",
    label: "Vendor",
    domain: "vendor.reanzly.com",
    icon: Globe,
    blurb: "Vendors & customers - live shipment tracking, invoices, PODs. Read-only.",
    roles: ["customer"],
  },
  {
    id: "broker",
    label: "Broker",
    domain: "broker.reanzly.com",
    icon: Handshake,
    blurb: "Freight brokers - resell Reanzly capacity with your own markup. Manage sub-brokers, enquiries, settlements.",
    roles: ["broker"],
  },
];

// Role tag chips rendered for each portal's quick-login.
const ROLE_TAG: Record<string, string> = {
  superadmin: "RZ",
  owner: "OWN",
  "ops-manager": "OPS",
  "fleet-manager": "FLT",
  "finance-manager": "FIN",
  dispatcher: "DSP",
  driver: "TRK",
  customer: "VND",
  broker: "BRK",
};

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const [portal, setPortal] = useState<PortalType>("app");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("owner");
  const [emailPh, setEmailPh] = useState(EMAIL_PLACEHOLDERS[0]);
  const [pwPh, setPwPh] = useState(PASSWORD_PLACEHOLDERS[0]);
  const [error, setError] = useState<string | null>(null);

  const currentPortal = PORTALS.find((p) => p.id === portal)!;

  // Derive the effective role during render (no effect). If the persisted
  // selectedRole isn't valid for the current portal (e.g. user switched from
  // app → driver), fall back to the portal's first role.
  const quickRoles = currentPortal.roles;
  const effectiveRole = quickRoles.includes(selectedRole) ? selectedRole : quickRoles[0];

  // Rotate savage placeholders every 4s (kept stable on first paint).
  useEffect(() => {
    const t = setInterval(() => {
      setEmailPh(pick(EMAIL_PLACEHOLDERS));
      setPwPh(pick(PASSWORD_PLACEHOLDERS));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    // Validation order matches the spec:
    //   1. empty email      -> "Work email is required."
    //   2. invalid format   -> "That email doesn't look right. Check the @ and the domain."
    //   3. password < 4     -> "Password needs at least 4 characters. Try harder."
    // The regex requires local@domain.tld (no whitespace, dot in the domain).
    if (!email.trim()) {
      setError("Work email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That email doesn't look right. Check the @ and the domain.");
      return;
    }
    if (password.trim().length < 4) {
      setError("Password needs at least 4 characters. Try harder.");
      return;
    }
    setSubmitting(true);
    // Doherty threshold - keep feedback under 400ms. 600ms spinner feels real.
    setTimeout(() => {
      login(email.trim(), effectiveRole, portal, "Reanzly Logistics Pvt Ltd");
    }, 600);
  }

  function quickLogin(roleId: string) {
    setSelectedRole(roleId);
    setSubmitting(true);
    setError(null);
    setTimeout(() => login("", roleId, portal, "Reanzly Logistics Pvt Ltd"), 450);
  }

  const selectedRoleObj = ROLE_ARCHETYPES.find((r) => r.id === effectiveRole);

  // Brand-panel marketing copy adapts to the selected portal.
  const portalCopy: Record<
    PortalType,
    { tag: string; title: string; body: string; stats: { k: string; v: string }[] }
  > = {
    superadmin: {
      tag: "Multi-tenant control plane",
      title: "Onboard, bill, back up & monitor every tenant from one console.",
      body: "Self-serve or assisted onboarding. Permission matrix per org. Offline-sync health. Daily backups. Audit log. The whole platform, governed.",
      stats: [
        { k: "Tenants", v: "48" },
        { k: "MRR", v: "₹38L" },
        { k: "Uptime", v: "99.9%" },
      ],
    },
    app: {
      tag: "The logistics operating system",
      title: "Run every truck, trip & rupee from one black box.",
      body: "22+ modules. Job orders to POD. Rate cards to GST. Live fleet map. Driver field app. Finance engine. CRM, HR, internal chat with Rean AI. All in monochrome.",
      stats: [
        { k: "Trips / day", v: "1,284" },
        { k: "On-time", v: "94.2%" },
        { k: "Fleet", v: "312" },
      ],
    },
    driver: {
      tag: "Field-first, offline-first",
      title: "Your truck. Your trips. Your captures. Even with no signal.",
      body: "Job orders, e-POD with photo + GPS, fuel logs, inspections, expenses. Autosaved offline, synced the moment you're back online. One-thumb operable.",
      stats: [
        { k: "Avg sync", v: "1.2s" },
        { k: "Offline", v: "∞" },
        { k: "Captures", v: "100%" },
      ],
    },
    vendor: {
      tag: "Track only what's yours",
      title: "Your shipments, live. No noise, no dashboards you'll never use.",
      body: "Share a link, get a portal. Live map, ETA, POD the second it's captured, invoices, ledger. Read-only by design - your vendors see exactly what you want them to.",
      stats: [
        { k: "Live", v: "24×7" },
        { k: "ETAs", v: "Auto" },
        { k: "POD", v: "Instant" },
      ],
    },
    broker: {
      tag: "Freight brokerage, scaled",
      title: "Resell Reanzly capacity. Set your markup. Build your network.",
      body: "Tap into Reanzly's published rate card, apply your own markup, and resell to your sub-brokers and customers. Manage enquiries, quote on marketplace loads, run settlement cycles, and get paid via NACH. Your own brokerage, on Reanzly rails.",
      stats: [
        { k: "Lanes", v: "10+" },
        { k: "Markup", v: "8% avg" },
        { k: "Settlement", v: "Auto" },
      ],
    },
  };
  const copy = portalCopy[portal];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {/* Top hairline brand bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-foreground text-[11px] font-bold text-background">
            RZ
          </span>
          <span className="text-[13px] font-semibold tracking-tight">Reanzly</span>
          <span className="hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:inline">
            Logistics OS
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => setMarketingView("landing")}
            className="tap flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to website
          </button>
          <span className="hidden h-3 w-px bg-border md:block" />
          <span className="hidden items-center gap-1.5 md:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            DPDP + GDPR compliant
          </span>
          <span className="hidden h-3 w-px bg-border md:block" />
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="hover:text-foreground"
          >
            Help
          </a>
          <span className="h-3 w-px bg-border" />
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setAuthMode("signup");
            }}
            className="font-medium text-foreground hover:underline underline-offset-4"
          >
            Create account
          </a>
        </div>
      </header>

      {/* Main split: brand panel (desktop) + form */}
      <main className="flex flex-1 overflow-hidden">
        {/* Brand / marketing panel - desktop only (Gestalt: one visual mass) */}
        <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-foreground p-12 text-background lg:flex lg:p-16">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-background text-[12px] font-bold text-foreground">
              RZ
            </span>
            <span className="text-[13px] font-medium uppercase tracking-[0.16em]">
              {copy.tag}
            </span>
          </div>

          <div className="space-y-7">
            <h1 className="max-w-md text-[40px] font-semibold leading-[1.05] tracking-tight">
              {copy.title}
            </h1>
            <p className="max-w-md text-[14px] leading-relaxed text-background/70">
              {copy.body}
            </p>

            {/* Feature bullets - 4 short trust markers */}
            <ul className="grid grid-cols-2 gap-2.5">
              {[
                "14-day free trial",
                "DPDP + GDPR compliant",
                "Indian data residency",
                "Cancel anytime",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2 text-[12px] text-background/80"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-background/60" />
                  {line}
                </li>
              ))}
            </ul>

            {/* Stat row - tabular mono, hairline grid */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[6px] border border-background/20 bg-background/20">
              {copy.stats.map((s) => (
                <div key={s.k} className="bg-foreground p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-background/60">
                    {s.k}
                  </p>
                  <p className="mt-1 text-[22px] font-semibold tabular-nums">{s.v}</p>
                </div>
              ))}
            </div>

            {/* Module strip - quick inventory of what's behind the door */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "Trips",
                "Fleet map",
                "LR / POD",
                "Rate cards",
                "GST",
                "Payroll",
                "HR",
                "CRM",
                "Rean AI",
              ].map((m) => (
                <span
                  key={m}
                  className="rounded-[3px] border border-background/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-background/70"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-background/50">
            <span className="font-mono">{currentPortal.domain}</span>
            <span>Mumbai · Pune · Delhi · Bengaluru</span>
          </div>

          {/* Decorative grid lines - Swiss aesthetic */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
        </section>

        {/* Form panel */}
        <section className="flex flex-1 items-center justify-center overflow-y-auto p-6 sm:p-10">
          <div className="w-full max-w-[440px]">
            {/* Mobile brand line */}
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-foreground text-[12px] font-bold text-background">
                RZ
              </span>
              <span className="text-[15px] font-semibold tracking-tight">Reanzly</span>
            </div>

            {/* Portal selector - 5-tab segmented control (Hick's: limited choice) */}
            <div className="mb-5">
              <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Sign in to
              </p>
              <div className="grid grid-cols-5 gap-1 rounded-[6px] border border-border bg-muted/30 p-1">
                {PORTALS.map((p) => {
                  const Icon = p.icon;
                  const active = portal === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPortal(p.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-[4px] px-1 py-2 text-[11px] font-medium transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                      aria-pressed={active}
                      title={p.domain}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="font-mono text-[10px] text-muted-foreground">
                  {currentPortal.domain}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {currentPortal.blurb.split(" - ")[0]}
                </p>
              </div>
            </div>

            <div className="mb-5">
              <h2 className="text-[22px] font-semibold tracking-tight">Sign in</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {currentPortal.blurb}
              </p>
            </div>

            {/* Quick role picker - adapts to the selected portal.
                For the SuperAdmin portal we render a dedicated CTA card
                and SKIP the email/password form entirely. SuperAdmin auth
                is a separate, two-step flow handled by <AdminLogin /> in
                the SuperAdminShell - showing a second form here would
                create a confusing double-login ("stuck") experience. */}
            {quickRoles.length > 1 ? (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Quick login as
                  </p>
                  <p className="text-[10px] text-muted-foreground">double-tap to skip form</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quickRoles.map((rid) => {
                    const role = ROLE_ARCHETYPES.find((x) => x.id === rid);
                    if (!role) return null;
                    const active = effectiveRole === rid;
                    return (
                      <button
                        key={rid}
                        type="button"
                        onClick={() => setSelectedRole(rid)}
                        onDoubleClick={() => quickLogin(rid)}
                        className={cn(
                          "group relative flex flex-col items-start gap-1 rounded-[6px] border p-2.5 text-left transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background hover:bg-accent",
                        )}
                        aria-pressed={active}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span
                            className={cn(
                              "flex h-6 items-center rounded-[3px] px-1.5 text-[9px] font-bold tracking-wider",
                              active ? "bg-background text-foreground" : "bg-foreground text-background",
                            )}
                          >
                            {ROLE_TAG[rid] || rid.slice(0, 3).toUpperCase()}
                          </span>
                          {active && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <span className="text-[12px] font-medium leading-tight">
                          {role.name.split(" ")[0]}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] leading-tight",
                            active ? "text-background/70" : "text-muted-foreground",
                          )}
                        >
                          {role.branch}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : portal === "superadmin" ? (
              <div className="mb-5 rounded-[6px] border border-foreground/30 bg-foreground/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[12px] font-bold text-background">
                    {ROLE_TAG[quickRoles[0]] || quickRoles[0].slice(0, 3).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-foreground">
                        {ROLE_ARCHETYPES.find((r) => r.id === quickRoles[0])?.name}
                      </p>
                      <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        admin.reanzly.com
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                      Internal staff sign-in is a separate, two-step flow. You will
                      pick your role and enter your Reanzly work credentials on the
                      next screen.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => quickLogin(quickRoles[0])}
                  disabled={submitting}
                  className="tap mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Routing to admin sign-in...
                    </>
                  ) : (
                    <>
                      Continue to admin sign-in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="mt-2.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  2FA enforced for all internal roles
                </p>
              </div>
            ) : (
              <div className="mb-5 rounded-[6px] border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[11px] font-bold text-background">
                    {ROLE_TAG[quickRoles[0]] || quickRoles[0].slice(0, 3).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground">
                      {ROLE_ARCHETYPES.find((r) => r.id === quickRoles[0])?.name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {ROLE_ARCHETYPES.find((r) => r.id === quickRoles[0])?.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => quickLogin(quickRoles[0])}
                  disabled={submitting}
                  className="tap mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in as {ROLE_ARCHETYPES.find((r) => r.id === quickRoles[0])?.name.split(" ")[0]}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Divider + email/password form - hidden for the SuperAdmin
                portal because admin auth is handled by <AdminLogin /> in
                the SuperAdminShell. Showing it here would create a
                double-login ("stuck") UX. */}
            {portal !== "superadmin" && (
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                or with credentials
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            )}

            {portal !== "superadmin" && (
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              {/* Email */}
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Work email
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Clear any stale error the moment the user starts
                      // editing - so a "Work email is required." from a
                      // previous empty submit doesn't linger while they
                      // type a valid address.
                      if (error) setError(null);
                    }}
                    placeholder={emailPh}
                    autoComplete="email"
                    className="h-11 w-full rounded-[6px] border border-border bg-background pl-9 pr-3 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground"
                  />
                </div>
              </label>

              {/* Password */}
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Password
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={pwPh}
                    autoComplete="current-password"
                    className="h-11 w-full rounded-[6px] border border-border bg-background pl-9 pr-10 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {/* Error */}
              {error && (
                <p className="rounded-[5px] border border-border bg-accent/40 px-3 py-2 text-[12px] text-foreground">
                  {error}
                </p>
              )}

              {/* Row: remember + forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded-[3px] border-border accent-foreground"
                  />
                  Keep me signed in
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setError("Demo build - password resets aren't wired. Use any 4+ char password.")
                  }
                  className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Forgot?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "tap mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[14px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in to {currentPortal.label}…
                  </>
                ) : (
                  <>
                    Sign in to {currentPortal.label}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
            )}

            {/* Switch to signup - hidden for the SuperAdmin portal
                because internal staff accounts are provisioned, not self-served. */}
            {portal !== "superadmin" && (
            <div className="mt-5 rounded-[6px] border border-border bg-muted/30 px-3 py-2.5">
              <p className="text-[12px] text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="font-medium text-foreground hover:underline underline-offset-4"
                >
                  Create one
                </button>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span>
                  {portal === "app"
                    ? "Onboard your organisation in under 2 minutes."
                    : portal === "driver"
                      ? "Driver accounts are created by your fleet manager."
                      : portal === "broker"
                        ? "Become a Reanzly Broker Partner - start your brokerage in minutes."
                        : "Vendor portals are issued by your logistics partner."}
                </span>
              </p>
            </div>
            )}

            {/* SuperAdmin-only notice replaces the signup CTA */}
            {portal === "superadmin" && (
              <div className="mt-5 rounded-[6px] border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-[12px] text-muted-foreground">
                  Internal staff accounts are provisioned by Reanzly HQ.
                  Need access? Ask{" "}
                  <span className="font-medium text-foreground">anand.kumar@reanzly.com</span>{" "}
                  to invite you.
                </p>
              </div>
            )}

            {/* Trust line */}
            <div className="mt-5 flex items-start gap-2 rounded-[6px] border border-border bg-background px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                DPDP + GDPR compliant. Row-level tenant isolation. Session
                {selectedRoleObj ? (
                  <>
                    {" "}
                    binds as{" "}
                    <span className="font-medium text-foreground">{selectedRoleObj.name}</span>.
                  </>
                ) : null}
              </p>
            </div>

            {/* Footer microcopy */}
            <div className="mt-5 flex flex-col items-center gap-1 text-center">
              <p className="text-[11px] text-muted-foreground">
                By signing in you agree to the{" "}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="font-medium text-foreground hover:underline underline-offset-4"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="font-medium text-foreground hover:underline underline-offset-4"
                >
                  Privacy Policy
                </a>
                .
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Demo build · no real credentials are checked
              </p>
            </div>

            {/* Footer CTA strip - desktop, mirrors header create-account link */}
            <div className="mt-5 hidden items-center justify-center gap-1 text-[11px] text-muted-foreground lg:flex">
              <span>New to Reanzly?</span>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="flex items-center gap-0.5 font-medium text-foreground hover:underline underline-offset-4"
              >
                Start a free trial
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

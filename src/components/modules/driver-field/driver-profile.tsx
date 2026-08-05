"use client";

import { useState } from "react";
import { useDriverStore } from "@/lib/store/driver-store";
import { useAppStore } from "@/lib/store/app-store";
import { useDriverGeolocation } from "@/hooks/use-geolocation";
import {
  formatINR,
  fmtCoord,
  PERFORMANCE_SCORE,
  fmtPct,
} from "./_helpers";
import { DriverPerformance } from "./driver-performance";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  User,
  Truck,
  Phone,
  IdCard,
  MapPin,
  Signal,
  SignalZero,
  Loader2,
  Check,
  Power,
  Bell,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Trash2,
  Database,
  Trophy,
  X,
  Target,
  Star,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DriverProfile() {
  const s = useDriverStore();
  const logout = useAppStore((s2) => s2.logout);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.driverName);
  const [phone, setPhone] = useState(s.phone);
  const [license, setLicense] = useState(s.licenseNumber);
  const [plate, setPlate] = useState(s.vehicleName);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showFullPerformance, setShowFullPerformance] = useState(false);
  const perf = PERFORMANCE_SCORE;

  const geo = useDriverGeolocation(s.trackingEnabled);
  const lastPing = s.locationPings[0];

  function handleLogout() {
    // Clock out first so dispatch sees the driver as off-duty.
    if (s.duty.checkedIn) {
      s.checkOut();
    }
    toast.success("Signed out. Drive safe.");
    setTimeout(() => logout(), 150);
  }

  function saveIdentity() {
    s.setIdentity({
      driverName: name.trim() || s.driverName,
      phone: phone.trim() || s.phone,
      licenseNumber: license.trim() || s.licenseNumber,
      vehicleName: plate.trim() || s.vehicleName,
    });
    setEditing(false);
    toast.success("Profile updated");
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight">Profile</h1>
        <p className="text-[12px] text-muted-foreground">Driver & vehicle settings</p>
      </header>

      {/* Identity card */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-accent text-[16px] font-semibold">
            {s.driverName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold">{s.driverName}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">ID: {s.driverId}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  s.duty.checkedIn ? "bg-foreground animate-pulse" : "bg-muted-foreground"
                )}
              />
              <span className="text-[11px] font-medium">
                {s.duty.checkedIn ? "On Duty" : "Off Duty"}
              </span>
              {s.duty.startedAt && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  since {new Date(s.duty.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-border">
          <Row icon={User} label="Full Name">
            {editing ? (
              <Input value={name} onChange={setName} />
            ) : (
              <ValueStr>{s.driverName}</ValueStr>
            )}
          </Row>
          <Row icon={Phone} label="Phone">
            {editing ? (
              <Input value={phone} onChange={setPhone} />
            ) : (
              <ValueStr tabular>{s.phone}</ValueStr>
            )}
          </Row>
          <Row icon={IdCard} label="License No.">
            {editing ? (
              <Input value={license} onChange={setLicense} />
            ) : (
              <ValueStr tabular>{s.licenseNumber}</ValueStr>
            )}
          </Row>
          <Row icon={Truck} label="Vehicle Plate">
            {editing ? (
              <Input value={plate} onChange={setPlate} />
            ) : (
              <ValueStr tabular>{s.vehicleName}</ValueStr>
            )}
          </Row>
          <Row icon={Database} label="Vehicle ID">
            <ValueStr tabular>{s.vehicleId}</ValueStr>
          </Row>
        </div>

        <div className="flex gap-2 border-t border-border p-3">
          {editing ? (
            <>
              <button
                onClick={saveIdentity}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground text-[12px] font-medium text-background"
              >
                <Check className="h-4 w-4" /> Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(s.driverName);
                  setPhone(s.phone);
                  setLicense(s.licenseNumber);
                  setPlate(s.vehicleName);
                }}
                className="flex h-9 items-center justify-center rounded-[5px] border border-border px-4 text-[12px] font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-foreground text-[12px] font-medium hover:bg-accent"
            >
              Edit Profile
            </button>
          )}
        </div>
      </section>

      {/* Tracking settings */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <SectionHeader icon={Signal} title="Location Tracking" />
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-[13px] font-medium">GPS Tracking</p>
              <p className="text-[11px] text-muted-foreground">
                Share live location with dispatch while on duty.
              </p>
            </div>
            <Toggle on={s.trackingEnabled} onClick={() => s.setTracking(!s.trackingEnabled)} />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
              <span
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  s.locationPermission === "denied" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {geo.watching && !geo.fix ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : s.trackingEnabled && geo.fix ? (
                  <Signal className="h-3 w-3" />
                ) : (
                  <SignalZero className="h-3 w-3" />
                )}
                {s.locationPermission === "denied"
                  ? "Permission denied"
                  : s.trackingEnabled
                  ? geo.fix
                    ? "Tracking live"
                    : "Acquiring…"
                  : "Paused"}
              </span>
            </div>
            {geo.error && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">{geo.error}</p>
            )}
            {lastPing && (
              <div className="mt-2 rounded-[5px] border border-border bg-accent/20 px-2.5 py-2 text-[11px]">
                <p className="flex items-center gap-1 tabular-nums">
                  <MapPin className="h-3 w-3" />
                  {fmtCoord(lastPing.lat, lastPing.lng)}
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  ±{lastPing.accuracy?.toFixed(0) || "-"}m · {new Date(lastPing.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2">
        <StatCard label="Trips Logged" value={String(s.activities.filter((a) => a.type === "STATUS_UPDATE" && a.payload.status === "Delivered").length)} />
        <StatCard label="PODs Captured" value={String(s.activities.filter((a) => a.type === "POD").length)} />
        <StatCard label="Today" value={formatINR(s.earnings.today)} sub={`${s.earnings.tripsCompletedToday} trips`} />
        <StatCard label="This Week" value={formatINR(s.earnings.week)} sub={`${s.earnings.tripsCompletedWeek} trips`} />
      </section>

      {/* Performance scorecard — compact preview + tap-to-expand */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Performance</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            rank #{perf.rankInFleet}/{perf.fleetSize}
          </span>
        </div>
        <div className="p-4">
          {/* Big score */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Overall Score
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[32px] font-semibold leading-none tabular-nums">{perf.overall}</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">/ 100</span>
              </div>
            </div>
            <span
              className={cn(
                "rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                perf.overall >= 90
                  ? "border-foreground bg-foreground text-background"
                  : perf.overall >= 80
                  ? "border-foreground text-foreground"
                  : "border-border bg-accent/40 text-foreground"
              )}
            >
              {perf.overall >= 90 ? "Elite" : perf.overall >= 80 ? "Strong" : "Steady"}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${perf.overall}%` }}
            />
          </div>

          {/* 4 KPIs */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PerfKpi icon={Target} label="On-time" value={fmtPct(perf.onTimePct)} />
            <PerfKpi icon={Star} label="Rating" value={perf.customerRating.toFixed(1)} />
            <PerfKpi icon={CheckCircle2} label="Completion" value={fmtPct(perf.completionRate)} />
            <PerfKpi
              icon={ShieldAlert}
              label="Incidents"
              value={String(perf.incidents30d)}
            />
          </div>

          {/* Lifetime mini-stats */}
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
            <MiniPerfStat icon={Truck} label="Trips · 30d" value={String(perf.trips30d)} />
            <MiniPerfStat icon={Trophy} label="Lifetime" value={String(perf.tripsLifetime)} />
            <MiniPerfStat
              icon={ShieldCheck}
              label="Inspections"
              value={`${perf.inspectionsPassed}/${perf.totalInspections}`}
            />
          </div>

          <button
            onClick={() => setShowFullPerformance(true)}
            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-[5px] border border-border text-[12px] font-medium hover:bg-accent"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            View full scorecard
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* Full performance Sheet drawer */}
      <Sheet open={showFullPerformance} onOpenChange={setShowFullPerformance}>
        <SheetContent
          showCloseButton={false}
          side="bottom"
          className="mx-auto max-h-[92vh] max-w-[640px] gap-0 p-0"
        >
          <SheetHeader className="flex flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <SheetTitle className="text-[14px] font-semibold">Performance Scorecard</SheetTitle>
            </div>
            <SheetClose>
              <button
                onClick={() => setShowFullPerformance(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          </SheetHeader>
          <SheetDescription className="sr-only">
            Full performance scorecard with score trend, on-time delivery, customer rating, and achievements.
          </SheetDescription>
          <div className="scrollbar-thin overflow-y-auto px-4 py-4 pb-8">
            <DriverPerformance variant="full" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings shortcuts */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <SectionHeader icon={Bell} title="Preferences" />
        <LinkRow icon={Bell} label="Notifications" hint="Alerts for new trips & messages" onClick={() => toast.message("Opens notification preferences")} />
        <LinkRow icon={ShieldCheck} label="Privacy & Data" hint="View what data is stored" onClick={() => toast.message(`${s.activities.length} records · ${s.locationPings.length} pings stored on device`)} />
        <LinkRow icon={Power} label={s.duty.checkedIn ? "Check Out" : "Check In"} hint={s.duty.checkedIn ? "End your duty session" : "Start a duty session"} onClick={() => (s.duty.checkedIn ? s.checkOut() : s.checkIn())} />
      </section>

      {/* Data management */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <SectionHeader icon={Database} title="Data" />
        <div className="p-4 text-[11px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground tabular-nums">{s.activities.length}</span> activity records ·{" "}
            <span className="font-medium text-foreground tabular-nums">{s.locationPings.length}</span> location pings stored locally.
          </p>
          <p className="mt-1">Records sync automatically to the dispatch backend. Pending: {s.activities.filter((a) => !a.synced).length}</p>
        </div>
        <div className="border-t border-border p-3">
          <button
            onClick={() => {
              if (confirm("Clear all local activity records? This cannot be undone.")) {
                s.clearActivities();
                toast.success("Local records cleared");
              }
            }}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[5px] border border-border text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" /> Clear Local Records
          </button>
        </div>
      </section>

      {/* Sign out - destructive-action pattern (Fitts's: large target;
          Progressive Disclosure: confirm before tearing down the session). */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <SectionHeader icon={LogOut} title="Session" />
        <div className="p-4">
          {confirmLogout ? (
            <div className="space-y-3">
              <div className="rounded-[5px] border border-border bg-accent/30 p-3 text-[12px]">
                <p className="font-medium">Sign out of Reanzly?</p>
                <p className="mt-0.5 text-muted-foreground">
                  {s.duty.checkedIn
                    ? "You’re on duty - you’ll be clocked out automatically. Pending records will keep syncing in the background."
                    : "Your local records stay on this device. Pending records will keep syncing in the background."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLogout}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <LogOut className="h-4 w-4" />
                  Yes, sign out
                </button>
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="flex h-10 items-center justify-center rounded-[5px] border border-border px-4 text-[13px] font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLogout(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[5px] border border-border text-[13px] font-medium transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>
      </section>

      <p className="pt-2 text-center text-[10px] text-muted-foreground">
        Reanzly Driver · v3.0 · Monochrome
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  );
}

function ValueStr({ children, tabular }: { children: React.ReactNode; tabular?: boolean }) {
  return (
    <span className={cn("text-[13px] font-medium", tabular && "tabular-nums")}>{children}</span>
  );
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full max-w-[180px] rounded-[5px] border border-border bg-background px-2 text-right text-[13px] outline-none focus:border-foreground"
    />
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        on ? "border-foreground bg-foreground" : "border-border bg-accent"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2.5">
      <Icon className="h-4 w-4" />
      <span className="text-[12px] font-semibold">{title}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof User;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-0 hover:bg-accent/30"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function PerfKpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[5px] border border-border p-2.5">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MiniPerfStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-0.5 text-[13px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useWarehouseFieldStore } from "@/lib/store/warehouse-field-store";
import { useAppStore } from "@/lib/store/app-store";
import {
  User,
  Phone,
  IdCard,
  Warehouse,
  Check,
  Power,
  Bell,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Trash2,
  Database,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function WarehouseFieldProfile() {
  const s = useWarehouseFieldStore();
  const logout = useAppStore((s2) => s2.logout);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.crewName);
  const [phone, setPhone] = useState(s.phone);
  const [empCode, setEmpCode] = useState(s.employeeCode);
  const [godown, setGodown] = useState(s.godown);
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    // Clock out first so the godown floor lead sees the crew member as
    // off-shift immediately.
    if (s.duty.checkedIn) {
      s.checkOut();
    }
    toast.success("Signed out. See you on the next shift.");
    setTimeout(() => logout(), 150);
  }

  function saveIdentity() {
    s.setIdentity({
      crewName: name.trim() || s.crewName,
      phone: phone.trim() || s.phone,
      employeeCode: empCode.trim() || s.employeeCode,
      godown: godown.trim() || s.godown,
    });
    setEditing(false);
    toast.success("Profile updated");
  }

  const completedCount = s.activities.filter(
    (a) => a.type === "STATUS_UPDATE" && a.payload.status === "Completed"
  ).length;
  const exceptionCount = s.activities.filter((a) => a.type === "EXCEPTION").length;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight">Profile</h1>
        <p className="text-[12px] text-muted-foreground">Crew & shift settings</p>
      </header>

      {/* Identity card */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground bg-accent text-[16px] font-semibold">
            {s.crewName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-semibold">{s.crewName}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">ID: {s.crewId}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  s.duty.checkedIn ? "bg-foreground animate-pulse" : "bg-muted-foreground"
                )}
              />
              <span className="text-[11px] font-medium">
                {s.duty.checkedIn ? "On Shift" : "Off Shift"}
              </span>
              {s.duty.startedAt && (
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  since{" "}
                  {new Date(s.duty.startedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-border">
          <Row icon={User} label="Full Name">
            {editing ? <Input value={name} onChange={setName} /> : <ValueStr>{s.crewName}</ValueStr>}
          </Row>
          <Row icon={Phone} label="Phone">
            {editing ? <Input value={phone} onChange={setPhone} /> : <ValueStr tabular>{s.phone}</ValueStr>}
          </Row>
          <Row icon={IdCard} label="Employee Code">
            {editing ? (
              <Input value={empCode} onChange={setEmpCode} />
            ) : (
              <ValueStr tabular>{s.employeeCode}</ValueStr>
            )}
          </Row>
          <Row icon={Warehouse} label="Godown">
            {editing ? <Input value={godown} onChange={setGodown} /> : <ValueStr>{s.godown}</ValueStr>}
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
                  setName(s.crewName);
                  setPhone(s.phone);
                  setEmpCode(s.employeeCode);
                  setGodown(s.godown);
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

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2">
        <StatCard icon={ClipboardCheck} label="Tasks Completed" value={String(completedCount)} />
        <StatCard icon={AlertTriangle} label="Exceptions Flagged" value={String(exceptionCount)} />
      </section>

      {/* Preferences */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <SectionHeader icon={Bell} title="Preferences" />
        <LinkRow
          icon={Bell}
          label="Notifications"
          hint="Alerts for new task assignments"
          onClick={() => toast.message("Opens notification preferences")}
        />
        <LinkRow
          icon={ShieldCheck}
          label="Privacy & Data"
          hint="View what data is stored"
          onClick={() => toast.message(`${s.activities.length} records stored on device`)}
        />
        <LinkRow
          icon={Power}
          label={s.duty.checkedIn ? "Check Out" : "Check In"}
          hint={s.duty.checkedIn ? "End your shift" : "Start your shift"}
          onClick={() => (s.duty.checkedIn ? s.checkOut() : s.checkIn())}
        />
      </section>

      {/* Data management */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <SectionHeader icon={Database} title="Data" />
        <div className="p-4 text-[11px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground tabular-nums">{s.activities.length}</span>{" "}
            activity records stored locally on this device.
          </p>
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
                    ? "You're on shift - you'll be checked out automatically."
                    : "Your local records stay on this device."}
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
        Reanzly Warehouse · v3.0 · Monochrome
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

function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2.5">
      <Icon className="h-4 w-4" />
      <span className="text-[12px] font-semibold">{title}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-[15px] font-semibold tabular-nums">{value}</p>
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

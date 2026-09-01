"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";
import {
  Lock, ShieldCheck, Check, X, Smartphone, Monitor, Tablet, AlertCircle, KeyRound, Trash2,
} from "lucide-react";
import { SESSIONS_MOCK, passwordStrength, type SessionRow } from "../_helpers";

export function LoginSecuritySection() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [twoFA, setTwoFA] = useState(true);
  const [sessions, setSessions] = useState(SESSIONS_MOCK);

  const strength = passwordStrength(newPw);
  const matches = newPw === confirm && newPw.length > 0;

  const handleChangePassword = () => {
    if (!current || !newPw || !confirm) {
      toast("All fields required", { description: "Fill in current and new passwords." });
      return;
    }
    if (newPw !== confirm) {
      toast("Passwords don't match", { description: "New password and confirmation must match." });
      return;
    }
    if (strength.score < 3) {
      toast("Password too weak", { description: "Meet at least 3 strength requirements." });
      return;
    }
    toast.success("Password changed", { description: "You'll be asked to re-login on other devices." });
    setCurrent(""); setNewPw(""); setConfirm("");
  };

  const terminate = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast("Session terminated", { description: "The device has been signed out." });
  };

  const terminateAllOthers = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.success("All other sessions terminated", { description: "Only this device remains signed in." });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Login & Security</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Password, two-factor authentication, and active sessions.</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Change Password</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Current Password</label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" className="h-8 rounded-[5px] text-[13px] tabular" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">New Password</label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" className="h-8 rounded-[5px] text-[13px] tabular" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Confirm Password</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="h-8 rounded-[5px] text-[13px] tabular" />
            {confirm.length > 0 && (
              <div className={"mt-1 text-[11px] " + (matches ? "text-foreground" : "text-muted-foreground")}>
                {matches ? "✓ Passwords match" : "✕ Do not match"}
              </div>
            )}
          </div>
        </div>

        {/* Strength meter */}
        {newPw.length > 0 && (
          <div className="mt-4 rounded-[5px] border border-border bg-background p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Strength</span>
              <span className="text-[12px] font-medium text-foreground">{strength.label}</span>
            </div>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={"h-1 flex-1 rounded-full " + (i <= strength.score ? "bg-foreground" : "bg-muted")}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {Object.entries(strength.checks).map(([label, ok]) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px]">
                  {ok ? (
                    <Check className="h-3 w-3 text-foreground" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Btn variant="primary" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={handleChangePassword}>
            Update Password
          </Btn>
        </div>
      </div>

      {/* 2FA */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-medium text-foreground">Two-Factor Authentication (2FA)</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Add a second verification step using an authenticator app. Required for owners and finance roles.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge variant={twoFA ? "solid" : "muted"}>
                  {twoFA ? "Enabled" : "Disabled"}
                </StatusBadge>
                {twoFA && (
                  <span className="text-[11px] text-muted-foreground">Authenticator app · Last verified 4h ago</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={twoFA}
              onCheckedChange={(v) => {
                setTwoFA(v);
                toast(v ? "2FA enabled" : "2FA disabled", {
                  description: v ? "Use Google Authenticator or similar to scan the QR." : "Your account is less secure.",
                });
              }}
              className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
            />
            {twoFA && (
              <Btn size="sm" onClick={() => toast("Regenerate backup codes", { description: "Old codes are invalidated." })}>
                Backup Codes
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Active Sessions</h3>
          </div>
          <Btn size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={terminateAllOthers}>
            Terminate All Others
          </Btn>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Device</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Browser</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">IP Address</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Active</th>
                <th className="w-24 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <DeviceIcon device={s.device} />
                      <div>
                        <div className="text-[13px] font-medium text-foreground">{s.device}</div>
                        {s.isCurrent && <StatusBadge variant="solid" className="text-[10px]">Current</StatusBadge>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground">{s.browser}</td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground tabular">{s.ip}</td>
                  <td className="px-4 py-2.5 text-[13px] text-foreground">{s.location}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{relTime(s.lastActive)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!s.isCurrent && (
                      <button
                        onClick={() => terminate(s.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                      >
                        Terminate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions.length === 0 && (
          <div className="py-8 text-center text-[13px] text-muted-foreground">No active sessions.</div>
        )}
      </div>
    </div>
  );
}

function DeviceIcon({ device }: { device: string }) {
  const isPhone = /iPhone|Android|Mobile/i.test(device);
  const isTablet = /iPad|Tablet/i.test(device);
  if (isPhone) return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  if (isTablet) return <Tablet className="h-4 w-4 text-muted-foreground" />;
  return <Monitor className="h-4 w-4 text-muted-foreground" />;
}

function relTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Clock, Save, Moon } from "lucide-react";
import {
  NOTIF_EVENTS, NOTIF_CHANNELS, DEFAULT_NOTIF_MATRIX,
} from "../_helpers";

export function NotificationsSection() {
  const [matrix, setMatrix] = useState(DEFAULT_NOTIF_MATRIX);
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [digest, setDigest] = useState("Daily");
  const [digestTime, setDigestTime] = useState("08:30");

  const toggle = (eventId: string, channelId: string) => {
    setMatrix((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], [channelId]: !prev[eventId][channelId] },
    }));
  };

  const handleSave = () => {
    toast.success("Notification preferences saved", {
      description: `${Object.values(matrix).flat().filter(Boolean).length} channels active across ${NOTIF_EVENTS.length} event types.`,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Notifications</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Choose how and when you receive event notifications.</p>
        </div>
        <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave}>Save Preferences</Btn>
      </div>

      {/* Channel matrix */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Event × Channel Matrix</h3>
          </div>
          <span className="text-[11px] text-muted-foreground tabular">{NOTIF_EVENTS.length} events · {NOTIF_CHANNELS.length} channels</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Event Category</th>
                {NOTIF_CHANNELS.map((c) => (
                  <th key={c.id} className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-24">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {NOTIF_EVENTS.map((ev) => (
                <tr key={ev.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="text-[13px] font-medium text-foreground">{ev.label}</div>
                    <div className="text-[11px] text-muted-foreground">{ev.description}</div>
                  </td>
                  {NOTIF_CHANNELS.map((c) => (
                    <td key={c.id} className="px-4 py-2.5 text-center">
                      <Switch
                        checked={matrix[ev.id][c.id]}
                        onCheckedChange={() => toggle(ev.id, c.id)}
                        className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Quiet Hours</h3>
          </div>
          <Switch
            checked={quietEnabled}
            onCheckedChange={setQuietEnabled}
            className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
          />
        </div>
        <div className={`grid grid-cols-2 gap-4 transition-opacity ${quietEnabled ? "" : "opacity-40 pointer-events-none"}`}>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Start Time</label>
            <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">End Time</label>
            <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Non-critical notifications are batched and delivered after quiet hours end. Critical alerts bypass quiet hours.
        </p>
      </div>

      {/* Notification Digest */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Notification Digest</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Digest Frequency</label>
            <Select value={digest} onValueChange={setDigest}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Off", "Daily", "Weekly"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Delivery Time</label>
            <Input type="time" value={digestTime} onChange={(e) => setDigestTime(e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          A consolidated email summary of non-urgent notifications. Urgent items are still delivered in real time.
        </p>
      </div>
    </div>
  );
}

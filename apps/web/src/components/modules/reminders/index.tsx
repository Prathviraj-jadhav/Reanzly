"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { Reminder } from "@/lib/types";
import { toast } from "sonner";
import { RemindersList } from "./reminders-list";
import { AddReminderDrawer } from "./add-reminder-drawer";

export function RemindersModule() {
  const { activeView, navigate } = useAppStore();
  // Real, database-backed reminders (src/app/api/reminders) - previously
  // useState(REMINDERS) seeded from mock-data.ts.
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ reminders }) => setReminders(reminders))
      .catch(() => toast.error("Couldn't load reminders", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addReminder = useCallback(async (r: Reminder): Promise<boolean> => {
    const { id: _clientId, ...payload } = r;
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create reminder", { description: body.error || "Try again." });
      return false;
    }
    const { reminder } = await res.json();
    setReminders((prev) => [reminder, ...prev]);
    return true;
  }, []);

  const updateReminder = useCallback(async (id: string, data: Partial<Reminder>): Promise<boolean> => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r))); // optimistic
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save reminder", { description: body.error || "Try again." });
      return false;
    }
    const { reminder } = await res.json();
    setReminders((prev) => prev.map((r) => (r.id === id ? reminder : r)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading reminders…</div>;
  }

  const drawerOpen =
    activeView.module === "reminders" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "reminders" && activeView.view === "create") {
      navigate("reminders");
    }
  };

  return (
    <>
      <RemindersList
        reminders={reminders}
        onCreate={() => navigate("reminders", "create")}
        onUpdate={updateReminder}
      />
      <AddReminderDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addReminder} />
    </>
  );
}

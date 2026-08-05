"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { REMINDERS } from "@/lib/mock-data";
import type { Reminder } from "@/lib/types";
import { RemindersList } from "./reminders-list";
import { AddReminderDrawer } from "./add-reminder-drawer";

export function RemindersModule() {
  const { activeView, navigate } = useAppStore();
  // Lift REMINDERS into state so in-session adds/edits persist.
  const [reminders, setReminders] = useState<Reminder[]>(REMINDERS);

  const addReminder = useCallback((r: Reminder) => {
    setReminders((prev) => [r, ...prev]);
  }, []);

  const updateReminder = useCallback((id: string, data: Partial<Reminder>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

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

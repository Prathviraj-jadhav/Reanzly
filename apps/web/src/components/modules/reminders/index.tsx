"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { Reminder } from "@/lib/types";
import { toast } from "sonner";
import { RemindersList } from "./reminders-list";
import { AddReminderDrawer } from "./add-reminder-drawer";
import {
  fetchReminders,
  createReminder,
  patchReminder,
  pilotErrorMessage,
} from "@/lib/pilot-api";

export function RemindersModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchReminders()
      .then(setReminders)
      .catch(() => toast.error("Couldn't load reminders", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addReminder = useCallback(async (r: Reminder): Promise<boolean> => {
    const { id: _clientId, ...payload } = r;
    try {
      const reminder = await createReminder(payload);
      setReminders((prev) => [reminder, ...prev]);
      return true;
    } catch (error) {
      toast.error("Couldn't create reminder", {
        description: pilotErrorMessage(error, "Try again."),
      });
      return false;
    }
  }, []);

  const updateReminder = useCallback(async (id: string, data: Partial<Reminder>): Promise<boolean> => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    try {
      const reminder = await patchReminder(id, data);
      setReminders((prev) => prev.map((r) => (r.id === id ? reminder : r)));
      return true;
    } catch (error) {
      toast.error("Couldn't save reminder", {
        description: pilotErrorMessage(error, "Try again."),
      });
      return false;
    }
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading reminders…</div>;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      goToModule("reminders");
    }
  };

  return (
    <>
      <RemindersList
        reminders={reminders}
        onCreate={() => goToModule("reminders", "create")}
        onUpdate={updateReminder}
      />
      <AddReminderDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addReminder} />
    </>
  );
}

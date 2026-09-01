"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { HelpdeskTicket } from "./_helpers";
import { TicketsList } from "./tickets-list";
import { TicketDetail } from "./ticket-detail";
import { AddTicketDrawer } from "./add-ticket-drawer";
import { toast } from "sonner";
import {
  fetchHelpdeskTickets,
  createHelpdeskTicket,
  patchHelpdeskTicket,
  pilotErrorMessage,
} from "@/lib/pilot-api";

export function HelpdeskModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "helpdesk");

  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchHelpdeskTickets()
      .then(setTickets)
      .catch(() => toast.error("Couldn't load helpdesk tickets", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addTicket = useCallback(async (t: HelpdeskTicket): Promise<boolean> => {
    const { id: _clientId, ...payload } = t;
    try {
      const ticket = await createHelpdeskTicket(payload);
      setTickets((prev) => [ticket, ...prev]);
      return true;
    } catch (error) {
      toast.error("Couldn't create ticket", {
        description: pilotErrorMessage(error, "Try again."),
      });
      return false;
    }
  }, []);

  const updateTicket = useCallback(async (id: string, patch: Record<string, unknown>): Promise<boolean> => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as HelpdeskTicket : t)));
    try {
      const ticket = await patchHelpdeskTicket(id, patch);
      setTickets((prev) => prev.map((t) => (t.id === id ? ticket : t)));
      return true;
    } catch {
      toast.error("Couldn't update ticket", { description: "Reload to see the real current state." });
      return false;
    }
  }, []);

  if (view.view === "detail" && view.id) {
    return <TicketDetail ticketId={view.id} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      navigateCompat("helpdesk");
    }
  };

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading helpdesk…</div>;
  }

  return (
    <>
      <TicketsList tickets={tickets} onCreate={() => navigateCompat("helpdesk", "create")} onUpdate={updateTicket} />
      <AddTicketDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addTicket} />
    </>
  );
}

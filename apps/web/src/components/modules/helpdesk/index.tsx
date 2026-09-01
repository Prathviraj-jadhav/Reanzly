"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { HelpdeskTicket } from "./_helpers";
import { TicketsList } from "./tickets-list";
import { TicketDetail } from "./ticket-detail";
import { AddTicketDrawer } from "./add-ticket-drawer";
import { toast } from "sonner";

export function HelpdeskModule() {
  const { activeView, navigate } = useAppStore();

  // Real, database-backed tickets (src/app/api/helpdesk) - previously
  // useState(HELPDESK_TICKETS) seeded from a client-only mock array.
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/helpdesk")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ tickets }) => setTickets(tickets))
      .catch(() => toast.error("Couldn't load helpdesk tickets", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addTicket = useCallback(async (t: HelpdeskTicket): Promise<boolean> => {
    const { id: _clientId, ...payload } = t;
    const res = await fetch("/api/helpdesk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create ticket", { description: body.error || "Try again." });
      return false;
    }
    const { ticket } = await res.json();
    setTickets((prev) => [ticket, ...prev]);
    return true;
  }, []);

  const updateTicket = useCallback(async (id: string, patch: Record<string, unknown>): Promise<boolean> => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as HelpdeskTicket : t))); // optimistic
    const res = await fetch(`/api/helpdesk/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Couldn't update ticket", { description: "Reload to see the real current state." });
      return false;
    }
    const { ticket } = await res.json();
    setTickets((prev) => prev.map((t) => (t.id === id ? ticket : t)));
    return true;
  }, []);

  // Detail view - route before any list hooks to keep hook order stable.
  if (
    activeView.module === "helpdesk" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <TicketDetail ticketId={activeView.id} />;
  }

  const drawerOpen =
    activeView.module === "helpdesk" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "helpdesk" && activeView.view === "create") {
      navigate("helpdesk");
    }
  };

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading helpdesk…</div>;
  }

  return (
    <>
      <TicketsList tickets={tickets} onCreate={() => navigate("helpdesk", "create")} onUpdate={updateTicket} />
      <AddTicketDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addTicket} />
    </>
  );
}

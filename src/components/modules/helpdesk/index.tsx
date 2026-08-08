"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { HELPDESK_TICKETS, type HelpdeskTicket } from "./_helpers";
import { TicketsList } from "./tickets-list";
import { TicketDetail } from "./ticket-detail";
import { AddTicketDrawer } from "./add-ticket-drawer";

export function HelpdeskModule() {
  const { activeView, navigate } = useAppStore();
  // Lift HELPDESK_TICKETS into state so in-session adds persist across list ↔ detail.
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(HELPDESK_TICKETS);

  const addTicket = useCallback((t: HelpdeskTicket) => {
    setTickets((prev) => [t, ...prev]);
  }, []);

  const updateTicket = useCallback((id: string, data: Partial<HelpdeskTicket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
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

  return (
    <>
      <TicketsList tickets={tickets} onCreate={() => navigate("helpdesk", "create")} onAdd={addTicket} onUpdate={updateTicket} />
      <AddTicketDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addTicket} />
    </>
  );
}

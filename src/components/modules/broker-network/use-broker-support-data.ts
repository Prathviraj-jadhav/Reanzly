"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export interface TicketMessage {
  id: string;
  author: string;
  role: "customer" | "staff" | "system";
  text: string;
  ts: string;
  internal?: boolean;
}

export interface SupportTicketDTO {
  id: string;
  ticketId: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
}

export function useBrokerSupportData() {
  const [tickets, setTickets] = useState<SupportTicketDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/support");
      if (res.ok) {
        setTickets(await res.json());
      }
    } catch {
      toast.error("Could not load support tickets.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTicket = useCallback(async (input: Partial<SupportTicketDTO>) => {
    const res = await fetch("/api/broker/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not create support ticket.", { description: body.error });
      return null;
    }
    setTickets((prev) => [body, ...prev]);
    return body as SupportTicketDTO;
  }, []);

  const addMessage = useCallback(async (id: string, text: string) => {
    const res = await fetch(`/api/broker/support/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not send message.", { description: body.error });
      return false;
    }
    setTickets((prev) => prev.map((s) => (s.id === id ? body : s)));
    return true;
  }, []);

  return { tickets, loaded, reload, addTicket, addMessage };
}

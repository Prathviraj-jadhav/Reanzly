"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import type { ApprovalRequest } from "./_helpers";
import { ApprovalsList } from "./approvals-list";
import { ApprovalDetail } from "./approval-detail";

export function ApprovalsModule() {
  const { activeView } = useAppStore();
  // Real, database-backed approval requests (src/app/api/approvals) -
  // previously useState(APPROVAL_REQUESTS) seeded from the module's own
  // client-only mock array. Detail view now reads from this same fetched
  // list instead of re-reading the (removed) mock array independently.
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/approvals")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ requests }) => setRequests(requests))
      .catch(() => toast.error("Couldn't load approval requests", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  // Applies an approve/reject/delegate/withdraw decision via the real API
  // and reconciles local state from the server's authoritative response.
  const applyAction = useCallback(
    async (
      id: string,
      action: "approve" | "reject" | "delegate" | "withdraw",
      payload?: { comment?: string; delegateTo?: string },
    ): Promise<ApprovalRequest | null> => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Couldn't record decision", { description: body.error || "Try again." });
        return null;
      }
      const { request } = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)));
      return request;
    },
    [],
  );

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading approval requests…</div>;
  }

  // Detail view - route before any list hooks to keep hook order stable.
  if (
    activeView.module === "approvals" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <ApprovalDetail requestId={activeView.id} requests={requests} onAction={applyAction} />;
  }

  return <ApprovalsList requests={requests} onAction={applyAction} />;
}

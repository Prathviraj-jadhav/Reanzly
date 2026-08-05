"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { APPROVAL_REQUESTS, type ApprovalRequest } from "./_helpers";
import { ApprovalsList } from "./approvals-list";
import { ApprovalDetail } from "./approval-detail";

export function ApprovalsModule() {
  const { activeView } = useAppStore();
  // Lift APPROVAL_REQUESTS into state so decisions persist across list ↔ detail.
  const [requests, setRequests] = useState<ApprovalRequest[]>(APPROVAL_REQUESTS);

  const updateRequest = useCallback((id: string, data: Partial<ApprovalRequest>) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  // Detail view — route before any list hooks to keep hook order stable.
  if (
    activeView.module === "approvals" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <ApprovalDetail requestId={activeView.id} />;
  }

  return <ApprovalsList requests={requests} onUpdate={updateRequest} />;
}

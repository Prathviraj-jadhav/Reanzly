"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { ISSUES } from "@/lib/mock-data";
import type { Issue } from "@/lib/types";
import { IssuesList } from "./issues-list";
import { IssueDetail } from "./issue-detail";
import { AddIssueDrawer } from "./add-issue-drawer";

export function IssuesModule() {
  const { activeView, navigate } = useAppStore();
  // Lift ISSUES into state so in-session adds/edits persist across list ↔ detail.
  const [issues, setIssues] = useState<Issue[]>(ISSUES);

  const addIssue = useCallback((i: Issue) => {
    setIssues((prev) => [i, ...prev]);
  }, []);

  const updateIssue = useCallback((id: string, data: Partial<Issue>) => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  }, []);

  if (
    activeView.module === "issues" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <IssueDetail issueId={activeView.id} />;
  }

  const drawerOpen =
    activeView.module === "issues" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "issues" && activeView.view === "create") {
      navigate("issues");
    }
  };

  return (
    <>
      <IssuesList
        issues={issues}
        onCreate={() => navigate("issues", "create")}
        onUpdate={updateIssue}
        onAdd={addIssue}
      />
      <AddIssueDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addIssue} />
    </>
  );
}

"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { Issue } from "@/lib/types";
import { toast } from "sonner";
import { IssuesList } from "./issues-list";
import { IssueDetail } from "./issue-detail";
import { AddIssueDrawer } from "./add-issue-drawer";

export function IssuesModule() {
  const { activeView, navigate } = useAppStore();
  // Real, database-backed issues (src/app/api/issues) - previously
  // useState(ISSUES) seeded from mock-data.ts.
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/issues")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ issues }) => setIssues(issues))
      .catch(() => toast.error("Couldn't load issues", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addIssue = useCallback(async (i: Issue): Promise<boolean> => {
    const { id: _clientId, ...payload } = i;
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't raise issue", { description: body.error || "Try again." });
      return false;
    }
    const { issue } = await res.json();
    setIssues((prev) => [issue, ...prev]);
    return true;
  }, []);

  const updateIssue = useCallback(async (id: string, data: Partial<Issue>): Promise<boolean> => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i))); // optimistic
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save issue", { description: body.error || "Try again." });
      return false;
    }
    const { issue } = await res.json();
    setIssues((prev) => prev.map((i) => (i.id === id ? issue : i)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading issues…</div>;
  }

  if (
    activeView.module === "issues" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <IssueDetail issueId={activeView.id} issues={issues} onUpdate={updateIssue} />;
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

"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { DocumentRecord } from "@/lib/types";
import { toast } from "sonner";
import { DocumentsList } from "./documents-list";
import { DocumentDetail } from "./document-detail";
import { UploadDocumentDrawer } from "./upload-document-drawer";

export function DocumentsModule() {
  const { activeView, navigate } = useAppStore();
  // Real, database-backed documents (src/app/api/documents) - previously
  // useState(DOCUMENTS) seeded from mock-data.ts, and the "create" flow
  // here had no onAdd handler at all, so uploads were already a silent
  // no-op even before this rewiring.
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ documents }) => setDocuments(documents))
      .catch(() => toast.error("Couldn't load documents", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addDocument = useCallback(async (data: Partial<DocumentRecord>): Promise<boolean> => {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't upload document", { description: body.error || "Try again." });
      return false;
    }
    const { document } = await res.json();
    setDocuments((prev) => [document, ...prev]);
    return true;
  }, []);

  const updateDocument = useCallback(async (id: string, data: Partial<DocumentRecord>): Promise<boolean> => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d))); // optimistic
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save document", { description: body.error || "Try again." });
      return false;
    }
    const { document } = await res.json();
    setDocuments((prev) => prev.map((d) => (d.id === id ? document : d)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading documents…</div>;
  }

  if (
    activeView.module === "documents" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <DocumentDetail documentId={activeView.id} documents={documents} onUpdate={updateDocument} />;
  }

  const drawerOpen =
    activeView.module === "documents" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "documents" && activeView.view === "create") {
      navigate("documents");
    }
  };

  return (
    <>
      <DocumentsList onCreate={() => navigate("documents", "create")} documents={documents} onUpdate={updateDocument} />
      <UploadDocumentDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addDocument} />
    </>
  );
}

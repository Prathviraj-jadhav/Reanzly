"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { DocumentRecord } from "@/lib/types";
import { toast } from "sonner";
import { DocumentsList } from "./documents-list";
import { DocumentDetail } from "./document-detail";
import { UploadDocumentDrawer } from "./upload-document-drawer";

export function DocumentsModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
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
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
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

  if (view.view === "detail" && view.id) {
    return <DocumentDetail documentId={view.id} documents={documents} onUpdate={updateDocument} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      goToModule("documents");
    }
  };

  return (
    <>
      <DocumentsList onCreate={() => goToModule("documents", "create")} documents={documents} onUpdate={updateDocument} />
      <UploadDocumentDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addDocument} />
    </>
  );
}

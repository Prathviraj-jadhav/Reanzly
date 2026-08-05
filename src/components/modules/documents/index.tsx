"use client";
import { useAppStore } from "@/lib/store/app-store";
import { DocumentsList } from "./documents-list";
import { DocumentDetail } from "./document-detail";
import { UploadDocumentDrawer } from "./upload-document-drawer";

export function DocumentsModule() {
  const { activeView, navigate } = useAppStore();

  if (
    activeView.module === "documents" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <DocumentDetail documentId={activeView.id} />;
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
      <DocumentsList onCreate={() => navigate("documents", "create")} />
      <UploadDocumentDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}

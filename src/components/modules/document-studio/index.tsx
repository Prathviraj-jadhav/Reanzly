"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { StudioList } from "./studio-list";
import { TemplateGallery } from "./template-gallery";
import { DocumentBuilder } from "./document-builder";
import { DocumentPreview } from "./document-preview";
import { BrandingSettings } from "./branding-settings";
import { useDocStudioStore } from "./_store";
import {
  Settings as SettingsIcon,
  LayoutGrid,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";

// Local-only views that are NOT driven by the global app-store navigation.
// The global activeView.view drives "list" / "create" (builder) / "detail" (preview),
// while "gallery" and "settings" are local-only.
type LocalView = "gallery" | "settings" | null;

export function DocumentStudioModule() {
  const { activeView, navigate, navigateDetail } = useAppStore();
  const documents = useDocStudioStore((s) => s.documents);
  const draft = useDocStudioStore((s) => s.draft);
  const clearDraft = useDocStudioStore((s) => s.clearDraft);

  const [localView, setLocalView] = useState<LocalView>(null);
  const [brandedOverride, setBrandedOverride] = useState<boolean | undefined>(undefined);

  // Derive the view directly from activeView + localView.
  // Priority: localView (gallery/settings) > activeView.view > list default
  let view: "list" | "builder" | "preview" | "gallery" | "settings";
  if (localView === "gallery") {
    view = "gallery";
  } else if (localView === "settings") {
    view = "settings";
  } else if (activeView.view === "create") {
    view = "builder";
  } else if (activeView.view === "detail" && activeView.id) {
    view = "preview";
  } else {
    view = "list";
  }

  // Builder view is also entered when a draft exists in the store
  if (view === "list" && draft) {
    view = "builder";
  }

  const previewDocId = view === "preview" ? activeView.id : null;

  // ===== Render =====
  if (view === "builder") {
    return (
      <DocumentBuilder
        onExit={() => {
          clearDraft();
          navigate("document-studio");
          setLocalView(null);
        }}
        onCommitted={(docId) => {
          // After commit, jump straight to the preview of the new doc.
          clearDraft();
          navigateDetail("document-studio", docId);
          setLocalView(null);
        }}
      />
    );
  }

  if (view === "settings") {
    return (
      <BrandingSettings
        onBack={() => {
          navigate("document-studio");
          setLocalView(null);
        }}
      />
    );
  }

  if (view === "preview" && previewDocId) {
    const doc = documents.find((d) => d.id === previewDocId);
    if (!doc) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <p className="text-[13px] text-muted-foreground">Document not found.</p>
          <Btn
            variant="outline"
            onClick={() => {
              navigate("document-studio");
              setLocalView(null);
            }}
          >
            Back to Studio
          </Btn>
        </div>
      );
    }
    return (
      <DocumentPreview
        doc={doc}
        onBack={() => {
          navigate("document-studio");
          setLocalView(null);
        }}
        onEdit={() => {
          navigate("document-studio", "create");
          setLocalView(null);
        }}
        reanzlyBrandedOverride={brandedOverride ?? doc.branding.reanzlyBranded}
        onBrandedToggle={(v) => setBrandedOverride(v)}
      />
    );
  }

  if (view === "gallery") {
    return (
      <TemplateGallery
        onBack={() => {
          navigate("document-studio");
          setLocalView(null);
        }}
        onPick={() => {
          // Draft started in store; switch to builder via global nav
          navigate("document-studio", "create");
          setLocalView(null);
        }}
      />
    );
  }

  // Default: list view
  return (
    <div className="flex flex-col gap-4">
      {/* Quick-actions strip (above the list) */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Btn
          variant="outline"
          size="sm"
          icon={<SettingsIcon className="h-3.5 w-3.5" />}
          onClick={() => setLocalView("settings")}
        >
          <span className="hidden sm:inline">Branding Defaults</span>
        </Btn>
        <Btn
          variant="outline"
          size="sm"
          icon={<LayoutGrid className="h-3.5 w-3.5" />}
          onClick={() => setLocalView("gallery")}
        >
          <span className="hidden sm:inline">Browse Templates</span>
        </Btn>
      </div>

      <StudioList
        onCreate={() => setLocalView("gallery")}
        onView={(docId) => {
          setBrandedOverride(undefined);
          navigateDetail("document-studio", docId);
        }}
      />
    </div>
  );
}

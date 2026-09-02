"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
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

type LocalView = "gallery" | "settings" | null;

export function DocumentStudioModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const documents = useDocStudioStore((s) => s.documents);
  const draft = useDocStudioStore((s) => s.draft);
  const clearDraft = useDocStudioStore((s) => s.clearDraft);

  const [localView, setLocalView] = useState<LocalView>(null);
  const [brandedOverride, setBrandedOverride] = useState<boolean | undefined>(undefined);

  let screen: "list" | "builder" | "preview" | "gallery" | "settings";
  if (localView === "gallery") {
    screen = "gallery";
  } else if (localView === "settings") {
    screen = "settings";
  } else if (view.view === "create") {
    screen = "builder";
  } else if (view.view === "detail" && view.id) {
    screen = "preview";
  } else {
    screen = "list";
  }

  if (screen === "list" && draft) {
    screen = "builder";
  }

  const previewDocId = screen === "preview" ? view.id : null;

  if (screen === "builder") {
    return (
      <DocumentBuilder
        onExit={() => {
          clearDraft();
          goToModule("document-studio");
          setLocalView(null);
        }}
        onCommitted={(docId) => {
          clearDraft();
          goToDetail("document-studio", docId);
          setLocalView(null);
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <BrandingSettings
        onBack={() => {
          goToModule("document-studio");
          setLocalView(null);
        }}
      />
    );
  }

  if (screen === "preview" && previewDocId) {
    const doc = documents.find((d) => d.id === previewDocId);
    if (!doc) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <p className="text-[13px] text-muted-foreground">Document not found.</p>
          <Btn
            variant="outline"
            onClick={() => {
              goToModule("document-studio");
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
          goToModule("document-studio");
          setLocalView(null);
        }}
        onEdit={() => {
          goToModule("document-studio", "create");
          setLocalView(null);
        }}
        reanzlyBrandedOverride={brandedOverride ?? doc.branding.reanzlyBranded}
        onBrandedToggle={(v) => setBrandedOverride(v)}
      />
    );
  }

  if (screen === "gallery") {
    return (
      <TemplateGallery
        onBack={() => {
          goToModule("document-studio");
          setLocalView(null);
        }}
        onPick={() => {
          goToModule("document-studio", "create");
          setLocalView(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
          goToDetail("document-studio", docId);
        }}
      />
    </div>
  );
}

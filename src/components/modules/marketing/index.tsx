"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { CampaignsList } from "./campaigns-list";
import { CampaignDetail } from "./campaign-detail";
import { NewCampaignWizard } from "./new-campaign-wizard";
import {
  CAMPAIGNS,
  type Campaign,
  type JourneyStep,
  type CampaignStatus,
} from "./_helpers";
import { toastInfo, toastSuccess } from "@/lib/toast";

export function MarketingModule() {
  const { activeView, navigate, navigateDetail } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [wizardOpen, setWizardOpen] = useState(false);

  const updateJourney = useCallback((campaignId: string, journey: JourneyStep[]) => {
    setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, journey } : c)));
  }, []);

  // ===== Mutations exposed to the list & detail screens =====

  /** Prepend a freshly-created campaign (from the wizard) and navigate to its detail. */
  const handleCreate = (campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev]);
    setWizardOpen(false);
    navigateDetail("marketing", campaign.id);
  };

  /** Duplicate a campaign → prepend a copy with "(Copy)" suffix and Draft status. */
  const duplicateCampaign = useCallback((id: string) => {
    setCampaigns((prev) => {
      const src = prev.find((c) => c.id === id);
      if (!src) return prev;
      const copy: Campaign = {
        ...src,
        id: `cmp-new-${Date.now()}`,
        campaignId: `CMP-${String(2400 + prev.length + 1).padStart(4, "0")}`,
        name: `${src.name} (Copy)`,
        status: "Draft" as CampaignStatus,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        startDate: new Date().toISOString(),
        endDate: undefined,
        owner: "You",
        journey: src.journey.map((s) => ({ ...s, metrics: s.metrics ? { ...s.metrics, sent: 0, opened: 0, clicked: 0, converted: 0 } : undefined })),
        audienceMembers: [],
      };
      return [copy, ...prev];
    });
    toastSuccess("Campaign duplicated", "A draft copy has been added to the top of the list.");
  }, []);

  /** Archive → remove from the active list (filter state). */
  const archiveCampaign = useCallback((id: string) => {
    setCampaigns((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) toastInfo("Campaign archived", `${target.campaignId} moved to archive.`);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  /** Pause a running/scheduled campaign. */
  const pauseCampaign = useCallback((id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Paused" as CampaignStatus } : c)),
    );
    toastSuccess("Campaign paused", "Sending has been stopped immediately.");
  }, []);

  /** Activate a paused/draft campaign. */
  const activateCampaign = useCallback((id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Running" as CampaignStatus } : c)),
    );
    toastSuccess("Campaign activated", "The campaign is now live.");
  }, []);

  /** Cancel a campaign → drop it from the active list. */
  const cancelCampaign = useCallback((id: string) => {
    setCampaigns((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) toastInfo("Campaign cancelled", `${target.campaignId} has been cancelled.`);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  /** Generic status setter used by the bulk actions. */
  const setStatusBulk = useCallback((ids: string[], status: CampaignStatus) => {
    setCampaigns((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, status } : c)));
  }, []);

  // ===== Detail view =====
  if (activeView.module === "marketing" && activeView.view === "detail" && activeView.id) {
    return (
      <>
        <CampaignDetail
          campaignId={activeView.id}
          campaigns={campaigns}
          onUpdateJourney={updateJourney}
          onDuplicate={duplicateCampaign}
          onArchive={archiveCampaign}
          onPause={pauseCampaign}
          onActivate={activateCampaign}
        />
      </>
    );
  }

  return (
    <>
      <CampaignsList
        campaigns={campaigns}
        onCreate={() => setWizardOpen(true)}
        onDuplicate={duplicateCampaign}
        onArchive={archiveCampaign}
        onPause={pauseCampaign}
        onCancel={cancelCampaign}
        onPauseBulk={(ids) => setStatusBulk(ids, "Paused")}
        onNavigateToMarketplace={() => {
          // Try to deep-link to the broker marketplace; if the broker gate is
          // closed (authUser has no brokerProfile), the broker-shell will fall
          // back to the broker overview. Either way we surface a toast so the
          // user understands what happened.
          navigate("broker-marketplace");
          toastInfo("Reanzly Marketplace", "Opening broker marketplace - promote your business.");
        }}
      />
      <NewCampaignWizard
        key={wizardOpen ? "open" : "closed"}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreate={handleCreate}
        nextCampaignNumber={2400 + campaigns.length + 1}
      />
    </>
  );
}

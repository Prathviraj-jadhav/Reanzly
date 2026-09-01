"use client";

import { use } from "react";
import { DriverFieldApp } from "@/components/modules/driver-field";
import {
  DRIVER_DEFAULT_TAB,
  isValidDriverFieldTab,
  type DriverFieldTab,
} from "@/lib/navigation/portal-paths";
import { useDriverFieldNavigation } from "@/lib/navigation/use-portal-navigation";

export default function DriverFieldTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const resolvedTab: DriverFieldTab = isValidDriverFieldTab(tab) ? tab : DRIVER_DEFAULT_TAB;
  const nav = useDriverFieldNavigation(resolvedTab);

  if (!isValidDriverFieldTab(tab)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-[13px] text-muted-foreground">
        Unknown driver tab.
      </div>
    );
  }

  return <DriverFieldApp {...nav} />;
}

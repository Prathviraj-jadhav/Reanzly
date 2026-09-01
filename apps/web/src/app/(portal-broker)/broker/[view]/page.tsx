"use client";

import { use } from "react";
import { BrokerShell } from "@/components/layout/broker-shell";
import {
  BROKER_DEFAULT_VIEW,
  isValidBrokerView,
  type BrokerView,
} from "@/lib/navigation/portal-paths";
import { useBrokerPortalNavigation } from "@/lib/navigation/use-portal-navigation";

export default function BrokerPortalViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = use(params);
  const resolvedView: BrokerView = isValidBrokerView(view) ? view : BROKER_DEFAULT_VIEW;
  const nav = useBrokerPortalNavigation(resolvedView);

  if (!isValidBrokerView(view)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-[13px] text-muted-foreground">
        Unknown broker portal view.
      </div>
    );
  }

  return <BrokerShell {...nav} />;
}

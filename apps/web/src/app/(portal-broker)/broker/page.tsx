"use client";

import { BrokerShell } from "@/components/layout/broker-shell";
import { BROKER_DEFAULT_VIEW } from "@/lib/navigation/portal-paths";
import { useBrokerPortalNavigation } from "@/lib/navigation/use-portal-navigation";

export default function BrokerPortalPage() {
  const nav = useBrokerPortalNavigation(BROKER_DEFAULT_VIEW);
  return <BrokerShell {...nav} />;
}

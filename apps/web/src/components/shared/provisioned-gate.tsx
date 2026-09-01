"use client";

import { useAppStore } from "@/lib/store/app-store";
import { PlaceholderModule } from "@/components/modules/placeholder";

/**
 * Broker Network modules are individually licensed. When authUser.selectedModules
 * is set, the module id must be in the list (or "*"). Demo logins allow all.
 */
export function ProvisionedGate({
  moduleId,
  children,
}: {
  moduleId: string;
  children: React.ReactNode;
}) {
  const authUser = useAppStore((s) => s.authUser);
  const selected = authUser?.selectedModules;
  if (!selected || selected.includes("*") || selected.includes(moduleId)) {
    return <>{children}</>;
  }
  return (
    <PlaceholderModule
      title="Module not provisioned"
      description="This Broker Network module is not in your current plan. Add it from Settings - Marketplace or contact your Reanzly account manager."
    />
  );
}

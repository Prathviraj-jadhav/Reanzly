"use client";

import { SettingsClusterLayout } from "@/components/shared/platform-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsClusterLayout>{children}</SettingsClusterLayout>;
}

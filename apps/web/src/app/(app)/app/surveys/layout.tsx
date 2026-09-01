"use client";

import { CrmClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CrmClusterLayout>{children}</CrmClusterLayout>;
}

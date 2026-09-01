"use client";

import { OperationsClusterLayout } from "@/components/shared/platform-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OperationsClusterLayout>{children}</OperationsClusterLayout>;
}

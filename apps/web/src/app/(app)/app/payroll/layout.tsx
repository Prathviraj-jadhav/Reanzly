"use client";

import { HrClusterLayout } from "@/components/shared/people-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <HrClusterLayout>{children}</HrClusterLayout>;
}

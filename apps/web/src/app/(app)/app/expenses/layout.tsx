"use client";

import { ExpensesClusterLayout } from "@/components/shared/finance-cluster-layout";

export default function ExpensesClusterModuleLayout({ children }: { children: React.ReactNode }) {
  return <ExpensesClusterLayout>{children}</ExpensesClusterLayout>;
}

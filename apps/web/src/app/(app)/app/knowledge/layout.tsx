"use client";

import { DocumentsClusterLayout } from "@/components/shared/documents-cluster-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocumentsClusterLayout>{children}</DocumentsClusterLayout>;
}

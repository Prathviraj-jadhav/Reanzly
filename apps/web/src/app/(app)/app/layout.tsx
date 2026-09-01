import type { Metadata } from "next";
import { AppRouteShell } from "@/components/layout/app-route-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppRouteShell>{children}</AppRouteShell>;
}

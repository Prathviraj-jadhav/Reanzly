import { LandingSite } from "@/components/marketing/landing-site";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reanzly - AI Logistics Operating System",
  description: "Automate dispatch, billing, and fleet maintenance with AI agents.",
};

export default function RootPage() {
  return <LandingSite />;
}

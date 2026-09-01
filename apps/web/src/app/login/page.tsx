import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/login-screen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | Reanzly",
  description: "Log in to your Reanzly account",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

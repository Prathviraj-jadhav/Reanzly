import { LoginScreen } from "@/components/auth/login-screen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | Reanzly",
  description: "Log in to your Reanzly account",
};

export default function LoginPage() {
  return <LoginScreen />;
}

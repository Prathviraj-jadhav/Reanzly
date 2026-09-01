import { redirect } from "next/navigation";
import { DASHBOARD_ROUTE } from "@/lib/navigation/routing-config";

export default function AppIndexPage() {
  redirect(DASHBOARD_ROUTE);
}

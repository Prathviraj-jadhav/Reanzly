import Link from "next/link";
import { DASHBOARD_ROUTE } from "@/lib/navigation/routing-config";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        This app URL does not match a known module. Unmigrated modules are still available from the legacy dashboard.
      </p>
      <Link
        href={DASHBOARD_ROUTE}
        className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
      >
        Go to dashboard
      </Link>
    </div>
  );
}

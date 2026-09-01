"use client";

import { useEffect } from "react";
import { Btn } from "@/components/shared/btn";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        This module failed to load. Your session is still active — try again or return to the dashboard.
      </p>
      <Btn onClick={reset}>Try again</Btn>
    </div>
  );
}

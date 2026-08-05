"use client";

import { cn } from "@/lib/utils";
import type { PresenceState } from "@/lib/types";
import { Sparkles } from "lucide-react";

// ============================================================
// ChatAvatar - monochrome avatar with optional presence dot.
// ============================================================

const PRESENCE_DOT: Record<PresenceState, string> = {
  online: "bg-foreground",
  idle: "bg-muted-foreground",
  offline: "bg-border",
};

export function ChatAvatar({
  initials,
  size = "md",
  presence,
  isRean = false,
  className,
}: {
  initials: string;
  size?: "xs" | "sm" | "md" | "lg";
  presence?: PresenceState;
  isRean?: boolean;
  className?: string;
}) {
  const sizeCls =
    size === "xs"
      ? "h-5 w-5 text-[9px] rounded-[3px]"
      : size === "sm"
        ? "h-6 w-6 text-[10px] rounded-[4px]"
        : size === "lg"
          ? "h-10 w-10 text-[14px] rounded-[5px]"
          : "h-7 w-7 text-[11px] rounded-[4px]";

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex items-center justify-center font-medium",
          sizeCls,
          isRean
            ? "bg-foreground text-background"
            : "bg-muted text-foreground border border-border"
        )}
      >
        {isRean ? <Sparkles className="h-3.5 w-3.5" /> : initials}
      </div>
      {presence && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background",
            PRESENCE_DOT[presence]
          )}
          aria-label={presence}
        />
      )}
    </div>
  );
}
